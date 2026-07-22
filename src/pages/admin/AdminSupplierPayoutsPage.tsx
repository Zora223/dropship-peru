// src/pages/admin/AdminSupplierPayoutsPage.tsx
// 🆕 v19 - Panel Admin: Liquidaciones a Suppliers
import { useEffect, useState } from "react";
import {
  listSupplierPayouts,
  markPayoutAsPaid,
  getPayoutStats,
  type SupplierPayout,
  type PayoutStatus,
  type PaymentMethod,
} from "../../lib/admin-supplier-payouts";
import { useToast } from "../../contexts/ToastContext";

export default function AdminSupplierPayoutsPage() {
  const toast = useToast();
  const [payouts, setPayouts] = useState<SupplierPayout[]>([]);
  const [stats, setStats] = useState({
    pending_count: 0,
    pending_amount: 0,
    paid_count: 0,
    paid_amount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PayoutStatus>("pending");
  const [modalPayout, setModalPayout] = useState<SupplierPayout | null>(null);

  // Formulario modal
  const [payMethod, setPayMethod] = useState<PaymentMethod>("yape");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const [payoutsData, statsData] = await Promise.all([
        listSupplierPayouts(filter),
        getPayoutStats(),
      ]);
      setPayouts(payoutsData);
      setStats(statsData);
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [filter]);

  function openModal(payout: SupplierPayout) {
    setModalPayout(payout);
    setPayMethod("yape");
    setPayRef("");
    setPayNotes("");
  }

  function closeModal() {
    setModalPayout(null);
  }

  async function handlePay() {
    if (!modalPayout) return;
    if (!payRef.trim()) {
      toast.warning("Falta referencia", "Ingresa el ID/código de operación");
      return;
    }

    try {
      setSaving(true);
      await markPayoutAsPaid(modalPayout.id, {
        payment_method: payMethod,
        payment_reference: payRef,
        payment_notes: payNotes,
      });
      toast.success("✅ Pagado", `S/ ${modalPayout.amount.toFixed(2)} → ${modalPayout.supplier_name}`);
      closeModal();
      loadData();
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💰 Liquidaciones a Proveedores</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona los pagos pendientes a los suppliers
          </p>
        </div>
        <button
          onClick={loadData}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Por pagar"
          value={`S/ ${stats.pending_amount.toFixed(2)}`}
          sub={`${stats.pending_count} liquidaciones`}
          color="amber"
          icon="⏳"
        />
        <StatCard
          label="Pagado (total)"
          value={`S/ ${stats.paid_amount.toFixed(2)}`}
          sub={`${stats.paid_count} liquidaciones`}
          color="emerald"
          icon="✅"
        />
        <StatCard
          label="Total suppliers"
          value={`${new Set(payouts.map((p) => p.supplier_id)).size}`}
          sub="activos con pagos"
          color="blue"
          icon="👥"
        />
        <StatCard
          label="Promedio por pago"
          value={`S/ ${
            stats.paid_count > 0
              ? (stats.paid_amount / stats.paid_count).toFixed(2)
              : "0.00"
          }`}
          sub="histórico"
          color="purple"
          icon="📊"
        />
      </div>

      {/* Filtros */}
      <div className="mt-6 flex gap-2">
        {(["pending", "paid", "all"] as PayoutStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              filter === s
                ? "bg-purple-600 text-white shadow"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {s === "pending" && "⏳ Pendientes"}
            {s === "paid" && "✅ Pagados"}
            {s === "all" && "📋 Todos"}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Cargando...</div>
        ) : payouts.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No hay liquidaciones {filter === "pending" ? "pendientes" : ""}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                  Supplier
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                  Pedido
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                  Cliente
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600">
                  Monto
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-600">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                  Fecha
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{p.supplier_name}</div>
                    {p.supplier_phone && (
                      <div className="text-xs text-gray-500">📞 {p.supplier_phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-700">{p.order_number}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.customer_name}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-gray-900">
                      S/ {Number(p.amount).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.status === "pending" ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                        ⏳ Pendiente
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                        ✅ Pagado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {p.paid_at
                      ? `Pagado: ${new Date(p.paid_at).toLocaleDateString("es-PE")}`
                      : `Creado: ${new Date(p.created_at).toLocaleDateString("es-PE")}`}
                    {p.payment_method && (
                      <div className="mt-0.5 text-gray-400">
                        {p.payment_method.toUpperCase()} · {p.payment_reference}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.status === "pending" ? (
                      <button
                        onClick={() => openModal(p)}
                        className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600"
                      >
                        💰 Marcar pagado
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal pagar */}
      {modalPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900">💰 Registrar pago</h2>
            <p className="mt-1 text-sm text-gray-500">
              Marcar como pagado a <b>{modalPayout.supplier_name}</b>
            </p>

            <div className="mt-4 rounded-xl bg-purple-50 border border-purple-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Monto a pagar:</span>
                <span className="text-2xl font-black text-purple-700">
                  S/ {Number(modalPayout.amount).toFixed(2)}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Pedido: <span className="font-mono">{modalPayout.order_number}</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Método de pago
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["yape", "plin", "transfer", "cash"] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPayMethod(m)}
                      className={`rounded-xl border-2 px-3 py-2 text-xs font-bold transition ${
                        payMethod === m
                          ? "border-purple-500 bg-purple-50 text-purple-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {m === "yape" && "💜 Yape"}
                      {m === "plin" && "💙 Plin"}
                      {m === "transfer" && "🏦 Transf."}
                      {m === "cash" && "💵 Efectivo"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Referencia / N° operación *
                </label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="Ej: 12345678 o Cod: ABC123"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  rows={2}
                  placeholder="Comentarios adicionales..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handlePay}
                disabled={saving || !payRef.trim()}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "✅ Confirmar pago"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Componente StatCard ============
function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: "amber" | "emerald" | "blue" | "purple";
  icon: string;
}) {
  const colors = {
    amber: "border-amber-200 bg-amber-50",
    emerald: "border-emerald-200 bg-emerald-50",
    blue: "border-blue-200 bg-blue-50",
    purple: "border-purple-200 bg-purple-50",
  };

  return (
    <div className={`rounded-2xl border-2 ${colors[color]} p-4`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
          {label}
        </span>
      </div>
      <div className="mt-2 text-2xl font-black text-gray-900">{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{sub}</div>
    </div>
  );
}