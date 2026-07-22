// src/lib/admin-supplier-payouts.ts
// 🆕 v19 - Gestión de liquidaciones a suppliers (Admin)
import { supabase } from "./supabase";

export interface SupplierPayout {
  id: string;
  supplier_id: string;
  supplier_order_id: string;
  order_id: string;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_notes: string | null;
  paid_by: string | null;
  created_at: string;
  // Datos enriquecidos
  supplier_name?: string;
  supplier_phone?: string;
  order_number?: string;
  customer_name?: string;
}

export type PayoutStatus = "pending" | "paid" | "all";
export type PaymentMethod = "yape" | "plin" | "transfer" | "cash" | "other";

/**
 * Lista liquidaciones filtradas por estado.
 * Usa RPC para bypass RLS de profiles.
 */
export async function listSupplierPayouts(
  status: PayoutStatus = "pending"
): Promise<SupplierPayout[]> {
  let query = supabase
    .from("supplier_earnings")
    .select(
      `
      id,
      supplier_id,
      supplier_order_id,
      order_id,
      amount,
      status,
      paid_at,
      payment_method,
      payment_reference,
      payment_notes,
      paid_by,
      created_at
    `
    )
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Enriquecer con datos supplier + order
  const supplierIds = [...new Set(data.map((d) => d.supplier_id))];
  const orderIds = [...new Set(data.map((d) => d.order_id))];

  const [suppliersRes, ordersRes] = await Promise.all([
    supabase
      .from("supplier_profiles")
      .select("id, business_name, phone")
      .in("id", supplierIds),
    supabase
      .from("orders")
      .select("id, order_number, customer_name")
      .in("id", orderIds),
  ]);

  const suppliersMap = new Map(
    (suppliersRes.data ?? []).map((s) => [s.id, s])
  );
  const ordersMap = new Map((ordersRes.data ?? []).map((o) => [o.id, o]));

  return data.map((d) => {
    const supplier = suppliersMap.get(d.supplier_id);
    const order = ordersMap.get(d.order_id);
    return {
      ...d,
      supplier_name: supplier?.business_name ?? "—",
      supplier_phone: supplier?.phone ?? "",
      order_number: order?.order_number ?? "—",
      customer_name: order?.customer_name ?? "—",
    } as SupplierPayout;
  });
}

/**
 * Marca una liquidación como pagada.
 */
export async function markPayoutAsPaid(
  payoutId: string,
  data: {
    payment_method: PaymentMethod;
    payment_reference: string;
    payment_notes?: string;
  }
): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("supplier_earnings")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_method: data.payment_method,
      payment_reference: data.payment_reference.trim(),
      payment_notes: data.payment_notes?.trim() || null,
      paid_by: user.user.id,
    })
    .eq("id", payoutId)
    .eq("status", "pending"); // Solo si sigue pendiente

  if (error) throw error;
}

/**
 * Stats generales de payouts.
 */
export async function getPayoutStats(): Promise<{
  pending_count: number;
  pending_amount: number;
  paid_count: number;
  paid_amount: number;
}> {
  const { data, error } = await supabase
    .from("supplier_earnings")
    .select("amount, status");

  if (error) throw error;

  const stats = {
    pending_count: 0,
    pending_amount: 0,
    paid_count: 0,
    paid_amount: 0,
  };

  (data ?? []).forEach((row) => {
    if (row.status === "pending") {
      stats.pending_count++;
      stats.pending_amount += Number(row.amount);
    } else if (row.status === "paid") {
      stats.paid_count++;
      stats.paid_amount += Number(row.amount);
    }
  });

  return stats;
}