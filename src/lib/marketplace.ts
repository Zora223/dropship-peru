// src/lib/marketplace.ts
// 🏪 v22.16 - Marketplace público con AGRUPACIÓN por catálogo (no competencia)

import { supabase } from "./supabase";

// ══════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════

export interface MarketplaceProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  category: string | null;
  images: string[];
  featured: boolean;
  avg_rating: number | null;
  review_count: number | null;
  colors: string[] | null;
  catalog_product_id: string | null;
  // 🆕 v22.16 - Info de tienda asignada (aleatoria si es de catálogo)
  store: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  };
  // 🆕 v22.16 - Cuántas tiendas ofrecen este producto
  stores_count?: number;
}

export interface MarketplaceStore {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  product_count: number;
  avg_rating: number;
}

export interface MarketplaceCategory {
  name: string;
  emoji: string;
  product_count: number;
}

export interface MarketplaceStats {
  total_stores: number;
  total_products: number;
  total_categories: number;
  active_vendors: number;
}

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════

interface RawProductRow {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  stock: number;
  category: string | null;
  images: string[] | null;
  featured: boolean | null;
  avg_rating: number | string | null;
  review_count: number | null;
  colors: string[] | null;
  catalog_product_id: string | null;
  store: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    is_active: boolean;
  };
}

function mapProductRow(p: RawProductRow, storesCount = 1): MarketplaceProduct {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    compare_at_price: p.compare_at_price ? Number(p.compare_at_price) : null,
    stock: p.stock,
    category: p.category,
    images: Array.isArray(p.images) ? p.images : [],
    featured: p.featured ?? false,
    avg_rating: p.avg_rating ? Number(p.avg_rating) : null,
    review_count: p.review_count ?? 0,
    colors: Array.isArray(p.colors) ? p.colors : [],
    catalog_product_id: p.catalog_product_id,
    store: {
      id: p.store.id,
      name: p.store.name,
      slug: p.store.slug,
      logo_url: p.store.logo_url,
    },
    stores_count: storesCount,
  };
}

/**
 * 🆕 v22.16 - Agrupa productos por catálogo (deduplica) y asigna vendedor aleatorio
 *
 * Si 5 vendedores tienen el mismo producto del catálogo:
 * - Devuelve 1 sola card
 * - Con vendedor asignado aleatoriamente (justo)
 * - Con contador de cuántas tiendas lo venden
 */
function dedupeByCatalog(rawProducts: RawProductRow[]): MarketplaceProduct[] {
  const groupedByCatalog = new Map<string, RawProductRow[]>();
  const uniqueOwn: RawProductRow[] = [];

  for (const p of rawProducts) {
    if (p.catalog_product_id) {
      // Es de catálogo → agrupar
      const key = p.catalog_product_id;
      const list = groupedByCatalog.get(key) ?? [];
      list.push(p);
      groupedByCatalog.set(key, list);
    } else {
      // Es producto propio del vendedor → siempre único
      uniqueOwn.push(p);
    }
  }

  const result: MarketplaceProduct[] = [];

  // Productos propios (únicos)
  uniqueOwn.forEach((p) => result.push(mapProductRow(p, 1)));

  // Productos de catálogo (deduplicados + asignación aleatoria)
  groupedByCatalog.forEach((products) => {
    // Escoge un vendedor aleatorio de los que ofrecen ese producto
    const randomIndex = Math.floor(Math.random() * products.length);
    const chosen = products[randomIndex];
    result.push(mapProductRow(chosen, products.length));
  });

  return result;
}

// ══════════════════════════════════════════════════════════
// PRODUCTOS DESTACADOS
// ══════════════════════════════════════════════════════════

/**
 * v22.16 - Trae productos deduplicados por catálogo
 * (evita mostrar el mismo producto en múltiples tarjetas)
 */
export async function getFeaturedProducts(
  limit = 12
): Promise<MarketplaceProduct[]> {
  // Traemos MÁS de lo necesario porque después deduplicamos
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id, name, description, price, compare_at_price, stock,
      category, images, featured, avg_rating, review_count, colors,
      catalog_product_id,
      store:stores!inner (id, name, slug, logo_url, is_active)
    `
    )
    .eq("is_active", true)
    .gt("stock", 0)
    .eq("store.is_active", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit * 3); // Traer 3x para tener suficiente después de dedupe

  if (error) {
    console.error("Error fetching featured products:", error);
    return [];
  }

  const deduped = dedupeByCatalog((data ?? []) as unknown as RawProductRow[]);
  return deduped.slice(0, limit);
}

// ══════════════════════════════════════════════════════════
// TIENDAS DESTACADAS
// ══════════════════════════════════════════════════════════

export async function getFeaturedStores(
  limit = 8
): Promise<MarketplaceStore[]> {
  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, name, slug, description, logo_url")
    .eq("is_active", true)
    .limit(limit * 2);

  if (error) {
    console.error("Error fetching stores:", error);
    return [];
  }

  if (!stores || stores.length === 0) return [];

  const storeIds = stores.map((s) => s.id);
  const { data: products } = await supabase
    .from("products")
    .select("store_id, avg_rating")
    .in("store_id", storeIds)
    .eq("is_active", true)
    .gt("stock", 0);

  const countMap = new Map<
    string,
    { count: number; totalRating: number; ratingCount: number }
  >();

  (products ?? []).forEach((p: { store_id: string; avg_rating: number | null }) => {
    const current = countMap.get(p.store_id) ?? {
      count: 0,
      totalRating: 0,
      ratingCount: 0,
    };
    current.count += 1;
    if (p.avg_rating && p.avg_rating > 0) {
      current.totalRating += Number(p.avg_rating);
      current.ratingCount += 1;
    }
    countMap.set(p.store_id, current);
  });

  return stores
    .map((s) => {
      const stats = countMap.get(s.id) ?? {
        count: 0,
        totalRating: 0,
        ratingCount: 0,
      };
      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        description: s.description,
        logo_url: s.logo_url,
        product_count: stats.count,
        avg_rating:
          stats.ratingCount > 0
            ? Number((stats.totalRating / stats.ratingCount).toFixed(1))
            : 0,
      };
    })
    .filter((s) => s.product_count > 0)
    .sort((a, b) => b.product_count - a.product_count)
    .slice(0, limit);
}

// ══════════════════════════════════════════════════════════
// CATEGORÍAS
// ══════════════════════════════════════════════════════════

function extractEmoji(category: string): { emoji: string; label: string } {
  const match = category.match(/^(\p{Emoji})\s*(.+)$/u);
  if (match) {
    return { emoji: match[1], label: match[2] };
  }
  return { emoji: "📦", label: category };
}

export async function getCategories(): Promise<MarketplaceCategory[]> {
  const { data, error } = await supabase
    .from("products")
    .select("category, catalog_product_id")
    .eq("is_active", true)
    .gt("stock", 0)
    .not("category", "is", null);

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  // Deduplicar por catalog_product_id para el conteo
  const seenCatalog = new Set<string>();
  const countMap = new Map<string, number>();

  (data ?? []).forEach((p: { category: string | null; catalog_product_id: string | null }) => {
    if (!p.category) return;

    // Si es de catálogo y ya lo contamos, saltamos
    if (p.catalog_product_id) {
      if (seenCatalog.has(p.catalog_product_id)) return;
      seenCatalog.add(p.catalog_product_id);
    }

    countMap.set(p.category, (countMap.get(p.category) ?? 0) + 1);
  });

  return Array.from(countMap.entries())
    .map(([category, count]) => {
      const { emoji, label } = extractEmoji(category);
      return {
        name: label,
        emoji,
        product_count: count,
      };
    })
    .sort((a, b) => b.product_count - a.product_count);
}

// ══════════════════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════════════════

export async function getMarketplaceStats(): Promise<MarketplaceStats> {
  const [storesRes, productsRes, categoriesRes] = await Promise.all([
    supabase
      .from("stores")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("products")
      .select("id, catalog_product_id", { count: "exact" })
      .eq("is_active", true)
      .gt("stock", 0),
    supabase
      .from("products")
      .select("category")
      .eq("is_active", true)
      .not("category", "is", null),
  ]);

  const uniqueCategories = new Set(
    (categoriesRes.data ?? [])
      .map((p: { category: string | null }) => p.category)
      .filter(Boolean)
  );

  // 🆕 Contar productos únicos (deduplicando catálogo)
  const seenCatalog = new Set<string>();
  let uniqueCount = 0;
  (productsRes.data ?? []).forEach(
    (p: { id: string; catalog_product_id: string | null }) => {
      if (p.catalog_product_id) {
        if (!seenCatalog.has(p.catalog_product_id)) {
          seenCatalog.add(p.catalog_product_id);
          uniqueCount += 1;
        }
      } else {
        uniqueCount += 1;
      }
    }
  );

  return {
    total_stores: storesRes.count ?? 0,
    total_products: uniqueCount,
    total_categories: uniqueCategories.size,
    active_vendors: storesRes.count ?? 0,
  };
}

// ══════════════════════════════════════════════════════════
// BÚSQUEDA
// ══════════════════════════════════════════════════════════

export async function searchProducts(
  query: string,
  limit = 24
): Promise<MarketplaceProduct[]> {
  if (!query.trim()) return [];

  const q = query.trim();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id, name, description, price, compare_at_price, stock,
      category, images, featured, avg_rating, review_count, colors,
      catalog_product_id,
      store:stores!inner (id, name, slug, logo_url, is_active)
    `
    )
    .eq("is_active", true)
    .gt("stock", 0)
    .eq("store.is_active", true)
    .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
    .limit(limit * 3);

  if (error) {
    console.error("Error searching:", error);
    return [];
  }

  const deduped = dedupeByCatalog((data ?? []) as unknown as RawProductRow[]);
  return deduped.slice(0, limit);
}

// ══════════════════════════════════════════════════════════
// PRODUCTOS POR CATEGORÍA
// ══════════════════════════════════════════════════════════

export async function getProductsByCategory(
  categoryLabel: string,
  limit = 48
): Promise<MarketplaceProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id, name, description, price, compare_at_price, stock,
      category, images, featured, avg_rating, review_count, colors,
      catalog_product_id,
      store:stores!inner (id, name, slug, logo_url, is_active)
    `
    )
    .eq("is_active", true)
    .gt("stock", 0)
    .eq("store.is_active", true)
    .ilike("category", `%${categoryLabel}%`)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit * 3);

  if (error) {
    console.error("Error fetching by category:", error);
    return [];
  }

  const deduped = dedupeByCatalog((data ?? []) as unknown as RawProductRow[]);
  return deduped.slice(0, limit);
}