// src/pages/vendor/VendorOrdersPage.tsx
// Gestión de pedidos del vendor con asignación de delivery + WhatsApp (FASE 3 + 5A)
// 🆕 v20 - Soporte para pickup + shipping_address null

import { useEffect, useMemo, useState } from "react";
import { useMyStore } from "../../hooks/useMyStore";
import {
  fetchVendorOrders,
  updateVendorOrderStatus,
} from "../../lib/vendor-orders";
import type {
  DbOrder,
  DbOrderItem,
  DbShippingAddress,
  OrderStatus,
  PaymentMethodType,
} from "../../types/database";
import AssignDeliveryModal from "../../components/vendor/AssignDeliveryModal";

type OrderFilter = "all" | OrderStatus;

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

const PAYMENT_ICONS: Record<PaymentMethodType, string> = {
  yape: "💜",
  plin: "💙",
  card: "💳",
  transfer: "🏦",
  cash_on_delivery: "📦",
};

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending_payment", label: "Pendientes" },
  { value: "confirmed", label: "Confirmados" },
  { value: "shipped", label: "Enviados" },
  { value: "delivered", label: "Entregados" },
  { value: "cancelled", label: "Cancelados" },
];

const DELIVERY_STATUS_LABELS: Record<
  string,
  { label: string; color: string }
> = {
  unassigned: { label: "Sin asignar", color: "text-gray-500" },
  assigned: { label: "Delivery asignado", color: "text-blue-600" },
  picked_up: { label: "En camino", color: "text-purple-600" },
  delivered: { label: "Entregado", color: "text-emerald-600" },
  failed: { label: "Delivery fallido", color: "text-red-600" },
};

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

// 🆕 v20 - Ahora acepta null
function formatAddress(address: DbShippingAddress | null): string {
  if (!address) return "🏪 Recojo en tienda";
  const parts = [address.street, address.district, address.city].filter(
    Boolean
  );
  return parts.join(", ");
}

function isNewOrder(dateString: string): boolean {
  const orderDate = new Date(dateString).getTime();
  const now = Date.now();
  return now - orderDate < 24 * 60 * 60 * 1000;
}

function getNextStatus(status: OrderStatus): OrderStatus | null {
  if (status === "pending_payment") return "confirmed";
  if (status === "confirmed") return "shipped";
  if (status === "shipped") return "delivered";
  return null;
}

function getNextStatusLabel(status: OrderStatus) {
  if (status === "pending_payment") return "Confirmar pedido";
  if (status === "confirmed") return "Marcar como enviado";
  if (status === "shipped") return "Confirmar entrega";
  return null;
}

function getCustomerWhatsappUrl(order: DbOrder): string {
  const digits = order.customer_phone.replace(/[^0-9]/g, "");
  const normalized = digits.startsWith("51")
    ? digits
    : digits.length === 9
    ? `51${digits}`
    : digits;

  const message = [
    `¡Hola ${order.customer_name}! 👋`,
    ``,
    `Te contactamos por tu pedido *${order.order_number}*`,
    `Total: ${formatCurrency(order.total)}`,
  ].join("\n");

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function DeliveryStatusBadge({ order }: { order: DbOrder }) {
  if (!order.delivery_id) return null;

  const deliveryStatus = order.delivery_status ?? "assigned";
  const config = DELIVERY_STATUS_LABELS[deliveryStatus] ?? {
    label: deliveryStatus,
    color: "text-gray-500",
  };

  return (
    <span className={`text-xs font-semibold ${config.color}`}>
      🛵 {config.label}
    </span>
  );
}

export default function VendorOrdersPage() {
  const { store, loading: storeLoading, error: storeError } = useMyStore();

  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<OrderFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<DbOrder | null>(null);
  const [trackingInput, setTrackingInput] = useState("");

  const [assignModal, setAssignModal] = useState<{
    orderId: string;
    orderNumber: string;
    orderTotal: number;
    customerName: string;
    shippingAddress: string | null;
    shippingReference: string | null;
  } | null>(null);

  async function loadOrders() {
    if (!store?.id) return;

    try {
      setLoading(true);
      setError(null);

      const data = await fetchVendorOrders(store.id);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (store?.id) {
      loadOrders();
    }

    if (!storeLoading && !store) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id, storeLoading]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesFilter =
        activeFilter === "all" || order.status === activeFilter;

      const matchesSearch =
        !query ||
        order.order_number.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [orders, activeFilter, searchQuery]);

  const stats = useMemo(() => {
    return {
      pendientes: orders.filter((order) => order.status === "pending_payment")
        .length,
      enProceso: orders.filter(
        (order) => order.status === "confirmed" || order.status === "shipped"
      ).length,
      completados: orders.filter((order) => order.status === "delivered").length,
      ingresos: orders
        .filter((order) => order.status !== "cancelled")
        .reduce((sum, order) => sum + Number(order.total || 0), 0),
    };
  }, [orders]);

  function openOrder(order: DbOrder) {
    setSelectedOrder(order);
    setTrackingInput(order.tracking_number ?? "");
  }

  function openAssignModal(order: DbOrder, event: React.MouseEvent) {
    event.stopPropagation();
    setAssignModal({
      orderId: order.id,
      orderNumber: order.order_number,
      orderTotal: Number(order.total ?? 0),
      customerName: order.customer_name,
      shippingAddress: formatAddress(order.shipping_address),
      shippingReference: order.shipping_address?.reference ?? null,
    });
  }

  async function handleUpdateStatus(
    order: DbOrder,
    newStatus: OrderStatus,
    trackingNumber?: string | null
  ) {
    if (!store?.id) return;

    try {
      setActionLoading(true);
      setError(null);

      const updatedOrder = await updateVendorOrderStatus(
        store.id,
        order.id,
        newStatus,
        trackingNumber
      );

      setOrders((prev) =>
        prev.map((item) => (item.id === updatedOrder.id ? updatedOrder : item))
      );

      setSelectedOrder(updatedOrder);
      setTrackingInput(updatedOrder.tracking_number ?? "");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al actualizar pedido"
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelOrder(order: DbOrder) {
    const confirmed = window.confirm(
      "¿Seguro que deseas cancelar este pedido?"
    );
    if (!confirmed) return;

    await handleUpdateStatus(order, "cancelled", order.tracking_number);
  }

  async function handleDeliveryAssigned() {
    await loadOrders();

    if (selectedOrder) {
      setTimeout(() => {
        setOrders((prev) => {
          const updated = prev.find((o) => o.id === selectedOrder.id);
          if (updated) {
            setSelectedOrder(updated);
          }
          return prev;
        });
      }, 100);
    }
  }

  // 🆕 v20 - Solo delivery a domicilio puede asignar delivery
  function canAssignDelivery(order: DbOrder): boolean {
    return (
      order.status === "confirmed" &&
      order.delivery_mode === "home_delivery" &&
      !order.delivery_id &&
      order.delivery_status !== "assigned" &&
      order.delivery_status !== "picked_up"
    );
  }

  function hasDelivery(order: DbOrder): boolean {
    return !!order.delivery_id;
  }

  if (storeLoading || loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-gray-100" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl bg-gray-100"
            />
          ))}
        </div>

        <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
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
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6">
        <h1 className="text-xl font-bold text-amber-900">
          Primero crea tu tienda
        </h1>
        <p className="mt-2 text-sm text-amber-800">
          Para recibir y gestionar pedidos necesitas configurar tu tienda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Pedidos
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona los pedidos recibidos en tu tienda.
          </p>
        </div>

        <button
          onClick={loadOrders}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Pendientes
          </div>
          <div className="mt-2 text-3xl font-bold text-amber-600">
            {stats.pendientes}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            En proceso
          </div>
          <div className="mt-2 text-3xl font-bold text-blue-600">
            {stats.enProceso}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Completados
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-600">
            {stats.completados}
          </div>
        </div>

        <div className="rounded-2xl bg-linear-to-br from-rose-500 to-orange-500 p-5 text-white shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
            Ingresos
          </div>
          <div className="mt-2 text-3xl font-bold">
            {formatCurrency(stats.ingresos)}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="🔍 Buscar por número de pedido o cliente..."
          className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900/10"
        />

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                activeFilter === filter.value
                  ? "bg-gray-900 text-white shadow"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* VISTA DESKTOP */}
      <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-212.5 text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Pedido</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Total</th>
                <th className="px-6 py-4 font-medium">Pago</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium">Entrega</th>
                <th className="px-6 py-4 font-medium"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => {
                const hasCatalog = order.items?.some(
                  (item) => item.source === "catalog"
                );
                const status = STATUS_CONFIG[order.status];
                const isNew = isNewOrder(order.created_at);
                const isPickup = order.delivery_mode === "store_pickup";

                return (
                  <tr key={order.id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">
                          {order.order_number}
                        </span>

                        {isNew && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            NUEVO
                          </span>
                        )}

                        {hasCatalog && (
                          <span
                            title="Incluye productos del catálogo"
                            className="text-xs"
                          >
                            🏭
                          </span>
                        )}

                        {isPickup && (
                          <span
                            title="Recojo en tienda"
                            className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700"
                          >
                            🏪 PICKUP
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-500">
                        {formatDate(order.created_at)}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {order.customer_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.items?.length ?? 0}{" "}
                        {(order.items?.length ?? 0) === 1 ? "item" : "items"}
                      </div>
                    </td>

                    <td className="px-6 py-4 font-bold text-gray-900">
                      {formatCurrency(order.total)}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      <span className="mr-1">
                        {PAYMENT_ICONS[order.payment_method]}
                      </span>
                      {PAYMENT_LABELS[order.payment_method] ??
                        order.payment_method}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.bg} ${status.text}`}
                      >
                        <span>{status.emoji}</span>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>

                    {/* 🆕 v20 - Columna Entrega (delivery o pickup) */}
                    <td className="px-6 py-4">
                      {isPickup ? (
                        <span className="text-xs font-semibold text-purple-600">
                          🏪 Recojo en tienda
                        </span>
                      ) : hasDelivery(order) ? (
                        <DeliveryStatusBadge order={order} />
                      ) : canAssignDelivery(order) ? (
                        <button
                          onClick={(e) => openAssignModal(order, e)}
                          className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white transition hover:bg-emerald-600"
                        >
                          🛵 Asignar
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <a
                          href={getCustomerWhatsappUrl(order)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
                          title="Contactar por WhatsApp"
                        >
                          💬
                        </a>

                        <button
                          onClick={() => openOrder(order)}
                          className="rounded-full bg-gray-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-800"
                        >
                          Gestionar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-gray-400"
                  >
                    <div className="text-4xl">📭</div>
                    <p className="mt-3">
                      {orders.length === 0
                        ? "Aún no tienes pedidos."
                        : "No hay pedidos con estos filtros."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VISTA MÓVIL */}
      <div className="space-y-3 lg:hidden">
        {filteredOrders.map((order) => {
          const hasCatalog = order.items?.some(
            (item) => item.source === "catalog"
          );
          const status = STATUS_CONFIG[order.status];
          const isNew = isNewOrder(order.created_at);
          const itemsCount = order.items?.length ?? 0;
          const isPickup = order.delivery_mode === "store_pickup";

          return (
            <div
              key={order.id}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div
                className={`px-4 py-2 text-xs font-bold ${status.bg} ${status.text}`}
              >
                <div className="flex items-center justify-between">
                  <span>
                    {status.emoji} {STATUS_LABELS[order.status]}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isPickup && (
                      <span className="rounded-full bg-purple-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        🏪 PICKUP
                      </span>
                    )}
                    {isNew && (
                      <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        NUEVO
                      </span>
                    )}
                    {hasCatalog && <span title="Del catálogo">🏭</span>}
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm font-bold text-gray-900">
                      {order.order_number}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatShortDate(order.created_at)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black text-gray-900">
                      {formatCurrency(order.total)}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {itemsCount} {itemsCount === 1 ? "item" : "items"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-gray-50 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Cliente
                  </div>
                  <div className="mt-0.5 truncate font-semibold text-gray-900">
                    {order.customer_name}
                  </div>
                  <div className="truncate text-xs text-gray-500">
                    {order.customer_phone}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                  <span className="text-base">
                    {PAYMENT_ICONS[order.payment_method]}
                  </span>
                  <span>
                    {PAYMENT_LABELS[order.payment_method] ??
                      order.payment_method}
                  </span>
                </div>

                {hasDelivery(order) && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3">
                    <span className="text-base">🛵</span>
                    <DeliveryStatusBadge order={order} />
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={getCustomerWhatsappUrl(order)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-600"
                  >
                    💬 WhatsApp
                  </a>

                  {canAssignDelivery(order) && (
                    <button
                      onClick={(e) => openAssignModal(order, e)}
                      className="flex-1 rounded-xl bg-emerald-100 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-200"
                    >
                      🛵 Delivery
                    </button>
                  )}

                  <button
                    onClick={() => openOrder(order)}
                    className="flex-1 rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white transition hover:bg-gray-800"
                  >
                    Gestionar
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <div className="text-5xl">📭</div>
            <p className="mt-3 text-sm text-gray-500">
              {orders.length === 0
                ? "Aún no tienes pedidos."
                : "No hay pedidos con estos filtros."}
            </p>
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white p-6">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Pedido
                </div>

                <h2 className="truncate font-mono text-xl font-bold text-gray-900 sm:text-2xl">
                  {selectedOrder.order_number}
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      STATUS_CONFIG[selectedOrder.status].bg
                    } ${STATUS_CONFIG[selectedOrder.status].text}`}
                  >
                    <span>{STATUS_CONFIG[selectedOrder.status].emoji}</span>
                    {STATUS_LABELS[selectedOrder.status]}
                  </span>

                  {selectedOrder.delivery_mode === "store_pickup" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                      🏪 Recojo en tienda
                    </span>
                  )}

                  {hasDelivery(selectedOrder) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      🛵 Delivery asignado
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="shrink-0 text-2xl text-gray-400 hover:text-gray-600"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-6">
              <a
                href={getCustomerWhatsappUrl(selectedOrder)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 hover:shadow-lg"
              >
                💬 Contactar al cliente por WhatsApp
              </a>

              {canAssignDelivery(selectedOrder) && (
                <button
                  onClick={(e) => openAssignModal(selectedOrder, e)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                >
                  🛵 Asignar Delivery a este pedido
                </button>
              )}

              {/* Cliente */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Cliente
                </div>

                <div className="mt-2 font-bold text-gray-900">
                  {selectedOrder.customer_name}
                </div>

                <div className="text-sm text-gray-600">
                  {selectedOrder.customer_email}
                </div>

                <div className="text-sm text-gray-600">
                  {selectedOrder.customer_phone}
                </div>
              </div>

              {/* 🆕 v20 - Dirección o pickup dinámico */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {selectedOrder.delivery_mode === "store_pickup"
                    ? "🏪 Recojo en tienda"
                    : "📍 Dirección de envío"}
                </div>

                {selectedOrder.delivery_mode === "store_pickup" ? (
                  <div className="mt-2 space-y-2">
                    <div className="rounded-xl bg-purple-50 border border-purple-200 p-3">
                      <div className="font-bold text-purple-900 text-sm">
                        🏪 El cliente recogerá en la tienda
                      </div>
                      {selectedOrder.pickup_time_slot && (
                        <div className="mt-1 text-xs text-purple-700">
                          📅 {selectedOrder.pickup_time_slot}
                        </div>
                      )}
                    </div>
                    {selectedOrder.pickup_code && (
                      <div className="rounded-xl bg-linear-to-br from-purple-600 to-fuchsia-600 p-4 text-center text-white">
                        <div className="text-xs font-bold uppercase tracking-wider opacity-90">
                          Código de verificación
                        </div>
                        <div className="mt-1 font-mono text-3xl font-black tracking-widest">
                          {selectedOrder.pickup_code}
                        </div>
                        <div className="mt-2 text-[10px] opacity-80">
                          Pide este código al cliente cuando venga a recoger
                        </div>
                      </div>
                    )}
                  </div>
                ) : selectedOrder.shipping_address ? (
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

                    {selectedOrder.delivery_date &&
                      selectedOrder.delivery_time_slot && (
                        <div className="mt-2 rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs">
                          📅 Entrega: {selectedOrder.delivery_date} ·{" "}
                          {selectedOrder.delivery_time_slot}
                        </div>
                      )}
                  </>
                ) : (
                  <div className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                    ⚠️ Sin información de entrega
                  </div>
                )}

                {selectedOrder.notes && (
                  <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                    <strong>Nota del cliente:</strong> {selectedOrder.notes}
                  </div>
                )}
              </div>

              {/* Productos */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Productos
                </div>

                <div className="mt-3 space-y-2">
                  {selectedOrder.items?.map((item: DbOrderItem, index) => (
                    <div
                      key={`${item.product_id}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-gray-900">
                          {item.product_name}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              item.source === "catalog"
                                ? "bg-purple-50 text-purple-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {item.source === "catalog"
                              ? "🏭 Catálogo"
                              : "✨ Propio"}
                          </span>

                          <span className="text-xs text-gray-500">
                            x{item.quantity}
                          </span>

                          <span className="text-xs text-gray-500">
                            {formatCurrency(item.unit_price)} c/u
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 font-bold text-gray-900">
                        {formatCurrency(item.subtotal)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>

                  {selectedOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-700 font-semibold">
                      <span>Descuento ({selectedOrder.discount_tier})</span>
                      <span>-{formatCurrency(selectedOrder.discount_amount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-base font-bold text-gray-900">
                    <span>Total</span>
                    <span>{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {selectedOrder.has_catalog_items && (
                <div className="rounded-2xl border-l-4 border-purple-500 bg-purple-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-700">
                    🏭 Items del catálogo
                  </div>

                  <p className="mt-2 text-sm text-purple-900">
                    Este pedido incluye productos importados del catálogo
                    maestro. Revisa si debes coordinar con el proveedor o con el
                    administrador.
                  </p>
                </div>
              )}

              {/* Pago */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Pago
                </div>

                <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-lg">
                    {PAYMENT_ICONS[selectedOrder.payment_method]}
                  </span>
                  <span>
                    Método:{" "}
                    <strong>
                      {PAYMENT_LABELS[selectedOrder.payment_method] ??
                        selectedOrder.payment_method}
                    </strong>
                  </span>
                </div>

                {selectedOrder.payment_receiver === "vendor" && (
                  <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-900">
                    ✅ Este pago fue directo a tu Yape/Plin (no a Dropship)
                  </div>
                )}

                {selectedOrder.delivery_debt > 0 && (
                  <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                    ⚠️ Debes S/ {selectedOrder.delivery_debt.toFixed(2)} a
                    Dropship por delivery (se descontará de próxima liquidación)
                  </div>
                )}
              </div>

              {selectedOrder.tracking_number && (
                <div className="rounded-2xl bg-gray-900 p-4 text-center text-white">
                  <div className="text-xs uppercase tracking-wider opacity-70">
                    Tracking
                  </div>

                  <div className="mt-1 font-mono text-lg font-bold">
                    {selectedOrder.tracking_number}
                  </div>
                </div>
              )}

              {selectedOrder.status === "confirmed" &&
                selectedOrder.delivery_mode !== "store_pickup" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">
                      Tracking de envío
                    </label>

                    <input
                      value={trackingInput}
                      onChange={(event) => setTrackingInput(event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
                      placeholder="Ej: OLVA-123456789"
                    />
                  </div>
                )}

              <div className="space-y-3 pt-2">
                {getNextStatus(selectedOrder.status) && (
                  <button
                    disabled={actionLoading}
                    onClick={() => {
                      const nextStatus = getNextStatus(selectedOrder.status);
                      if (!nextStatus) return;

                      handleUpdateStatus(
                        selectedOrder,
                        nextStatus,
                        nextStatus === "shipped"
                          ? trackingInput.trim() || null
                          : selectedOrder.tracking_number
                      );
                    }}
                    className="w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading
                      ? "Guardando..."
                      : getNextStatusLabel(selectedOrder.status)}
                  </button>
                )}

                {selectedOrder.status !== "cancelled" &&
                  selectedOrder.status !== "delivered" && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleCancelOrder(selectedOrder)}
                      className="w-full rounded-xl bg-red-50 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancelar pedido
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {assignModal && (
        <AssignDeliveryModal
          orderId={assignModal.orderId}
          orderNumber={assignModal.orderNumber}
          orderTotal={assignModal.orderTotal}
          customerName={assignModal.customerName}
          shippingAddress={assignModal.shippingAddress}
          shippingReference={assignModal.shippingReference}
          onClose={() => setAssignModal(null)}
          onAssigned={handleDeliveryAssigned}
        />
      )}
    </div>
  );
}