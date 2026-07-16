import { supabase } from "./supabase";
import type { DbOrder, DbProfile } from "../types/database";

export interface PlatformStatsSummary {
  users: {
    total: number;
    admins: number;
    vendors: number;
    customers: number;
    new_this_week: number;
  };
  stores: {
    total: number;
    active: number;
    suspended: number;
    in_trial: number;
    expiring_soon: number; // trials que expiran en <7 días
  };
  orders: {
    total: number;
    today: number;
    this_week: number;
    pending: number;
    growth_pct: number; // vs semana pasada
  };
  revenue: {
    total: number;
    this_month: number;
    mrr_estimated: number; // Monthly Recurring Revenue
    avg_ticket: number;
  };
}

export interface TopStoreItem {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  total_sales: number;
  orders_count: number;
}

export interface ExpiringTrialItem {
  id: string;
  name: string;
  slug: string;
  owner_name: string | null;
  owner_email: string | null;
  trial_ends_at: string;
  days_left: number;
}

function isRevenueOrder(order: DbOrder): boolean {
  return order.status !== "pending_payment" && order.status !== "cancelled";
}

function calcGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Devuelve KPIs generales de la plataforma.
 */
export async function fetchPlatformStatsSummary(): Promise<PlatformStatsSummary> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);

  const [
    profilesResult,
    storesResult,
    ordersResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id, role, created_at"),
    supabase
      .from("stores")
      .select("id, is_active, subscription_status, trial_ends_at, plan_price"),
    supabase.from("orders").select("id, total, status, created_at"),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (storesResult.error) throw storesResult.error;
  if (ordersResult.error) throw ordersResult.error;

  const profiles = (profilesResult.data ?? []) as DbProfile[];
  const stores = (storesResult.data ?? []) as any[];
  const orders = (ordersResult.data ?? []) as DbOrder[];

  // Users
  const admins = profiles.filter((p) => p.role === "admin").length;
  const vendors = profiles.filter((p) => p.role === "vendor").length;
  const customers = profiles.filter((p) => p.role === "customer").length;
  const newThisWeek = profiles.filter(
    (p) => new Date(p.created_at) >= startOfWeek
  ).length;

  // Stores
  const activeStores = stores.filter((s) => s.is_active).length;
  const suspendedStores = stores.filter((s) => !s.is_active).length;
  const inTrial = stores.filter((s) => {
    if (s.subscription_status !== "trial") return false;
    if (!s.trial_ends_at) return false;
    return new Date(s.trial_ends_at) > now;
  }).length;
  const expiringSoon = stores.filter((s) => {
    if (s.subscription_status !== "trial") return false;
    if (!s.trial_ends_at) return false;
    const trialEnd = new Date(s.trial_ends_at);
    return trialEnd > now && trialEnd <= in7Days;
  }).length;

  // Orders
  const revenueOrders = orders.filter(isRevenueOrder);
  const todayOrders = orders.filter(
    (o) => new Date(o.created_at) >= startOfToday
  );
  const weekOrders = orders.filter(
    (o) => new Date(o.created_at) >= startOfWeek
  );
  const lastWeekOrders = orders.filter((o) => {
    const d = new Date(o.created_at);
    return d >= startOfLastWeek && d < startOfWeek;
  });
  const pendingOrders = orders.filter((o) => o.status === "pending_payment");

  // Revenue
  const totalRevenue = revenueOrders.reduce(
    (sum, o) => sum + Number(o.total || 0),
    0
  );
  const monthRevenue = revenueOrders
    .filter((o) => new Date(o.created_at) >= startOfMonth)
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  // MRR = tiendas activas con suscripción × plan_price
  const mrr = stores
    .filter(
      (s) =>
        s.is_active &&
        (s.subscription_status === "active" ||
          s.subscription_status === "trial")
    )
    .reduce((sum, s) => sum + Number(s.plan_price || 15), 0);

  const avgTicket =
    revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0;

  return {
    users: {
      total: profiles.length,
      admins,
      vendors,
      customers,
      new_this_week: newThisWeek,
    },
    stores: {
      total: stores.length,
      active: activeStores,
      suspended: suspendedStores,
      in_trial: inTrial,
      expiring_soon: expiringSoon,
    },
    orders: {
      total: orders.length,
      today: todayOrders.length,
      this_week: weekOrders.length,
      pending: pendingOrders.length,
      growth_pct: calcGrowth(weekOrders.length, lastWeekOrders.length),
    },
    revenue: {
      total: totalRevenue,
      this_month: monthRevenue,
      mrr_estimated: mrr,
      avg_ticket: avgTicket,
    },
  };
}

/**
 * Ventas por día de los últimos N días (plataforma completa).
 */
export interface DailyPlatformSales {
  date: string;
  label: string;
  total: number;
  orders_count: number;
}

export async function fetchPlatformSalesLastDays(
  days: number = 7
): Promise<DailyPlatformSales[]> {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (days - 1));

  const { data, error } = await supabase
    .from("orders")
    .select("total, status, created_at")
    .gte("created_at", startDate.toISOString());

  if (error) throw error;

  const orders = (data ?? []) as DbOrder[];
  const map = new Map<string, { total: number; count: number }>();

  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { total: 0, count: 0 });
  }

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
 * Top tiendas por ventas totales.
 */
export async function fetchTopStores(
  limit: number = 5
): Promise<TopStoreItem[]> {
  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("id, name, slug, logo_url");

  if (storesError) throw storesError;

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("store_id, total, status");

  if (ordersError) throw ordersError;

  const storeMap = new Map<
    string,
    { total: number; count: number; store: any }
  >();

  for (const store of stores ?? []) {
    storeMap.set(store.id, { total: 0, count: 0, store });
  }

  for (const order of orders ?? []) {
    if (!order.store_id) continue;
    if (order.status === "cancelled" || order.status === "pending_payment") {
      continue;
    }
    const entry = storeMap.get(order.store_id);
    if (entry) {
      entry.total += Number(order.total || 0);
      entry.count += 1;
    }
  }

  return Array.from(storeMap.values())
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map((entry) => ({
      id: entry.store.id,
      name: entry.store.name,
      slug: entry.store.slug,
      logo_url: entry.store.logo_url,
      total_sales: entry.total,
      orders_count: entry.count,
    }));
}

/**
 * Trials que expiran pronto.
 */
export async function fetchExpiringTrials(
  daysAhead: number = 7,
  limit: number = 10
): Promise<ExpiringTrialItem[]> {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);

  const { data, error } = await supabase
    .from("stores")
    .select(
      `
      id, name, slug, trial_ends_at, subscription_status,
      owner:profiles!stores_owner_id_fkey(full_name, email)
    `
    )
    .eq("subscription_status", "trial")
    .not("trial_ends_at", "is", null)
    .lte("trial_ends_at", future.toISOString())
    .gte("trial_ends_at", now.toISOString())
    .order("trial_ends_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((store: any) => {
    const trialEndsAt = new Date(store.trial_ends_at);
    const daysLeft = Math.ceil(
      (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      owner_name: store.owner?.full_name ?? null,
      owner_email: store.owner?.email ?? null,
      trial_ends_at: store.trial_ends_at,
      days_left: daysLeft,
    };
  });
}