import { supabase } from "./supabase";
import type { DbPlatformSettings } from "../types/database";

export const DEFAULT_PLATFORM_SETTINGS: Omit<DbPlatformSettings, "id"> = {
  platform_name: "Dropship Perú",
  logo_url: null,
  primary_color: "#e11d48",
  secondary_color: "#1e293b",
  font_family: "Inter",
  enabled_payment_methods: ["yape", "plin", "transfer", "card"],
  active_theme_id: "default",
  banner_enabled: false,
  banner_text: "",
  banner_link: "",
  seasonal_effect: "none",

  // 🆕 Nuevos campos del banner
  promo_countdown_date: null,
  promo_dismissible: true,
  promo_link_text: "Ver ofertas",
  promo_hide_on_expire: true,
  promo_show_icon: true,
};

export async function fetchPlatformSettings(): Promise<DbPlatformSettings> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching platform_settings:", error);
    throw error;
  }

  if (data) return data as DbPlatformSettings;

  const { data: inserted, error: insertError } = await supabase
    .from("platform_settings")
    .insert({ id: 1, ...DEFAULT_PLATFORM_SETTINGS })
    .select("*")
    .single();

  if (insertError) {
    console.error("Error creating platform_settings:", insertError);
    throw insertError;
  }

  return inserted as DbPlatformSettings;
}

export async function updatePlatformSettings(
  updates: Partial<Omit<DbPlatformSettings, "id">>
): Promise<DbPlatformSettings> {
  const { data, error } = await supabase
    .from("platform_settings")
    .update(updates)
    .eq("id", 1)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating platform_settings:", error);
    throw error;
  }

  return data as DbPlatformSettings;
}