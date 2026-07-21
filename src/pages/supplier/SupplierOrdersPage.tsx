// src/pages/supplier/SupplierOrdersPage.tsx
// 🆕 v16 FASE 3 - Panel de pedidos del proveedor
import { useEffect, useState } from "react";
import {
  Package,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Store,
  User,
  MapPin,
  Calendar,
  DollarSign,
  Eye,
} from "lucide-react";
import {
  listMySupplierOrders,
  getMySupplierStats,
  confirmSupplierOrder,
  markAsPreparing,
  markAsReadyForPickup,
  markAsOutOfStock,
} from "../../lib/supplier-orders";
import type {
  SupplierOrder,
  SupplierOrderStatus,
  SupplierOrderStats,
} from "../../lib/supplier-orders";
import { useToast } from "../../contexts/ToastContext";

const STATUS_CONFIG: Record<
  SupplierOrderStatus,
  {
    label: string;
    color: string;
    icon: any;
  }
> = {
  pending: {
    label: "Pendiente",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmado",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: CheckCircle2,
  },
  preparing: {
    label: "Preparando",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: Package,
  },
  ready_for_pickup: {
    label: "Listo para recojo",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  picked_up: {
    label: "En camino",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    icon: Truck,
  },
  delivered: {
    label: "Entregado",
    color: "bg-emerald-500 text-white border-emerald-600",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: XCircle,
  },
  out_of_stock: {
    label: "Sin stock",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: AlertTriangle,
  },
};

export default function SupplierOrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [stats, setStats] = useState<SupplierOrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SupplierOrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SupplierOrder | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showOutOfStockModal, setShowOutOfStockModal] =
    useState<SupplierOrder | null>(null);
  const [outOfStockReason, setOutOfStockReason] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersData, statsData] = await Promise.all([
        listMySupplierOrders({ status: filter, search }),
        getMySupplierStats(),
      ]);
      setOrders(ordersData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudieron cargar los pedidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const t = setTimeout(loadData, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleConfirm = async (order: SupplierOrder) => {
    if (!confirm(`¿Confirmar stock para "${order.product_name}"?`)) return;
    try {
      setActionLoading(order.id);
      await confirmSupplierOrder(order.id);
      toast.success("Confirmado", "El pedido fue confirmado exitosamente");
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudo confirmar");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePreparing = async (order: SupplierOrder) => {
    try {
      setActionLoading(order.id);
      await markAsPreparing(order.id);
      toast.success("Preparando", "Marcado como en preparación");
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudo actualizar");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReady = async (order: SupplierOrder) => {
    if (!confirm(`¿Marcar "${order.product_name}" como listo para recojo?`))
      return;
    try {
      setActionLoading(order.id);
      await markAsReadyForPickup(order.id);
      toast.success(
        "¡Listo!",
        "El delivery será notificado para recogerlo"
      );
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudo marcar como listo");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOutOfStock = async () => {
    if (!showOutOfStockModal || !outOfStockReason.trim()) {
      toast.warning("Falta motivo", "Explica por qué no tienes stock");
      return;
    }
    try {
      setActionLoading(showOutOfStockModal.id);
      await markAsOutOfStock(showOutOfStockModal.id, outOfStockReason);
      toast.success(
        "Reportado",
        "El vendor será notificado sobre la falta de stock"
      );
      setShowOutOfStockModal(null);
      setOutOfStockReason("");
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudo reportar");
    } finally {
      setActionLoading(null);
    }
  };

  const renderActions = (order: SupplierOrder) => {
    if (actionLoading === order.id) {
      return (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Procesando...
        </div>
      );
    }

    switch (order.status) {
      case "pending":
        return (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleConfirm(order)}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              ✓ Confirmar stock
            </button>
            <button
              onClick={() => setShowOutOfStockModal(order)}
              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              ✗ Sin stock
            </button>
          </div>
        );
      case "confirmed":
        return (
          <button
            onClick={() => handlePreparing(order)}
            className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
          >
            📦 Empezar a preparar
          </button>
        );
      case "preparing":
        return (
          <button
            onClick={() => handleReady(order)}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            ✅ Marcar como listo
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            📦 Mis Pedidos
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona los pedidos de tus productos vendidos.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Pendientes"
            value={stats.pending}
            color="amber"
            icon={Clock}
          />
          <StatCard
            label="En preparación"
            value={stats.confirmed}
            color="blue"
            icon={Package}
          />
          <StatCard
            label="Entregados"
            value={stats.delivered}
            color="emerald"
            icon={CheckCircle2}
          />
          <StatCard
            label="Ganancia pendiente"
            value={stats.pending_revenue}
            color="amber"
            icon={DollarSign}
            isMoney
          />
        </div>
      )}

      {/* Filtros */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por pedido, producto, cliente o tienda..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
            <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
              Todos
            </FilterTab>
            <FilterTab
              active={filter === "pending"}
              onClick={() => setFilter("pending")}
              highlight
            >
              Pendientes
            </FilterTab>
            <FilterTab
              active={filter === "confirmed"}
              onClick={() => setFilter("confirmed")}
            >
              Confirmados
            </FilterTab>
            <FilterTab
              active={filter === "ready_for_pickup"}
              onClick={() => setFilter("ready_for_pickup")}
            >
              Listos
            </FilterTab>
            <FilterTab
              active={filter === "delivered"}
              onClick={() => setFilter("delivered")}
            >
              Entregados
            </FilterTab>
          </div>
        </div>
      </div>

      {/* Lista de pedidos */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-gray-400" />
            <p className="text-sm text-gray-500">Cargando pedidos...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No hay pedidos</p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === "all"
                ? "Aún no tienes pedidos de tus productos"
                : "No hay pedidos con este filtro"}
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const statusConf = STATUS_CONFIG[order.status];
            const StatusIcon = statusConf.icon;
            return (
              <div
                key={order.id}
                className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 hover:shadow-md transition"
              >
                <div className="flex items-start gap-4">
                  {/* Imagen */}
                  <div className="shrink-0">
                    {order.product_image ? (
                      <img
                        src={order.product_image}
                        alt={order.product_name}
                        className="w-20 h-20 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-3xl">
                        📦
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">
                          {order.product_name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {order.order?.order_number} · {order.quantity} unidad
                          {order.quantity > 1 ? "es" : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${statusConf.color}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConf.label}
                      </span>
                    </div>

                    {/* Grid info */}
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Store className="w-3.5 h-3.5" />
                        <span className="truncate">
                          {order.store?.name || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <User className="w-3.5 h-3.5" />
                        <span className="truncate">
                          {order.order?.customer_name || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {order.order?.delivery_date ||
                            order.order?.pickup_time_slot?.split(" ")[0] ||
                            "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>S/ {Number(order.total_amount).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Destino */}
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>
                        {order.delivery_destination === "vendor_store"
                          ? "Entrega al vendor (recojo en tienda del cliente)"
                          : "Entrega directa al cliente"}
                      </span>
                    </div>

                    {/* Motivo cancelación */}
                    {order.cancel_reason && (
                      <div className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                        <strong>Motivo:</strong> {order.cancel_reason}
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div>{renderActions(order)}</div>
                      <button
                        onClick={() => setSelected(order)}
                        className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver detalle
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de detalle */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-linear-to-r from-amber-500 to-orange-600 p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    {selected.product_name}
                  </h2>
                  <p className="text-amber-100 text-sm">
                    {selected.order?.order_number}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Cliente */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <h3 className="font-bold text-gray-900 mb-2">👤 Cliente</h3>
                <p className="text-sm">{selected.order?.customer_name}</p>
                <p className="text-sm text-gray-500">
                  📞 {selected.order?.customer_phone}
                </p>
              </div>

              {/* Dirección o pickup */}
              {selected.order?.delivery_mode === "home_delivery" &&
                selected.order?.shipping_address && (
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <h3 className="font-bold text-gray-900 mb-2">
                      📍 Dirección de entrega
                    </h3>
                    <p className="text-sm">
                      {selected.order.shipping_address.street}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selected.order.shipping_address.district},{" "}
                      {selected.order.shipping_address.city}
                    </p>
                    {selected.order.shipping_address.reference && (
                      <p className="text-xs text-gray-400 mt-1">
                        📌 {selected.order.shipping_address.reference}
                      </p>
                    )}
                    {selected.order.delivery_date && (
                      <p className="text-xs text-gray-600 mt-2 font-semibold">
                        📅 {selected.order.delivery_date} ·{" "}
                        {selected.order.delivery_time_slot}
                      </p>
                    )}
                  </div>
                )}

              {selected.order?.delivery_mode === "store_pickup" && (
                <div className="rounded-2xl bg-purple-50 p-4">
                  <h3 className="font-bold text-purple-900 mb-2">
                    🏪 Recojo en tienda
                  </h3>
                  <p className="text-sm text-purple-800">
                    El cliente recogerá en tu tienda vendor.
                  </p>
                  {selected.order.pickup_time_slot && (
                    <p className="text-xs text-purple-700 mt-2 font-semibold">
                      📅 {selected.order.pickup_time_slot}
                    </p>
                  )}
                </div>
              )}

              {/* Vendor */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <h3 className="font-bold text-gray-900 mb-2">🏪 Vendor</h3>
                <p className="text-sm">{selected.vendor?.full_name}</p>
                <p className="text-sm text-gray-500">
                  Tienda: {selected.store?.name}
                </p>
              </div>

              {/* Precio */}
              <div className="rounded-2xl bg-emerald-50 p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-emerald-700 font-semibold">
                      Tu ganancia
                    </p>
                    <p className="text-2xl font-bold text-emerald-900">
                      S/ {Number(selected.total_amount).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-emerald-700">
                    <p>{selected.quantity} unidad(es)</p>
                    <p>@ S/ {Number(selected.base_price).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal sin stock */}
      {showOutOfStockModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowOutOfStockModal(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900">
              ⚠️ Reportar sin stock
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Producto: <strong>{showOutOfStockModal.product_name}</strong>
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo (será visible para el vendor)
              </label>
              <textarea
                value={outOfStockReason}
                onChange={(e) => setOutOfStockReason(e.target.value)}
                placeholder="Ej: Producto agotado, esperando reposición"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm min-h-24 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowOutOfStockModal(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleOutOfStock}
                disabled={!outOfStockReason.trim()}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ────────────────────────────────

function StatCard({
  label,
  value,
  color,
  icon: Icon,
  isMoney,
}: {
  label: string;
  value: number;
  color: "amber" | "blue" | "emerald" | "red";
  icon: any;
  isMoney?: boolean;
}) {
  const colors = {
    amber: "from-amber-500 to-orange-600",
    blue: "from-blue-500 to-blue-600",
    emerald: "from-emerald-500 to-emerald-600",
    red: "from-red-500 to-red-600",
  };
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
      <div
        className={`w-10 h-10 rounded-xl bg-linear-to-br ${colors[color]} flex items-center justify-center shadow-sm mb-2`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {isMoney ? `S/ ${value.toFixed(2)}` : value}
      </p>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
  highlight,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
        active
          ? highlight
            ? "bg-amber-500 text-white shadow-sm"
            : "bg-white text-gray-900 shadow-sm"
          : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}