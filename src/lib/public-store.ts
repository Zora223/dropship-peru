// src/lib/public-store.ts
// 🆕 v22.20 - Soporte tallas (sizes)

import { supabase } from "./supabase";
import type { DbStore, DbProduct } from "../types/database";

export interface PublicStoreProduct extends DbProduct {
  real_stock: number;
  avg_rating: number;
  review_count: number;
  colors: string[];
  sizes: string[]; // 🆕 v22.20
}

export async function fetchPublicStoreBySlug(
  slug: string
): Promise<DbStore | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching public store:", error);
    throw error;
  }

  return data as DbStore | null;
}

export async function fetchPublicStoreById(
  storeId: string
): Promise<DbStore | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching public store by id:", error);
    throw error;
  }

  return data as DbStore | null;
}

export async function fetchPublicStoreProducts(
  storeId: string
): Promise<PublicStoreProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      catalog:catalog_products!products_catalog_product_id_fkey(stock, is_active, colors, sizes)
    `)
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching public products:", error);
    throw error;
  }

  if (!data) return [];

  return data
    .map((product) => {
      const catalog = (
        product as unknown as {
          catalog: {
            stock: number;
            is_active: boolean;
            colors: string[] | null;
            sizes: string[] | null;
          } | null;
        }
      ).catalog;

      if (product.source === "catalog" && catalog && !catalog.is_active) {
        return null;
      }

      const real_stock =
        product.source === "catalog" && catalog
          ? catalog.stock
          : product.stock;

      // Priorizar colores/tallas del catálogo si es producto de catálogo
      const colors: string[] =
        product.source === "catalog" && catalog?.colors
          ? catalog.colors
          : ((product as any).colors ?? []);

      const sizes: string[] =
        product.source === "catalog" && catalog?.sizes
          ? catalog.sizes
          : ((product as any).sizes ?? []);

      const avg_rating = Number((product as any).avg_rating) || 0;
      const review_count = Number((product as any).review_count) || 0;

      return {
        ...(product as DbProduct),
        real_stock,
        avg_rating,
        review_count,
        colors,
        sizes,
      } as PublicStoreProduct;
    })
    .filter((product): product is PublicStoreProduct => product !== null);
}