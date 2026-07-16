import { supabase } from "./supabase";
import type { DbOrder } from "../types/database";

export interface VendorStatsSummary {
  today: { orders: number; revenue: number };
  this_week: { orders: number; revenue: number; growth_pct: number };
  this_month: { orders: number; revenue: number; growth_pct: number };
  pending: { orders: number; revenue: number };
  totals: {
    all_orders: number;
    all_revenue: number;
    avg_ticket: number;
    active_products: number;
    low_stock: number;
    out_of_stock: number;
  };
}

export interface DailySales {
  date: string;      // "2026-02-07"
  label: string;     // "Lun 07"
  total: number;
  orders_count: number;
}

export interface TopSellingProduct {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  total_revenue: number;
  image: string | null;
}

/** ¿Es un pedido que cuenta como venta real? */
function isRevenueOrder(order: DbOrder): boolean {
  return order.status !== "pending_payment" && order.status !== "cancelled";
}

/** Compara dos periodos y devuelve % de crecimiento */
function calcGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Devuelve las estadísticas completas del vendor.
 */
export async function fetchVendorStatsSummary(
  storeId: string
): Promise<VendorStatsSummary> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  const endOfLastWeek = new Date(startOfWeek);

  // Traemos todas las órdenes de la tienda
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, total, status, created_at")
    .eq("store_id", storeId);

  if (ordersError) throw ordersError;

  const allOrders = (orders ?? []) as DbOrder[];
  const revenueOrders = allOrders.filter(isRevenueOrder);

  // Hoy
  const todayOrders = allOrders.filter(
    (o) => new Date(o.created_at) >= startOfToday
  );
  const todayRevenue = todayOrders
    .filter(isRevenueOrder)
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  // Esta semana
  const weekOrders = revenueOrders.filter(
    (o) => new Date(o.created_at) >= startOfWeek
  );
  const weekRevenue = weekOrders.reduce(
    (sum, o) => sum + Number(o.total || 0),
    0
  );

  // Semana pasada
  const lastWeekOrders = revenueOrders.filter((o) => {
    const d = new Date(o.created_at);
    return d >= startOfLastWeek && d < endOfLastWeek;
  });
  const lastWeekRevenue = lastWeekOrders.reduce(
    (sum, o) => sum + Number(o.total || 0),
    0
  );

  // Este mes
  const monthOrders = revenueOrders.filter(
    (o) => new Date(o.created_at) >= startOfMonth
  );
  const monthRevenue = monthOrders.reduce(
    (sum, o) => sum + Number(o.total || 0),
    0
  );

  // Mes pasado
  const lastMonthOrders = revenueOrders.filter((o) => {
    const d = new Date(o.created_at);
    return d >= startOfLastMonth && d < startOfMonth;
  });
  const lastMonthRevenue = lastMonthOrders.reduce(
    (sum, o) => sum + Number(o.total || 0),
    0
  );

  // Pendientes
  const pendingOrders = allOrders.filter(
    (o) => o.status === "pending_payment"
  );
  const pendingRevenue = pendingOrders.reduce(
    (sum, o) => sum + Number(o.total || 0),
    0
  );

  // Totales
  const totalRevenue = revenueOrders.reduce(
    (sum, o) => sum + Number(o.total || 0),
    0
  );
  const avgTicket =
    revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0;

  // Productos activos + stock
  const { data: products } = await supabase
    .from("products")
    .select("id, is_active, stock")
    .eq("store_id", storeId);

  const productList = products ?? [];
  const activeProducts = productList.filter((p) => p.is_active).length;
  const lowStock = productList.filter(
    (p) => p.is_active && p.stock > 0 && p.stock <= 5
  ).length;
  const outOfStock = productList.filter(
    (p) => p.is_active && p.stock === 0
  ).length;

  return {
    today: {
      orders: todayOrders.length,
      revenue: todayRevenue,
    },
    this_week: {
      orders: weekOrders.length,
      revenue: weekRevenue,
      growth_pct: calcGrowth(weekRevenue, lastWeekRevenue),
    },
    this_month: {
      orders: monthOrders.length,
      revenue: monthRevenue,
      growth_pct: calcGrowth(monthRevenue, lastMonthRevenue),
    },
    pending: {
      orders: pendingOrders.length,
      revenue: pendingRevenue,
    },
    totals: {
      all_orders: allOrders.length,
      all_revenue: totalRevenue,
      avg_ticket: avgTicket,
      active_products: activeProducts,
      low_stock: lowStock,
      out_of_stock: outOfStock,
    },
  };
}

/**
 * Devuelve las ventas por día de los últimos N días.
 */
export async function fetchVendorSalesLastDays(
  storeId: string,
  days: number = 7
): Promise<DailySales[]> {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (days - 1));

  const { data, error } = await supabase
    .from("orders")
    .select("total, status, created_at")
    .eq("store_id", storeId)
    .gte("created_at", startDate.toISOString());

  if (error) throw error;

  const orders = (data ?? []) as DbOrder[];

  // Construir mapa de fecha → totales
  const map = new Map<string, { total: number; count: number }>();

  // Inicializar todos los días con 0
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { total: 0, count: 0 });
  }

  // Sumar órdenes reales
  for (const order of orders) {
    if (!isRevenueOrder(order)) continue;
    const key = new Date(order.created_at).toISOString().slice(0, 10);
    const current = map.get(key);
    if (current) {
      current.total += Number(order.total || 0);
      current.count += 1;
    }
  }

  const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  return Array.from(map.entries()).map(([date, val]) => {
    const d = new Date(date);
    return {
      date,
      label: `${DAYS_ES[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}`,
      total: val.total,
      orders_count: val.count,
    };
  });
}

/**
 * Top productos vendidos de la tienda.
 */
export async function fetchVendorTopProducts(
  storeId: string,
  limit: number = 5
): Promise<TopSellingProduct[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("items, status")
    .eq("store_id", storeId);

  if (error) throw error;

  const orders = (data ?? []) as { items: any[]; status: string }[];

  // Acumular ventas por producto
  const productMap = new Map<
    string,
    { name: string; quantity: number; revenue: number; image: string | null }
  >();

  for (const order of orders) {
    if (order.status === "cancelled" || order.status === "pending_payment") {
      continue;
    }

    if (!Array.isArray(order.items)) continue;

    for (const item of order.items) {
      const productId = item.product_id ?? item.productId;
      if (!productId) continue;

      const name = item.product_name ?? item.name ?? "Producto";
      const qty = Number(item.quantity || 0);
      const subtotal = Number(item.subtotal || item.price * qty || 0);
      const image = item.image ?? null;

      const existing = productMap.get(productId);
      if (existing) {
        existing.quantity += qty;
        existing.revenue += subtotal;
      } else {
        productMap.set(productId, {
          name,
          quantity: qty,
          revenue: subtotal,
          image,
        });
      }
    }
  }

  return Array.from(productMap.entries())
    .map(([product_id, val]) => ({
      product_id,
      product_name: val.name,
      quantity_sold: val.quantity,
      total_revenue: val.revenue,
      image: val.image,
    }))
    .sort((a, b) => b.quantity_sold - a.quantity_sold)
    .slice(0, limit);
}