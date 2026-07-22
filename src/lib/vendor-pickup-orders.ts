// src/lib/vendor-pickup-orders.ts
// 🆕 v17 - Gestión de pedidos pickup del vendor
// 🆕 v19 - Agrega markAsReadyForPickup (dispara WhatsApp)
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
 * 🆕 v19 - Marca el pedido como "listo para recoger".
 * Setea pickup_ready_at → dispara trigger WhatsApp al cliente con el código.
 */
export async function markAsReadyForPickup(orderId: string): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({
      pickup_ready_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .is("pickup_ready_at", null); // Solo si no está ya listo

  if (error) throw error;
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