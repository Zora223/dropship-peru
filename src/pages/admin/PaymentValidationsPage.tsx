// ============================================================
// PÁGINA: PaymentValidationsPage
// Panel admin para gestionar validaciones OCR de pagos
// ============================================================

import { useEffect, useState } from "react";
import {
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Eye,
  RefreshCw,
} from "lucide-react";
import type {
  PaymentValidation,
  ValidationStatus,
  ValidationStats,
} from "../../lib/payment-validations-admin";
import {
  listPaymentValidations,
  getValidationStats,
} from "../../lib/payment-validations-admin";
import { PaymentValidationDetailModal } from "../../components/admin/PaymentValidationDetailModal";
import { useToast } from "../../contexts/ToastContext";

export function PaymentValidationsPage() {
  const toast = useToast();
  const [validations, setValidations] = useState<PaymentValidation[]>([]);
  const [stats, setStats] = useState<ValidationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ValidationStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PaymentValidation | null>(null);

  // Cargar datos
  const loadData = async () => {
    try {
      setLoading(true);
      const [validationsData, statsData] = await Promise.all([
        listPaymentValidations({ status: filter, search }),
        getValidationStats(),
      ]);
      setValidations(validationsData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudieron cargar las validaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Búsqueda con debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadData();
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const statusBadge = (status: ValidationStatus) => {
    const styles = {
      approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
      manual_review: "bg-amber-100 text-amber-700 border-amber-200",
    };
    const labels = {
      approved: "Aprobado",
      rejected: "Rechazado",
      manual_review: "Revisión manual",
    };
    const icons = {
      approved: CheckCircle2,
      rejected: XCircle,
      manual_review: AlertTriangle,
    };
    const Icon = icons[status];
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${styles[status]}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Validaciones OCR
            </h1>
            <p className="text-sm text-gray-600">
              Gestión de pagos validados automáticamente
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl font-medium transition disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
          />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total"
            value={stats.total}
            icon={TrendingUp}
            color="purple"
          />
          <StatCard
            label="Aprobados"
            value={stats.approved}
            subtitle={`${stats.approval_rate}% éxito`}
            icon={CheckCircle2}
            color="emerald"
          />
          <StatCard
            label="Rechazados"
            value={stats.rejected}
            icon={XCircle}
            color="red"
          />
          <StatCard
            label="Revisión manual"
            value={stats.manual_review}
            subtitle="Requieren tu acción"
            icon={AlertTriangle}
            color="amber"
          />
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por pedido, cliente o destinatario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Tabs de filtro */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <FilterTab
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              Todos
            </FilterTab>
            <FilterTab
              active={filter === "manual_review"}
              onClick={() => setFilter("manual_review")}
              highlight
            >
              Pendientes
            </FilterTab>
            <FilterTab
              active={filter === "approved"}
              onClick={() => setFilter("approved")}
            >
              Aprobados
            </FilterTab>
            <FilterTab
              active={filter === "rejected"}
              onClick={() => setFilter("rejected")}
            >
              Rechazados
            </FilterTab>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-40" />
            <p>Cargando validaciones...</p>
          </div>
        ) : validations.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Filter className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No hay validaciones</p>
            <p className="text-sm mt-1">
              {filter === "all"
                ? "Aún no se han procesado pagos"
                : "No hay validaciones con este filtro"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Monto</th>
                  <th className="px-4 py-3">Detectado</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {validations.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => setSelected(v)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-sm">
                        {v.order?.order_number || "—"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {v.order?.store?.name || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">
                        {v.customer?.full_name || "—"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {v.customer?.email || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">
                        S/. {v.expected_amount.toFixed(2)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p
                        className={`text-sm font-medium ${
                          v.amount_matches
                            ? "text-emerald-700"
                            : "text-red-600"
                        }`}
                      >
                        {v.ocr_detected_amount !== null
                          ? `S/. ${v.ocr_detected_amount.toFixed(2)}`
                          : "—"}
                      </p>
                      {v.ocr_detected_recipient && (
                        <p className="text-xs text-gray-500 truncate max-w-40">
                          → {v.ocr_detected_recipient}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">{statusBadge(v.status)}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-500">
                        {new Date(v.processed_at).toLocaleDateString("es-PE")}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(v.processed_at).toLocaleTimeString("es-PE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(v);
                        }}
                        className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {selected && (
        <PaymentValidationDetailModal
          validation={selected}
          onClose={() => setSelected(null)}
          onActionComplete={loadData}
        />
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "purple" | "emerald" | "red" | "amber";
}) {
  const colors = {
    purple: "from-purple-500 to-fuchsia-600",
    emerald: "from-emerald-500 to-emerald-600",
    red: "from-red-500 to-red-600",
    amber: "from-amber-500 to-orange-600",
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-start justify-between mb-2">
        <div
          className={`w-10 h-10 rounded-xl bg-linear-to-br ${colors[color]} flex items-center justify-center shadow-sm`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
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
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
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