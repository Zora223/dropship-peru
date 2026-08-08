// src/lib/product-launch-ai.ts
// 🍌 Cliente Launch AI v3 - Con historial y personalización

import { supabase } from "./supabase";

export interface LaunchKit {
  id: string;
  product_id: string;
  vendor_id: string;
  detected_category: string;
  original_image_url: string;
  enhanced_image_url: string;
  caption_instagram: string;
  caption_facebook: string;
  hashtags: string[];
  whatsapp_message: string;
  email_subject: string;
  email_body: string;
  credits_used: number;
  generation_time_ms: number;
  created_at?: string;
}

export interface StoreInfo {
  name: string;
  slug: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
}

export interface LaunchAIParams {
  product_id: string;
  product_name: string;
  product_description?: string;
  product_category?: string;
  product_price: number;
  input_image_url: string;
}

export interface LaunchAIResponse {
  success: boolean;
  kit: LaunchKit;
  store: StoreInfo;
  product_url: string;
  credits_used: number;
  credits_remaining: number;
  generation_time_ms: number;
}

// ============================================
// GENERAR NUEVO KIT (15 créditos)
// ============================================
export async function generateLaunchKit(
  params: LaunchAIParams
): Promise<LaunchAIResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No hay sesión activa");

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/product-launch-ai`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al generar kit");
  }

  return data;
}

// ============================================
// 🆕 OBTENER TODOS LOS KITS DEL VENDOR
// ============================================
export async function getMyKits(limit = 20): Promise<LaunchKit[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("product_launch_kits")
    .select("*")
    .eq("vendor_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error cargando kits:", error);
    return [];
  }

  return (data as LaunchKit[]) || [];
}

// ============================================
// 🆕 OBTENER ÚLTIMO KIT DE UN PRODUCTO
// ============================================
export async function getKitByProductId(
  productId: string
): Promise<LaunchKit | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("product_launch_kits")
    .select("*")
    .eq("vendor_id", user.id)
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error buscando kit:", error);
    return null;
  }

  return data as LaunchKit | null;
}

// ============================================
// 🆕 OBTENER INFO DE LA TIENDA
// ============================================
export async function getMyStoreInfo(): Promise<StoreInfo | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("stores")
    .select("name, slug, whatsapp, contact_phone, instagram, facebook")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    name: data.name,
    slug: data.slug,
    whatsapp: data.whatsapp || data.contact_phone,
    instagram: data.instagram,
    facebook: data.facebook,
  };
}

// ============================================
// 🆕 CONTAR KITS POR PRODUCTO
// ============================================
export async function countKitsPerProduct(): Promise<Record<string, number>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data } = await supabase
    .from("product_launch_kits")
    .select("product_id")
    .eq("vendor_id", user.id);

  if (!data) return {};

  const counts: Record<string, number> = {};
  data.forEach((row: { product_id: string }) => {
    counts[row.product_id] = (counts[row.product_id] || 0) + 1;
  });

  return counts;
}

// ============================================
// UTILIDADES
// ============================================
export async function downloadEnhancedImage(
  url: string,
  filename: string
): Promise<void> {
  const response = await fetch(url);
  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  }
}

const CATEGORY_INFO: Record<string, { emoji: string; label: string }> = {
  clothing_female: { emoji: "👗", label: "Ropa Femenina" },
  clothing_male: { emoji: "👔", label: "Ropa Masculina" },
  toys: { emoji: "🧸", label: "Juguetes" },
  accessories: { emoji: "💍", label: "Accesorios" },
  electronics: { emoji: "📱", label: "Electrónica" },
  beauty: { emoji: "💄", label: "Belleza" },
  pets: { emoji: "🐾", label: "Mascotas" },
  kitchen: { emoji: "🍳", label: "Cocina" },
  home: { emoji: "🏠", label: "Hogar" },
  sports: { emoji: "⚽", label: "Deportes" },
  generic: { emoji: "📦", label: "Producto" },
};

export function getCategoryInfo(category: string) {
  return CATEGORY_INFO[category] || CATEGORY_INFO.generic;
}

export function formatGenerationTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}