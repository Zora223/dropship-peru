import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "../../components/StatCard";
import MiniChart from "../../components/MiniChart";
import {
  fetchPlatformStatsSummary,
  fetchPlatformSalesLastDays,
  fetchTopStores,
  fetchExpiringTrials,
  type PlatformStatsSummary,
  type DailyPlatformSales,
  type TopStoreItem,
  type ExpiringTrialItem,
} from "../../lib/admin-stats";
import { supabase } from "../../lib/supabase";
import type { DbOrder, DbStore } from "../../types/database";

interface RecentOrder extends DbOrder {
  store: Pick<DbStore, "id" | "name" | "slug"> | null;
}

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function formatCurrencyShort(value: number) {
  if (value >= 1000) return `S/ ${(value / 1000).toFixed(1)}k`;
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

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStatsSummary | null>(null);
  const [salesChart, setSalesChart] = useState<DailyPlatformSales[]>([]);
  const [topStores, setTopStores] = useState<TopStoreItem[]>([]);
  const [expiringTrials, setExpiringTrials] = useState<ExpiringTrialItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);

      const [statsData, chartData, topData, trialsData, ordersResult] =
        await Promise.all([
          fetchPlatformStatsSummary(),
          fetchPlatformSalesLastDays(7),
          fetchTopStores(5),
          fetchExpiringTrials(7, 5),
          supabase
            .from("orders")
            .select(
              `
              *,
              store:stores(id, name, slug)
            `
            )
            .order("created_at", { ascending: false })
            .limit(6),
        ]);

      setStats(statsData);
      setSalesChart(chartData);
      setTopStores(topData);
      setExpiringTrials(trialsData);

      if (ordersResult.error) throw ordersResult.error;
      setRecentOrders((ordersResult.data ?? []) as RecentOrder[]);
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
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 py-8">
        <div>
          <div className="h-9 w-72 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-100" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>

        <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (!stats) return null;

  const totalWeekChart = salesChart.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="space-y-6 py-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Panel de Administración 🎛️
          </h1>
          <p className="mt-1 text-gray-500">
            Visión general de toda la plataforma.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          🔄 Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPIs principales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Usuarios"
          value={stats.users.total}
          icon="👥"
          color="info"
          subtitle={`${stats.users.vendors} vendors · ${stats.users.customers} clientes`}
          trend={
            stats.users.new_this_week > 0
              ? {
                  value: stats.users.new_this_week,
                  label: "nuevos esta semana",
                }
              : undefined
          }
        />

        <StatCard
          label="Tiendas activas"
          value={stats.stores.active}
          icon="🏪"
          color="primary"
          subtitle={`${stats.stores.in_trial} en trial · ${stats.stores.suspended} suspendidas`}
        />

        <StatCard
          label="Pedidos esta semana"
          value={stats.orders.this_week}
          icon="🧾"
          color="warning"
          trend={{
            value: stats.orders.growth_pct,
            label: "vs semana pasada",
          }}
          subtitle={`${stats.orders.pending} pendientes de pago`}
        />

        <StatCard
          label="Ingresos totales"
          value={formatCurrency(stats.revenue.total)}
          icon="💰"
          color="dark"
          subtitle={`${formatCurrency(stats.revenue.this_month)} este mes`}
        />
      </div>

      {/* Métricas secundarias */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="MRR estimado"
          value={formatCurrency(stats.revenue.mrr_estimated)}
          icon="📈"
          color="success"
          subtitle="Ingreso recurrente mensual (tiendas × plan)"
        />

        <StatCard
          label="Ticket promedio"
          value={formatCurrency(stats.revenue.avg_ticket)}
          icon="🎯"
          color="default"
          subtitle="Sobre pedidos completados"
        />

        <StatCard
          label="Pedidos hoy"
          value={stats.orders.today}
          icon="📅"
          color="info"
          subtitle={`de ${stats.orders.total} pedidos totales`}
        />
      </div>

      {/* Alertas de trials expirando */}
      {expiringTrials.length > 0 && (
        <div className="rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⏰</span>
            <div className="flex-1">
              <div className="font-bold text-amber-900">
                {expiringTrials.length} trial
                {expiringTrials.length === 1 ? "" : "s"} por vencer
              </div>
              <p className="mt-1 text-sm text-amber-800">
                Estas tiendas terminan su período de prueba en los próximos 7
                días.
              </p>

              <div className="mt-4 space-y-2">
                {expiringTrials.map((trial) => (
                  <div
                    key={trial.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-gray-900">
                        {trial.name}
                      </div>
                      <div className="truncate text-xs text-gray-500">
                        {trial.owner_email ?? "Sin correo"}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        trial.days_left <= 2
                          ? "bg-red-100 text-red-700"
                          : trial.days_left <= 5
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {trial.days_left}d
                    </span>
                  </div>
                ))}
              </div>

              <Link
                to="/admin/stores"
                className="mt-3 inline-block text-sm font-semibold text-amber-900 underline"
              >
                Ver todas las tiendas →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Grid principal: gráfico + top tiendas */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Gráfico */}
        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                📊 Ventas de la plataforma (7 días)
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
                stats.orders.growth_pct >= 0
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {stats.orders.growth_pct >= 0 ? "↑" : "↓"}{" "}
              {Math.abs(stats.orders.growth_pct)}%
            </span>
          </div>

          <div className="mt-6">
            <MiniChart
              data={salesChart.map((d) => ({
                label: d.label,
                value: d.total,
              }))}
              color="#0891b2"
              height={180}
              formatValue={(v) => formatCurrencyShort(v)}
            />
          </div>
        </div>

        {/* Top tiendas */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">🏆 Top tiendas</h2>
          <p className="mt-1 text-xs text-gray-500">Por ventas totales</p>

          {topStores.length === 0 ? (
            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-center text-xs text-gray-500">
              Aún no hay ventas registradas.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {topStores.map((store, index) => (
                <a
                  key={store.id}
                  href={`/tienda/${store.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl bg-gray-50 p-2.5 transition hover:bg-gray-100"
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
                    {store.logo_url ? (
                      <img
                        src={store.logo_url}
                        alt={store.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>🏪</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-gray-900">
                      {store.name}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {store.orders_count} pedidos ·{" "}
                      {formatCurrency(store.total_sales)}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          <Link
            to="/admin/stores"
            className="mt-4 block rounded-xl border border-gray-200 py-2 text-center text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Ver todas las tiendas →
          </Link>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/admin/catalog"
          className="group rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="text-3xl">📦</div>
          <div className="mt-3 font-bold text-gray-900">Catálogo maestro</div>
          <div className="mt-1 text-sm text-gray-500">Gestiona productos</div>
        </Link>

        <Link
          to="/admin/stores"
          className="group rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="text-3xl">🏪</div>
          <div className="mt-3 font-bold text-gray-900">Tiendas</div>
          <div className="mt-1 text-sm text-gray-500">
            {stats.stores.total} tiendas registradas
          </div>
        </Link>

        <Link
          to="/admin/orders"
          className="group rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="text-3xl">🧾</div>
          <div className="mt-3 font-bold text-gray-900">Pedidos globales</div>
          <div className="mt-1 text-sm text-gray-500">
            {stats.orders.total} pedidos totales
          </div>
        </Link>

        <Link
          to="/admin/users"
          className="group rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="text-3xl">👥</div>
          <div className="mt-3 font-bold text-gray-900">Usuarios</div>
          <div className="mt-1 text-sm text-gray-500">
            {stats.users.total} cuentas activas
          </div>
        </Link>
      </div>

      {/* Últimos pedidos */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              🧾 Pedidos recientes
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Últimos pedidos registrados en la plataforma.
            </p>
          </div>
          <Link
            to="/admin/orders"
            className="text-sm font-semibold text-rose-600 hover:text-rose-700"
          >
            Ver todos →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="mt-6 rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-400">
            No hay pedidos recientes para mostrar.
          </p>
        ) : (
          <>
            {/* Desktop tabla */}
            <div className="mt-6 hidden overflow-hidden rounded-2xl border border-gray-100 md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Pedido</th>
                    <th className="px-4 py-3 font-medium">Tienda</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-gray-900">
                        {order.order_number}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {order.store?.name ?? "Tienda"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {order.customer_name}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatShortDate(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="mt-6 space-y-3 md:hidden">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs font-bold text-gray-900">
                        {order.order_number}
                      </div>
                      <div className="mt-1 truncate text-sm text-gray-700">
                        🏪 {order.store?.name ?? "Tienda"}
                      </div>
                      <div className="truncate text-xs text-gray-500">
                        👤 {order.customer_name}
                      </div>
                      <div className="mt-1 text-[10px] text-gray-400">
                        {formatShortDate(order.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-gray-900">
                        {formatCurrency(order.total)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}