// src/pages/admin/AdminOrdersPage.tsx
import { useEffect, useMemo, useState } from "react";
import { fetchAllOrders, updateOrderStatus, deleteOrder } from "../../lib/orders";
import type { OrderWithStore } from "../../lib/orders";
import type { OrderStatus, PaymentMethodType } from "../../types/database";

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string }> = {
  pending_payment: { label: "Pendiente pago", bg: "bg-amber-50", text: "text-amber-700" },
  confirmed: { label: "Confirmado", bg: "bg-blue-50", text: "text-blue-700" },
  shipped: { label: "Enviado", bg: "bg-purple-50", text: "text-purple-700" },
  delivered: { label: "Entregado", bg: "bg-emerald-50", text: "text-emerald-700" },
  cancelled: { label: "Cancelado", bg: "bg-red-50", text: "text-red-700" },
};

const PAYMENT_LABELS: Record<PaymentMethodType, string> = {
  yape: "Yape",
  plin: "Plin",
  card: "Tarjeta",
  transfer: "Transferencia",
  cash_on_delivery: "Contra entrega",
};

const STATUS_FILTERS: ("todos" | OrderStatus)[] = [
  "todos", "pending_payment", "confirmed", "shipped", "delivered", "cancelled",
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
  const [statusFilter, setStatusFilter] = useState<"todos" | OrderStatus>("todos");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithStore | null>(null);
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
      setError(err instanceof Error ? err.message : "Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadOrders(); }, []);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch = !query ||
        order.order_number.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        order.customer_email.toLowerCase().includes(query) ||
        (order.store_name?.toLowerCase().includes(query) ?? false);
      const matchesStatus = statusFilter === "todos" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: orders.length,
    revenue: orders.filter(o => o.status !== "cancelled").reduce((sum, o) => sum + Number(o.total || 0), 0),
    pending: orders.filter(o => o.status === "pending_payment").length,
    catalogOrders: orders.filter(o => o.has_catalog_items).length,
  }), [orders]);

  async function handleStatusChange(order: OrderWithStore, status: OrderStatus) {
    try {
      setActionLoading(true);
      setError(null);
      await updateOrderStatus(order.id, status);
      setOrders(prev => prev.map(item => item.id === order.id ? { ...item, status } : item));
      setSelectedOrder(prev => prev?.id === order.id ? { ...prev, status } : prev);
      setSuccess("Estado actualizado.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(order: OrderWithStore) {
    if (!window.confirm(`¿Eliminar el pedido ${order.order_number}?`)) return;
    try {
      setActionLoading(true);
      await deleteOrder(order.id);
      setOrders(prev => prev.filter(item => item.id !== order.id));
      setSelectedOrder(null);
      setSuccess("Pedido eliminado.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
        <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            Pedidos de la plataforma
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Vista interna de todos los pedidos.
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="self-start rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          🔄 Actualizar
        </button>
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

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total</div>
          <div className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Ventas</div>
          <div className="mt-1 text-xl sm:text-3xl font-bold">{formatCurrency(stats.revenue)}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pendientes</div>
          <div className="mt-1 text-2xl sm:text-3xl font-bold text-amber-600">{stats.pending}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Catálogo</div>
          <div className="mt-1 text-2xl sm:text-3xl font-bold text-purple-600">{stats.catalogOrders}</div>
        </div>
      </div>

      {/* Buscador + filtros */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Buscar por pedido, cliente, tienda..."
          className="w-full rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:bg-white"
        />
        {/* Filtros scrollables en móvil */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === filter
                  ? "bg-gray-900 text-white shadow"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter === "todos" ? "Todos" : STATUS_CONFIG[filter as OrderStatus].label}
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
          <div className="text-5xl">📦</div>
          <h2 className="mt-4 text-lg font-bold text-gray-900">Aún no hay pedidos</h2>
          <p className="mt-2 text-sm text-gray-500">Los pedidos aparecerán cuando los clientes compren.</p>
        </div>
      ) : (
        <>
          {/* TABLA DESKTOP */}
          <div className="hidden lg:block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
             <table className="w-full min-w-200 text-left text-sm">
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
                            <span className="font-bold text-gray-900">{order.order_number}</span>
                            {order.has_catalog_items && <span title="Con catálogo" className="text-xs">🏭</span>}
                          </div>
                          <div className="text-xs text-gray-500">
                            {Array.isArray(order.items) ? order.items.length : 0} items
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{order.customer_name}</div>
                          <div className="text-xs text-gray-500 truncate max-w-37.5">{order.customer_email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{order.store_name ?? "Tienda"}</div>
                          <div className="text-xs text-gray-500">{order.vendor_name ?? "—"}</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">{formatCurrency(order.total)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">{timeAgo(order.created_at)}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="rounded-full bg-gray-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-800"
                          >
                            Detalle
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">
                        No se encontraron pedidos con esos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CARDS MÓVIL / TABLET */}
          <div className="lg:hidden space-y-3">
            {filteredOrders.map((order) => {
              const status = STATUS_CONFIG[order.status];
              return (
                <div key={order.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  {/* Badge estado */}
                  <div className={`px-4 py-2 text-xs font-bold ${status.bg} ${status.text} flex items-center justify-between`}>
                    <span>{status.label}</span>
                    {order.has_catalog_items && <span>🏭 Catálogo</span>}
                  </div>
                  <div className="p-4">
                    {/* Número + total */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-sm font-bold text-gray-900">{order.order_number}</div>
                        <div className="text-xs text-gray-400">{timeAgo(order.created_at)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-gray-900">{formatCurrency(order.total)}</div>
                        <div className="text-xs text-gray-500">
                          {Array.isArray(order.items) ? order.items.length : 0} items
                        </div>
                      </div>
                    </div>

                    {/* Cliente */}
                    <div className="mt-3 rounded-xl bg-gray-50 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cliente</div>
                      <div className="mt-0.5 font-semibold text-gray-900 truncate">{order.customer_name}</div>
                      <div className="text-xs text-gray-500 truncate">{order.customer_email}</div>
                    </div>

                    {/* Tienda */}
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                      <span>🏪</span>
                      <span className="truncate font-medium">{order.store_name ?? "Tienda"}</span>
                      {order.vendor_name && <span className="text-gray-400">· {order.vendor_name}</span>}
                    </div>

                    {/* Pago */}
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                      <span>💳</span>
                      <span>{PAYMENT_LABELS[order.payment_method as PaymentMethodType] ?? order.payment_method}</span>
                    </div>

                    {/* Botón */}
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="mt-4 w-full rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white transition hover:bg-gray-800"
                    >
                      Ver detalle
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredOrders.length === 0 && (
              <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                <div className="text-4xl">📭</div>
                <p className="mt-3 text-sm text-gray-500">No hay pedidos con esos filtros.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL DETALLE */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 backdrop-blur-sm"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="max-h-[95vh] sm:max-h-[90vh] w-full sm:max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle móvil */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            {/* Header modal */}
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white p-4 sm:p-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Pedido</div>
                <h2 className="font-mono text-xl sm:text-2xl font-bold text-gray-900">
                  {selectedOrder.order_number}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CONFIG[selectedOrder.status].bg} ${STATUS_CONFIG[selectedOrder.status].text}`}>
                    {STATUS_CONFIG[selectedOrder.status].label}
                  </span>
                  {selectedOrder.has_catalog_items && (
                    <span className="inline-flex rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                      🏭 Con catálogo
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-2xl text-gray-400 hover:text-gray-600 ml-4">×</button>
            </div>

            <div className="space-y-4 p-4 sm:p-6">
              {/* Cliente */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Cliente</div>
                <div className="font-bold text-gray-900">{selectedOrder.customer_name}</div>
                <div className="text-sm text-gray-600 mt-1">📞 {selectedOrder.customer_phone}</div>
                <div className="text-sm text-gray-600 truncate">✉️ {selectedOrder.customer_email}</div>
                <div className="mt-2 text-xs text-gray-500">
                  {(() => {
                    const addr = selectedOrder.shipping_address as any;
                    if (!addr) return "Sin dirección";
                    if (typeof addr === "string") return addr;
                    return `${addr.street ?? ""}, ${addr.district ?? ""} (${addr.city ?? ""})${addr.reference ? ` · ${addr.reference}` : ""}`;
                  })()}
                </div>
              </div>

              {/* Tienda */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Tienda</div>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-gray-900">{selectedOrder.store_name ?? "Tienda"}</div>
                    <div className="text-xs text-gray-500">Vendor: {selectedOrder.vendor_name ?? "—"}</div>
                  </div>
                  {selectedOrder.store_slug && (
                    <a
                      href={`/tienda/${selectedOrder.store_slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Ver ↗
                    </a>
                  )}
                </div>
              </div>

              {/* Productos */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Productos</div>
                <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-sm gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="shrink-0 font-bold text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {item.quantity}x
                          </span>
                          <span className="text-gray-800 font-medium truncate">{item.name ?? item.product_name}</span>
                        </div>
                        <span className="shrink-0 font-semibold text-gray-900">
                          {formatCurrency((item.price ?? item.unit_price) * item.quantity || 0)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 py-2">Sin detalle de productos.</p>
                  )}
                </div>
              </div>

              {/* Total + pago */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total</div>
                  <div className="mt-1 text-xl sm:text-2xl font-black text-rose-600">
                    {formatCurrency(selectedOrder.total)}
                  </div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pago</div>
                  <div className="mt-1 text-sm font-bold text-gray-800">
                    💳 {PAYMENT_LABELS[selectedOrder.payment_method as PaymentMethodType] ?? selectedOrder.payment_method}
                  </div>
                </div>
              </div>

              {/* Cambiar estado */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Cambiar estado
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(selectedOrder, status)}
                      disabled={actionLoading}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                        selectedOrder.status === status
                          ? `${STATUS_CONFIG[status].bg} ${STATUS_CONFIG[status].text} ring-2 ring-current`
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {STATUS_CONFIG[status].label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-900">
                  <span className="font-bold">Nota: </span>{selectedOrder.notes}
                </div>
              )}

              <button
                onClick={() => handleDelete(selectedOrder)}
                disabled={actionLoading}
                className="w-full rounded-xl bg-red-50 py-3 text-xs font-bold text-red-600 transition hover:bg-red-100"
              >
                🗑 Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}