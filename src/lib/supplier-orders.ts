// src/lib/supplier-orders.ts
// 🆕 v16 FASE 3 - Gestión de órdenes del proveedor
// 🔥 v17 FIX: pending_revenue viene de supplier_earnings (real)
// 🔥 v17 FIX: Usa RPC get_supplier_orders_full() para evitar RLS
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

  // Relaciones
  order?: {
    id: string;
    order_number: string;
    customer_name: string | null;
    customer_phone: string | null;
    delivery_mode: string | null;
    delivery_date: string | null;
    delivery_time_slot: string | null;
    shipping_address: any | null;
    pickup_time_slot: string | null;
    status: string;
    created_at: string;
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
 * 🔥 v17: Usa RPC para evitar RLS
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

  // 🔥 Llamar función RPC (bypass RLS)
  const { data, error } = await supabase.rpc("get_supplier_orders_full");

  if (error) {
    console.error("Error listando supplier orders:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Mapear resultado plano a estructura anidada
  let results: SupplierOrder[] = data.map((row: any) => ({
    id: row.id,
    order_id: row.order_id,
    supplier_id: row.supplier_id,
    product_id: row.product_id,
    catalog_product_id: row.catalog_product_id,
    vendor_id: row.vendor_id,
    store_id: row.store_id,
    product_name: row.product_name,
    product_image: row.product_image,
    sku: row.sku,
    quantity: row.quantity,
    base_price: Number(row.base_price),
    total_amount: Number(row.total_amount),
    status: row.status,
    delivery_destination: row.delivery_destination,
    pickup_address: row.pickup_address,
    supplier_notes: row.supplier_notes,
    cancel_reason: row.cancel_reason,
    confirmed_at: row.confirmed_at,
    ready_at: row.ready_at,
    picked_up_at: row.picked_up_at,
    delivered_at: row.delivered_at,
    cancelled_at: row.cancelled_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    order: row.order_id
      ? {
          id: row.order_id,
          order_number: row.order_number,
          customer_name: row.customer_name,
          customer_phone: row.customer_phone,
          delivery_mode: row.delivery_mode,
          delivery_date: row.delivery_date,
          delivery_time_slot: row.delivery_time_slot,
          shipping_address: row.shipping_address,
          pickup_time_slot: row.pickup_time_slot,
          status: row.order_status,
          created_at: row.order_created_at,
        }
      : null,
    vendor: row.vendor_id
      ? {
          id: row.vendor_id,
          full_name: row.vendor_full_name,
          email: row.vendor_email,
          phone: row.vendor_phone,
        }
      : null,
    store: row.store_id
      ? {
          id: row.store_id,
          name: row.store_name,
          slug: row.store_slug,
        }
      : null,
  }));

  // Filtro por status
  if (filters?.status && filters.status !== "all") {
    results = results.filter((o) => o.status === filters.status);
  }

  // Filtro búsqueda
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

  // Límite
  if (filters?.limit) {
    results = results.slice(0, filters.limit);
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

  // 1️⃣ Stats de órdenes
  const { data: ordersData, error: ordersError } = await supabase
    .from("supplier_orders")
    .select("status, total_amount")
    .eq("supplier_id", user.id);

  if (ordersError) {
    console.error("Error obteniendo stats:", ordersError);
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

  const total = ordersData.length;
  const pending = ordersData.filter((o) => o.status === "pending").length;
  const confirmed = ordersData.filter(
    (o) => o.status === "confirmed" || o.status === "preparing"
  ).length;
  const ready = ordersData.filter(
    (o) => o.status === "ready_for_pickup" || o.status === "picked_up"
  ).length;
  const delivered = ordersData.filter((o) => o.status === "delivered").length;
  const cancelled = ordersData.filter(
    (o) => o.status === "cancelled" || o.status === "out_of_stock"
  ).length;

  // 2️⃣ Revenue desde supplier_earnings (dinero real)
  const { data: earningsData } = await supabase
    .from("supplier_earnings")
    .select("amount, status")
    .eq("supplier_id", user.id);

  const total_revenue =
    earningsData
      ?.filter((e) => e.status === "paid")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;

  const pending_revenue =
    earningsData
      ?.filter((e) => e.status === "pending")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;

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