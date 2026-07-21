// src/lib/supplier-orders.ts
// 🆕 v16 FASE 3 - Gestión de órdenes del proveedor
import { supabase } from "./supabase";

// ============================================
// 📋 TIPOS
// ============================================

export type SupplierOrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "picked_up"
  | "delivered"
  | "cancelled"
  | "out_of_stock";

export type DeliveryDestination = "customer_direct" | "vendor_store";

export interface SupplierOrder {
  id: string;
  order_id: string;
  supplier_id: string;
  product_id: string | null;
  catalog_product_id: string | null;
  vendor_id: string | null;
  store_id: string | null;

  product_name: string;
  product_image: string | null;
  sku: string | null;
  quantity: number;
  base_price: number;
  total_amount: number;

  status: SupplierOrderStatus;
  delivery_destination: DeliveryDestination;
  pickup_address: any | null;
  supplier_notes: string | null;
  cancel_reason: string | null;

  confirmed_at: string | null;
  ready_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;

  created_at: string;
  updated_at: string;

  // Relaciones (joins)
  order?: {
    id: string;
    order_number: string;
    customer_name: string;
    customer_phone: string;
    delivery_mode: string;
    delivery_date: string | null;
    delivery_time_slot: string | null;
    shipping_address: any | null;
    pickup_time_slot: string | null;
    status: string;
  } | null;

  vendor?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  } | null;

  store?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface SupplierOrderStats {
  total: number;
  pending: number;
  confirmed: number;
  ready: number;
  delivered: number;
  cancelled: number;
  total_revenue: number;
  pending_revenue: number;
}

// ============================================
// 📥 LEER
// ============================================

/**
 * Lista órdenes del proveedor autenticado.
 */
export async function listMySupplierOrders(filters?: {
  status?: SupplierOrderStatus | "all";
  search?: string;
  limit?: number;
}): Promise<SupplierOrder[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  let query = supabase
    .from("supplier_orders")
    .select(
      `
      *,
      order:orders!supplier_orders_order_id_fkey(
        id,
        order_number,
        customer_name,
        customer_phone,
        delivery_mode,
        delivery_date,
        delivery_time_slot,
        shipping_address,
        pickup_time_slot,
        status
      ),
      vendor:profiles!supplier_orders_vendor_id_fkey(
        id,
        full_name,
        email,
        phone
      ),
      store:stores!supplier_orders_store_id_fkey(
        id,
        name,
        slug
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
    query = query.limit(100);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error listando supplier orders:", error);
    throw error;
  }

  let results = (data ?? []) as SupplierOrder[];

  if (filters?.search) {
    const search = filters.search.toLowerCase().trim();
    results = results.filter(
      (o) =>
        o.order?.order_number?.toLowerCase().includes(search) ||
        o.product_name?.toLowerCase().includes(search) ||
        o.order?.customer_name?.toLowerCase().includes(search) ||
        o.store?.name?.toLowerCase().includes(search)
    );
  }

  return results;
}

/**
 * Obtiene estadísticas de las órdenes del proveedor.
 */
export async function getMySupplierStats(): Promise<SupplierOrderStats> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("supplier_orders")
    .select("status, total_amount")
    .eq("supplier_id", user.id);

  if (error) {
    console.error("Error obteniendo stats:", error);
    return {
      total: 0,
      pending: 0,
      confirmed: 0,
      ready: 0,
      delivered: 0,
      cancelled: 0,
      total_revenue: 0,
      pending_revenue: 0,
    };
  }

  const total = data.length;
  const pending = data.filter((o) => o.status === "pending").length;
  const confirmed = data.filter(
    (o) => o.status === "confirmed" || o.status === "preparing"
  ).length;
  const ready = data.filter(
    (o) => o.status === "ready_for_pickup" || o.status === "picked_up"
  ).length;
  const delivered = data.filter((o) => o.status === "delivered").length;
  const cancelled = data.filter(
    (o) => o.status === "cancelled" || o.status === "out_of_stock"
  ).length;

  const total_revenue = data
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const pending_revenue = data
    .filter(
      (o) =>
        o.status !== "delivered" &&
        o.status !== "cancelled" &&
        o.status !== "out_of_stock"
    )
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  return {
    total,
    pending,
    confirmed,
    ready,
    delivered,
    cancelled,
    total_revenue,
    pending_revenue,
  };
}

// ============================================
// ✏️ ACCIONES
// ============================================

/**
 * Confirma el stock del pedido → pasa a 'confirmed'
 */
export async function confirmSupplierOrder(
  supplierOrderId: string
): Promise<void> {
  const { error } = await supabase
    .from("supplier_orders")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", supplierOrderId);

  if (error) throw error;
}

/**
 * Marca como "preparando"
 */
export async function markAsPreparing(
  supplierOrderId: string
): Promise<void> {
  const { error } = await supabase
    .from("supplier_orders")
    .update({ status: "preparing" })
    .eq("id", supplierOrderId);

  if (error) throw error;
}

/**
 * Marca como listo para que delivery recoja.
 */
export async function markAsReadyForPickup(
  supplierOrderId: string
): Promise<void> {
  const { error } = await supabase
    .from("supplier_orders")
    .update({
      status: "ready_for_pickup",
      ready_at: new Date().toISOString(),
    })
    .eq("id", supplierOrderId);

  if (error) throw error;
}

/**
 * Marca como sin stock (con motivo).
 */
export async function markAsOutOfStock(
  supplierOrderId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from("supplier_orders")
    .update({
      status: "out_of_stock",
      cancel_reason: reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", supplierOrderId);

  if (error) throw error;
}

/**
 * Agrega/actualiza notas del proveedor.
 */
export async function updateSupplierNotes(
  supplierOrderId: string,
  notes: string
): Promise<void> {
  const { error } = await supabase
    .from("supplier_orders")
    .update({ supplier_notes: notes })
    .eq("id", supplierOrderId);

  if (error) throw error;
}