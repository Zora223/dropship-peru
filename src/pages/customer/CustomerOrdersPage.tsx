// src/pages/customer/CustomerOrdersPage.tsx
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

function formatAddress(address: DbShippingAddress | null): string {
  if (!address) return "🏪 Recojo en tienda";
  return [address.street, address.district, address.city].filter(Boolean).join(", ");
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<CustomerOrderWithStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<OrderFilter>("all");
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrderWithStore | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMyCustomerOrders();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar tus pedidos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadOrders(); }, []);

  const filteredOrders = useMemo(() => {
    if (activeFilter === "all") return orders;
    return orders.filter((o) => o.status === activeFilter);
  }, [orders, activeFilter]);

  const stats = useMemo(() => ({
    total: orders.length,
    pendientes: orders.filter(o => o.status === "pending_payment" || o.status === "confirmed").length,
    enviados: orders.filter(o => o.status === "shipped").length,
    entregados: orders.filter(o => o.status === "delivered").length,
  }), [orders]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />)}
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Mis pedidos</h1>
          <p className="mt-1 text-sm text-gray-500">Historial de tus compras y seguimiento.</p>
        </div>
        <button
          onClick={loadOrders}
          className="self-start rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          🔄 Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Stats — 2 columnas en móvil, 4 en desktop */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total</div>
          <div className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pendientes</div>
          <div className="mt-1 text-2xl sm:text-3xl font-bold text-amber-600">{stats.pendientes}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Enviados</div>
          <div className="mt-1 text-2xl sm:text-3xl font-bold text-purple-600">{stats.enviados}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Entregados</div>
          <div className="mt-1 text-2xl sm:text-3xl font-bold text-emerald-600">{stats.entregados}</div>
        </div>
      </div>

      {/* Filtros — scroll horizontal en móvil */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeFilter === filter.value
                ? "bg-gray-900 text-white shadow"
                : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Lista de pedidos */}
      {orders.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 sm:p-16 text-center shadow-sm">
          <div className="text-5xl sm:text-6xl">🛍️</div>
          <h2 className="mt-4 text-lg sm:text-xl font-bold text-gray-900">Aún no tienes pedidos</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto">
            Para comprar, ingresa desde el enlace directo que te compartió tu vendedor.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Volver al inicio
          </Link>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
          <div className="text-4xl">🔍</div>
          <p className="mt-4 text-sm text-gray-500">No tienes pedidos en este estado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const status = STATUS_CONFIG[order.status];
            const isPickup = order.delivery_mode === "store_pickup";

            return (
              <div key={order.id} className="overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-sm transition hover:shadow-md">
                {/* Header tarjeta */}
                <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl text-lg sm:text-xl ${status.bg}`}>
                      {status.icon}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm sm:text-base">{order.order_number}</span>
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

                  {/* Total + botón */}
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="sm:text-right">
                      <div className="text-xs text-gray-500">Total</div>
                      <div className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(order.total)}</div>
                    </div>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="rounded-full bg-gray-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-gray-800"
                    >
                      Ver detalle
                    </button>
                  </div>
                </div>

                {/* Cuerpo tarjeta */}
                <div className="p-4 sm:p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Comprado en</div>
                  {order.store?.slug ? (
                    <Link to={`/tienda/${order.store.slug}`} className="mt-1 inline-block text-base font-bold text-rose-600 hover:underline">
                      {order.store.name} →
                    </Link>
                  ) : (
                    <div className="mt-1 text-base font-bold text-gray-900">{order.store?.name ?? "Tienda"}</div>
                  )}

                  {/* Productos */}
                  <div className="mt-4 space-y-2">
                    {order.items.map((item: DbOrderItem, index) => (
                      <div
                        key={`${item.product_id}-${index}`}
                        className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-sm gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-white text-base sm:text-lg">
                            📦
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate text-sm">{item.product_name}</div>
                            <div className="text-xs text-gray-500">Cant: {item.quantity}</div>
                          </div>
                        </div>
                        <div className="shrink-0 font-semibold text-gray-900 text-sm">{formatCurrency(item.subtotal)}</div>
                      </div>
                    ))}
                  </div>

                  {order.tracking_number && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-purple-50 px-4 py-3">
                      <span>🚚</span>
                      <span className="text-sm font-semibold text-purple-900">Tracking:</span>
                      <span className="font-mono text-sm text-purple-700 truncate">{order.tracking_number}</span>
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

      {/* MODAL — bottom-sheet en móvil, centrado en desktop */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 backdrop-blur-sm"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="max-h-[92vh] sm:max-h-[90vh] w-full sm:max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle móvil */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            {/* Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white p-4 sm:p-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Pedido</div>
                <h2 className="font-mono text-xl sm:text-2xl font-bold text-gray-900">{selectedOrder.order_number}</h2>
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
              <button onClick={() => setSelectedOrder(null)} className="text-2xl text-gray-400 hover:text-gray-600 ml-4 shrink-0">×</button>
            </div>

            <div className="space-y-4 p-4 sm:p-6">
              {selectedOrder.status !== "cancelled" && (
                <Link
                  to={`/pedido/${selectedOrder.order_number}`}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-blue-500 to-indigo-500 py-3.5 text-sm font-bold text-white shadow-md"
                >
                  📦 Ver seguimiento en vivo →
                </Link>
              )}

              {/* Tienda */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tienda</div>
                <div className="mt-2 font-bold text-gray-900">{selectedOrder.store?.name ?? "Tienda"}</div>
                {selectedOrder.store?.slug && (
                  <Link to={`/tienda/${selectedOrder.store.slug}`} className="mt-1 inline-block text-xs font-semibold text-rose-600 hover:text-rose-700">
                    Visitar tienda →
                  </Link>
                )}
              </div>

              {/* Productos */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Productos</div>
                <div className="space-y-2">
                  {selectedOrder.items.map((item: DbOrderItem, index) => (
                    <div key={`${item.product_id}-${index}`} className="flex items-center justify-between rounded-xl bg-white p-3 gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{item.product_name}</div>
                        <div className="text-xs text-gray-500">x{item.quantity} · {formatCurrency(item.unit_price)} c/u</div>
                      </div>
                      <div className="shrink-0 font-bold text-gray-900 text-sm">{formatCurrency(item.subtotal)}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-base font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Dirección o pickup */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  {selectedOrder.delivery_mode === "store_pickup" ? "🏪 Recojo en tienda" : "📍 Dirección de envío"}
                </div>
                {selectedOrder.shipping_address ? (
                  <div className="space-y-1 text-sm text-gray-700">
                    <div>📍 {formatAddress(selectedOrder.shipping_address)}</div>
                    <div>👤 {selectedOrder.shipping_address.full_name}</div>
                    <div>📞 {selectedOrder.shipping_address.phone}</div>
                    {selectedOrder.shipping_address.reference && (
                      <div className="text-gray-500">Ref: {selectedOrder.shipping_address.reference}</div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl bg-purple-50 border border-purple-200 p-3">
                    <div className="text-sm font-bold text-purple-900">🏪 Retira tu pedido en la tienda</div>
                    {selectedOrder.pickup_time_slot && (
                      <div className="mt-1 text-xs text-purple-700">📅 {selectedOrder.pickup_time_slot}</div>
                    )}
                    {selectedOrder.pickup_confirmation_code && (
                      <div className="mt-3 rounded-lg bg-linear-to-br from-purple-600 to-fuchsia-600 p-3 text-center text-white">
                        <div className="text-[10px] font-bold uppercase opacity-90">Código de recojo</div>
                        <div className="mt-1 font-mono text-2xl font-black tracking-widest">
                          {selectedOrder.pickup_confirmation_code}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pago + Fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Método</div>
                  <div className="mt-2 font-bold text-gray-900 text-sm">
                    {PAYMENT_LABELS[selectedOrder.payment_method]}
                  </div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Fecha</div>
                  <div className="mt-2 text-xs font-bold text-gray-900">{formatDate(selectedOrder.created_at)}</div>
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