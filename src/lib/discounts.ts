// src/lib/discounts.ts
// 🆕 v19.3 - Sistema descuentos GAMIFICADO con PORCENTAJES
// Modelo Balanceado: 2.5% / 3.5% / 4% / 5% con tope S/70
import { supabase } from "./supabase";
import { getPlatformConfig } from "./platform-config";

export interface DiscountRule {
  id: string;
  tier_name: string;
  tier_label: string;
  tier_emoji: string;
  tier_tagline: string;
  min_items: number;
  min_total: number;
  discount_amount: number;   // Legacy (S/ fijo)
  discount_pct: number;      // 🆕 % principal
  active: boolean;
  sort_order: number;
}

export interface DiscountResult {
  applied: boolean;
  current_tier: DiscountRule | null;
  next_tier: DiscountRule | null;
  discount_amount: number;    // Monto final aplicado (después de tope)
  discount_pct_display: number; // % que se muestra al cliente
  capped: boolean;            // true si el tope se activó
  final_total: number;
  items_to_next: number;
  progress_pct: number;
  message: string;
}

let cachedRules: DiscountRule[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function getDiscountRules(force = false): Promise<DiscountRule[]> {
  const now = Date.now();
  if (!force && cachedRules && now - cacheTime < CACHE_TTL) {
    return cachedRules;
  }

  const { data, error } = await supabase
    .from("discount_rules")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error loading discount rules:", error);
    return [];
  }

  cachedRules = (data ?? []) as DiscountRule[];
  cacheTime = now;
  return cachedRules;
}

/**
 * 🆕 v19.3 - Calcula descuento porcentual con tope máximo
 */
export async function calculateDiscount(
  itemCount: number,
  subtotal: number
): Promise<DiscountResult> {
  const rules = await getDiscountRules();
  const config = await getPlatformConfig();
  const maxDiscount = config.discount_max_per_order ?? 70;

  if (rules.length === 0 || itemCount === 0) {
    return {
      applied: false,
      current_tier: null,
      next_tier: null,
      discount_amount: 0,
      discount_pct_display: 0,
      capped: false,
      final_total: subtotal,
      items_to_next: 0,
      progress_pct: 0,
      message: "",
    };
  }

  // Encontrar tier actual (el más alto que cumple)
  let currentTier: DiscountRule | null = null;
  let bestDiscount = 0;

  for (const rule of rules) {
    const meetsItems = itemCount >= rule.min_items;
    const meetsTotal = subtotal >= rule.min_total;

    if (meetsItems && meetsTotal) {
      // Priorizar % sobre valor fijo
      const discFromPct = (subtotal * rule.discount_pct) / 100;
      const discFromAmount = rule.discount_amount;
      const thisDiscount = Math.max(discFromPct, discFromAmount);

      if (thisDiscount >= bestDiscount) {
        bestDiscount = thisDiscount;
        currentTier = rule;
      }
    }
  }

  // 🛡️ Aplicar TOPE máximo
  const capped = bestDiscount > maxDiscount;
  const finalDiscount = Math.min(bestDiscount, maxDiscount);

  // Siguiente tier (para gamificación)
  const nextTier = rules.find((r) => r.min_items > itemCount) ?? null;
  const itemsToNext = nextTier ? nextTier.min_items - itemCount : 0;

  // Progreso al siguiente tier
  let progressPct = 0;
  if (nextTier) {
    const prevItems = currentTier?.min_items ?? 0;
    const range = nextTier.min_items - prevItems;
    const progress = itemCount - prevItems;
    progressPct = range > 0 ? Math.min(100, (progress / range) * 100) : 0;
  } else if (currentTier) {
    progressPct = 100;
  }

  const finalTotal = Math.max(0, subtotal - finalDiscount);

  // Mensaje personalizado
  let message = "";
  if (currentTier && nextTier) {
    message = `Agrega ${itemsToNext} producto${itemsToNext > 1 ? "s" : ""} más para ${nextTier.tier_emoji} ${nextTier.tier_label} (${nextTier.discount_pct}%)`;
  } else if (currentTier && !nextTier) {
    if (capped) {
      message = `¡Tope máximo alcanzado! Ahorraste el máximo de S/ ${maxDiscount}`;
    } else {
      message = `¡Nivel máximo ${currentTier.tier_emoji} ${currentTier.tier_label}!`;
    }
  } else if (!currentTier && nextTier) {
    message = `Agrega ${itemsToNext} producto${itemsToNext > 1 ? "s" : ""} y desbloquea ${nextTier.discount_pct}% de descuento`;
  }

  return {
    applied: finalDiscount > 0,
    current_tier: currentTier,
    next_tier: nextTier,
    discount_amount: Number(finalDiscount.toFixed(2)),
    discount_pct_display: currentTier?.discount_pct ?? 0,
    capped,
    final_total: Number(finalTotal.toFixed(2)),
    items_to_next: itemsToNext,
    progress_pct: Math.round(progressPct),
    message,
  };
}

export function clearDiscountCache() {
  cachedRules = null;
  cacheTime = 0;
}