// src/lib/platform-config.ts
// 🆕 v19 - Configuración global de la plataforma
import { supabase } from "./supabase";

export interface PlatformConfig {
  commission_pct: number;           // 3
  vendor_margin_pct: number;        // 40
  vendor_min_margin_pct: number;    // 20
  delivery_cost_default: number;    // 7
  delivery_cost_province: number;   // 15
  free_shipping_min: number;        // 0
  platform_yape_number: string;     // "999999999"
}

// Cache en memoria (evita queries innecesarias)
let cachedConfig: PlatformConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene toda la configuración de la plataforma.
 * Usa cache de 5 min para performance.
 */
export async function getPlatformConfig(force = false): Promise<PlatformConfig> {
  const now = Date.now();
  if (!force && cachedConfig && now - cacheTime < CACHE_TTL) {
    return cachedConfig;
  }

  const { data, error } = await supabase
    .from("platform_config")
    .select("config_key, config_value");

  if (error) {
    console.error("Error loading platform config:", error);
    // Fallback a defaults
    return getDefaultConfig();
  }

  const config = getDefaultConfig();
  (data ?? []).forEach((row) => {
    const key = row.config_key as keyof PlatformConfig;
    const value = row.config_value;
    // JSONB puede venir como string, number o object
    if (typeof value === "number") {
      (config[key] as any) = value;
    } else if (typeof value === "string") {
      (config[key] as any) = value;
    } else {
      (config[key] as any) = value;
    }
  });

  cachedConfig = config;
  cacheTime = now;
  return config;
}

/**
 * Actualiza una configuración (solo admin).
 */
export async function updatePlatformConfig(
  key: keyof PlatformConfig,
  value: number | string
): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("platform_config")
    .update({
      config_value: value,
      updated_at: new Date().toISOString(),
      updated_by: user.user.id,
    })
    .eq("config_key", key);

  if (error) throw error;

  // Invalidar cache
  cachedConfig = null;
}

/**
 * Valores por defecto (si BD falla).
 */
function getDefaultConfig(): PlatformConfig {
  return {
    commission_pct: 3,
    vendor_margin_pct: 40,
    vendor_min_margin_pct: 20,
    delivery_cost_default: 7,
    delivery_cost_province: 15,
    free_shipping_min: 0,
    platform_yape_number: "999999999",
  };
}

/**
 * Limpia el cache manualmente.
 */
export function clearConfigCache() {
  cachedConfig = null;
  cacheTime = 0;
}