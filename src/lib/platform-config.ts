// src/lib/platform-config.ts
// 🆕 v19 - Configuración global de la plataforma
import { supabase } from "./supabase";

export interface PlatformConfig {
  commission_pct: number;
  vendor_margin_pct: number;
  vendor_min_margin_pct: number;
  delivery_cost_default: number;
  delivery_cost_province: number;
  free_shipping_min: number;
  platform_yape_number: string;
  discount_max_per_order: number; // 🆕 v19.3 tope máximo descuento
}

let cachedConfig: PlatformConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

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
    return getDefaultConfig();
  }

  const config = getDefaultConfig();
  (data ?? []).forEach((row) => {
    const key = row.config_key as keyof PlatformConfig;
    const value = row.config_value;
    if (typeof value === "number" || typeof value === "string") {
      (config[key] as any) = value;
    } else {
      (config[key] as any) = value;
    }
  });

  cachedConfig = config;
  cacheTime = now;
  return config;
}

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
  cachedConfig = null;
}

function getDefaultConfig(): PlatformConfig {
  return {
    commission_pct: 3,
    vendor_margin_pct: 40,
    vendor_min_margin_pct: 20,
    delivery_cost_default: 7,
    delivery_cost_province: 15,
    free_shipping_min: 0,
    platform_yape_number: "999999999",
    discount_max_per_order: 70, // 🆕 v19.3
  };
}

export function clearConfigCache() {
  cachedConfig = null;
  cacheTime = 0;
}