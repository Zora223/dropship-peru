import { supabase } from "./supabase";
import type { DbOrder, OrderStatus } from "../types/database";

export async function fetchVendorOrders(storeId: string): Promise<DbOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching vendor orders:", error);
    throw error;
  }

  return (data ?? []) as DbOrder[];
}

export async function updateVendorOrderStatus(
  storeId: string,
  orderId: string,
  status: OrderStatus,
  trackingNumber?: string | null
): Promise<DbOrder> {
  const payload: {
    status: OrderStatus;
    updated_at: string;
    tracking_number?: string | null;
  } = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (trackingNumber !== undefined) {
    payload.tracking_number = trackingNumber;
  }

  const { data, error } = await supabase
    .from("orders")
    .update(payload)
    .eq("id", orderId)
    .eq("store_id", storeId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating vendor order:", error);
    throw error;
  }

  return data as DbOrder;
}