import { supabase } from "./supabase";
import type { DbStore } from "../types/database";

export interface StoreWithStats extends DbStore {
  owner_name: string | null;
  owner_email: string;
  products_count: number;
  orders_count: number;
  total_sales: number;
}

export async function fetchAllStoresWithStats(): Promise<StoreWithStats[]> {
  const { data: stores, error } = await supabase
    .from("stores")
    .select(`
      *,
      owner:profiles!stores_owner_id_fkey(full_name, email)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching stores:", error);
    throw error;
  }

  if (!stores || stores.length === 0) return [];

  const storeIds = stores.map((s) => s.id);

  const [productsRes, ordersRes] = await Promise.all([
    supabase.from("products").select("store_id").in("store_id", storeIds),
    supabase.from("orders").select("store_id, total").in("store_id", storeIds),
  ]);

  const productCounts = new Map<string, number>();
  productsRes.data?.forEach((p) => {
    productCounts.set(p.store_id, (productCounts.get(p.store_id) ?? 0) + 1);
  });

  const orderStats = new Map<string, { count: number; total: number }>();
  ordersRes.data?.forEach((o) => {
    const current = orderStats.get(o.store_id) ?? { count: 0, total: 0 };
    orderStats.set(o.store_id, {
      count: current.count + 1,
      total: current.total + Number(o.total),
    });
  });

  return stores.map((store) => {
    const owner = (store as unknown as { owner: { full_name: string | null; email: string } | null }).owner;
    const stats = orderStats.get(store.id) ?? { count: 0, total: 0 };
    return {
      ...(store as DbStore),
      owner_name: owner?.full_name ?? null,
      owner_email: owner?.email ?? "—",
      products_count: productCounts.get(store.id) ?? 0,
      orders_count: stats.count,
      total_sales: stats.total,
    } as StoreWithStats;
  });
}

export async function toggleStoreActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase
    .from("stores")
    .update({ is_active })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteStore(id: string): Promise<void> {
  const { error } = await supabase.from("stores").delete().eq("id", id);
  if (error) throw error;
}