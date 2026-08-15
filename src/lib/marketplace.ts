// src/lib/marketplace.ts
// 🏪 v22.21 - Categorías con foto real + precio desde

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
  store: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  };
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
  cover_image: string | null; // 🆕 v22.21 - Foto real
  min_price: number | null;   // 🆕 v22.21 - Precio desde
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

function dedupeByCatalog(rawProducts: RawProductRow[]): MarketplaceProduct[] {
  const groupedByCatalog = new Map<string, RawProductRow[]>();
  const uniqueOwn: RawProductRow[] = [];

  for (const p of rawProducts) {
    if (p.catalog_product_id) {
      const key = p.catalog_product_id;
      const list = groupedByCatalog.get(key) ?? [];
      list.push(p);
      groupedByCatalog.set(key, list);
    } else {
      uniqueOwn.push(p);
    }
  }

  const result: MarketplaceProduct[] = [];

  uniqueOwn.forEach((p) => result.push(mapProductRow(p, 1)));

  groupedByCatalog.forEach((products) => {
    const randomIndex = Math.floor(Math.random() * products.length);
    const chosen = products[randomIndex];
    result.push(mapProductRow(chosen, products.length));
  });

  return result;
}

// ══════════════════════════════════════════════════════════
// PRODUCTOS DESTACADOS
// ══════════════════════════════════════════════════════════

export async function getFeaturedProducts(
  limit = 12
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
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit * 3);

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
// CATEGORÍAS - CON FOTOS REALES 🔥 v22.21
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
    .select("category, catalog_product_id, images, price")
    .eq("is_active", true)
    .gt("stock", 0)
    .not("category", "is", null);

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  const seenCatalog = new Set<string>();
  const categoryData = new Map<
    string,
    { count: number; images: string[]; prices: number[] }
  >();

  (data ?? []).forEach(
    (p: {
      category: string | null;
      catalog_product_id: string | null;
      images: string[] | null;
      price: number | string | null;
    }) => {
      if (!p.category) return;

      // Dedupe por catálogo (no contar duplicados)
      if (p.catalog_product_id) {
        if (seenCatalog.has(p.catalog_product_id)) return;
        seenCatalog.add(p.catalog_product_id);
      }

      const current = categoryData.get(p.category) ?? {
        count: 0,
        images: [],
        prices: [],
      };

      current.count += 1;

      // Guardar imágenes disponibles
      if (Array.isArray(p.images) && p.images[0]) {
        current.images.push(p.images[0]);
      }

      // Guardar precios
      if (p.price) {
        current.prices.push(Number(p.price));
      }

      categoryData.set(p.category, current);
    }
  );

  return Array.from(categoryData.entries())
    .map(([category, stats]) => {
      const { emoji, label } = extractEmoji(category);

      // Elegir imagen aleatoria de las disponibles
      const randomImage =
        stats.images.length > 0
          ? stats.images[Math.floor(Math.random() * stats.images.length)]
          : null;

      // Precio mínimo
      const minPrice =
        stats.prices.length > 0 ? Math.min(...stats.prices) : null;

      return {
        name: label,
        emoji,
        product_count: stats.count,
        cover_image: randomImage,
        min_price: minPrice,
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