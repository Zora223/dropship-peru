// src/lib/photo-studio-ai.ts
import { supabase } from "./supabase";

// ============================================
// TYPES
// ============================================

export type GenerationType = "remove_background" | "context" | "model";

export interface ImagePreset {
  id: string;
  category: "background" | "context" | "model";
  name: string;
  emoji: string;
  prompt_template: string;
  credits_cost: number;
  is_active: boolean;
  sort_order: number;
}

export interface GenerateImageParams {
  vendor_id: string;
  product_id?: string;
  product_name: string;
  product_description?: string;
  generation_type: GenerationType;
  preset_id: string;
  input_image_url?: string;
}

export interface GenerateImageResponse {
  success: boolean;
  image_url: string;
  generation_id: string;
  preset_name: string;
  credits_used: number;
  credits_remaining: number;
  plan: string;
}

export interface ImageGeneration {
  id: string;
  vendor_id: string;
  product_id: string | null;
  content_type: string;
  generation_type: string;
  prompt: string;
  result: string;
  image_url: string | null;
  input_image_url: string | null;
  image_style: string | null;
  credits_used: number;
  created_at: string;
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Obtiene todos los presets de imágenes agrupados por categoría
 */
export async function getImagePresets(): Promise<{
  background: ImagePreset[];
  context: ImagePreset[];
  model: ImagePreset[];
}> {
  const { data, error } = await supabase
    .from("ai_image_presets")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("❌ Error cargando presets:", error);
    throw error;
  }

  const grouped = {
    background: [] as ImagePreset[],
    context: [] as ImagePreset[],
    model: [] as ImagePreset[],
  };

  (data || []).forEach((preset) => {
    if (preset.category === "background") grouped.background.push(preset);
    else if (preset.category === "context") grouped.context.push(preset);
    else if (preset.category === "model") grouped.model.push(preset);
  });

  return grouped;
}

/**
 * Genera una imagen con IA usando Cloudflare Workers AI
 */
export async function generateAIImage(
  params: GenerateImageParams
): Promise<GenerateImageResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error("No estás autenticado");
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ai-image`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 402) {
      throw new Error(
        `Créditos insuficientes. Necesitas ${data.credits_needed} créditos.`
      );
    }
    throw new Error(data.error || "Error al generar imagen");
  }

  return data as GenerateImageResponse;
}

/**
 * Obtiene el historial de imágenes generadas por un vendor
 */
export async function getImageGenerationHistory(
  vendorId: string,
  limit = 20
): Promise<ImageGeneration[]> {
  const { data, error } = await supabase
    .from("ai_generations")
    .select("*")
    .eq("vendor_id", vendorId)
    .eq("generation_type", "image")
    .not("image_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("❌ Error cargando historial:", error);
    throw error;
  }

  return (data as ImageGeneration[]) || [];
}

/**
 * Descarga una imagen desde una URL
 */
export async function downloadImage(
  imageUrl: string,
  fileName: string = "dropship-ai-image.png"
): Promise<void> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("❌ Error descargando imagen:", error);
    throw error;
  }
}

/**
 * Elimina una imagen generada (opcional, para historial)
 */
export async function deleteGeneratedImage(
  generationId: string,
  imageUrl: string
): Promise<void> {
  // Extraer path del bucket desde la URL
  const urlParts = imageUrl.split("/ai-generated-images/");
  if (urlParts.length === 2) {
    const filePath = urlParts[1];
    await supabase.storage.from("ai-generated-images").remove([filePath]);
  }

  // Eliminar registro de la BD
  const { error } = await supabase
    .from("ai_generations")
    .delete()
    .eq("id", generationId);

  if (error) throw error;
}

// ============================================
// HELPERS DE UI
// ============================================

/**
 * Retorna info sobre el tipo de generación
 */
export function getGenerationTypeInfo(type: GenerationType) {
  const info = {
    remove_background: {
      title: "Remover fondo",
      description: "Convierte tu foto casera en una foto profesional de e-commerce",
      emoji: "🎭",
      color: "from-blue-500 to-cyan-500",
      minCredits: 3,
    },
    context: {
      title: "Producto en contexto",
      description: "Coloca tu producto en escenarios aspiracionales",
      emoji: "🌆",
      color: "from-purple-500 to-pink-500",
      minCredits: 7,
    },
    model: {
      title: "Modelo usando el producto",
      description: "Genera fotos con modelos usando tu producto",
      emoji: "👤",
      color: "from-orange-500 to-red-500",
      minCredits: 12,
    },
  };

  return info[type];
}

/**
 * Retorna el color del badge según créditos
 */
export function getCreditsColor(credits: number): string {
  if (credits >= 12) return "bg-red-100 text-red-700";
  if (credits >= 7) return "bg-orange-100 text-orange-700";
  return "bg-blue-100 text-blue-700";
}