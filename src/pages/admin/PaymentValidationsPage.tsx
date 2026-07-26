// src/pages/admin/PaymentValidationsPage.tsx
import { useEffect, useState } from "react";
import {
  Sparkles, Search, CheckCircle2, XCircle,
  AlertTriangle, TrendingUp, Eye, RefreshCw,
} from "lucide-react";
import type { PaymentValidation, ValidationStatus, ValidationStats } from "../../lib/payment-validations-admin";
import { listPaymentValidations, getValidationStats } from "../../lib/payment-validations-admin";
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
      toast.error("Error", "No se pudieron cargar las validaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filter]);
  useEffect(() => {
    const timeout = setTimeout(() => { loadData(); }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const statusBadge = (status: ValidationStatus) => {
    const styles = {
      approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
      manual_review: "bg-amber-100 text-amber-700 border-amber-200",
    };
    const labels = { approved: "Aprobado", rejected: "Rechazado", manual_review: "Revisión" };
    const icons = { approved: CheckCircle2, rejected: XCircle, manual_review: AlertTriangle };
    const Icon = icons[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${styles[status]}`}>
        <Icon className="w-3 h-3" />{labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-linear-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center shadow-lg shrink-0">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Validaciones OCR</h1>
            <p className="text-xs sm:text-sm text-gray-600">Pagos validados automáticamente</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="self-start inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* Stats — 2 cols móvil, 4 desktop */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} icon={TrendingUp} color="purple" />
          <StatCard label="Aprobados" value={stats.approved} subtitle={`${stats.approval_rate}% éxito`} icon={CheckCircle2} color="emerald" />
          <StatCard label="Rechazados" value={stats.rejected} icon={XCircle} color="red" />
          <StatCard label="Revisión" value={stats.manual_review} subtitle="Requieren acción" icon={AlertTriangle} color="amber" />
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col gap-3">
          {/* Buscador */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por pedido, cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          {/* Tabs scrollables en móvil */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide bg-gray-100 rounded-xl p-1">
            {[
              { value: "all", label: "Todos" },
              { value: "manual_review", label: "⚠️ Pendientes", highlight: true },
              { value: "approved", label: "✅ Aprobados" },
              { value: "rejected", label: "❌ Rechazados" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value as ValidationStatus | "all")}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                  filter === tab.value
                    ? tab.highlight ? "bg-amber-500 text-white shadow-sm" : "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-40" />
          <p>Cargando validaciones...</p>
        </div>
      ) : validations.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-3">🔍</div>
          <p className="font-medium">No hay validaciones</p>
          <p className="text-sm mt-1">
            {filter === "all" ? "Aún no se han procesado pagos" : "No hay con este filtro"}
          </p>
        </div>
      ) : (
        <>
          {/* TABLA DESKTOP */}
          <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                    <tr key={v.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setSelected(v)}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-sm">{v.order?.order_number || "—"}</p>
                        <p className="text-xs text-gray-500">{v.order?.store?.name || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{v.customer?.full_name || "—"}</p>
                        <p className="text-xs text-gray-500 truncate max-w-37.5">{v.customer?.email || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">S/. {v.expected_amount.toFixed(2)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className={`text-sm font-medium ${v.amount_matches ? "text-emerald-700" : "text-red-600"}`}>
                          {v.ocr_detected_amount !== null ? `S/. ${v.ocr_detected_amount.toFixed(2)}` : "—"}
                        </p>
                        {v.ocr_detected_recipient && (
                          <p className="text-xs text-gray-500 truncate max-w-30">→ {v.ocr_detected_recipient}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">{statusBadge(v.status)}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-500">{new Date(v.processed_at).toLocaleDateString("es-PE")}</p>
                        <p className="text-xs text-gray-400">{new Date(v.processed_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</p>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={(e) => { e.stopPropagation(); setSelected(v); }} className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 text-sm font-medium">
                          <Eye className="w-4 h-4" />Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CARDS MÓVIL */}
          <div className="lg:hidden space-y-3">
            {validations.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer"
                onClick={() => setSelected(v)}
              >
                {/* Estado badge header */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  {statusBadge(v.status)}
                  <span className="text-xs text-gray-400">{new Date(v.processed_at).toLocaleDateString("es-PE")}</span>
                </div>

                <div className="p-4">
                  {/* Pedido + tienda */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{v.order?.order_number || "—"}</div>
                      <div className="text-xs text-gray-500">{v.order?.store?.name || "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">S/. {v.expected_amount.toFixed(2)}</div>
                      {v.ocr_detected_amount !== null && (
                        <div className={`text-xs font-medium ${v.amount_matches ? "text-emerald-600" : "text-red-600"}`}>
                          OCR: S/. {v.ocr_detected_amount.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cliente */}
                  <div className="mt-3 rounded-xl bg-gray-50 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cliente</div>
                    <div className="mt-0.5 text-sm font-semibold text-gray-900">{v.customer?.full_name || "—"}</div>
                    <div className="text-xs text-gray-500 truncate">{v.customer?.email || "—"}</div>
                  </div>

                  {/* Botón ver */}
                  <button
                    onClick={() => setSelected(v)}
                    className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-purple-50 py-2.5 text-sm font-semibold text-purple-700 transition hover:bg-purple-100"
                  >
                    <Eye className="w-4 h-4" /> Ver detalle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

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

// Sub-componentes
function StatCard({ label, value, subtitle, icon: Icon, color }: {
  label: string; value: number; subtitle?: string;
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
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-linear-to-br ${colors[color]} flex items-center justify-center shadow-sm mb-2`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
      </div>
      <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs sm:text-sm text-gray-600">{label}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}