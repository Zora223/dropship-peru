// src/lib/auto-fill-ai.ts
// 🪄 Cliente para Auto-Fill AI (analiza imagen y rellena campos)

import { supabase } from "./supabase";

export type AutoFillField = "all" | "name" | "description" | "category" | "price";

export interface AutoFillData {
  name?: string;
  description?: string;
  category?: string;
  brand_suggested?: string;
  colors_detected?: string[];
  price_min?: number;
  price_max?: number;
  price_suggested?: number;
}

export interface AutoFillResponse {
  success: boolean;
  data: AutoFillData;
  credits_used: number;
  credits_remaining: number;
  field: AutoFillField;
}

export interface AutoFillError {
  error: string;
  credits_remaining?: number;
  details?: string;
}

// ========================================
// 💰 CRÉDITOS POR OPERACIÓN
// ========================================
export const AUTO_FILL_COSTS: Record<AutoFillField, number> = {
  all: 5,
  name: 1,
  description: 2,
  category: 1,
  price: 2,
};

// ========================================
// 📋 INFO DE CADA CAMPO (UI)
// ========================================
export const FIELD_INFO: Record<
  AutoFillField,
  { label: string; icon: string; description: string }
> = {
  all: {
    label: "Rellenar TODO",
    icon: "🪄",
    description: "Nombre, descripción, categoría y precio en un solo click",
  },
  name: {
    label: "Nombre",
    icon: "✍️",
    description: "Solo el nombre del producto",
  },
  description: {
    label: "Descripción",
    icon: "📝",
    description: "Descripción profesional detallada",
  },
  category: {
    label: "Categoría",
    icon: "🏷️",
    description: "Detección automática de categoría",
  },
  price: {
    label: "Precio",
    icon: "💰",
    description: "Precio sugerido con rango de mercado",
  },
};

// ========================================
// 🚀 FUNCIÓN PRINCIPAL — Llamar a la Edge Function
// ========================================
export async function autoFillProduct(
  imageUrl: string,
  field: AutoFillField = "all"
): Promise<AutoFillResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(
    `${supabaseUrl}/functions/v1/auto-fill-product`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        image_url: imageUrl,
        field: field,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    const errMsg = result.error || "Error al procesar imagen";
    throw new Error(errMsg);
  }

  return result as AutoFillResponse;
}

// ========================================
// 📤 SUBIR IMAGEN TEMPORAL (si aún no está en storage)
// ========================================
export async function uploadTempImageForAI(file: File): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");

  const fileName = `temp/${user.id}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(fileName);

  return data.publicUrl;
}