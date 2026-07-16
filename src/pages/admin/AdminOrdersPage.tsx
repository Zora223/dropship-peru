import { useEffect, useMemo, useState } from "react";
import {
  fetchAllOrders,
  updateOrderStatus,
  deleteOrder,
} from "../../lib/orders";
import type { OrderWithStore } from "../../lib/orders";
import type { OrderStatus, PaymentMethodType } from "../../types/database";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string }
> = {
  pending_payment: {
    label: "Pendiente pago",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
  confirmed: {
    label: "Confirmado",
    bg: "bg-blue-50",
    text: "text-blue-700",
  },
  shipped: {
    label: "Enviado",
    bg: "bg-purple-50",
    text: "text-purple-700",
  },
  delivered: {
    label: "Entregado",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
  },
  cancelled: {
    label: "Cancelado",
    bg: "bg-red-50",
    text: "text-red-700",
  },
};

const PAYMENT_LABELS: Record<PaymentMethodType, string> = {
  yape: "Yape",
  plin: "Plin",
  card: "Tarjeta",
  transfer: "Transferencia",
  cash_on_delivery: "Pago contra entrega",
};

const STATUS_FILTERS: ("todos" | OrderStatus)[] = [
  "todos",
  "pending_payment",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Hace un momento";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days}d`;

  return date.toLocaleDateString("es-PE");
}

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithStore[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"todos" | OrderStatus>("todos");

  const [selectedOrder, setSelectedOrder] = useState<OrderWithStore | null>(
    null
  );

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadOrders() {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchAllOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        order.order_number.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        order.customer_email.toLowerCase().includes(query) ||
        (order.store_name?.toLowerCase().includes(query) ?? false) ||
        (order.vendor_name?.toLowerCase().includes(query) ?? false);

      const matchesStatus =
        statusFilter === "todos" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      revenue: orders
        .filter((order) => order.status !== "cancelled")
        .reduce((sum, order) => sum + Number(order.total || 0), 0),
      pending: orders.filter((order) => order.status === "pending_payment")
        .length,
      catalogOrders: orders.filter((order) => order.has_catalog_items).length,
    };
  }, [orders]);

  async function handleStatusChange(order: OrderWithStore, status: OrderStatus) {
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);

      await updateOrderStatus(order.id, status);

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id ? { ...item, status } : item
        )
      );

      setSelectedOrder((prev) =>
        prev?.id === order.id ? { ...prev, status } : prev
      );

      setSuccess("Estado del pedido actualizado.");

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(order: OrderWithStore) {
    const confirmed = window.confirm(
      `¿Eliminar el pedido ${order.order_number}? Esta acción no se puede deshacer. En producción se recomienda cancelar antes que eliminar.`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);

      await deleteOrder(order.id);

      setOrders((prev) => prev.filter((item) => item.id !== order.id));
      setSelectedOrder(null);

      setSuccess("Pedido eliminado correctamente.");

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al eliminar pedido");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-rose-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Pedidos de la plataforma
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Vista interna de todos los pedidos. Supervisa estados, pagos y operaciones.
        </p>
      </div>

      {success && (
        <div className="rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-4 text-sm text-emerald-800">
          ✅ {success}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Pedidos totales
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {stats.total}
          </div>
        </div>

        <div className="rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
            Ventas procesadas
          </div>
          <div className="mt-2 text-3xl font-bold">
            {formatCurrency(stats.revenue)}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Pendientes
          </div>
          <div className="mt-2 text-3xl font-bold text-amber-600">
            {stats.pending}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Con catálogo
          </div>
          <div className="mt-2 text-3xl font-bold text-purple-600">
            {stats.catalogOrders}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar por pedido, cliente, tienda o vendor..."
          className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900/10"
        />

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                statusFilter === filter
                  ? "bg-gray-900 text-white shadow"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter === "todos" ? "Todos" : STATUS_CONFIG[filter].label}
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
          <div className="text-6xl">📦</div>

          <h2 className="mt-4 text-xl font-bold text-gray-900">
            Aún no hay pedidos
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Los pedidos aparecerán cuando los clientes compren en alguna tienda.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-250 text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Pedido</th>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Tienda</th>
                  <th className="px-6 py-4 font-medium">Total</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium">Fecha</th>
                  <th className="px-6 py-4 font-medium"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => {
                  const status = STATUS_CONFIG[order.status];

                  return (
                    <tr key={order.id} className="transition hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">
                            {order.order_number}
                          </span>

                          {order.has_catalog_items && (
                            <span
                              title="Incluye productos del catálogo"
                              className="text-xs"
                            >
                              🏭
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-gray-500">
                          {Array.isArray(order.items)
                            ? order.items.length
                            : 0}{" "}
                          items
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {order.customer_name}
                        </div>

                        <div className="text-xs text-gray-500">
                          {order.customer_email}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {order.store_name ?? "Tienda"}
                        </div>

                        <div className="text-xs text-gray-500">
                          {order.vendor_name ?? "—"}
                        </div>
                      </td>

                      <td className="px-6 py-4 font-bold text-gray-900">
                        {formatCurrency(order.total)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.bg} ${status.text}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-400">
                        {timeAgo(order.created_at)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="rounded-full bg-gray-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-800"
                          >
                            Detalle
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredOrders.length === 0 && orders.length > 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-sm text-gray-400"
                    >
                      No se encontraron pedidos con esos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Pedido
                </div>

                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedOrder.order_number}
                </h2>

                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      STATUS_CONFIG[selectedOrder.status].bg
                    } ${STATUS_CONFIG[selectedOrder.status].text}`}
                  >
                    {STATUS_CONFIG[selectedOrder.status].label}
                  </span>

                  {selectedOrder.has_catalog_items && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                      🏭 Con catálogo
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="text-2xl text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

                        {/* ... Todo lo de arriba queda exactamente igual ... */}

            <div className="space-y-4 p-6">
              
              {/* 1. SECCIÓN CLIENTE Y ENVÍO (Mejorada para despachos en Perú) */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Datos de Envío y Contacto
                </div>

                <div className="mt-2 font-bold text-gray-900">
                  {selectedOrder.customer_name}
                </div>
                <div className="text-sm text-gray-600">
                  📞 {selectedOrder.customer_phone} &nbsp;·&nbsp; ✉️ {selectedOrder.customer_email}
                </div>

                {/* Lectura segura del JSONB de dirección */}
                <div className="mt-3 border-t border-gray-200/60 pt-2 text-xs text-gray-600">
                  <span className="font-semibold text-gray-700">Dirección: </span>
                  {(() => {
                    const addr = selectedOrder.shipping_address as any;
                    if (!addr) return "No registrada";
                    if (typeof addr === 'string') return addr; // Por si acaso alguien guardó texto simple
                    return `${addr.street ?? ''}, ${addr.district ?? ''} (${addr.city ?? ''}) ${addr.reference ? `· Ref: ${addr.reference}` : ''}`;
                  })()}
                </div>
              </div>

              {/* 2. SECCIÓN TIENDA */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tienda de Origen
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-gray-900">{selectedOrder.store_name ?? "Tienda"}</span>
                    <div className="text-xs text-gray-500">Vendor: {selectedOrder.vendor_name ?? "—"}</div>
                  </div>
                  {selectedOrder.store_slug && (
                    <a
                      href={`/tienda/${selectedOrder.store_slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-xs border border-gray-100 hover:bg-rose-50"
                    >
                      Ver tienda ↗
                    </a>
                  )}
                </div>
              </div>

              {/* 3. NUEVO: LISTA DE PRODUCTOS DEL PEDIDO (Leemos el JSONB items) */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Productos Solicitados
                </div>
                <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto pr-1">
                  {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 pr-2">
                          <span className="font-bold text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {item.quantity}x
                          </span>
                          <span className="text-gray-800 font-medium line-clamp-1">{item.name}</span>
                        </div>
                        <span className="font-semibold text-gray-900 whitespace-nowrap">
                          {formatCurrency((item.price * item.quantity) || 0)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 py-2">No hay detalle de productos en este pedido.</p>
                  )}
                </div>
              </div>

              {/* 4. TOTAL Y MÉTODO DE PAGO */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Monto Total</div>
                  <div className="mt-1 text-2xl font-black text-rose-600">
                    {formatCurrency(selectedOrder.total)}
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pago</div>
                  <div className="mt-1 text-base font-bold text-gray-800 flex items-center gap-1.5">
                    💳 {PAYMENT_LABELS[selectedOrder.payment_method]}
                  </div>
                </div>
              </div>

              {/* 5. BOTONES DE ESTADO */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Intervención de Estado (Admin)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(selectedOrder, status)}
                      disabled={actionLoading}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 cursor-pointer ${
                        selectedOrder.status === status
                          ? `${STATUS_CONFIG[status].bg} ${STATUS_CONFIG[status].text} ring-2 ring-current shadow-xs`
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {STATUS_CONFIG[status].label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-3 text-xs text-amber-900">
                  <span className="font-bold">Nota del cliente: </span> {selectedOrder.notes}
                </div>
              )}

              <button
                onClick={() => handleDelete(selectedOrder)}
                disabled={actionLoading}
                className="w-full rounded-xl bg-red-50 hover:bg-red-100 py-3 text-xs font-bold text-red-600 transition cursor-pointer mt-2"
              >
                🗑 Eliminar registro definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}