// src/lib/vendor-products.ts
// 🆕 v22.13 - Soporte colores unificado (text[])

import { supabase } from "./supabase";
import { uploadMultipleFiles, deleteFileByUrl } from "./storage";
import type { DbProduct, ProductSource } from "../types/database";

export interface VendorProductWithRealStock extends DbProduct {
  real_stock: number;
  catalog_inactive: boolean;
  base_price?: number;
  suggested_price?: number;
  colors?: string[]; // 🆕 v22.13
}

/**
 * Lista TODOS los productos de la tienda del vendor.
 * 🆕 v22.13 - Trae colores del catálogo también
 */
export async function fetchMyProducts(storeId: string): Promise<VendorProductWithRealStock[]> {
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      catalog:catalog_products!products_catalog_product_id_fkey(stock, is_active, base_price, suggested_price, colors)
    `)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map((p) => {
    const catalog = (p as unknown as {
      catalog: {
        stock: number;
        is_active: boolean;
        base_price: number;
        suggested_price: number;
        colors: string[] | null;
      } | null;
    }).catalog;

    const real_stock = p.source === "catalog" && catalog ? catalog.stock : p.stock;
    const catalog_inactive = p.source === "catalog" && catalog ? !catalog.is_active : false;

    // 🆕 Si es catálogo, priorizar colores del catálogo (fuente única)
    const colors = p.source === "catalog" && catalog?.colors
      ? catalog.colors
      : ((p as any).colors ?? []);

    return {
      ...(p as DbProduct),
      real_stock,
      catalog_inactive,
      base_price: catalog?.base_price,
      suggested_price: catalog?.suggested_price,
      colors,
    } as VendorProductWithRealStock;
  });
}

/**
 * Importa un producto del catálogo a la tienda del vendor.
 * 🆕 v22.13 - Copia los colores del catálogo
 */
export interface ImportCatalogProductInput {
  storeId: string;
  catalogProductId: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  sku: string | null;
  category: string | null;
  images: string[];
  colors?: string[]; // 🆕 v22.13
}

export async function importCatalogProduct(
  input: ImportCatalogProductInput
): Promise<DbProduct> {
  const { data, error } = await supabase
    .from("products")
    .insert({
      store_id: input.storeId,
      source: "catalog" as ProductSource,
      catalog_product_id: input.catalogProductId,
      name: input.name,
      description: input.description,
      price: input.price,
      compare_at_price: null,
      stock: input.stock,
      sku: input.sku,
      category: input.category,
      images: input.images,
      colors: input.colors ?? [], // 🆕 v22.13
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error importing product:", error);
    throw error;
  }
  return data as DbProduct;
}

export async function isProductImported(
  storeId: string,
  catalogProductId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .eq("catalog_product_id", catalogProductId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

export async function fetchImportedCatalogIds(storeId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("products")
    .select("catalog_product_id")
    .eq("store_id", storeId)
    .eq("source", "catalog")
    .not("catalog_product_id", "is", null);

  if (error) throw error;
  return new Set((data ?? []).map((p) => p.catalog_product_id as string));
}

/**
 * Crea un producto PROPIO del vendor.
 * 🆕 v22.13 - colors como string[]
 */
export interface CreateOwnProductInput {
  storeId: string;
  name: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  sku: string | null;
  category: string | null;
  is_active: boolean;
  featured: boolean;
  images: string[];
  colors?: string[]; // 🆕 v22.13 - string[] en vez de objetos
}

export async function createOwnProduct(input: CreateOwnProductInput): Promise<DbProduct> {
  const { data, error } = await supabase
    .from("products")
    .insert({
      store_id: input.storeId,
      source: "own" as ProductSource,
      catalog_product_id: null,
      name: input.name,
      description: input.description,
      price: input.price,
      compare_at_price: input.compare_at_price,
      stock: input.stock,
      sku: input.sku,
      category: input.category,
      images: input.images,
      is_active: input.is_active,
      featured: input.featured,
      colors: input.colors ?? [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as DbProduct;
}

/**
 * Actualiza un producto del vendor.
 * 🆕 v22.13 - colors como string[]
 */
export async function updateMyProduct(
  productId: string,
  updates: Partial<{
    name: string;
    description: string | null;
    price: number;
    compare_at_price: number | null;
    stock: number;
    sku: string | null;
    category: string | null;
    images: string[];
    is_active: boolean;
    featured: boolean;
    colors: string[]; // 🆕 v22.13
  }>
): Promise<DbProduct> {
  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", productId)
    .select()
    .single();

  if (error) throw error;
  return data as DbProduct;
}

export async function updateProductPrice(
  productId: string,
  newPrice: number
): Promise<DbProduct> {
  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select(`
      id,
      source,
      catalog_product_id,
      catalog:catalog_products!products_catalog_product_id_fkey(base_price)
    `)
    .eq("id", productId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  if (product.source === "catalog") {
    const catalog = (product as any).catalog;
    if (catalog && newPrice <= Number(catalog.base_price)) {
      throw new Error(
        `El precio debe ser mayor a S/ ${Number(catalog.base_price).toFixed(2)} (costo del proveedor)`
      );
    }
  }

  if (newPrice <= 0) {
    throw new Error("El precio debe ser mayor a 0");
  }

  const { data, error } = await supabase
    .from("products")
    .update({
      price: newPrice,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DbProduct;
}

export async function toggleMyProductActive(productId: string, is_active: boolean): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ is_active })
    .eq("id", productId);
  if (error) throw error;
}

export async function deleteMyProduct(productId: string): Promise<void> {
  const { data: product } = await supabase
    .from("products")
    .select("source, images")
    .eq("id", productId)
    .single();

  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) throw error;

  if (product?.source === "own" && Array.isArray(product.images)) {
    for (const url of product.images) {
      try {
        await deleteFileByUrl("product-images", url);
      } catch (err) {
        console.warn("Could not delete image:", err);
      }
    }
  }
}

export async function uploadProductImages(
  storeId: string,
  files: File[]
): Promise<string[]> {
  return uploadMultipleFiles("product-images", files, `vendors/${storeId}`);
}

export async function toggleProductFeatured(productId: string, featured: boolean): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ featured })
    .eq("id", productId);
  if (error) throw error;
}