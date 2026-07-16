// src/lib/admin-payments.ts
// Queries para el panel de liquidaciones del admin (Fase 7)
import { supabase } from "./supabase";

// ============================================================
// TIPOS
// ============================================================

export type VendorPaymentStatus = "pending" | "received";
export type DeliveryPaymentStatus = "pending" | "paid";

export interface EarningRow {
  id: string;
  order_id: string;
  delivery_id: string;
  vendor_id: string;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  vendor_payment_status: VendorPaymentStatus;
  vendor_paid_at: string | null;
  vendor_payment_notes: string | null;
  delivery_payment_status: DeliveryPaymentStatus;
  delivery_paid_at: string | null;
  delivery_payment_notes: string | null;
  created_at: string;
  // joins
  order?: {
    order_number: string;
    total: number;
    delivery_delivered_at: string | null;
    customer_name: string;
  };
  vendor?: {
    full_name: string | null;
    email: string;
  };
  delivery?: {
    full_name: string | null;
    email: string;
  };
  delivery_profile?: {
    phone: string | null;
    yape_number: string | null;
  };
}

export interface PaymentsSummary {
  totalToCollect: number; // vendors deben al admin
  totalToPay: number; // admin debe a deliveries
  feesEarnedMonth: number; // fees del mes actual
  deliveriesCompletedMonth: number; // entregas del mes
  pendingVendorCount: number;
  pendingDeliveryCount: number;
}

// El filtro es genérico: "pending" | "done" | "all"
// "done" = vendor: "received" / delivery: "paid"
export type PaymentFilter = "pending" | "done" | "all";

// ============================================================
// SUMMARY / KPIs
// ============================================================

export async function getPaymentsSummary(): Promise<PaymentsSummary> {
  const { data: allEarnings, error } = await supabase
    .from("delivery_earnings")
    .select(
      "gross_amount, net_amount, platform_fee, vendor_payment_status, delivery_payment_status, created_at"
    );

  if (error) throw error;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let totalToCollect = 0;
  let totalToPay = 0;
  let feesEarnedMonth = 0;
  let deliveriesCompletedMonth = 0;
  let pendingVendorCount = 0;
  let pendingDeliveryCount = 0;

  for (const e of allEarnings ?? []) {
    const createdAt = new Date(e.created_at);
    const isThisMonth = createdAt >= startOfMonth;

    // Vendor debe al admin (aún no ha recibido el pago)
    if (e.vendor_payment_status === "pending") {
      totalToCollect += Number(e.gross_amount);
      pendingVendorCount++;
    }

    // Admin debe al delivery (solo si vendor ya pagó = "received")
    if (
      e.delivery_payment_status === "pending" &&
      e.vendor_payment_status === "received"
    ) {
      totalToPay += Number(e.net_amount);
      pendingDeliveryCount++;
    }

    // Fees ganados este mes (ciclo completo)
    if (
      isThisMonth &&
      e.vendor_payment_status === "received" &&
      e.delivery_payment_status === "paid"
    ) {
      feesEarnedMonth += Number(e.platform_fee);
      deliveriesCompletedMonth++;
    }
  }

  return {
    totalToCollect,
    totalToPay,
    feesEarnedMonth,
    deliveriesCompletedMonth,
    pendingVendorCount,
    pendingDeliveryCount,
  };
}

// ============================================================
// LISTAR EARNINGS
// ============================================================

export async function getVendorPayments(
  filter: PaymentFilter = "pending"
): Promise<EarningRow[]> {
  let query = supabase
    .from("delivery_earnings")
    .select(
      `
      *,
      order:orders!delivery_earnings_order_id_fkey (
        order_number, total, delivery_delivered_at, customer_name
      ),
      vendor:profiles!delivery_earnings_vendor_id_fkey (
        full_name, email
      )
    `
    )
    .order("created_at", { ascending: false });

  if (filter === "pending") {
    query = query.eq("vendor_payment_status", "pending");
  } else if (filter === "done") {
    query = query.eq("vendor_payment_status", "received");
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as EarningRow[]) ?? [];
}

export async function getDeliveryPayments(
  filter: PaymentFilter = "pending"
): Promise<EarningRow[]> {
  // Delivery solo cobra cuando vendor ya pagó al admin
  let query = supabase
    .from("delivery_earnings")
    .select(
      `
      *,
      order:orders!delivery_earnings_order_id_fkey (
        order_number, total, delivery_delivered_at, customer_name
      ),
      delivery:profiles!delivery_earnings_delivery_id_fkey (
        full_name, email
      )
    `
    )
    .eq("vendor_payment_status", "received")
    .order("created_at", { ascending: false });

  if (filter === "pending") {
    query = query.eq("delivery_payment_status", "pending");
  } else if (filter === "done") {
    query = query.eq("delivery_payment_status", "paid");
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data as unknown as EarningRow[]) ?? [];
  if (rows.length === 0) return rows;

  // Fetch delivery_profiles por separado (phone + yape)
  const deliveryIds = [...new Set(rows.map((r) => r.delivery_id))];
  const { data: dpData } = await supabase
    .from("delivery_profiles")
    .select("id, phone, yape_number")
    .in("id", deliveryIds);

  const dpMap = new Map(
    (dpData ?? []).map((dp) => [
      dp.id,
      { phone: dp.phone, yape_number: dp.yape_number },
    ])
  );

  return rows.map((r) => ({
    ...r,
    delivery_profile: dpMap.get(r.delivery_id) ?? undefined,
  }));
}

// ============================================================
// MARCAR COMO PAGADO
// ============================================================

export async function markVendorPayment(
  earningId: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from("delivery_earnings")
    .update({
      vendor_payment_status: "received", // constraint acepta "received"
      vendor_paid_at: new Date().toISOString(),
      vendor_payment_notes: notes ?? null,
    })
    .eq("id", earningId);

  if (error) throw error;
}

export async function markDeliveryPayment(
  earningId: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from("delivery_earnings")
    .update({
      delivery_payment_status: "paid",
      delivery_paid_at: new Date().toISOString(),
      delivery_payment_notes: notes ?? null,
    })
    .eq("id", earningId);

  if (error) throw error;
}

// Revertir (por si el admin se equivocó)
export async function revertVendorPayment(earningId: string): Promise<void> {
  const { error } = await supabase
    .from("delivery_earnings")
    .update({
      vendor_payment_status: "pending",
      vendor_paid_at: null,
      vendor_payment_notes: null,
    })
    .eq("id", earningId);

  if (error) throw error;
}

export async function revertDeliveryPayment(earningId: string): Promise<void> {
  const { error } = await supabase
    .from("delivery_earnings")
    .update({
      delivery_payment_status: "pending",
      delivery_paid_at: null,
      delivery_payment_notes: null,
    })
    .eq("id", earningId);

  if (error) throw error;
}