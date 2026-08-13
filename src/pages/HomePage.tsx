// src/pages/HomePage.tsx
// 🏪 v22.17 - HomePage sin exposición de tiendas (respeta cartera protegida)

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
          getFeaturedProducts(12),
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
    <div className="space-y-16">
      <SEOHead
        title="Dropship Perú - Marketplace de productos peruanos"
        description="Descubre productos únicos de emprendedores peruanos. Envíos en 24-48h en Iquitos y Lima. Compra directo a tiendas verificadas."
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

        <div className="relative px-6 py-16 text-center md:px-16 md:py-24">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-200 backdrop-blur">
            <span>🌴</span>
            <span>Hecho en Iquitos, para todo el Perú</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
            Descubre productos <br />
            <span className="text-rose-400">de emprendedores peruanos</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-300 md:text-xl">
            El marketplace <strong className="text-emerald-300">nacido en la Amazonía</strong>.
            Compra directo. Envíos rápidos.
          </p>

          {/* Buscador */}
          <form onSubmit={handleSearch} className="mx-auto mt-8 max-w-2xl">
            <div className="flex gap-2 rounded-full bg-white p-2 shadow-2xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Buscar productos, categorías..."
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

          {/* Stats social proof */}
          {stats.total_products > 0 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/80">
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
          PRODUCTOS DESTACADOS
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
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                <div key={i} className="aspect-square animate-pulse rounded-2xl bg-gray-200" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════
          CATEGORÍAS
      ═══════════════════════════════════════════════ */}
      {categories.length > 0 && (
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
              📁 Explora por categoría
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Encuentra lo que buscas
            </p>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {categories.slice(0, 12).map((cat) => (
              <Link
                key={cat.name}
                to={`/categoria/${encodeURIComponent(cat.name.toLowerCase().replace(/\s+/g, "-"))}`}
                className="group flex flex-col items-center justify-center rounded-2xl bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="text-4xl transition group-hover:scale-110">
                  {cat.emoji}
                </div>
                <h3 className="mt-2 text-center text-xs font-bold text-gray-900">
                  {cat.name}
                </h3>
                <span className="mt-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                  {cat.product_count} productos
                </span>
              </Link>
            ))}
          </div>
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
          CÓMO FUNCIONA
      ═══════════════════════════════════════════════ */}
      <section className="rounded-3xl bg-white p-8 shadow-sm md:p-10">
        <div className="text-center">
          <h2 className="text-3xl font-black tracking-tight text-gray-900">
            ¿Cómo funciona?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-500">
            Un flujo simple para vender online sin complicaciones.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-gray-50 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-2xl font-black">
              1
            </div>
            <h3 className="mt-4 font-bold text-gray-900">Crea tu tienda</h3>
            <p className="mt-2 text-sm text-gray-600">
              Configura nombre, logo, productos, colores y métodos de pago.
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-2xl font-black">
              2
            </div>
            <h3 className="mt-4 font-bold text-gray-900">Comparte tu enlace</h3>
            <p className="mt-2 text-sm text-gray-600">
              Envía tu link por WhatsApp, Instagram, Facebook o campañas.
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl font-black">
              3
            </div>
            <h3 className="mt-4 font-bold text-gray-900">Recibe pedidos</h3>
            <p className="mt-2 text-sm text-gray-600">
              Gestiona pagos, estados, envíos y productos desde tu panel.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          PROVEEDORES
      ═══════════════════════════════════════════════ */}
      <section className="overflow-hidden rounded-3xl bg-linear-to-br from-amber-50 via-orange-50 to-amber-100 shadow-sm">
        <div className="grid gap-8 p-8 md:grid-cols-2 md:items-center md:gap-12 md:p-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700">
              <span>🏭</span>
              <span>Para proveedores mayoristas</span>
            </div>

            <h2 className="mt-4 text-3xl font-black tracking-tight text-gray-900 md:text-4xl">
              ¿Vendes al por mayor?
            </h2>

            <p className="mt-4 text-lg text-gray-700">
              Súbete a la plataforma. Nuestras tiendas venderán tus productos y
              tú recibes el pago <b>al instante por Yape</b> cuando confirmes cada
              pedido.
            </p>

            <ul className="mt-6 space-y-3">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                  ✓
                </span>
                <div>
                  <div className="font-semibold text-gray-900">Cobros inmediatos por Yape</div>
                  <div className="text-sm text-gray-600">
                    Al confirmar disponibilidad, te pagamos al toque
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                  ✓
                </span>
                <div>
                  <div className="font-semibold text-gray-900">Cero riesgo, cero espera</div>
                  <div className="text-sm text-gray-600">
                    No adelantas nada, no esperas al cliente
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                  ✓
                </span>
                <div>
                  <div className="font-semibold text-gray-900">Múltiples vendedores</div>
                  <div className="text-sm text-gray-600">
                    Amplía tu alcance sin invertir en publicidad
                  </div>
                </div>
              </li>
            </ul>

            <Link
              to="/registro-proveedor"
              className="mt-8 inline-block rounded-full bg-amber-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-amber-600 hover:shadow-xl"
            >
              🏭 Regístrate como proveedor
            </Link>
          </div>

          <div className="relative">
            <div className="rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-4">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Panel Proveedor
                </div>
                <div className="mt-1 text-lg font-bold text-gray-900">
                  Hola Kevin 👋
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="text-xl">🆕</div>
                  <div className="mt-1 text-lg font-bold text-gray-900">3</div>
                  <div className="text-[10px] font-semibold text-gray-600">Por atender</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-xl">✅</div>
                  <div className="mt-1 text-lg font-bold text-gray-900">8</div>
                  <div className="text-[10px] font-semibold text-gray-600">Confirmados</div>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <div className="text-xl">💰</div>
                  <div className="mt-1 text-sm font-bold text-gray-900">S/. 950</div>
                  <div className="text-[10px] font-semibold text-gray-600">Cobrado hoy</div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-2 text-[10px] text-emerald-800">
                <span>💚</span>
                <span className="font-semibold">
                  Al confirmar, te pagamos por Yape
                </span>
              </div>
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