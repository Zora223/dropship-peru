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
  pending_payment: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    icon: "⏳",
  },
  confirmed: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    icon: "✓",
  },
  shipped: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    icon: "🚚",
  },
  delivered: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    icon: "📦",
  },
  cancelled: {
    bg: "bg-red-50",
    text: "text-red-700",
    icon: "✗",
  },
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
  }).format(new Date(value));
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
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar el resumen de cliente"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const activeOrders = orders.filter((order) => order.status !== "cancelled");

    const totalSpent = activeOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    const pendingOrders = orders.filter(
      (order) =>
        order.status === "pending_payment" ||
        order.status === "confirmed" ||
        order.status === "shipped"
    ).length;

    return {
      totalOrders: orders.length,
      favorites: favoritesCount,
      totalSpent,
      pendingOrders,
    };
  }, [orders, favoritesCount]);

  const recentOrders = useMemo(() => {
    return orders.slice(0, 3);
  }, [orders]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-9 w-56 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-gray-100" />
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-2xl bg-gray-100"
            />
          ))}
        </div>

        <div className="h-80 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Hola de nuevo
          </h1>
          <p className="mt-1 text-gray-500">
            Aquí tienes el resumen de tu actividad.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-500">
            Pedidos realizados
          </div>
          <div className="mt-2 text-3xl font-bold text-blue-600">
            {stats.totalOrders}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-500">
            Pedidos activos
          </div>
          <div className="mt-2 text-3xl font-bold text-purple-600">
            {stats.pendingOrders}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-500">
            Favoritos
          </div>
          <div className="mt-2 text-3xl font-bold text-rose-600">
            {stats.favorites}
          </div>
        </div>

        <div className="rounded-2xl bg-linear-to-br from-gray-900 to-gray-800 p-6 text-white shadow-sm">
          <div className="text-sm font-medium text-white/70">
            Total comprado
          </div>
          <div className="mt-2 text-3xl font-bold">
            {formatCurrency(stats.totalSpent)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Pedidos recientes
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Tus últimas compras realizadas.
            </p>
          </div>

          <Link
            to="/customer/orders"
            className="text-sm font-semibold text-rose-600 hover:text-rose-700"
          >
            Ver todos →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-gray-50 p-12 text-center">
  <div className="text-5xl">🛍️</div>

  <h3 className="mt-4 text-lg font-bold text-gray-900">
    Aún no tienes pedidos
  </h3>

  <p className="mt-2 text-sm text-gray-500">
    Para comprar, ingresa desde el enlace directo que te compartió tu vendedor.
  </p>

  <Link
    to="/"
    className="mt-6 inline-block rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
  >
    Volver al inicio
  </Link>
</div>
        ) : (
          <div className="mt-4 space-y-3">
            {recentOrders.map((order) => {
              const status = STATUS_CONFIG[order.status];

              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 p-4 transition hover:bg-gray-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg ${status.bg}`}
                    >
                      {status.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-gray-900">
                        {order.order_number}
                      </div>
                      <div className="truncate text-xs text-gray-500">
                        {order.store?.name ?? "Tienda"} ·{" "}
                        {formatDate(order.created_at)}
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        {PAYMENT_LABELS[order.payment_method]}
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 text-right">
                    <div className="text-sm font-bold text-gray-900">
                      {formatCurrency(order.total)}
                    </div>
                    <div className={`text-xs font-semibold ${status.text}`}>
                      {STATUS_LABELS[order.status]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}