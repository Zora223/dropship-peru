// src/pages/customer/CustomerDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchMyCustomerFavoritesCount,
  fetchMyCustomerOrders,
  type CustomerOrderWithStore,
} from "../../lib/customer-orders";
import type { OrderStatus, PaymentMethodType } from "../../types/database";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_CONFIG: Record<OrderStatus, { bg: string; text: string; icon: string }> = {
  pending_payment: { bg: "bg-amber-50", text: "text-amber-700", icon: "⏳" },
  confirmed: { bg: "bg-blue-50", text: "text-blue-700", icon: "✓" },
  shipped: { bg: "bg-purple-50", text: "text-purple-700", icon: "🚚" },
  delivered: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "📦" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", icon: "✗" },
};

const PAYMENT_LABELS: Record<PaymentMethodType, string> = {
  yape: "Yape",
  plin: "Plin",
  card: "Tarjeta",
  transfer: "Transferencia",
  cash_on_delivery: "Contra entrega",
};

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(value));
}

export default function CustomerDashboard() {
  const [orders, setOrders] = useState<CustomerOrderWithStore[]>([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);
      const [ordersData, favoritesData] = await Promise.all([
        fetchMyCustomerOrders(),
        fetchMyCustomerFavoritesCount(),
      ]);
      setOrders(ordersData);
      setFavoritesCount(favoritesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el resumen");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  const stats = useMemo(() => {
    const activeOrders = orders.filter(o => o.status !== "cancelled");
    const totalSpent = activeOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const pendingOrders = orders.filter(o =>
      o.status === "pending_payment" || o.status === "confirmed" || o.status === "shipped"
    ).length;
    return { totalOrders: orders.length, favorites: favoritesCount, totalSpent, pendingOrders };
  }, [orders, favoritesCount]);

  const recentOrders = useMemo(() => orders.slice(0, 3), [orders]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Hola de nuevo 👋</h1>
          <p className="mt-1 text-sm text-gray-500">Resumen de tu actividad.</p>
        </div>
        <button
          onClick={loadDashboard}
          className="self-start rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          🔄 Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Stats — 2 columnas en móvil */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm">
          <div className="text-xs sm:text-sm font-medium text-gray-500">Pedidos</div>
          <div className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-blue-600">{stats.totalOrders}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm">
          <div className="text-xs sm:text-sm font-medium text-gray-500">Activos</div>
          <div className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-purple-600">{stats.pendingOrders}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm">
          <div className="text-xs sm:text-sm font-medium text-gray-500">Favoritos</div>
          <div className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-rose-600">{stats.favorites}</div>
        </div>
        <div className="col-span-2 lg:col-span-1 rounded-2xl bg-linear-to-br from-gray-900 to-gray-800 p-4 sm:p-6 text-white shadow-sm">
          <div className="text-xs sm:text-sm font-medium text-white/70">Total gastado</div>
          <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-bold">{formatCurrency(stats.totalSpent)}</div>
        </div>
      </div>

      {/* Pedidos recientes */}
      <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Pedidos recientes</h2>
            <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Tus últimas compras.</p>
          </div>
          <Link to="/customer/orders" className="text-sm font-semibold text-rose-600 hover:text-rose-700 shrink-0">
            Ver todos →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 p-8 sm:p-12 text-center">
            <div className="text-4xl sm:text-5xl">🛍️</div>
            <h3 className="mt-4 text-base sm:text-lg font-bold text-gray-900">Aún no tienes pedidos</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto">
              Ingresa desde el enlace directo que te compartió tu vendedor.
            </p>
            <Link
              to="/"
              className="mt-6 inline-block rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Volver al inicio
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => {
              const status = STATUS_CONFIG[order.status];
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 p-3 sm:p-4 transition hover:bg-gray-50 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl text-base sm:text-lg ${status.bg}`}>
                      {status.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-gray-900">{order.order_number}</div>
                      <div className="truncate text-xs text-gray-500">
                        {order.store?.name ?? "Tienda"} · {formatDate(order.created_at)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {PAYMENT_LABELS[order.payment_method]}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold text-gray-900">{formatCurrency(order.total)}</div>
                    <div className={`text-xs font-semibold ${status.text}`}>{STATUS_LABELS[order.status]}</div>
                  </div>
                </div>
              );
            })}

            {/* Accesos rápidos */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Link
                to="/customer/orders"
                className="rounded-xl border border-gray-200 py-3 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                📦 Mis pedidos
              </Link>
              <Link
                to="/customer/favorites"
                className="rounded-xl border border-gray-200 py-3 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                ❤️ Favoritos
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}