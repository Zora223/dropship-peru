import { supabase } from "./supabase";
import type {
  DbOrder,
  DbStore,
  DbStorePaymentMethod,
} from "../types/database";

export interface OrderSuccessData {
  order: DbOrder;
  store: DbStore | null;
  paymentMethod: DbStorePaymentMethod | null;
}

export async function fetchOrderSuccessData(
  orderNumber: string
): Promise<OrderSuccessData | null> {
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (orderError) {
    console.error("Error fetching order success data:", orderError);
    throw orderError;
  }

  if (!orderData) {
    return null;
  }

  const order = orderData as DbOrder;

  const { data: storeData, error: storeError } = await supabase
    .from("stores")
    .select("*")
    .eq("id", order.store_id)
    .maybeSingle();

  if (storeError) {
    console.error("Error fetching order store:", storeError);
  }

  const store = (storeData as DbStore | null) ?? null;

  const paymentMethod =
    store?.payment_methods?.find(
      (method) => method.id === order.payment_method
    ) ?? null;

  return {
    order,
    store,
    paymentMethod,
  };
}