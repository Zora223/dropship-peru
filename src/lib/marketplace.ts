// src/lib/marketplace.ts
// 🏪 v22.15 - Marketplace público (funciones de datos)

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
  store: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  };
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
// PRODUCTOS DESTACADOS
// ══════════════════════════════════════════════════════════

/**
 * Trae productos destacados o más recientes con stock
 * Filtra solo tiendas activas
 */
export async function getFeaturedProducts(
  limit = 12
): Promise<MarketplaceProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      description,
      price,
      compare_at_price,
      stock,
      category,
      images,
      featured,
      avg_rating,
      review_count,
      colors,
      store:stores!inner (
        id,
        name,
        slug,
        logo_url,
        is_active
      )
    `
    )
    .eq("is_active", true)
    .gt("stock", 0)
    .eq("store.is_active", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching featured products:", error);
    return [];
  }

  // Type assertion segura
  return (data ?? []).map((p: any) => ({
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
    store: {
      id: p.store.id,
      name: p.store.name,
      slug: p.store.slug,
      logo_url: p.store.logo_url,
    },
  })) as MarketplaceProduct[];
}

// ══════════════════════════════════════════════════════════
// TIENDAS DESTACADAS
// ══════════════════════════════════════════════════════════

/**
 * Trae tiendas activas con más productos y mejor rating
 */
export async function getFeaturedStores(
  limit = 8
): Promise<MarketplaceStore[]> {
  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, name, slug, description, logo_url")
    .eq("is_active", true)
    .limit(limit * 2); // Traer más para filtrar los que tengan productos

  if (error) {
    console.error("Error fetching stores:", error);
    return [];
  }

  if (!stores || stores.length === 0) return [];

  // Contar productos activos por tienda
  const storeIds = stores.map((s) => s.id);
  const { data: products } = await supabase
    .from("products")
    .select("store_id, avg_rating")
    .in("store_id", storeIds)
    .eq("is_active", true)
    .gt("stock", 0);

  const countMap = new Map<string, { count: number; totalRating: number; ratingCount: number }>();
  (products ?? []).forEach((p: any) => {
    const current = countMap.get(p.store_id) ?? { count: 0, totalRating: 0, ratingCount: 0 };
    current.count += 1;
    if (p.avg_rating && p.avg_rating > 0) {
      current.totalRating += Number(p.avg_rating);
      current.ratingCount += 1;
    }
    countMap.set(p.store_id, current);
  });

  // Filtrar tiendas con al menos 1 producto y ordenar
  return stores
    .map((s) => {
      const stats = countMap.get(s.id) ?? { count: 0, totalRating: 0, ratingCount: 0 };
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

/**
 * Extrae emoji de una categoría "👗 Ropa de Mujer" → "👗"
 */
function extractEmoji(category: string): { emoji: string; label: string } {
  const match = category.match(/^(\p{Emoji})\s*(.+)$/u);
  if (match) {
    return { emoji: match[1], label: match[2] };
  }
  return { emoji: "📦", label: category };
}

/**
 * Trae todas las categorías únicas con contador de productos
 */
export async function getCategories(): Promise<MarketplaceCategory[]> {
  const { data, error } = await supabase
    .from("products")
    .select("category")
    .eq("is_active", true)
    .gt("stock", 0)
    .not("category", "is", null);

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  const countMap = new Map<string, number>();
  (data ?? []).forEach((p: any) => {
    if (p.category) {
      countMap.set(p.category, (countMap.get(p.category) ?? 0) + 1);
    }
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

/**
 * Estadísticas globales del marketplace (para social proof)
 */
export async function getMarketplaceStats(): Promise<MarketplaceStats> {
  const [storesRes, productsRes, categoriesRes] = await Promise.all([
    supabase
      .from("stores")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("products")
      .select("id, category", { count: "exact" })
      .eq("is_active", true)
      .gt("stock", 0),
    supabase
      .from("products")
      .select("category")
      .eq("is_active", true)
      .not("category", "is", null),
  ]);

  const uniqueCategories = new Set(
    (categoriesRes.data ?? []).map((p: any) => p.category).filter(Boolean)
  );

  return {
    total_stores: storesRes.count ?? 0,
    total_products: productsRes.count ?? 0,
    total_categories: uniqueCategories.size,
    active_vendors: storesRes.count ?? 0,
  };
}

// ══════════════════════════════════════════════════════════
// BÚSQUEDA
// ══════════════════════════════════════════════════════════

/**
 * Busca productos por nombre, descripción o categoría
 */
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
      store:stores!inner (id, name, slug, logo_url, is_active)
    `
    )
    .eq("is_active", true)
    .gt("stock", 0)
    .eq("store.is_active", true)
    .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
    .limit(limit);

  if (error) {
    console.error("Error searching:", error);
    return [];
  }

  return (data ?? []).map((p: any) => ({
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
    store: {
      id: p.store.id,
      name: p.store.name,
      slug: p.store.slug,
      logo_url: p.store.logo_url,
    },
  })) as MarketplaceProduct[];
}

// ══════════════════════════════════════════════════════════
// PRODUCTOS POR CATEGORÍA
// ══════════════════════════════════════════════════════════

/**
 * Trae todos los productos de una categoría (para /categoria/:slug)
 */
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
      store:stores!inner (id, name, slug, logo_url, is_active)
    `
    )
    .eq("is_active", true)
    .gt("stock", 0)
    .eq("store.is_active", true)
    .ilike("category", `%${categoryLabel}%`)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching by category:", error);
    return [];
  }

  return (data ?? []).map((p: any) => ({
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
    store: {
      id: p.store.id,
      name: p.store.name,
      slug: p.store.slug,
      logo_url: p.store.logo_url,
    },
  })) as MarketplaceProduct[];
}