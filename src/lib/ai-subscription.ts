// src/lib/ai-subscription.ts
// 🤖 Cliente para la suscripción de AI del vendor

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

/**
 * Obtiene la suscripción AI del vendor autenticado.
 * Si no existe, retorna null (el vendor no ha activado ningún plan).
 */
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
 * Info visual de cada plan (para UI)
 */
export const AI_PLANS_INFO: Record<
  AIPlan,
  { label: string; price: number; credits: number; emoji: string }
> = {
  starter: { label: "Starter", price: 0, credits: 10, emoji: "🆓" },
  creator: { label: "Creator", price: 19, credits: 100, emoji: "🎨" },
  pro: { label: "Pro", price: 49, credits: 500, emoji: "🚀" },
  business: { label: "Business", price: 149, credits: -1, emoji: "💎" }, // -1 = ilimitado
};

export function isUnlimitedPlan(plan: string): boolean {
  return plan === "business";
}