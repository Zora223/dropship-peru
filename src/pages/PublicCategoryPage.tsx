// src/pages/PublicCategoryPage.tsx
// 🏪 v22.15 - Página pública por categoría (SEO)

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getProductsByCategory,
  type MarketplaceProduct,
} from "../lib/marketplace";
import ProductCard from "../components/marketplace/ProductCard";
import SEOHead from "../components/marketplace/SEOHead";

export default function PublicCategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Convertir slug a label legible: "ropa-de-mujer" → "Ropa De Mujer"
  const categoryLabel = slug
    ? decodeURIComponent(slug)
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "";

  useEffect(() => {
    async function load() {
      if (!slug) return;
      try {
        setLoading(true);
        const data = await getProductsByCategory(categoryLabel, 48);
        setProducts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, categoryLabel]);

  return (
    <div className="space-y-6">
      <SEOHead
        title={`${categoryLabel} - Dropship Perú`}
        description={`Explora productos de ${categoryLabel} de tiendas peruanas verificadas. Envíos rápidos en Iquitos y Lima.`}
      />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/" className="hover:text-gray-900">
          Inicio
        </Link>
        <span>›</span>
        <span className="font-semibold text-gray-900">{categoryLabel}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900 md:text-4xl">
          📁 {categoryLabel}
        </h1>
        <p className="mt-2 text-gray-500">
          {products.length} productos disponibles
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-gray-200" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
          <div className="text-6xl">📦</div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">
            Sin productos en esta categoría
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Explora otras categorías o vuelve pronto
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Volver al inicio
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}