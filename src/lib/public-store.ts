import { supabase } from "./supabase";
import type { DbStore, DbProduct } from "../types/database";

export interface PublicStoreProduct extends DbProduct {
  /**
   * Stock real:
   * - Para "catalog": viene del admin
   * - Para "own": viene del vendor
   */
  real_stock: number;

  /**
   * Rating promedio del producto (0-5)
   * Se actualiza automáticamente vía trigger cuando se aprueba/rechaza una reseña.
   */
  avg_rating: number;

  /**
   * Cantidad de reseñas aprobadas del producto.
   */
  review_count: number;
}

/**
 * Carga una tienda pública por su slug.
 * Solo retorna tiendas ACTIVAS.
 */
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

/**
 * Carga una tienda pública por ID.
 * Solo retorna tiendas ACTIVAS.
 * Se usa especialmente en checkout/payment porque el carrito guarda storeId.
 */
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

/**
 * Carga los productos públicos de una tienda.
 * - Solo productos activos
 * - Para "catalog": filtra los desactivados por el admin y trae el stock real
 * - Para "own": el stock viene del propio producto
 * - Incluye avg_rating y review_count para el badge de reseñas
 */
export async function fetchPublicStoreProducts(
  storeId: string
): Promise<PublicStoreProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      catalog:catalog_products!products_catalog_product_id_fkey(stock, is_active)
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
          catalog: { stock: number; is_active: boolean } | null;
        }
      ).catalog;

      // Si el producto viene del catálogo pero está desactivado, no lo mostramos
      if (product.source === "catalog" && catalog && !catalog.is_active) {
        return null;
      }

      const real_stock =
        product.source === "catalog" && catalog
          ? catalog.stock
          : product.stock;

      // Rating (viene del trigger que actualiza estas columnas)
      const avg_rating = Number((product as any).avg_rating) || 0;
      const review_count = Number((product as any).review_count) || 0;

      return {
        ...(product as DbProduct),
        real_stock,
        avg_rating,
        review_count,
      } as PublicStoreProduct;
    })
    .filter((product): product is PublicStoreProduct => product !== null);
}