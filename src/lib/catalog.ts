import { supabase } from "./supabase";
import { deleteFileByUrl } from "./storage";
import type { DbCatalogProduct, DbSupplier } from "../types/database";

// ============================================
// CATALOG PRODUCTS
// ============================================

export async function fetchCatalogProducts(): Promise<DbCatalogProduct[]> {
  const { data, error } = await supabase
    .from("catalog_products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching catalog:", error);
    throw error;
  }
  return data ?? [];
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

export async function deleteCatalogProduct(id: string): Promise<void> {
  // Primero obtener las imágenes para eliminarlas del storage
  const { data: product } = await supabase
    .from("catalog_products")
    .select("images")
    .eq("id", id)
    .single();

  // Eliminar el producto
  const { error } = await supabase.from("catalog_products").delete().eq("id", id);
  if (error) {
    console.error("Error deleting catalog product:", error);
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

// ============================================
// SUPPLIERS (auxiliar, para el select del form)
// ============================================

export async function fetchSuppliers(): Promise<DbSupplier[]> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching suppliers:", error);
    throw error;
  }
  return data ?? [];
}