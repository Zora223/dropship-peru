import { supabase } from "./supabase";
import type { DbCustomerFavorite, DbProduct, DbStore } from "../types/database";

export interface FavoriteProductStore
  extends Pick<DbStore, "id" | "name" | "slug" | "logo_url" | "is_active"> {}

export interface FavoriteProduct extends DbProduct {
  store: FavoriteProductStore | null;
}

export interface CustomerFavoriteWithProduct extends DbCustomerFavorite {
  product: FavoriteProduct | null;
}

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  return user.id;
}

export async function fetchMyCustomerFavorites(): Promise<
  CustomerFavoriteWithProduct[]
> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("customer_favorites")
    .select(`
      *,
      product:products(
        *,
        store:stores(
          id,
          name,
          slug,
          logo_url,
          is_active
        )
      )
    `)
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customer favorites:", error);
    throw error;
  }

  return (data ?? []) as CustomerFavoriteWithProduct[];
}

export async function isMyFavorite(productId: string): Promise<boolean> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("customer_favorites")
    .select("id")
    .eq("customer_id", userId)
    .eq("product_id", productId)
    .maybeSingle();

  if (error) {
    console.error("Error checking favorite:", error);
    throw error;
  }

  return Boolean(data);
}

export async function addMyCustomerFavorite(
  productId: string
): Promise<DbCustomerFavorite> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("customer_favorites")
    .insert({
      customer_id: userId,
      product_id: productId,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Este producto ya está en favoritos.");
    }

    console.error("Error adding customer favorite:", error);
    throw error;
  }

  return data as DbCustomerFavorite;
}

export async function removeMyCustomerFavorite(productId: string): Promise<void> {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from("customer_favorites")
    .delete()
    .eq("customer_id", userId)
    .eq("product_id", productId);

  if (error) {
    console.error("Error removing customer favorite:", error);
    throw error;
  }
}

export async function removeMyCustomerFavoriteById(
  favoriteId: string
): Promise<void> {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from("customer_favorites")
    .delete()
    .eq("id", favoriteId)
    .eq("customer_id", userId);

  if (error) {
    console.error("Error removing customer favorite by id:", error);
    throw error;
  }
}

export async function toggleMyCustomerFavorite(
  productId: string
): Promise<boolean> {
  const exists = await isMyFavorite(productId);

  if (exists) {
    await removeMyCustomerFavorite(productId);
    return false;
  }

  await addMyCustomerFavorite(productId);
  return true;
}