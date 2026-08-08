import { supabase } from "./supabase";
import { deleteFileByUrl } from "./storage";
import type { DbCatalogProduct } from "../types/database";

// ============================================
// TYPES 🆕 v22.6 (sin suppliers legacy)
// ============================================

/**
 * Catalog product con info del proveedor incluida
 */
export interface CatalogProductWithSupplier extends DbCatalogProduct {
  supplier?: {
    id: string;
    business_name: string;
    logo_url: string | null;
    city: string | null;
    is_verified: boolean;
    rating: number | null;
  } | null;
}

// ============================================
// CATALOG PRODUCTS
// ============================================

/**
 * Trae productos del catálogo con info del proveedor (supplier_profiles)
 */
export async function fetchCatalogProducts(): Promise<
  CatalogProductWithSupplier[]
> {
  const { data, error } = await supabase
    .from("catalog_products")
    .select(
      `
      *,
      supplier:supplier_profiles!catalog_products_supplier_id_fkey(
        id,
        business_name,
        logo_url,
        city,
        is_verified,
        rating
      )
    `
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching catalog:", error);
    throw error;
  }
  return (data ?? []) as CatalogProductWithSupplier[];
}

export interface CreateCatalogProductInput {
  supplier_id: string;
  name: string;
  description: string | null;
  base_price: number;
  suggested_price: number;
  stock: number;
  sku: string;
  category: string;
  images: string[];
  is_active: boolean;
}

export async function createCatalogProduct(
  input: CreateCatalogProductInput
): Promise<DbCatalogProduct> {
  const { data, error } = await supabase
    .from("catalog_products")
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error("Error creating catalog product:", error);
    throw error;
  }
  return data as DbCatalogProduct;
}

export async function updateCatalogProduct(
  id: string,
  updates: Partial<CreateCatalogProductInput>
): Promise<DbCatalogProduct> {
  const { data, error } = await supabase
    .from("catalog_products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating catalog product:", error);
    throw error;
  }
  return data as DbCatalogProduct;
}

/**
 * SOFT DELETE — no borra físicamente
 */
export async function deleteCatalogProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from("catalog_products")
    .update({
      deleted_at: new Date().toISOString(),
      is_active: false,
    })
    .eq("id", id);

  if (error) {
    console.error("Error deleting catalog product:", error);
    throw error;
  }
}

/**
 * HARD DELETE — borra físicamente + limpia imágenes
 * Solo para uso admin cuando quiere limpieza total
 */
export async function hardDeleteCatalogProduct(id: string): Promise<void> {
  // Primero obtener las imágenes para eliminarlas del storage
  const { data: product } = await supabase
    .from("catalog_products")
    .select("images")
    .eq("id", id)
    .single();

  // Eliminar el producto
  const { error } = await supabase
    .from("catalog_products")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error hard-deleting catalog product:", error);
    throw error;
  }

  // Limpiar imágenes huérfanas del storage
  if (product?.images && Array.isArray(product.images)) {
    for (const imageUrl of product.images) {
      try {
        await deleteFileByUrl("product-images", imageUrl);
      } catch (err) {
        console.warn("Could not delete image:", err);
      }
    }
  }
}

export async function toggleCatalogProductActive(
  id: string,
  is_active: boolean
): Promise<void> {
  const { error } = await supabase
    .from("catalog_products")
    .update({ is_active })
    .eq("id", id);
  if (error) throw error;
}