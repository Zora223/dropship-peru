// src/pages/HomePage.tsx
// 🏪 v22.20 - Homepage estilo "collage de apps" iOS/Android

import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  getFeaturedProducts,
  getCategories,
  getMarketplaceStats,
  type MarketplaceProduct,
  type MarketplaceCategory,
  type MarketplaceStats,
} from "../lib/marketplace";
import ProductCard from "../components/marketplace/ProductCard";
import SEOHead from "../components/marketplace/SEOHead";

// 🎨 Colores de fondo bonitos para cada categoría (rotativos)
const CATEGORY_BG_COLORS = [
  "from-rose-100 to-pink-200",
  "from-blue-100 to-cyan-200",
  "from-amber-100 to-orange-200",
  "from-emerald-100 to-teal-200",
  "from-purple-100 to-fuchsia-200",
  "from-yellow-100 to-amber-200",
  "from-indigo-100 to-blue-200",
  "from-lime-100 to-green-200",
  "from-red-100 to-rose-200",
  "from-sky-100 to-blue-200",
  "from-fuchsia-100 to-pink-200",
  "from-teal-100 to-cyan-200",
];

function getCategoryBgColor(index: number): string {
  return CATEGORY_BG_COLORS[index % CATEGORY_BG_COLORS.length];
}

export default function HomePage() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [stats, setStats] = useState<MarketplaceStats>({
    total_stores: 0,
    total_products: 0,
    total_categories: 0,
    active_vendors: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadMarketplace() {
      try {
        setLoading(true);
        const [productsData, categoriesData, statsData] = await Promise.all([
          getFeaturedProducts(18),
          getCategories(),
          getMarketplaceStats(),
        ]);

        setProducts(productsData);
        setCategories(categoriesData);
        setStats(statsData);
      } catch (err) {
        console.error("Error loading marketplace:", err);
      } finally {
        setLoading(false);
      }
    }

    loadMarketplace();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/buscar?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <div className="space-y-12">
      <SEOHead
        title="Dropship Perú - Marketplace de productos peruanos"
        description="Descubre productos únicos de emprendedores peruanos. Envíos en 24-48h en Iquitos y Lima."
      />

      {/* ═══════════════════════════════════════════════
          HERO IQUITEÑO + BUSCADOR
      ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-gray-900 via-emerald-900 to-rose-900 text-white shadow-2xl">
        <div className="absolute -right-16 -top-16 text-[200px] opacity-10">
          🌴
        </div>
        <div className="absolute -bottom-16 -left-16 text-[200px] opacity-10">
          🌿
        </div>

        <div className="relative px-6 py-12 text-center md:px-16 md:py-20">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-200 backdrop-blur">
            <span>🌴</span>
            <span>Hecho en Iquitos, para todo el Perú</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">
            Descubre productos <br />
            <span className="text-rose-400">de emprendedores peruanos</span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-base text-gray-300 md:text-lg">
            Compra directo. Envíos rápidos. Sin esperar Lima 🚀
          </p>

          {/* Buscador */}
          <form onSubmit={handleSearch} className="mx-auto mt-6 max-w-2xl">
            <div className="flex gap-2 rounded-full bg-white p-2 shadow-2xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Buscar productos..."
                className="flex-1 rounded-full bg-transparent px-4 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
              <button
                type="submit"
                className="rounded-full bg-rose-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-rose-600"
              >
                Buscar
              </button>
            </div>
          </form>

          {stats.total_products > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-white/80">
              <div>
                <span className="font-black text-rose-300">{stats.total_products}</span> productos
              </div>
              <span className="opacity-50">·</span>
              <div>
                <span className="font-black text-amber-300">{stats.total_categories}</span> categorías
              </div>
              <span className="opacity-50">·</span>
              <div>
                <span className="font-black text-emerald-300">24-48h</span> envío
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          🎨 CATEGORÍAS — Estilo collage apps
      ═══════════════════════════════════════════════ */}
      {categories.length > 0 && (
        <section>
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
              📁 Explora por categoría
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Toca una categoría para ver todos los productos
            </p>
          </div>

          {/* Grid tipo apps de celular */}
          <div className="grid gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {categories.slice(0, 16).map((cat, idx) => (
              <Link
                key={cat.name}
                to={`/categoria/${encodeURIComponent(cat.name.toLowerCase().replace(/\s+/g, "-"))}`}
                className="group flex flex-col items-center"
              >
                {/* Icono cuadrado tipo app */}
                <div
                  className={`aspect-square w-full rounded-2xl bg-linear-to-br ${getCategoryBgColor(idx)} p-3 shadow-md transition group-hover:-translate-y-1 group-hover:shadow-lg flex items-center justify-center`}
                >
                  <div className="text-4xl sm:text-5xl transition group-hover:scale-110">
                    {cat.emoji}
                  </div>
                </div>

                {/* Nombre debajo (como en iOS/Android) */}
                <div className="mt-2 text-center">
                  <div className="text-xs font-bold text-gray-900 line-clamp-1">
                    {cat.name}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {cat.product_count} {cat.product_count === 1 ? "prod." : "prods."}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
          🔥 PRODUCTOS DESTACADOS — Grid pequeño
      ═══════════════════════════════════════════════ */}
      {(loading || products.length > 0) && (
        <section>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
                🔥 Productos destacados
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Lo más nuevo del marketplace
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-gray-200" />
              ))}
            </div>
          ) : (
            <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════
          IDENTIDAD IQUITEÑA
      ═══════════════════════════════════════════════ */}
      <section className="rounded-3xl bg-linear-to-br from-emerald-50 via-teal-50 to-cyan-50 p-8 shadow-sm md:p-10">
        <div className="grid gap-8 md:grid-cols-3 md:items-center">
          <div className="text-center md:text-left">
            <div className="mb-2 text-6xl md:text-7xl">🌴</div>
            <h3 className="text-2xl font-black text-emerald-900">
              Somos de Iquitos
            </h3>
            <p className="mt-1 text-sm font-semibold text-emerald-700">
              Loreto, Perú 🇵🇪
            </p>
          </div>
          <div className="md:col-span-2">
            <h2 className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
              Cansados de que todo se centralice en Lima 😤
            </h2>
            <p className="mt-3 text-gray-700">
              Sabemos que en <strong>Iquitos hay talento, emprendimiento y ganas</strong>,
              pero pocas herramientas tecnológicas hechas pensando en nuestra realidad.
            </p>
            <p className="mt-3 text-gray-700">
              Por eso creamos <strong>Dropship Perú</strong>: primero para nuestra ciudad
              🌴, con delivery real en Iquitos y expansión creciente a Lima.
              <strong className="text-emerald-700"> Sin excusas, sin fronteras.</strong>
            </p>
            <Link
              to="/nosotros"
              className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-900"
            >
              Conoce nuestra historia →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CTA VENDEDORES
      ═══════════════════════════════════════════════ */}
      <section className="rounded-3xl bg-white p-8 shadow-sm md:p-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="text-sm font-bold uppercase tracking-wider text-rose-600">
              💼 Para emprendedores
            </div>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-900 md:text-4xl">
              Crea tu tienda online <span className="text-rose-500">GRATIS</span>
            </h2>

            <p className="mt-4 text-gray-600">
              Únete a nuestra red de tiendas verificadas. Sin inventario, sin
              inversión inicial, sin comisiones abusivas.
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                  ✓
                </span>
                <div>
                  <div className="font-semibold text-gray-900">Tu propio link</div>
                  <div className="text-sm text-gray-600">
                    Comparte tu tienda en WhatsApp, redes o campañas
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                  ✓
                </span>
                <div>
                  <div className="font-semibold text-gray-900">Catálogo mayorista</div>
                  <div className="text-sm text-gray-600">
                    Cientos de productos listos para vender
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                  ✓
                </span>
                <div>
                  <div className="font-semibold text-gray-900">IA integrada</div>
                  <div className="text-sm text-gray-600">
                    Fotos profesionales y textos que venden, en segundos
                  </div>
                </div>
              </div>
            </div>

            <Link
              to="/register"
              className="mt-8 inline-block rounded-full bg-rose-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-rose-600 hover:shadow-xl"
            >
              Crear mi tienda GRATIS →
            </Link>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl bg-linear-to-br from-rose-50 to-pink-50 p-5">
              <div className="text-2xl">🔗</div>
              <h3 className="mt-2 font-bold text-gray-900">
                Acceso por link directo
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Tus clientes ven tu tienda, no un marketplace lleno de competencia.
              </p>
            </div>

            <div className="rounded-2xl bg-linear-to-br from-emerald-50 to-teal-50 p-5">
              <div className="text-2xl">🛡️</div>
              <h3 className="mt-2 font-bold text-gray-900">
                Cartera protegida
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                No exponemos a tus clientes a otros vendedores. Tu marca, tu venta.
              </p>
            </div>

            <div className="rounded-2xl bg-linear-to-br from-amber-50 to-orange-50 p-5">
              <div className="text-2xl">⚡</div>
              <h3 className="mt-2 font-bold text-gray-900">
                Sin fricción
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Pedidos organizados, pagos automáticos, envíos gestionados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CTA FINAL
      ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-gray-900 via-emerald-900 to-gray-900 px-8 py-16 text-center text-white">
        <div className="absolute -right-8 top-4 text-[120px] opacity-10">🌴</div>
        <div className="absolute -left-8 bottom-4 text-[120px] opacity-10">🌿</div>

        <div className="relative">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-200 backdrop-blur">
            <span>🌴</span>
            <span>Desde la selva para el Perú</span>
          </div>

          <h2 className="text-3xl font-bold md:text-4xl">
            Empieza a vender hoy
          </h2>

          <p className="mx-auto mt-4 max-w-lg text-gray-300">
            Únete a la comunidad de emprendedores que están rompiendo la
            centralización. Vende sin fronteras, desde donde estés.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-block rounded-full bg-rose-500 px-10 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-rose-600 hover:shadow-xl"
            >
              Crear mi tienda ahora
            </Link>
            <Link
              to="/registro-proveedor"
              className="inline-block rounded-full border-2 border-amber-400/40 bg-amber-500/10 px-10 py-4 text-base font-semibold text-amber-300 backdrop-blur transition hover:border-amber-400 hover:bg-amber-500/20"
            >
              🏭 Soy proveedor
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}