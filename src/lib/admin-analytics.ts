// src/lib/admin-analytics.ts
// 📊 Motor de Diagnóstico y Analytics Global para el Admin de Dropship Perú

import { supabase } from "./supabase";

export type TimePeriod = "7d" | "30d" | "all";

export interface VendorHealthProfile {
  vendor_id: string;
  email: string;
  full_name: string | null;
  store_name: string | null;
  store_slug: string | null;
  created_at: string;
  total_products: number;
  catalog_products_count: number;
  own_products_count: number;
  kits_generated: number;
  total_orders: number;
  total_revenue: number;
  health_status: "zombie" | "empty_store" | "no_marketing" | "marketer_no_sales" | "active_star";
  last_activity: string | null;
}

export interface KpiDiagnosisData {
  funnel: {
    registered_users: number;
    stores_created: number;
    stores_with_products: number;
    stores_using_ai: number;
    stores_with_sales: number;
    stores_in_bronce: number; // 30+ ventas de catálogo
  };
  bottlenecks: {
    empty_stores_pct: number;
    no_marketing_pct: number;
    no_sales_pct: number;
    pending_orders_revenue: number;
  };
  metrics: {
    total_revenue: number;
    catalog_revenue: number;
    total_orders: number;
    total_kits_created: number;
    avg_products_per_store: number;
  };
  vendors: VendorHealthProfile[];
}

export async function fetchAdminKpiDiagnosis(period: TimePeriod = "30d"): Promise<KpiDiagnosisData> {
  const now = new Date();
  let startDate: string | null = null;

  if (period === "7d") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (period === "30d") {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  // 1. Cargar Usuarios, Tiendas, Productos, Pedidos y Kits de IA
  const [profilesRes, storesRes, productsRes, ordersRes, kitsRes] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, created_at"),
    supabase.from("stores").select("id, owner_id, name, slug, created_at, is_active"),
    supabase.from("products").select("id, store_id, source, is_active"),
    startDate
      ? supabase.from("orders").select("id, store_id, total, status, created_at, items").gte("created_at", startDate)
      : supabase.from("orders").select("id, store_id, total, status, created_at, items"),
    supabase.from("product_launch_kits").select("id, vendor_id, product_id, created_at"),
  ]);

  const profiles = profilesRes.data || [];
  const stores = storesRes.data || [];
  const products = productsRes.data || [];
  const orders = ordersRes.data || [];
  const kits = kitsRes.data || [];

  // Mapeos rápidos
  const storeByOwner = new Map(stores.map((s) => [s.owner_id, s]));
  const productsByStore = new Map<string, any[]>();
  products.forEach((p) => {
    const list = productsByStore.get(p.store_id) || [];
    list.push(p);
    productsByStore.set(p.store_id, list);
  });

  const kitsByVendor = new Map<string, number>();
  kits.forEach((k) => {
    kitsByVendor.set(k.vendor_id, (kitsByVendor.get(k.vendor_id) || 0) + 1);
  });

  const ordersByStore = new Map<string, any[]>();
  orders.forEach((o) => {
    const list = ordersByStore.get(o.store_id) || [];
    list.push(o);
    ordersByStore.set(o.store_id, list);
  });

  // 2. Construir Salud por Vendedor
  const vendorsHealth: VendorHealthProfile[] = profiles.map((profile) => {
    const store = storeByOwner.get(profile.id);
    const storeProducts = store ? productsByStore.get(store.id) || [] : [];
    const storeOrders = store ? ordersByStore.get(store.id) || [] : [];
    const vendorKitsCount = kitsByVendor.get(profile.id) || 0;

    const catalogProds = storeProducts.filter((p) => p.source === "catalog").length;
    const ownProds = storeProducts.filter((p) => p.source === "own").length;

    const validOrders = storeOrders.filter((o) => o.status !== "cancelled");
    const totalRev = validOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

    // Determinar Estado de Salud del Vendedor
    let health: VendorHealthProfile["health_status"] = "zombie";

    if (!store || storeProducts.length === 0) {
      health = "empty_store";
    } else if (vendorKitsCount === 0) {
      health = "no_marketing";
    } else if (validOrders.length === 0) {
      health = "marketer_no_sales";
    } else {
      health = "active_star";
    }

    return {
      vendor_id: profile.id,
      email: profile.email || "Sin email",
      full_name: profile.full_name || null,
      store_name: store?.name || null,
      store_slug: store?.slug || null,
      created_at: profile.created_at,
      total_products: storeProducts.length,
      catalog_products_count: catalogProds,
      own_products_count: ownProds,
      kits_generated: vendorKitsCount,
      total_orders: validOrders.length,
      total_revenue: totalRev,
      health_status: health,
      last_activity: profile.created_at,
    };
  });

  // 3. Métricas del Embudo (Funnel)
  const registeredUsers = profiles.length;
  const storesCreated = stores.length;
  const storesWithProducts = stores.filter((s) => (productsByStore.get(s.id) || []).length > 0).length;
  const storesUsingAi = profiles.filter((p) => (kitsByVendor.get(p.id) || 0) > 0).length;
  const storesWithSales = stores.filter((s) => {
    const storeOrders = ordersByStore.get(s.id) || [];
    return storeOrders.some((o) => o.status !== "cancelled");
  }).length;

  // Tiendas en Nivel Bronce (30+ ventas de catálogo)
  const storesInBronce = stores.filter((s) => {
    const storeOrders = ordersByStore.get(s.id) || [];
    let catalogSales = 0;
    storeOrders.forEach((o) => {
      if (o.status !== "cancelled" && Array.isArray(o.items)) {
        o.items.forEach((it: any) => {
          if (it.source === "catalog" || it.supplier_id) catalogSales += Number(it.quantity || 1);
        });
      }
    });
    return catalogSales >= 30;
  }).length;

  // 4. Cuellos de Botella (Diagnóstico)
  const totalStores = storesCreated || 1;
  const emptyStoresPct = Math.round(((totalStores - storesWithProducts) / totalStores) * 100);
  const noMarketingPct = Math.round(((storesWithProducts - storesUsingAi) / totalStores) * 100);
  const noSalesPct = Math.round(((storesUsingAi - storesWithSales) / totalStores) * 100);

  const pendingOrders = orders.filter((o) => o.status === "pending_payment");
  const pendingRevenue = pendingOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  // Totales
  const validOrdersAll = orders.filter((o) => o.status !== "cancelled");
  const totalRevAll = validOrdersAll.reduce((sum, o) => sum + Number(o.total || 0), 0);

  return {
    funnel: {
      registered_users: registeredUsers,
      stores_created: storesCreated,
      stores_with_products: storesWithProducts,
      stores_using_ai: storesUsingAi,
      stores_with_sales: storesWithSales,
      stores_in_bronce: storesInBronce,
    },
    bottlenecks: {
      empty_stores_pct: Math.max(0, emptyStoresPct),
      no_marketing_pct: Math.max(0, noMarketingPct),
      no_sales_pct: Math.max(0, noSalesPct),
      pending_orders_revenue: pendingRevenue,
    },
    metrics: {
      total_revenue: totalRevAll,
      catalog_revenue: totalRevAll * 0.7, // Estimado
      total_orders: validOrdersAll.length,
      total_kits_created: kits.length,
      avg_products_per_store: storesCreated > 0 ? Math.round(products.length / storesCreated) : 0,
    },
    vendors: vendorsHealth.sort((a, b) => b.total_revenue - a.total_revenue),
  };
}