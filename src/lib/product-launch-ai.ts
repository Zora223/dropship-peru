// src/lib/product-launch-ai.ts
// 🍌 Product Launch AI - Cliente frontend

import { supabase } from "./supabase";

// ============================================
// TYPES
// ============================================

export type ProductCategory =
  | "clothing_female"
  | "clothing_male"
  | "toys"
  | "accessories"
  | "electronics"
  | "beauty"
  | "pets"
  | "kitchen"
  | "home"
  | "sports"
  | "generic";

export interface LaunchKit {
  id: string;
  vendor_id: string;
  product_id: string;
  detected_category: ProductCategory;
  confidence_score: number | null;

  original_image_url: string;
  enhanced_image_url: string | null;

  caption_instagram: string | null;
  caption_facebook: string | null;
  hashtags: string[] | null;
  whatsapp_message: string | null;
  email_subject: string | null;
  email_body: string | null;

  status: "pending" | "generating" | "completed" | "failed";
  progress: number;
  error_message: string | null;

  credits_used: number;
  generation_time_ms: number | null;
  model_used: string;

  created_at: string;
  completed_at: string | null;
}

export interface LaunchAIParams {
  product_id: string;
  product_name: string;
  product_description?: string;
  product_category?: string;
  product_price: number;
  input_image_url: string;
  store_name?: string;
  store_city?: string;
  store_phone?: string;
}

export interface LaunchAIResponse {
  success: boolean;
  kit: LaunchKit;
  credits_used: number;
  credits_remaining: number;
  generation_time_ms: number;
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Genera un kit completo de marketing con Nano Banana + Groq
 * Cuesta 15 créditos
 */
export async function generateLaunchKit(
  params: LaunchAIParams
): Promise<LaunchAIResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error("No estás autenticado");
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/product-launch-ai`,
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
        `Créditos insuficientes. Necesitas ${data.credits_needed || 15} créditos. Tienes ${data.credits_available || 0}.`
      );
    }
    throw new Error(data.error || "Error al generar kit de marketing");
  }

  return data as LaunchAIResponse;
}

/**
 * Obtiene los kits de un vendor
 */
export async function getMyLaunchKits(limit = 20): Promise<LaunchKit[]> {
  const { data, error } = await supabase
    .from("product_launch_kits")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("❌ Error cargando kits:", error);
    throw error;
  }

  return (data as LaunchKit[]) || [];
}

/**
 * Obtiene un kit específico por ID
 */
export async function getLaunchKitById(kitId: string): Promise<LaunchKit | null> {
  const { data, error } = await supabase
    .from("product_launch_kits")
    .select("*")
    .eq("id", kitId)
    .single();

  if (error) {
    console.error("❌ Error cargando kit:", error);
    return null;
  }

  return data as LaunchKit;
}

/**
 * Obtiene el último kit de un producto (si existe)
 */
export async function getLatestKitForProduct(
  productId: string
): Promise<LaunchKit | null> {
  const { data, error } = await supabase
    .from("product_launch_kits")
    .select("*")
    .eq("product_id", productId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("❌ Error cargando kit del producto:", error);
    return null;
  }

  return data as LaunchKit | null;
}

/**
 * Elimina un kit
 */
export async function deleteLaunchKit(
  kitId: string,
  imageUrl?: string
): Promise<void> {
  // Eliminar imagen del bucket si existe
  if (imageUrl) {
    const urlParts = imageUrl.split("/product-launch-images/");
    if (urlParts.length === 2) {
      const filePath = urlParts[1];
      await supabase.storage.from("product-launch-images").remove([filePath]);
    }
  }

  // Eliminar registro
  const { error } = await supabase
    .from("product_launch_kits")
    .delete()
    .eq("id", kitId);

  if (error) throw error;
}

/**
 * Descarga la imagen mejorada
 */
export async function downloadEnhancedImage(
  imageUrl: string,
  fileName: string = "product-launch-ai.png"
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

// ============================================
// HELPERS DE UI
// ============================================

export const CATEGORY_INFO: Record<
  ProductCategory,
  { label: string; emoji: string; color: string }
> = {
  clothing_female: {
    label: "Ropa Femenina",
    emoji: "👗",
    color: "from-pink-500 to-rose-500",
  },
  clothing_male: {
    label: "Ropa Masculina",
    emoji: "👔",
    color: "from-blue-500 to-indigo-500",
  },
  toys: {
    label: "Juguetes",
    emoji: "🧸",
    color: "from-yellow-500 to-orange-500",
  },
  accessories: {
    label: "Bisutería/Accesorios",
    emoji: "💎",
    color: "from-purple-500 to-pink-500",
  },
  electronics: {
    label: "Electrónica",
    emoji: "📱",
    color: "from-gray-700 to-gray-900",
  },
  beauty: {
    label: "Belleza",
    emoji: "💄",
    color: "from-rose-500 to-pink-500",
  },
  pets: {
    label: "Mascotas",
    emoji: "🐕",
    color: "from-amber-500 to-orange-500",
  },
  kitchen: {
    label: "Cocina",
    emoji: "🍳",
    color: "from-orange-500 to-red-500",
  },
  home: {
    label: "Hogar/Decoración",
    emoji: "🏠",
    color: "from-emerald-500 to-teal-500",
  },
  sports: {
    label: "Deportes",
    emoji: "⚽",
    color: "from-green-500 to-emerald-500",
  },
  generic: {
    label: "Producto",
    emoji: "📦",
    color: "from-gray-500 to-gray-700",
  },
};

/**
 * Retorna info de la categoría
 */
export function getCategoryInfo(category: ProductCategory) {
  return CATEGORY_INFO[category] || CATEGORY_INFO.generic;
}

/**
 * Formatea milisegundos a segundos legibles
 */
export function formatGenerationTime(ms: number | null): string {
  if (!ms) return "—";
  const seconds = Math.round(ms / 1000);
  return `${seconds}s`;
}

/**
 * Copia texto al portapapeles
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Error copying:", err);
    return false;
  }
}