// ============================================================
// SUPPLIER PRODUCTS — Funciones CRUD para proveedores
// ============================================================
// Maneja el catálogo mayorista de cada proveedor:
// - Crear, editar, eliminar productos
// - Subir imágenes a Supabase Storage
// - Contar cuántos vendors usan cada producto
// ============================================================

import { supabase } from "./supabase";

// ---- TIPOS ----
export interface SupplierProduct {
  id: string;
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
  created_at: string;
  updated_at: string;
  vendors_count?: number; // Calculado, no viene de la BD
}

export interface ProductFormData {
  name: string;
  description: string;
  base_price: number;
  suggested_price: number;
  stock: number;
  sku: string;
  category: string;
  images: string[];
  is_active: boolean;
}

export interface SupplierProductStats {
  total: number;
  active: number;
  outOfStock: number;
  totalVendors: number;
}

// ============================================================
// LISTAR PRODUCTOS DEL PROVEEDOR (con conteo de vendors)
// ============================================================
export async function listSupplierProducts(
  supplierId: string
): Promise<SupplierProduct[]> {
  // Traemos productos del proveedor
  const { data: products, error } = await supabase
    .from("catalog_products")
    .select("*")
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!products || products.length === 0) return [];

  // Traemos el conteo de vendors por producto
  const productIds = products.map((p) => p.id);

  const { data: vendorProducts, error: vpError } = await supabase
    .from("products")
    .select("catalog_product_id")
    .in("catalog_product_id", productIds);

  if (vpError) console.warn("Error contando vendors:", vpError);

  // Contamos vendors por producto
  const countMap: Record<string, number> = {};
  (vendorProducts ?? []).forEach((vp) => {
    if (vp.catalog_product_id) {
      countMap[vp.catalog_product_id] = (countMap[vp.catalog_product_id] ?? 0) + 1;
    }
  });

  // Combinamos productos + conteo
  return products.map((p) => ({
    ...p,
    vendors_count: countMap[p.id] ?? 0,
  })) as SupplierProduct[];
}

// ============================================================
// ESTADÍSTICAS DEL PROVEEDOR
// ============================================================
export function calculateStats(products: SupplierProduct[]): SupplierProductStats {
  return {
    total: products.length,
    active: products.filter((p) => p.is_active).length,
    outOfStock: products.filter((p) => p.stock === 0).length,
    totalVendors: products.reduce((sum, p) => sum + (p.vendors_count ?? 0), 0),
  };
}

// ============================================================
// CREAR PRODUCTO
// ============================================================
export async function createProduct(
  supplierId: string,
  data: ProductFormData
): Promise<SupplierProduct> {
  const { data: created, error } = await supabase
    .from("catalog_products")
    .insert({
      supplier_id: supplierId,
      name: data.name.trim(),
      description: data.description.trim() || null,
      base_price: data.base_price,
      suggested_price: data.suggested_price,
      stock: data.stock,
      sku: data.sku.trim(),
      category: data.category.trim(),
      images: data.images,
      is_active: data.is_active,
    })
    .select("*")
    .single();

  if (error) throw error;
  return created as SupplierProduct;
}

// ============================================================
// ACTUALIZAR PRODUCTO
// ============================================================
export async function updateProduct(
  productId: string,
  data: Partial<ProductFormData>
): Promise<SupplierProduct> {
  const { data: updated, error } = await supabase
    .from("catalog_products")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .select("*")
    .single();

  if (error) throw error;
  return updated as SupplierProduct;
}

// ============================================================
// ELIMINAR PRODUCTO
// ============================================================
export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await supabase
    .from("catalog_products")
    .delete()
    .eq("id", productId);

  if (error) throw error;
}

// ============================================================
// TOGGLE ACTIVAR/DESACTIVAR
// ============================================================
export async function toggleActive(
  productId: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from("catalog_products")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) throw error;
}

// ============================================================
// SUBIR IMAGEN AL BUCKET
// ============================================================
export async function uploadProductImage(file: File): Promise<string> {
  // Validar tipo
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen");
  }

  // Validar tamaño (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("La imagen no puede pesar más de 5MB");
  }

  // Generar nombre único
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  const extension = file.name.split(".").pop() || "jpg";
  const fileName = `catalog/${timestamp}-${randomStr}.${extension}`;

  // Subir al bucket
  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Obtener URL pública
  const { data: publicUrlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

// ============================================================
// ELIMINAR IMAGEN DEL BUCKET
// ============================================================
export async function deleteProductImage(imageUrl: string): Promise<void> {
  try {
    // Extraer path del URL público
    // URL formato: https://xxx.supabase.co/storage/v1/object/public/product-images/catalog/xxx.jpg
    const parts = imageUrl.split("/product-images/");
    if (parts.length < 2) return;

    const filePath = parts[1];

    const { error } = await supabase.storage
      .from("product-images")
      .remove([filePath]);

    if (error) console.warn("Error borrando imagen:", error);
  } catch (err) {
    console.warn("No se pudo borrar imagen:", err);
  }
}

// ============================================================
// LISTAR CATEGORÍAS ÚNICAS DEL PROVEEDOR
// ============================================================
export async function listSupplierCategories(
  supplierId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("catalog_products")
    .select("category")
    .eq("supplier_id", supplierId);

  if (error) throw error;

  const categories = new Set<string>();
  (data ?? []).forEach((row) => {
    if (row.category) categories.add(row.category);
  });

  return Array.from(categories).sort();
}