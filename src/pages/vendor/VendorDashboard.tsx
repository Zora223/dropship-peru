import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductForm from "../../components/vendor/ProductForm";
import TrialBanner from "../../components/vendor/TrialBanner";
import StatCard from "../../components/StatCard";
import MiniChart from "../../components/MiniChart";
import { useMyStore } from "../../hooks/useMyStore";
import { fetchVendorOrders } from "../../lib/vendor-orders";
import PickupOrdersSection from "../../components/vendor/PickupOrdersSection";
import {
  fetchVendorStatsSummary,
  fetchVendorSalesLastDays,
  fetchVendorTopProducts,
  type VendorStatsSummary,
  type DailySales,
  type TopSellingProduct,
} from "../../lib/vendor-stats";
import type {
  DbOrder,
  OrderStatus,
  PaymentMethodType,
} from "../../types/database";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pendiente",
  confirmed: "Confirmado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_CONFIG: Record<
  OrderStatus,
  { bg: string; text: string; emoji: string }
> = {
  pending_payment: { bg: "bg-amber-50", text: "text-amber-700", emoji: "⏳" },
  confirmed: { bg: "bg-blue-50", text: "text-blue-700", emoji: "✅" },
  shipped: { bg: "bg-purple-50", text: "text-purple-700", emoji: "🚚" },
  delivered: { bg: "bg-emerald-50", text: "text-emerald-700", emoji: "🎉" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", emoji: "❌" },
};

const PAYMENT_LABELS: Record<PaymentMethodType, string> = {
  yape: "Yape",
  plin: "Plin",
  card: "Tarjeta",
  transfer: "Transferencia",
  cash_on_delivery: "Pago contra entrega",
};

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function formatCurrencyShort(value: number) {
  if (value >= 1000) {
    return `S/ ${(value / 1000).toFixed(1)}k`;
  }
  return `S/ ${Number(value || 0).toFixed(0)}`;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function VendorDashboard() {
  const { store, loading: storeLoading, error: storeError } = useMyStore();

  const [stats, setStats] = useState<VendorStatsSummary | null>(null);
  const [salesChart, setSalesChart] = useState<DailySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopSellingProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<DbOrder[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [productCreated, setProductCreated] = useState(false);

  async function loadDashboard() {
    if (!store?.id) return;

    try {
      setLoading(true);
      setError(null);

      const [statsData, chartData, topData, ordersData] = await Promise.all([
        fetchVendorStatsSummary(store.id),
        fetchVendorSalesLastDays(store.id, 7),
        fetchVendorTopProducts(store.id, 5),
        fetchVendorOrders(store.id),
      ]);

      setStats(statsData);
      setSalesChart(chartData);
      setTopProducts(topData);
      setRecentOrders((ordersData ?? []).slice(0, 5));
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al cargar dashboard"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (store?.id) {
      loadDashboard();
    }
    if (!storeLoading && !store) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id, storeLoading]);

  const handleProductSaved = async () => {
    setShowForm(false);
    setProductCreated(true);
    await loadDashboard();
    setTimeout(() => setProductCreated(false), 3000);
  };

  if (storeLoading || loading) {
    return (
      <div className="space-y-8 py-8">
        <div>
          <div className="h-9 w-56 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-gray-100" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-96 animate-pulse rounded-2xl bg-gray-100 lg:col-span-2" />
          <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (storeError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
        {storeError}
      </div>
    );
  }

  if (!store) {
    return (
      <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
        <div className="text-6xl">🏪</div>
        <h2 className="mt-4 text-xl font-bold text-gray-900">
          Aún no tienes tienda
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Primero crea tu tienda para poder vender productos y recibir pedidos.
        </p>
        <Link
          to="/crear-tienda"
          className="mt-6 inline-block rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-gray-800"
        >
          Crear mi tienda
        </Link>
      </div>
    );
  }

  if (!stats) return null;

  const totalWeekChart = salesChart.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="space-y-6 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Mi Tienda 👋
          </h1>
          <p className="mt-1 text-gray-500">
            Resumen de{" "}
            <span className="font-semibold text-gray-700">{store.name}</span>
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Banner de trial */}
      <TrialBanner store={store} />

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
       {/* 🆕 v17: Pedidos pickup */}
      <PickupOrdersSection storeId={store.id} />

      {productCreated && (
        <div className="rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <div className="font-bold text-emerald-900">
                ¡Producto guardado!
              </div>
              <div className="text-sm text-emerald-700">
                Ya está disponible en tu tienda.{" "}
                <Link
                  to="/vendor/products"
                  className="font-semibold underline"
                >
                  Ver mis productos →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPIs principales — 4 cards con trend */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ventas del mes"
          value={formatCurrency(stats.this_month.revenue)}
          icon="💰"
          color="success"
          trend={{
            value: stats.this_month.growth_pct,
            label: "vs mes pasado",
          }}
          subtitle={`${stats.this_month.orders} pedidos completados`}
        />

        <StatCard
          label="Esta semana"
          value={formatCurrency(stats.this_week.revenue)}
          icon="📈"
          color="info"
          trend={{
            value: stats.this_week.growth_pct,
            label: "vs semana pasada",
          }}
          subtitle={`${stats.this_week.orders} pedidos`}
        />

        <StatCard
          label="Pendientes"
          value={stats.pending.orders}
          icon="⏳"
          color="warning"
          subtitle={`${formatCurrency(stats.pending.revenue)} por cobrar`}
        />

        <StatCard
          label="Ticket promedio"
          value={formatCurrency(stats.totals.avg_ticket)}
          icon="🎯"
          color="dark"
          subtitle={`Sobre ${stats.totals.all_orders} pedidos totales`}
        />
      </div>

      {/* Alertas de stock */}
      {(stats.totals.low_stock > 0 || stats.totals.out_of_stock > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {stats.totals.low_stock > 0 && (
            <div className="rounded-2xl border-l-4 border-orange-500 bg-orange-50 p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <div className="font-bold text-orange-900">
                    Productos con stock bajo
                  </div>
                  <p className="mt-1 text-sm text-orange-800">
                    {stats.totals.low_stock} producto
                    {stats.totals.low_stock === 1 ? "" : "s"} con 5 unidades o
                    menos.
                  </p>
                  <Link
                    to="/vendor/products"
                    className="mt-2 inline-block text-sm font-semibold text-orange-700 underline"
                  >
                    Revisar productos →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {stats.totals.out_of_stock > 0 && (
            <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">❌</span>
                <div className="flex-1">
                  <div className="font-bold text-red-900">
                    Productos agotados
                  </div>
                  <p className="mt-1 text-sm text-red-800">
                    {stats.totals.out_of_stock} producto
                    {stats.totals.out_of_stock === 1 ? "" : "s"} sin stock.
                  </p>
                  <Link
                    to="/vendor/products"
                    className="mt-2 inline-block text-sm font-semibold text-red-700 underline"
                  >
                    Gestionar stock →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid principal: gráfico + panel lateral */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* Gráfico de ventas */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  📊 Ventas últimos 7 días
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Total:{" "}
                  <span className="font-bold text-gray-900">
                    {formatCurrency(totalWeekChart)}
                  </span>
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  stats.this_week.growth_pct >= 0
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {stats.this_week.growth_pct >= 0 ? "↑" : "↓"}{" "}
                {Math.abs(stats.this_week.growth_pct)}%
              </span>
            </div>

            <div className="mt-6">
              <MiniChart
                data={salesChart.map((d) => ({
                  label: d.label,
                  value: d.total,
                }))}
                color="#e11d48"
                height={160}
                formatValue={(v) => formatCurrencyShort(v)}
              />
            </div>
          </div>

          {/* Últimos pedidos */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  🧾 Últimos pedidos
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Pedidos más recientes de tu tienda.
                </p>
              </div>
              <Link
                to="/vendor/orders"
                className="text-sm font-semibold text-rose-600 hover:text-rose-700"
              >
                Ver todos →
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-gray-50 p-8 text-center">
                <div className="text-4xl">📭</div>
                <h3 className="mt-3 font-bold text-gray-900">
                  Aún no tienes pedidos
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Cuando tus clientes compren, aparecerán aquí.
                </p>
              </div>
            ) : (
              <>
                {/* 🖥️ Desktop: tabla */}
                <div className="mt-6 hidden overflow-hidden rounded-2xl border border-gray-100 md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Pedido</th>
                        <th className="px-4 py-3 font-medium">Cliente</th>
                        <th className="px-4 py-3 font-medium">Total</th>
                        <th className="px-4 py-3 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-mono text-xs font-bold text-gray-900">
                              {order.order_number}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {formatShortDate(order.created_at)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {order.customer_name}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {PAYMENT_LABELS[order.payment_method] ??
                                order.payment_method}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900">
                            {formatCurrency(order.total)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                STATUS_CONFIG[order.status].bg
                              } ${STATUS_CONFIG[order.status].text}`}
                            >
                              {STATUS_CONFIG[order.status].emoji}{" "}
                              {STATUS_LABELS[order.status]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 📱 Mobile: cards */}
                <div className="mt-6 space-y-3 md:hidden">
                  {recentOrders.map((order) => {
                    const status = STATUS_CONFIG[order.status];
                    return (
                      <div
                        key={order.id}
                        className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-xs font-bold text-gray-900">
                              {order.order_number}
                            </div>
                            <div className="truncate text-sm font-medium text-gray-900">
                              {order.customer_name}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {formatShortDate(order.created_at)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-black text-gray-900">
                              {formatCurrency(order.total)}
                            </div>
                            <span
                              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.bg} ${status.text}`}
                            >
                              {status.emoji} {STATUS_LABELS[order.status]}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Estado de tienda */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              🏪 Estado de la tienda
            </h2>

            <div className="mt-4 flex items-center gap-3">
              <span
                className={`h-3 w-3 animate-pulse rounded-full ${
                  store.is_active ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm font-medium text-gray-700">
                {store.is_active
                  ? "Tienda activa y visible"
                  : "Tienda inactiva"}
              </span>
            </div>

            <p className="mt-2 text-xs text-gray-400">
              {store.is_active
                ? "Tus productos aparecen en tu tienda pública."
                : "Activa tu tienda para que los clientes compren."}
            </p>

            <div className="mt-4 rounded-xl bg-gray-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                URL de tu tienda
              </div>
              <a
                href={`/tienda/${store.slug}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate text-sm font-mono font-semibold text-rose-600 hover:underline"
              >
                /tienda/{store.slug}
              </a>
            </div>

            <div className="mt-4 space-y-2">
              <Link
                to="/vendor/settings"
                className="block rounded-xl bg-gray-900 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                ⚙️ Configurar tienda
              </Link>
              <a
                href={`/tienda/${store.slug}`}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-gray-200 py-2.5 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                👁 Ver mi tienda
              </a>
            </div>
          </div>

          {/* Top productos vendidos */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              🏆 Top productos
            </h2>
            <p className="mt-1 text-xs text-gray-500">Los más vendidos</p>

            {topProducts.length === 0 ? (
              <div className="mt-4 rounded-xl bg-gray-50 p-4 text-center text-xs text-gray-500">
                Aún no hay productos vendidos.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {topProducts.map((product, index) => (
                  <div
                    key={product.product_id}
                    className="flex items-center gap-3 rounded-xl bg-gray-50 p-2.5"
                  >
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        index === 0
                          ? "bg-amber-400 text-white"
                          : index === 1
                          ? "bg-gray-300 text-gray-800"
                          : index === 2
                          ? "bg-orange-400 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.product_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>📦</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-gray-900">
                        {product.product_name}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {product.quantity_sold} vendidos ·{" "}
                        {formatCurrency(product.total_revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Link
              to="/vendor/products"
              className="mt-4 block rounded-xl border border-gray-200 py-2 text-center text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Ver todos los productos →
            </Link>
          </div>

          {/* Acción rápida */}
          <div className="rounded-2xl bg-linear-to-br from-gray-900 to-gray-800 p-6 text-white shadow-lg">
            <h2 className="text-lg font-bold">⚡ Acción rápida</h2>
            <p className="mt-1 text-xs text-white/70">
              Amplía tu catálogo en segundos.
            </p>

            <button
              onClick={() => setShowForm(true)}
              className="mt-4 w-full rounded-xl bg-rose-500 py-3 text-sm font-bold text-white shadow transition hover:bg-rose-600 active:scale-95"
            >
              + Crear producto propio
            </button>

            <Link
              to="/vendor/catalog"
              className="mt-2 block w-full rounded-xl border border-white/20 py-2.5 text-center text-xs font-semibold text-white/80 transition hover:bg-white/10"
            >
              📚 Importar del catálogo
            </Link>

            <Link
              to="/vendor/orders"
              className="mt-2 block w-full rounded-xl border border-white/20 py-2.5 text-center text-xs font-semibold text-white/80 transition hover:bg-white/10"
            >
              🧾 Gestionar pedidos
            </Link>
          </div>
        </div>
      </div>

      {showForm && (
        <ProductForm
          storeId={store.id}
          onClose={() => setShowForm(false)}
          onSaved={handleProductSaved}
          initial={null}
        />
      )}
    </div>
  );
}