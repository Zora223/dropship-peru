// src/lib/analytics.ts
import { supabase } from "./supabase";

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS EXPORTADOS
// ═══════════════════════════════════════════════════════════════════════════

export type WhatsAppClickType =
  | "floating"
  | "header"
  | "product"
  | "payment"
  | "social"
  | "checkout"
  | "other";

export type PageType = "store" | "product" | "checkout" | "payment";

export type DeviceType = "mobile" | "tablet" | "desktop";

export interface AnalyticsSummary {
  total_views: number;
  unique_visitors: number;
  total_wa_clicks: number;
  conversion_rate: number;
}

export interface DailyView {
  day: string;
  views: number;
  unique_visitors: number;
  wa_clicks: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  product_image: string | null;
  views: number;
}

export interface WABreakdown {
  click_type: string;
  count: number;
}

export interface Referrer {
  referrer_domain: string;
  visits: number;
}

export interface DeviceBreakdown {
  device_type: string;
  count: number;
  percentage: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getBrowserFingerprint(): string {
  const nav = navigator;
  const raw = [
    nav.userAgent,
    nav.language,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
  ].join("|");

  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return "v_" + Math.abs(hash).toString(36);
}

function getSessionId(): string {
  const key = "analytics_session_id";
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

function getDeviceType(): DeviceType {
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function getReferrerDomain(): string | null {
  try {
    const ref = document.referrer;
    if (!ref) return null;
    return new URL(ref).hostname;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ANTI-DEDUPE (5 minutos por sesión)
// ═══════════════════════════════════════════════════════════════════════════

const DEDUPE_KEY_PREFIX = "analytics_tracked_";
const DEDUPE_MINUTES = 5;

function wasRecentlyTracked(key: string): boolean {
  const stored = sessionStorage.getItem(DEDUPE_KEY_PREFIX + key);
  if (!stored) return false;
  const timestamp = parseInt(stored, 10);
  const diffMinutes = (Date.now() - timestamp) / 1000 / 60;
  return diffMinutes < DEDUPE_MINUTES;
}

function markAsTracked(key: string): void {
  sessionStorage.setItem(DEDUPE_KEY_PREFIX + key, Date.now().toString());
}

// ═══════════════════════════════════════════════════════════════════════════
// TRACK PAGE VIEW — usa RPC track_page_view (SECURITY DEFINER)
// ═══════════════════════════════════════════════════════════════════════════

export async function trackPageView({
  storeId,
  productId,
  pageType = "store",
}: {
  storeId: string;
  productId?: string;
  pageType?: PageType;
}): Promise<void> {
  const dedupeKey = `view_${storeId}_${productId ?? "store"}_${getSessionId()}`;

  if (wasRecentlyTracked(dedupeKey)) {
    return;
  }

  const payload = {
    p_store_id: storeId,
    p_visitor_hash: getBrowserFingerprint(),
    p_session_id: getSessionId(),
    p_page_type: pageType,
    p_product_id: productId ?? null,
    p_device_type: getDeviceType(),
    p_referrer_domain: getReferrerDomain(),
    p_user_agent: navigator.userAgent,
  };

  const { data, error } = await supabase.rpc("track_page_view", payload);

  if (error) {
    console.error("[Analytics] Error al registrar vista:", error.message);
  } else {
    markAsTracked(dedupeKey);
    if (import.meta.env.DEV) {
      console.log("✅ [Analytics] Vista registrada:", data);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TRACK WHATSAPP CLICK — usa RPC track_whatsapp_click (SECURITY DEFINER)
// ═══════════════════════════════════════════════════════════════════════════

export async function trackWhatsAppClick({
  storeId,
  productId,
  clickType = "other",
}: {
  storeId: string;
  productId?: string;
  clickType?: WhatsAppClickType;
}): Promise<void> {
  const payload = {
    p_store_id: storeId,
    p_visitor_hash: getBrowserFingerprint(),
    p_session_id: getSessionId(),
    p_click_type: clickType,
    p_product_id: productId ?? null,
    p_device_type: getDeviceType(),
  };

  const { data, error } = await supabase.rpc("track_whatsapp_click", payload);

  if (error) {
    console.error("[Analytics] Error al registrar click WA:", error.message);
  } else if (import.meta.env.DEV) {
    console.log("✅ [Analytics] Click WhatsApp registrado:", data);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERY FUNCTIONS (para VendorAnalyticsPage)
// ═══════════════════════════════════════════════════════════════════════════

export async function getStoreAnalyticsSummary(
  storeId: string,
  days = 30
): Promise<AnalyticsSummary | null> {
  const { data, error } = await supabase.rpc("get_store_analytics_summary", {
    p_store_id: storeId,
    p_days: days,
  });
  if (error) {
    console.error("Error getStoreAnalyticsSummary:", error);
    throw error;
  }
  return (data?.[0] as AnalyticsSummary) ?? null;
}

export async function getStoreDailyViews(
  storeId: string,
  days = 30
): Promise<DailyView[]> {
  const { data, error } = await supabase.rpc("get_store_daily_views", {
    p_store_id: storeId,
    p_days: days,
  });
  if (error) {
    console.error("Error getStoreDailyViews:", error);
    throw error;
  }
  return (data as DailyView[]) ?? [];
}

export async function getStoreTopProducts(
  storeId: string,
  days = 30,
  limit = 5
): Promise<TopProduct[]> {
  const { data, error } = await supabase.rpc("get_store_top_products", {
    p_store_id: storeId,
    p_days: days,
    p_limit: limit,
  });
  if (error) {
    console.error("Error getStoreTopProducts:", error);
    throw error;
  }
  return (data as TopProduct[]) ?? [];
}

export async function getStoreWABreakdown(
  storeId: string,
  days = 30
): Promise<WABreakdown[]> {
  const { data, error } = await supabase.rpc("get_store_wa_breakdown", {
    p_store_id: storeId,
    p_days: days,
  });
  if (error) {
    console.error("Error getStoreWABreakdown:", error);
    throw error;
  }
  return (data as WABreakdown[]) ?? [];
}

// Alias para compatibilidad con imports antiguos
export const getStoreWaBreakdown = getStoreWABreakdown;

export async function getStoreReferrers(
  storeId: string,
  days = 30,
  limit = 5
): Promise<Referrer[]> {
  const { data, error } = await supabase.rpc("get_store_referrers", {
    p_store_id: storeId,
    p_days: days,
    p_limit: limit,
  });
  if (error) {
    console.error("Error getStoreReferrers:", error);
    throw error;
  }
  return (data as Referrer[]) ?? [];
}

export async function getStoreDevices(
  storeId: string,
  days = 30
): Promise<DeviceBreakdown[]> {
  const { data, error } = await supabase.rpc("get_store_devices", {
    p_store_id: storeId,
    p_days: days,
  });
  if (error) {
    console.error("Error getStoreDevices:", error);
    throw error;
  }
  return (data as DeviceBreakdown[]) ?? [];
}