// src/lib/whatsapp-logs.ts
// Cliente para gestionar logs de WhatsApp (admin)
import { supabase } from "./supabase";

// ============================================
// 📋 TIPOS
// ============================================

export type WhatsappLogStatus = "pending" | "sent" | "failed";
export type WhatsappRecipient = "customer" | "vendor" | "delivery";

export interface WhatsappLog {
  id: string;
  event_key: string;
  order_id: string | null;
  recipient_type: WhatsappRecipient;
  recipient_phone: string;
  recipient_name: string | null;
  message_sent: string;
  status: WhatsappLogStatus;
  error_message: string | null;
  bot_message_id: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface WhatsappLogsFilters {
  status?: WhatsappLogStatus | null;
  event_key?: string | null;
  recipient_type?: WhatsappRecipient | null;
  search?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  limit?: number;
}

export interface WhatsappLogsSummary {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  today: number;
}

// ============================================
// 📥 LEER LOGS
// ============================================

export async function getWhatsappLogs(
  filters: WhatsappLogsFilters = {}
): Promise<WhatsappLog[]> {
  let query = supabase
    .from("whatsapp_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.event_key) {
    query = query.eq("event_key", filters.event_key);
  }

  if (filters.recipient_type) {
    query = query.eq("recipient_type", filters.recipient_type);
  }

  if (filters.date_from) {
    query = query.gte("created_at", filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte("created_at", filters.date_to);
  }

  if (filters.search && filters.search.trim().length > 0) {
    const s = filters.search.trim();
    query = query.or(
      `recipient_phone.ilike.%${s}%,recipient_name.ilike.%${s}%,event_key.ilike.%${s}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as WhatsappLog[];
}

// ============================================
// 📊 RESUMEN
// ============================================

export async function getWhatsappLogsSummary(): Promise<WhatsappLogsSummary> {
  const { data, error } = await supabase
    .from("whatsapp_logs")
    .select("status, created_at");

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return {
    total:   rows.length,
    sent:    rows.filter((r) => r.status === "sent").length,
    failed:  rows.filter((r) => r.status === "failed").length,
    pending: rows.filter((r) => r.status === "pending").length,
    today:   rows.filter((r) => r.created_at?.startsWith(today)).length,
  };
}

// ============================================
// 🔁 REINTENTAR
// ============================================

/**
 * Reintenta enviar un mensaje fallido llamando a la Edge Function.
 */
export async function retryWhatsappLog(logId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // 1. Obtener el log original
  const { data: log, error: logErr } = await supabase
    .from("whatsapp_logs")
    .select("*")
    .eq("id", logId)
    .maybeSingle();

  if (logErr || !log) {
    return { success: false, error: "Log no encontrado" };
  }

  // 2. Llamar a la Edge Function
  const { data, error } = await supabase.functions.invoke(
    "send-whatsapp-event",
    {
      body: {
        event_key: log.event_key,
        order_id:  log.order_id,
        variables: {
          recipient_phone: log.recipient_phone,
          recipient_name:  log.recipient_name,
        },
      },
    }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data?.success) {
    return { success: false, error: data?.error ?? "Error desconocido" };
  }

  return { success: true };
}

// ============================================
// 🏷️ HELPERS UI
// ============================================

export function getStatusLabel(status: WhatsappLogStatus): string {
  const labels: Record<WhatsappLogStatus, string> = {
    sent:    "✅ Enviado",
    failed:  "❌ Falló",
    pending: "⏳ Pendiente",
  };
  return labels[status] ?? status;
}

export function getStatusColor(status: WhatsappLogStatus): string {
  const colors: Record<WhatsappLogStatus, string> = {
    sent:    "bg-emerald-100 text-emerald-700 border-emerald-200",
    failed:  "bg-rose-100 text-rose-700 border-rose-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
  };
  return colors[status] ?? "bg-gray-100 text-gray-700";
}

export function getRecipientLabel(type: WhatsappRecipient): string {
  const labels: Record<WhatsappRecipient, string> = {
    customer: "👤 Cliente",
    vendor:   "🏪 Vendedor",
    delivery: "🛵 Delivery",
  };
  return labels[type] ?? type;
}

export function getRecipientColor(type: WhatsappRecipient): string {
  const colors: Record<WhatsappRecipient, string> = {
    customer: "bg-blue-100 text-blue-700",
    vendor:   "bg-rose-100 text-rose-700",
    delivery: "bg-emerald-100 text-emerald-700",
  };
  return colors[type] ?? "bg-gray-100 text-gray-700";
}

export function getEventLabel(eventKey: string): string {
  const labels: Record<string, string> = {
    order_created_customer:          "🆕 Pedido creado",
    delivery_assigned_customer:      "🛵 Delivery asignado (cliente)",
    delivery_assigned_delivery:      "🛵 Delivery asignado (repartidor)",
    order_picked_up_customer:        "📦 Pedido recogido",
    order_delivered_customer:        "✅ Pedido entregado (cliente)",
    order_delivered_vendor:          "✅ Pedido entregado (vendor)",
    vendor_payment_received_vendor:  "💰 Pago recibido",
  };
  return labels[eventKey] ?? eventKey;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-PE", {
    year:   "numeric",
    month:  "short",
    day:    "2-digit",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string): string {
  const now  = new Date();
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHrs / 24);

  if (diffMin < 1)   return "hace segundos";
  if (diffMin < 60)  return `hace ${diffMin} min`;
  if (diffHrs < 24)  return `hace ${diffHrs} h`;
  if (diffDay < 30)  return `hace ${diffDay} d`;
  return formatDateTime(iso);
}