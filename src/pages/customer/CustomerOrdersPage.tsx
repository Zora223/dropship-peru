import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchMyCustomerOrders,
  type CustomerOrderWithStore,
} from "../../lib/customer-orders";
import type {
  DbOrderItem,
  DbShippingAddress,
  OrderStatus,
  PaymentMethodType,
} from "../../types/database";

type OrderFilter = "all" | OrderStatus;

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_CONFIG: Record<
  OrderStatus,
  { bg: string; text: string; icon: string }
> = {
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
  cash_on_delivery: "Pago contra entrega",
};

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending_payment", label: "Pendientes" },
  { value: "confirmed", label: "Confirmados" },
  { value: "shipped", label: "Enviados" },
  { value: "delivered", label: "Entregados" },
  { value: "cancelled", label: "Cancelados" },
];

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

// 🆕 v20 - Acepta null
function formatAddress(address: DbShippingAddress | null): string {
  if (!address) return "🏪 Recojo en tienda";
  return [address.street, address.district, address.city]
    .filter(Boolean)
    .join(", ");
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<CustomerOrderWithStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<OrderFilter>("all");
  const [selectedOrder, setSelectedOrder] =
    useState<CustomerOrderWithStore | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMyCustomerOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al cargar tus pedidos"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (activeFilter === "all") return orders;
    return orders.filter((order) => order.status === activeFilter);
  }, [orders, activeFilter]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      pendientes: orders.filter(
        (order) =>
          order.status === "pending_payment" || order.status === "confirmed"
      ).length,
      enviados: orders.filter((order) => order.status === "shipped").length,
      entregados: orders.filter((order) => order.status === "delivered").length,
    };
  }, [orders]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Mis pedidos</h1>
          <p className="mt-1 text-sm text-gray-500">Historial de tus compras y seguimiento.</p>
        </div>
        <button
          onClick={loadOrders}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total pedidos</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pendientes</div>
          <div className="mt-2 text-3xl font-bold text-amber-600">{stats.pendientes}</div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Enviados</div>
          <div className="mt-2 text-3xl font-bold text-purple-600">{stats.enviados}</div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Entregados</div>
          <div className="mt-2 text-3xl font-bold text-emerald-600">{stats.entregados}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeFilter === filter.value
                ? "bg-gray-900 text-white shadow"
                : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
          <div className="text-6xl">🛍️</div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">Aún no tienes pedidos</h2>
          <p className="mt-2 text-sm text-gray-500">
            Para realizar una compra, entra desde el enlace de la tienda que te compartió tu vendedor.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Volver al inicio
          </Link>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
          <div className="text-5xl">🔍</div>
          <p className="mt-4 text-sm text-gray-500">No tienes pedidos en este estado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const status = STATUS_CONFIG[order.status];
            const isPickup = order.delivery_mode === "store_pickup";

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-3xl bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${status.bg}`}>
                      {status.icon}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-gray-900">{order.order_number}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.text}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                        {isPickup && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                            🏪 PICKUP
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">{formatDate(order.created_at)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Total</div>
                      <div className="text-lg font-bold text-gray-900">{formatCurrency(order.total)}</div>
                    </div>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="rounded-full bg-gray-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-800"
                    >
                      Ver detalle
                    </button>
                  </div>
                </div>

                <div className="p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Comprado en</div>
                  {order.store?.slug ? (
                    <Link
                      to={`/tienda/${order.store.slug}`}
                      className="mt-1 inline-block text-base font-bold text-rose-600 hover:underline"
                    >
                      {order.store.name} →
                    </Link>
                  ) : (
                    <div className="mt-1 text-base font-bold text-gray-900">
                      {order.store?.name ?? "Tienda"}
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    {order.items.map((item: DbOrderItem, index) => (
                      <div
                        key={`${item.product_id}-${index}`}
                        className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-lg">
                            📦
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{item.product_name}</div>
                            <div className="text-xs text-gray-500">Cantidad: {item.quantity}</div>
                          </div>
                        </div>
                        <div className="font-semibold text-gray-900">{formatCurrency(item.subtotal)}</div>
                      </div>
                    ))}
                  </div>

                  {order.tracking_number && (
                    <div className="mt-4 flex items-center justify-between rounded-xl bg-purple-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span>🚚</span>
                        <span className="font-semibold text-purple-900">Tracking:</span>
                        <span className="font-mono text-purple-700">{order.tracking_number}</span>
                      </div>
                    </div>
                  )}

                  {order.status !== "cancelled" && (
                    <Link
                      to={`/pedido/${order.order_number}`}
                      className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-indigo-500 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg"
                    >
                      📦 Ver seguimiento en vivo →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white p-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Pedido</div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedOrder.order_number}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CONFIG[selectedOrder.status].bg} ${STATUS_CONFIG[selectedOrder.status].text}`}>
                    {STATUS_CONFIG[selectedOrder.status].icon} {STATUS_LABELS[selectedOrder.status]}
                  </span>
                  {selectedOrder.delivery_mode === "store_pickup" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                      🏪 Recojo en tienda
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-2xl text-gray-400 hover:text-gray-600">×</button>
            </div>

            <div className="space-y-4 p-6">
              {selectedOrder.status !== "cancelled" && (
                <Link
                  to={`/pedido/${selectedOrder.order_number}`}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-blue-500 to-indigo-500 py-3.5 text-sm font-bold text-white shadow-md transition hover:shadow-xl"
                >
                  📦 Ver seguimiento en vivo →
                </Link>
              )}

              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tienda</div>
                <div className="mt-2 font-bold text-gray-900">{selectedOrder.store?.name ?? "Tienda"}</div>
                {selectedOrder.store?.slug && (
                  <Link
                    to={`/tienda/${selectedOrder.store.slug}`}
                    className="mt-1 inline-block text-xs font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Visitar tienda →
                  </Link>
                )}
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Productos</div>
                <div className="mt-3 space-y-2">
                  {selectedOrder.items.map((item: DbOrderItem, index) => (
                    <div
                      key={`${item.product_id}-${index}`}
                      className="flex items-center justify-between rounded-xl bg-white p-3"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{item.product_name}</div>
                        <div className="text-xs text-gray-500">
                          x{item.quantity} · {formatCurrency(item.unit_price)} c/u
                        </div>
                      </div>
                      <div className="font-bold text-gray-900">{formatCurrency(item.subtotal)}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-base font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              {/* 🆕 v20 - Dirección o pickup dinámico */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {selectedOrder.delivery_mode === "store_pickup"
                    ? "🏪 Recojo en tienda"
                    : "📍 Dirección de envío"}
                </div>

                {selectedOrder.shipping_address ? (
                  <>
                    <div className="mt-2 text-sm text-gray-700">
                      📍 {formatAddress(selectedOrder.shipping_address)}
                    </div>
                    <div className="mt-1 text-sm text-gray-700">
                      👤 {selectedOrder.shipping_address.full_name}
                    </div>
                    <div className="mt-1 text-sm text-gray-700">
                      📞 {selectedOrder.shipping_address.phone}
                    </div>
                    {selectedOrder.shipping_address.reference && (
                      <div className="mt-1 text-sm text-gray-500">
                        Referencia: {selectedOrder.shipping_address.reference}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-2 rounded-xl bg-purple-50 border border-purple-200 p-3">
                    <div className="text-sm font-bold text-purple-900">
                      🏪 Retira tu pedido en la tienda
                    </div>
                    {selectedOrder.pickup_time_slot && (
                      <div className="mt-1 text-xs text-purple-700">
                        📅 {selectedOrder.pickup_time_slot}
                      </div>
                    )}
                    {selectedOrder.pickup_confirmation_code && (
                      <div className="mt-3 rounded-lg bg-linear-to-br from-purple-600 to-fuchsia-600 p-3 text-center text-white">
                        <div className="text-[10px] font-bold uppercase opacity-90">
                          Código de recojo
                        </div>
                        <div className="mt-1 font-mono text-2xl font-black tracking-widest">
                          {selectedOrder.pickup_confirmation_code}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Método</div>
                  <div className="mt-2 font-bold text-gray-900">
                    {PAYMENT_LABELS[selectedOrder.payment_method]}
                  </div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Fecha</div>
                  <div className="mt-2 text-sm font-bold text-gray-900">
                    {formatDate(selectedOrder.created_at)}
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                  <strong>Nota:</strong> {selectedOrder.notes}
                </div>
              )}

              {selectedOrder.tracking_number && (
                <div className="rounded-2xl bg-linear-to-br from-purple-500 to-pink-500 p-5 text-center text-white">
                  <div className="text-xs uppercase tracking-wider opacity-80">🚚 Número de seguimiento</div>
                  <div className="mt-2 font-mono text-xl font-bold">{selectedOrder.tracking_number}</div>
                </div>
              )}

              {selectedOrder.status === "delivered" && selectedOrder.store?.slug && (
                <Link
                  to={`/tienda/${selectedOrder.store.slug}`}
                  className="block w-full rounded-xl bg-rose-500 py-3 text-center text-sm font-bold text-white shadow transition hover:bg-rose-600"
                >
                  Volver a comprar
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}