// src/lib/discounts.ts
// 🆕 v19.1 - Sistema HÍBRIDO: sin descuento directo, con créditos futuros
import { supabase } from "./supabase";

export interface DiscountRule {
  id: string;
  tier_name: string;
  tier_label: string;
  tier_emoji: string;
  tier_tagline: string;
  min_items: number;
  min_total: number;
  discount_amount: number;      // ahora es CRÉDITO otorgado
  discount_pct: number;
  active: boolean;
  sort_order: number;
}

export interface DiscountResult {
  applied: boolean;
  current_tier: DiscountRule | null;
  next_tier: DiscountRule | null;
  credit_earned: number;         // 🆕 crédito que gana (no descuento inmediato)
  discount_amount: number;       // legacy, siempre 0 ahora
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
 * 🆕 v19.1 - Ahora calcula CRÉDITOS ganados (no descuento inmediato)
 */
export async function calculateDiscount(
  itemCount: number,
  subtotal: number
): Promise<DiscountResult> {
  const rules = await getDiscountRules();

  if (rules.length === 0 || itemCount === 0) {
    return {
      applied: false,
      current_tier: null,
      next_tier: null,
      credit_earned: 0,
      discount_amount: 0,
      final_total: subtotal,
      items_to_next: 0,
      progress_pct: 0,
      message: "",
    };
  }

  // Encontrar tier actual
  let currentTier: DiscountRule | null = null;
  let bestCredit = 0;

  for (const rule of rules) {
    const meetsItems = itemCount >= rule.min_items;
    const meetsTotal = subtotal >= rule.min_total;

    if (meetsItems && meetsTotal) {
      const credit = Math.max(
        rule.discount_amount,
        (subtotal * rule.discount_pct) / 100
      );
      if (credit >= bestCredit) {
        bestCredit = credit;
        currentTier = rule;
      }
    }
  }

  // Siguiente tier
  const nextTier = rules.find((r) => r.min_items > itemCount) ?? null;
  const itemsToNext = nextTier ? nextTier.min_items - itemCount : 0;

  let progressPct = 0;
  if (nextTier) {
    const prevItems = currentTier?.min_items ?? 0;
    const range = nextTier.min_items - prevItems;
    const progress = itemCount - prevItems;
    progressPct = range > 0 ? Math.min(100, (progress / range) * 100) : 0;
  } else if (currentTier) {
    progressPct = 100;
  }

  let message = "";
  if (currentTier && nextTier) {
    message = `Agrega ${itemsToNext} producto${itemsToNext > 1 ? "s" : ""} más y gana S/ ${nextTier.discount_amount} de crédito`;
  } else if (currentTier && !nextTier) {
    message = `¡Máximo nivel! Ganarás S/ ${currentTier.discount_amount} en créditos`;
  } else if (!currentTier && nextTier) {
    message = `Agrega ${itemsToNext} producto${itemsToNext > 1 ? "s" : ""} y gana S/ ${nextTier.discount_amount} de crédito Dropship`;
  }

  return {
    applied: bestCredit > 0,
    current_tier: currentTier,
    next_tier: nextTier,
    credit_earned: Number(bestCredit.toFixed(2)),
    discount_amount: 0, // 🆕 Ya NO se aplica descuento inmediato
    final_total: subtotal, // 🆕 Total NO cambia
    items_to_next: itemsToNext,
    progress_pct: Math.round(progressPct),
    message,
  };
}

export function clearDiscountCache() {
  cachedRules = null;
  cacheTime = 0;
}