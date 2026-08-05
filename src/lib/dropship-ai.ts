// src/lib/dropship-ai.ts
// 🤖 Dropship AI - Client library
import { supabase } from "./supabase";

// ============================================
// TIPOS
// ============================================

export type AIPlan = "starter" | "creator" | "pro" | "business";
export type AIStatus = "trial" | "active" | "expired" | "cancelled";
export type ContentType = "caption" | "hashtags" | "whatsapp" | "email" | "reel_script";
export type Tone = "professional" | "friendly" | "urgent" | "storytelling";
export type Focus = "sales" | "benefits" | "story";
export type Platform = "instagram" | "facebook" | "whatsapp" | "tiktok" | "email";

export interface AISubscription {
  id: string;
  vendor_id: string;
  plan: AIPlan;
  status: AIStatus;
  credits_remaining: number;
  credits_total: number;
  credits_reset_at: string;
  started_at: string;
  expires_at: string | null;
  is_trial: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIGeneration {
  id: string;
  vendor_id: string;
  product_id: string | null;
  content_type: ContentType;
  tone: Tone | null;
  focus: Focus | null;
  platform: Platform | null;
  prompt_data: any;
  result: string;
  tokens_used: number;
  model_used: string;
  created_at: string;
}

export interface AIFavorite {
  id: string;
  vendor_id: string;
  generation_id: string;
  label: string | null;
  created_at: string;
  generation?: AIGeneration;
}

export interface AIPaymentTransaction {
  id: string;
  vendor_id: string;
  plan: AIPlan;
  amount: number;
  payment_method: "yape" | "plin" | "transfer";
  payment_proof_url: string | null;
  status: "pending" | "paid" | "rejected" | "expired";
  valid_from: string | null;
  valid_until: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface GenerateContentInput {
  contentType: ContentType;
  tone?: Tone;
  focus?: Focus;
  platform?: Platform;
  productData: {
    id?: string;
    name: string;
    description: string;
    price: number;
    category: string;
  };
  storeData: {
    name: string;
    city: string;
    phone?: string;
  };
}

export interface GenerateContentResult {
  success: boolean;
  result: string;
  generation_id: string;
  credits_remaining: number;
  credits_total: number;
  plan: AIPlan;
  is_trial: boolean;
}

// ============================================
// PLANES
// ============================================

export const AI_PLANS = {
  starter: {
    id: "starter" as const,
    name: "Starter",
    emoji: "🆓",
    price: 0,
    credits: 10,
    color: "gray",
    features: [
      "10 generaciones/mes",
      "Solo captions básicos",
      "Hashtags básicos",
      "1 tono (amigable)",
    ],
    limits: {
      contentTypes: ["caption", "hashtags"] as ContentType[],
      tones: ["friendly"] as Tone[],
      platforms: ["instagram", "whatsapp"] as Platform[],
    },
  },
  creator: {
    id: "creator" as const,
    name: "Creator",
    emoji: "🎨",
    price: 19,
    credits: 100,
    color: "purple",
    popular: true,
    features: [
      "100 generaciones/mes",
      "Todos los tonos y enfoques",
      "Captions + Hashtags + WhatsApp",
      "Email marketing",
      "Guardar favoritos",
      "Historial completo",
    ],
    limits: {
      contentTypes: ["caption", "hashtags", "whatsapp", "email"] as ContentType[],
      tones: ["professional", "friendly", "urgent", "storytelling"] as Tone[],
      platforms: ["instagram", "facebook", "whatsapp", "tiktok", "email"] as Platform[],
    },
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    emoji: "🚀",
    price: 49,
    credits: 500,
    color: "pink",
    features: [
      "500 generaciones/mes",
      "Todo lo de Creator",
      "Imágenes AI (30/mes)",
      "Videos cortos (5/mes)",
      "Analytics básico",
      "Prioridad en soporte",
    ],
    limits: {
      contentTypes: ["caption", "hashtags", "whatsapp", "email", "reel_script"] as ContentType[],
      tones: ["professional", "friendly", "urgent", "storytelling"] as Tone[],
      platforms: ["instagram", "facebook", "whatsapp", "tiktok", "email"] as Platform[],
    },
  },
  business: {
    id: "business" as const,
    name: "Business",
    emoji: "💎",
    price: 149,
    credits: 999999,
    color: "gradient",
    features: [
      "Generaciones ILIMITADAS",
      "Todo lo de Pro",
      "Auto-publisher",
      "Ad optimizer",
      "Chatbot para tu tienda",
      "Soporte prioritario 24/7",
      "API access",
    ],
    limits: {
      contentTypes: ["caption", "hashtags", "whatsapp", "email", "reel_script"] as ContentType[],
      tones: ["professional", "friendly", "urgent", "storytelling"] as Tone[],
      platforms: ["instagram", "facebook", "whatsapp", "tiktok", "email"] as Platform[],
    },
  },
} as const;

// ============================================
// SUBSCRIPTION
// ============================================

export async function getMySubscription(): Promise<AISubscription | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("ai_subscriptions")
    .select("*")
    .eq("vendor_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching subscription:", error);
    return null;
  }

  // Si no existe, crear una por defecto (trial)
  if (!data) {
    const { data: newSub } = await supabase
      .from("ai_subscriptions")
      .insert({
        vendor_id: user.id,
        plan: "creator",
        status: "trial",
        credits_remaining: 100,
        credits_total: 100,
        is_trial: true,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();
    return newSub as AISubscription;
  }

  return data as AISubscription;
}

// ============================================
// GENERATION
// ============================================

export async function generateContent(
  input: GenerateContentInput
): Promise<GenerateContentResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No estás autenticado");

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-marketing-content`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "Error generando contenido");
  }

  return data as GenerateContentResult;
}

// ============================================
// HISTORIAL
// ============================================

export async function getMyGenerations(limit = 20): Promise<AIGeneration[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("ai_generations")
    .select("*")
    .eq("vendor_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as AIGeneration[];
}

export async function getGenerationsByProduct(productId: string): Promise<AIGeneration[]> {
  const { data, error } = await supabase
    .from("ai_generations")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AIGeneration[];
}

// ============================================
// FAVORITOS
// ============================================

export async function getMyFavorites(): Promise<AIFavorite[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("ai_favorites")
    .select(`
      *,
      generation:ai_generations(*)
    `)
    .eq("vendor_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AIFavorite[];
}

export async function addFavorite(generationId: string, label?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("ai_favorites").insert({
    vendor_id: user.id,
    generation_id: generationId,
    label: label || null,
  });

  if (error) throw error;
}

export async function removeFavorite(favoriteId: string): Promise<void> {
  const { error } = await supabase
    .from("ai_favorites")
    .delete()
    .eq("id", favoriteId);

  if (error) throw error;
}

// ============================================
// PAGOS - Upgrade
// ============================================

export async function requestPlanUpgrade(input: {
  plan: "creator" | "pro" | "business";
  amount: number;
  paymentMethod: "yape" | "plin" | "transfer";
  proofUrl?: string;
}): Promise<AIPaymentTransaction> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("ai_payment_transactions")
    .insert({
      vendor_id: user.id,
      plan: input.plan,
      amount: input.amount,
      payment_method: input.paymentMethod,
      payment_proof_url: input.proofUrl,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data as AIPaymentTransaction;
}

export async function getMyPayments(): Promise<AIPaymentTransaction[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("ai_payment_transactions")
    .select("*")
    .eq("vendor_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AIPaymentTransaction[];
}

// ============================================
// UTILIDADES
// ============================================

export function getPlanInfo(plan: AIPlan) {
  return AI_PLANS[plan];
}

export function canAccessFeature(
  subscription: AISubscription | null,
  feature: {
    contentType?: ContentType;
    tone?: Tone;
    platform?: Platform;
  }
): boolean {
  if (!subscription) return false;
  const plan = AI_PLANS[subscription.plan];

  if (feature.contentType && !plan.limits.contentTypes.includes(feature.contentType)) {
    return false;
  }
  if (feature.tone && !plan.limits.tones.includes(feature.tone)) {
    return false;
  }
  if (feature.platform && !plan.limits.platforms.includes(feature.platform)) {
    return false;
  }
  return true;
}

export function formatCreditsDisplay(remaining: number, total: number): string {
  if (total >= 999999) return `∞ (Ilimitado)`;
  return `${remaining} / ${total}`;
}

export function getDaysUntilReset(resetDate: string): number {
  const now = new Date();
  const reset = new Date(resetDate);
  const diff = reset.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getDaysUntilTrialEnd(expiresAt: string | null): number {
  if (!expiresAt) return 0;
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function parseGeneratedContent(content: string, type: ContentType): string[] {
  // Divide el contenido en variaciones si tiene marcadores "--- VERSIÓN N ---"
  if (type === "caption" || type === "whatsapp") {
    const parts = content.split(/---\s*(?:VERSIÓN|MENSAJE)\s*\d+.*?---/i);
    const cleaned = parts
      .map((p) => p.trim())
      .filter((p) => p.length > 20);
    return cleaned.length > 0 ? cleaned : [content];
  }
  return [content];
}