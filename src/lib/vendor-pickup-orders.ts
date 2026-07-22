// src/lib/vendor-pickup-orders.ts
// 🆕 v17 - Gestión de pedidos pickup del vendor
import { supabase } from "./supabase";

export interface VendorPickupOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  pickup_confirmation_code: string;
  pickup_time_slot: string | null;
  pickup_ready_at: string | null;
  pickup_completed_at: string | null;
  status: string;
  created_at: string;
  items: any[];
}

/**
 * Lista los pedidos pickup activos del vendor (no completados).
 */
export async function listMyPickupOrders(
  storeId: string
): Promise<VendorPickupOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      customer_name,
      customer_phone,
      total,
      pickup_confirmation_code,
      pickup_time_slot,
      pickup_ready_at,
      pickup_completed_at,
      status,
      created_at,
      items
    `
    )
    .eq("store_id", storeId)
    .eq("delivery_mode", "store_pickup")
    .in("status", ["confirmed", "shipped"])
    .is("pickup_completed_at", null)
    .order("pickup_ready_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data || []) as VendorPickupOrder[];
}

/**
 * Marca el pickup como completado (cliente ya recogió).
 * Valida el código de 6 dígitos.
 */
export async function completePickup(
  orderId: string,
  confirmationCode: string
): Promise<void> {
  // Verificar código primero
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("pickup_confirmation_code")
    .eq("id", orderId)
    .single();

  if (fetchError) throw fetchError;
  if (!order) throw new Error("Pedido no encontrado");

  if (order.pickup_confirmation_code !== confirmationCode.trim()) {
    throw new Error("Código incorrecto. Verifica con el cliente.");
  }

  // Marcar completado
  const { error } = await supabase
    .from("orders")
    .update({
      pickup_completed_at: new Date().toISOString(),
      status: "delivered",
    })
    .eq("id", orderId);

  if (error) throw error;
}