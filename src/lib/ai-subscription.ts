// src/lib/ai-subscription.ts
// 🤖 Cuotas: Inicio = 15 kits (225 créditos). 1 kit = 15 créditos.

import { supabase } from "./supabase";

export type AIPlan = "starter" | "creator" | "pro" | "business";

export interface AISubscription {
  id: string;
  vendor_id: string;
  plan: AIPlan;
  credits_remaining: number;
  credits_total: number;
  total_used: number;
  billing_cycle_start: string | null;
  billing_cycle_end: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function getAISubscription(): Promise<AISubscription | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.warn("[getAISubscription] No hay usuario autenticado");
    return null;
  }

  const { data, error } = await supabase
    .from("ai_subscriptions")
    .select("*")
    .eq("vendor_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[getAISubscription] Error:", error);
    return null;
  }

  return data as AISubscription | null;
}

/**
 * Créditos por plan (1 Kit Launch ≈ 15 créditos)
 * starter  = 15 kits  → 225
 * creator  = 50 kits  → 750
 * pro      = 150 kits → 2250
 * business = ilimitado
 */
export const AI_PLANS_INFO: Record<
  AIPlan,
  { label: string; price: number; credits: number; emoji: string; kitsPerMonth: number | "unlimited" }
> = {
  starter: { label: "Starter", price: 0, credits: 225, emoji: "🚀", kitsPerMonth: 15 },
  creator: { label: "Creator", price: 19, credits: 750, emoji: "🎨", kitsPerMonth: 50 },
  pro: { label: "Pro", price: 49, credits: 2250, emoji: "⚡", kitsPerMonth: 150 },
  business: { label: "Business", price: 149, credits: -1, emoji: "💎", kitsPerMonth: "unlimited" },
};

export function isUnlimitedPlan(plan: string): boolean {
  return plan === "business";
}

/** Kits restantes aproximados según créditos */
export function kitsRemainingFromCredits(credits: number, plan: string): number | "unlimited" {
  if (plan === "business" || credits < 0) return "unlimited";
  return Math.max(0, Math.floor(credits / 15));
}