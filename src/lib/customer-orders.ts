import { supabase } from "./supabase";
import type { DbOrder, DbStore } from "../types/database";

export interface CustomerOrderWithStore extends DbOrder {
  store: Pick<DbStore, "id" | "name" | "slug" | "logo_url"> | null;
}

export async function fetchMyCustomerOrders(): Promise<CustomerOrderWithStore[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      store:stores(
        id,
        name,
        slug,
        logo_url
      )
    `)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customer orders:", error);
    throw error;
  }

  return (data ?? []) as CustomerOrderWithStore[];
}

export async function fetchMyCustomerFavoritesCount(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  const { count, error } = await supabase
    .from("customer_favorites")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", user.id);

  if (error) {
    console.error("Error fetching favorites count:", error);
    throw error;
  }

  return count ?? 0;
}