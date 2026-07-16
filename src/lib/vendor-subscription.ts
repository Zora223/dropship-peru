import type { DbStore } from "../types/database";

export type SubscriptionUrgency =
  | "healthy" // > 7 días
  | "notice" // 4-7 días
  | "warning" // 1-3 días
  | "expired" // 0 o menos
  | "active" // suscripción pagada
  | "unknown"; // no hay fecha

export interface SubscriptionState {
  status: string;
  trialEndsAt: string | null;
  daysLeft: number | null;
  urgency: SubscriptionUrgency;
  isTrial: boolean;
  isExpired: boolean;
}

/**
 * Calcula el estado de suscripción de una tienda.
 * Se calcula en el cliente para evitar llamadas extra a Supabase.
 */
export function getSubscriptionState(
  store: Pick<DbStore, "subscription_status" | "trial_ends_at">
): SubscriptionState {
  const status = store.subscription_status ?? "trial";
  const trialEndsAt = store.trial_ends_at ?? null;

  // Suscripción activa: no mostramos banner de urgencia
  if (status === "active") {
    return {
      status,
      trialEndsAt,
      daysLeft: null,
      urgency: "active",
      isTrial: false,
      isExpired: false,
    };
  }

  // Sin fecha configurada (raro, pero por seguridad)
  if (!trialEndsAt) {
    return {
      status,
      trialEndsAt: null,
      daysLeft: null,
      urgency: "unknown",
      isTrial: status === "trial",
      isExpired: status === "expired",
    };
  }

  const now = new Date();
  const end = new Date(trialEndsAt);
  const msDiff = end.getTime() - now.getTime();
  const daysLeft = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

  let urgency: SubscriptionUrgency;
  if (daysLeft <= 0) urgency = "expired";
  else if (daysLeft <= 3) urgency = "warning";
  else if (daysLeft <= 7) urgency = "notice";
  else urgency = "healthy";

  return {
    status,
    trialEndsAt,
    daysLeft,
    urgency,
    isTrial: status === "trial",
    isExpired: daysLeft <= 0 || status === "expired",
  };
}