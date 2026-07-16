import { supabase } from "./supabase";
import { uploadMultipleFiles, deleteFileByUrl } from "./storage";
import type { DbProduct, ProductSource } from "../types/database";

export interface VendorProductWithRealStock extends DbProduct {
  /**
   * Stock real disponible:
   * - Para "catalog": viene de catalog_products.stock (sincronizado con admin)
   * - Para "own": viene de products.stock (manejado por el vendor)
   */
  real_stock: number;
  /**
   * Si el producto del catálogo fue desactivado por el admin.
   */
  catalog_inactive: boolean;
}

/**
 * Lista TODOS los productos de la tienda del vendor.
 */
/**
 * Lista TODOS los productos de la tienda del vendor.
 * Para productos "catalog": resuelve el stock real desde catalog_products.
 */
export async function fetchMyProducts(storeId: string): Promise<VendorProductWithRealStock[]> {
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      catalog:catalog_products!products_catalog_product_id_fkey(stock, is_active)
    `)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map((p) => {
    const catalog = (p as unknown as { catalog: { stock: number; is_active: boolean } | null }).catalog;

    const real_stock = p.source === "catalog" && catalog
      ? catalog.stock
      : p.stock;

    const catalog_inactive = p.source === "catalog" && catalog ? !catalog.is_active : false;

    return {
      ...(p as DbProduct),
      real_stock,
      catalog_inactive,
    } as VendorProductWithRealStock;
  });
}

/**
 * Importa un producto del catálogo a la tienda del vendor.
 */
export interface ImportCatalogProductInput {
  storeId: string;
  catalogProductId: string;
  name: string;
  description: string | null;
  price: number; // Precio del vendor (con su margen)
  stock: number;
  sku: string | null;
  category: string | null;
  images: string[];
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

/**
 * Verifica si un producto del catálogo ya fue importado por la tienda.
 */
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

/**
 * Lista los IDs del catálogo que ya están importados (para marcar en UI).
 */
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
 * Crea un producto PROPIO del vendor (no del catálogo).
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
  featured: boolean;  // ← AGREGAR
  images: string[];
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
      featured: input.featured,  // ← AGREGAR
    })
    .select()
    .single();

  if (error) throw error;
  return data as DbProduct;
}
/**
 * Actualiza un producto del vendor (precio, stock, etc).
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

/**
 * Activa/desactiva un producto.
 */
export async function toggleMyProductActive(productId: string, is_active: boolean): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ is_active })
    .eq("id", productId);
  if (error) throw error;
}

/**
 * Elimina un producto.
 * - Si es "own": borra el registro y las fotos del Storage.
 * - Si es "catalog": solo lo quita de la tienda (el catálogo del admin queda intacto).
 */
export async function deleteMyProduct(productId: string): Promise<void> {
  // Obtener el producto para saber su source y sus imágenes
  const { data: product } = await supabase
    .from("products")
    .select("source, images")
    .eq("id", productId)
    .single();

  // Eliminar el producto
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) throw error;

  // Si era "own", limpiar imágenes del Storage
  if (product?.source === "own" && Array.isArray(product.images)) {
    for (const url of product.images) {
      try {
        await deleteFileByUrl("product-images", url);
      } catch (err) {
        console.warn("Could not delete image:", err);
      }
    }
  }
  // Si era "catalog", NO tocamos el Storage (las imágenes son del admin)
}

/**
 * Sube fotos para un producto propio del vendor.
 */
export async function uploadProductImages(
  storeId: string,
  files: File[]
): Promise<string[]> {
  return uploadMultipleFiles("product-images", files, `vendors/${storeId}`);
}
/**
 * Marca/desmarca un producto como "Más vendido" (featured).
 */
export async function toggleProductFeatured(productId: string, featured: boolean): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ featured })
    .eq("id", productId);
  if (error) throw error;
}