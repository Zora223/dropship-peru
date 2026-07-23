// src/lib/discounts.ts
// 🆕 v19 - Sistema de descuentos gamificados (SMART/PRO/EXPERT/LEGEND)
import { supabase } from "./supabase";

export interface DiscountRule {
  id: string;
  tier_name: string;        // 'smart', 'pro', 'expert', 'legend'
  tier_label: string;       // 'SMART', 'PRO', 'EXPERT', 'LEGEND'
  tier_emoji: string;       // '🥉', '🥈', '🥇', '💎'
  tier_tagline: string;
  min_items: number;
  min_total: number;
  discount_amount: number;
  discount_pct: number;
  active: boolean;
  sort_order: number;
}

export interface DiscountResult {
  applied: boolean;
  current_tier: DiscountRule | null;
  next_tier: DiscountRule | null;
  discount_amount: number;
  final_total: number;
  items_to_next: number;
  progress_pct: number;      // 0-100, para barra de progreso
  message: string;
}

// Cache de reglas (5 min)
let cachedRules: DiscountRule[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Obtiene todas las reglas activas ordenadas.
 */
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
 * 🎯 CEREBRO: Calcula el descuento aplicable al carrito actual.
 * 
 * Reglas:
 * - Se aplica la regla más beneficiosa (mayor descuento)
 * - Considera tanto discount_amount como discount_pct
 * - Devuelve info del NEXT tier para gamificación
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
      discount_amount: 0,
      final_total: subtotal,
      items_to_next: 0,
      progress_pct: 0,
      message: "",
    };
  }

  // Encontrar la regla ACTUAL (la de mayor tier que cumple)
  let currentTier: DiscountRule | null = null;
  let bestDiscount = 0;

  for (const rule of rules) {
    const meetsItems = itemCount >= rule.min_items;
    const meetsTotal = subtotal >= rule.min_total;

    if (meetsItems && meetsTotal) {
      // Calcular descuento (usa el mayor entre fijo y %)
      const discFromAmount = rule.discount_amount;
      const discFromPct = (subtotal * rule.discount_pct) / 100;
      const thisDiscount = Math.max(discFromAmount, discFromPct);

      if (thisDiscount >= bestDiscount) {
        bestDiscount = thisDiscount;
        currentTier = rule;
      }
    }
  }

  // Encontrar SIGUIENTE tier (para gamificación)
  const nextTier = rules.find((r) => r.min_items > itemCount) ?? null;
  const itemsToNext = nextTier ? nextTier.min_items - itemCount : 0;

  // Progreso hacia siguiente tier (para barra visual)
  let progressPct = 0;
  if (nextTier) {
    const prevItems = currentTier?.min_items ?? 0;
    const range = nextTier.min_items - prevItems;
    const progress = itemCount - prevItems;
    progressPct = range > 0 ? Math.min(100, (progress / range) * 100) : 0;
  } else if (currentTier) {
    progressPct = 100; // Ya en el máximo
  }

  const finalTotal = Math.max(0, subtotal - bestDiscount);

  // Mensaje personalizado
  let message = "";
  if (currentTier && nextTier) {
    message = `Agrega ${itemsToNext} producto${itemsToNext > 1 ? "s" : ""} más para ${nextTier.tier_emoji} ${nextTier.tier_label}`;
  } else if (currentTier && !nextTier) {
    message = `¡Estás en el nivel máximo ${currentTier.tier_emoji} ${currentTier.tier_label}!`;
  } else if (!currentTier && nextTier) {
    message = `Agrega ${itemsToNext} producto${itemsToNext > 1 ? "s" : ""} para desbloquear ${nextTier.tier_emoji} ${nextTier.tier_label}`;
  }

  return {
    applied: bestDiscount > 0,
    current_tier: currentTier,
    next_tier: nextTier,
    discount_amount: Number(bestDiscount.toFixed(2)),
    final_total: Number(finalTotal.toFixed(2)),
    items_to_next: itemsToNext,
    progress_pct: Math.round(progressPct),
    message,
  };
}

/**
 * Limpia cache (útil si admin cambia reglas).
 */
export function clearDiscountCache() {
  cachedRules = null;
  cacheTime = 0;
}