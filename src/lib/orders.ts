import { supabase } from "./supabase";
import type { DbOrder, OrderStatus } from "../types/database";

// Definimos qué forma tiene cada ítem dentro del JSONB de la orden
export interface OrderItemSnapshot {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface OrderWithStore extends Omit<DbOrder, 'items'> {
  items: OrderItemSnapshot[]; // <--- Forzamos a TS a saber que esto es un Array
  store_name: string;
  store_slug: string;
  vendor_name: string | null;
}

export async function fetchAllOrders(): Promise<OrderWithStore[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      store:stores!orders_store_id_fkey(
        name,
        slug,
        owner:profiles!stores_owner_id_fkey(full_name)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching orders:", error.message);
    throw error;
  }

  if (!data) return [];

  return data.map((rawOrder: any) => {
    // 1. Separamos 'store' del resto de propiedades de la orden
    const { store, ...orderData } = rawOrder;

    return {
      ...orderData,
      store_name: store?.name ?? "Tienda eliminada",
      store_slug: store?.slug ?? "",
      vendor_name: store?.owner?.full_name ?? "Sin dueño",
    } as OrderWithStore;
  });
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw error;
}