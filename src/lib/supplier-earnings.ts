// src/lib/supplier-earnings.ts
// 🆕 v16 FASE 3 - Ganancias del proveedor
import { supabase } from "./supabase";

// ============================================
// 📋 TIPOS
// ============================================

export type EarningStatus = "pending" | "paid" | "cancelled";

export interface SupplierEarning {
  id: string;
  supplier_id: string;
  supplier_order_id: string;
  order_id: string | null;
  amount: number;
  status: EarningStatus;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_notes: string | null;
  paid_by: string | null;
  created_at: string;
  updated_at: string;

  // Joins
  supplier_order?: {
    id: string;
    product_name: string;
    product_image: string | null;
    quantity: number;
    base_price: number;
    status: string;
    order_id: string;
  } | null;

  order?: {
    id: string;
    order_number: string;
    customer_name: string;
    created_at: string;
  } | null;
}

export interface EarningsStats {
  total_earned: number;
  pending: number;
  paid: number;
  cancelled: number;
  total_orders: number;
  paid_orders: number;
  pending_orders: number;
  this_month_earned: number;
  this_month_pending: number;
}

// ============================================
// 📥 LEER
// ============================================

/**
 * Lista ganancias del proveedor autenticado.
 */
export async function listMyEarnings(filters?: {
  status?: EarningStatus | "all";
  limit?: number;
}): Promise<SupplierEarning[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  let query = supabase
    .from("supplier_earnings")
    .select(
      `
      *,
      supplier_order:supplier_orders!supplier_earnings_supplier_order_id_fkey(
        id,
        product_name,
        product_image,
        quantity,
        base_price,
        status,
        order_id
      ),
      order:orders!supplier_earnings_order_id_fkey(
        id,
        order_number,
        customer_name,
        created_at
      )
    `
    )
    .eq("supplier_id", user.id)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(200);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error listando earnings:", error);
    throw error;
  }

  return (data ?? []) as SupplierEarning[];
}

/**
 * Estadísticas del proveedor autenticado.
 */
export async function getMyEarningsStats(): Promise<EarningsStats> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("supplier_earnings")
    .select("amount, status, created_at, paid_at")
    .eq("supplier_id", user.id);

  if (error) {
    console.error("Error obteniendo stats earnings:", error);
    return {
      total_earned: 0,
      pending: 0,
      paid: 0,
      cancelled: 0,
      total_orders: 0,
      paid_orders: 0,
      pending_orders: 0,
      this_month_earned: 0,
      this_month_pending: 0,
    };
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const paid = data
    .filter((e) => e.status === "paid")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const pending = data
    .filter((e) => e.status === "pending")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const cancelled = data
    .filter((e) => e.status === "cancelled")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const this_month_earned = data
    .filter(
      (e) =>
        e.status === "paid" &&
        e.paid_at &&
        new Date(e.paid_at) >= startOfMonth
    )
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const this_month_pending = data
    .filter(
      (e) =>
        e.status === "pending" && new Date(e.created_at) >= startOfMonth
    )
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return {
    total_earned: paid,
    pending,
    paid,
    cancelled,
    total_orders: data.length,
    paid_orders: data.filter((e) => e.status === "paid").length,
    pending_orders: data.filter((e) => e.status === "pending").length,
    this_month_earned,
    this_month_pending,
  };
}