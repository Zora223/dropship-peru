// src/pages/supplier/SupplierEarningsPage.tsx
// 🆕 v16 FASE 3 - Panel de ganancias del proveedor
import { useEffect, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  Package,
  RefreshCw,
  Calendar,
  User,
} from "lucide-react";
import {
  listMyEarnings,
  getMyEarningsStats,
} from "../../lib/supplier-earnings";
import type {
  SupplierEarning,
  EarningStatus,
  EarningsStats,
} from "../../lib/supplier-earnings";
import { useToast } from "../../contexts/ToastContext";

const STATUS_CONFIG: Record<
  EarningStatus,
  { label: string; color: string; icon: any }
> = {
  pending: {
    label: "Pendiente",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Clock,
  },
  paid: {
    label: "Cobrado",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: Clock,
  },
};

export default function SupplierEarningsPage() {
  const toast = useToast();
  const [earnings, setEarnings] = useState<SupplierEarning[]>([]);
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EarningStatus | "all">("all");

  const loadData = async () => {
    try {
      setLoading(true);
      const [earningsData, statsData] = await Promise.all([
        listMyEarnings({ status: filter }),
        getMyEarningsStats(),
      ]);
      setEarnings(earningsData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudieron cargar las ganancias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            💰 Mis Ganancias
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Historial de ingresos por pedidos entregados.
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

      {/* Hero card - Balance principal */}
      {stats && (
        <div className="rounded-3xl bg-linear-to-br from-amber-500 via-orange-500 to-red-500 p-6 text-white shadow-xl">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
                💵 Por cobrar
              </p>
              <p className="mt-1 text-4xl font-bold">
                S/ {stats.pending.toFixed(2)}
              </p>
              <p className="mt-1 text-xs opacity-80">
                {stats.pending_orders} pedido{stats.pending_orders !== 1 && "s"} pendiente{stats.pending_orders !== 1 && "s"} de pago
              </p>
            </div>

            <div className="md:text-right">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
                ✅ Total cobrado
              </p>
              <p className="mt-1 text-4xl font-bold">
                S/ {stats.paid.toFixed(2)}
              </p>
              <p className="mt-1 text-xs opacity-80">
                {stats.paid_orders} pedido{stats.paid_orders !== 1 && "s"} liquidado{stats.paid_orders !== 1 && "s"}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-white/20 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="opacity-80">📅 Este mes</span>
              <div className="flex gap-4 text-xs">
                <span>
                  Cobrado: <strong>S/ {stats.this_month_earned.toFixed(2)}</strong>
                </span>
                <span>
                  Pendiente: <strong>S/ {stats.this_month_pending.toFixed(2)}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats secundarios */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStatCard
            label="Total pedidos"
            value={stats.total_orders}
            icon={Package}
            color="blue"
          />
          <MiniStatCard
            label="Cobrados"
            value={stats.paid_orders}
            icon={CheckCircle2}
            color="emerald"
          />
          <MiniStatCard
            label="Pendientes"
            value={stats.pending_orders}
            icon={Clock}
            color="amber"
          />
          <MiniStatCard
            label="Este mes"
            value={stats.this_month_earned + stats.this_month_pending}
            icon={TrendingUp}
            color="purple"
            isMoney
          />
        </div>
      )}

      {/* Info importante */}
      <div className="rounded-2xl border-l-4 border-blue-500 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div className="text-sm text-blue-900">
            <p className="font-semibold">¿Cómo cobro mis ganancias?</p>
            <p className="mt-1 text-blue-800">
              Las ganancias se marcan como <strong>Cobradas</strong> cuando el
              administrador te haga la liquidación (Yape, Plin o transferencia).
              Se procesan cada semana los días <strong>lunes</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 max-w-md">
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
          active={filter === "paid"}
          onClick={() => setFilter("paid")}
        >
          Cobrados
        </FilterTab>
      </div>

      {/* Lista de ganancias */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-gray-400" />
            <p className="text-sm text-gray-500">Cargando ganancias...</p>
          </div>
        ) : earnings.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">
              {filter === "all"
                ? "Aún no tienes ganancias"
                : "No hay ganancias con este filtro"}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Las ganancias aparecen cuando un pedido se entrega al cliente.
            </p>
          </div>
        ) : (
          earnings.map((earning) => {
            const statusConf = STATUS_CONFIG[earning.status];
            const StatusIcon = statusConf.icon;
            return (
              <div
                key={earning.id}
                className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 hover:shadow-md transition"
              >
                <div className="flex items-start gap-4">
                  {/* Imagen */}
                  {earning.supplier_order?.product_image ? (
                    <img
                      src={earning.supplier_order.product_image}
                      alt={earning.supplier_order.product_name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shrink-0">
                      📦
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">
                          {earning.supplier_order?.product_name || "Producto"}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {earning.order?.order_number || "—"} ·{" "}
                          {earning.supplier_order?.quantity || 0} unidad(es)
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
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <User className="w-3.5 h-3.5" />
                        <span className="truncate">
                          {earning.order?.customer_name || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {new Date(earning.created_at).toLocaleDateString(
                            "es-PE",
                            {
                              day: "2-digit",
                              month: "short",
                            }
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Monto */}
                    <div className="mt-3 flex items-center justify-between pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          Ganancia
                        </p>
                        <p className="text-xl font-bold text-emerald-700">
                          S/ {Number(earning.amount).toFixed(2)}
                        </p>
                      </div>
                      {earning.status === "paid" && earning.paid_at && (
                        <div className="text-right text-xs text-emerald-600">
                          <p className="font-semibold">Cobrado</p>
                          <p className="text-gray-500">
                            {new Date(earning.paid_at).toLocaleDateString(
                              "es-PE",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </p>
                          {earning.payment_method && (
                            <p className="text-gray-500 mt-0.5">
                              Vía {earning.payment_method}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Notas de pago */}
                    {earning.payment_notes && (
                      <div className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                        <strong>Nota:</strong> {earning.payment_notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Sub-componentes ────────────────────────────────

function MiniStatCard({
  label,
  value,
  icon: Icon,
  color,
  isMoney,
}: {
  label: string;
  value: number;
  icon: any;
  color: "blue" | "emerald" | "amber" | "purple";
  isMoney?: boolean;
}) {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-orange-600",
    purple: "from-purple-500 to-fuchsia-600",
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