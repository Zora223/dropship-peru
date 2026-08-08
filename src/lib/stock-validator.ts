// src/lib/stock-validator.ts
// 🆕 v22.13 - Validación de stock real antes de checkout

import { supabase } from "./supabase";

export interface StockCheckItem {
  product_id: string;
  quantity: number;
  product_name?: string;
}

export interface StockCheckResult {
  valid: boolean;
  issues: {
    product_id: string;
    product_name: string;
    requested: number;
    available: number;
    reason: string;
  }[];
}

/**
 * Valida que TODOS los items del carrito tengan stock disponible
 * Usa la vista products_with_real_stock para obtener stock actualizado
 */
export async function validateCartStock(
  items: StockCheckItem[]
): Promise<StockCheckResult> {
  if (items.length === 0) {
    return { valid: true, issues: [] };
  }

  const productIds = items.map((i) => i.product_id);

  const { data: products, error } = await supabase
    .from("products_with_real_stock")
    .select("id, name, real_stock, is_active, catalog_is_active, catalog_deleted_at")
    .in("id", productIds);

  if (error) {
    console.error("Error validando stock:", error);
    throw new Error("No se pudo validar el stock");
  }

  const issues: StockCheckResult["issues"] = [];

  for (const item of items) {
    const product = products?.find((p) => p.id === item.product_id);

    if (!product) {
      issues.push({
        product_id: item.product_id,
        product_name: item.product_name ?? "Producto",
        requested: item.quantity,
        available: 0,
        reason: "Producto no encontrado",
      });
      continue;
    }

    if (!product.is_active) {
      issues.push({
        product_id: item.product_id,
        product_name: product.name,
        requested: item.quantity,
        available: 0,
        reason: "Producto desactivado",
      });
      continue;
    }

    if (product.catalog_deleted_at) {
      issues.push({
        product_id: item.product_id,
        product_name: product.name,
        requested: item.quantity,
        available: 0,
        reason: "Producto eliminado del catálogo",
      });
      continue;
    }

    if (product.catalog_is_active === false) {
      issues.push({
        product_id: item.product_id,
        product_name: product.name,
        requested: item.quantity,
        available: 0,
        reason: "Producto desactivado por el proveedor",
      });
      continue;
    }

    const available = product.real_stock ?? 0;
    if (available < item.quantity) {
      issues.push({
        product_id: item.product_id,
        product_name: product.name,
        requested: item.quantity,
        available,
        reason:
          available === 0
            ? "Agotado"
            : `Solo quedan ${available} disponibles`,
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Obtiene el stock real de UN producto (para mostrar en UI)
 */
export async function getRealStock(productId: string): Promise<number> {
  const { data, error } = await supabase
    .from("products_with_real_stock")
    .select("real_stock")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    console.error("Error obteniendo stock:", error);
    return 0;
  }

  return data?.real_stock ?? 0;
}

/**
 * Obtiene stock real de VARIOS productos (para listas)
 */
export async function getRealStockBatch(
  productIds: string[]
): Promise<Map<string, number>> {
  const stockMap = new Map<string, number>();

  if (productIds.length === 0) return stockMap;

  const { data, error } = await supabase
    .from("products_with_real_stock")
    .select("id, real_stock")
    .in("id", productIds);

  if (error) {
    console.error("Error batch stock:", error);
    return stockMap;
  }

  (data ?? []).forEach((p) => {
    stockMap.set(p.id, p.real_stock ?? 0);
  });

  return stockMap;
}