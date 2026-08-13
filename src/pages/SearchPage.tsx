// src/pages/SearchPage.tsx
// 🏪 v22.15 - Página de búsqueda pública

import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { searchProducts, type MarketplaceProduct } from "../lib/marketplace";
import ProductCard from "../components/marketplace/ProductCard";
import SEOHead from "../components/marketplace/SEOHead";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState(query);

  useEffect(() => {
    async function load() {
      if (!query.trim()) {
        setProducts([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await searchProducts(query, 48);
        setProducts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      window.location.href = `/buscar?q=${encodeURIComponent(inputValue.trim())}`;
    }
  };

  return (
    <div className="space-y-6">
      <SEOHead
        title={query ? `Búsqueda: ${query} - Dropship Perú` : "Buscar productos - Dropship Perú"}
        description={`Resultados de búsqueda para "${query}" en Dropship Perú.`}
      />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/" className="hover:text-gray-900">
          Inicio
        </Link>
        <span>›</span>
        <span className="font-semibold text-gray-900">Búsqueda</span>
      </div>

      {/* Buscador */}
      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="flex gap-2 rounded-full bg-white p-2 shadow-md">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="🔍 Buscar productos..."
            className="flex-1 rounded-full bg-transparent px-4 py-2.5 text-sm outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-rose-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-rose-600"
          >
            Buscar
          </button>
        </div>
      </form>

      {/* Header resultados */}
      {query && (
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
            🔍 Resultados para "{query}"
          </h1>
          <p className="mt-2 text-gray-500">
            {loading ? "Buscando..." : `${products.length} productos encontrados`}
          </p>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-gray-200" />
          ))}
        </div>
      ) : !query ? (
        <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
          <div className="text-6xl">🔍</div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">
            Busca lo que necesitas
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Escribe el nombre de un producto arriba
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
          <div className="text-6xl">😕</div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">
            Sin resultados para "{query}"
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Intenta con otras palabras
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