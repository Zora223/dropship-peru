// src/pages/admin/AdminDeliveryPaymentsPage.tsx
// Panel de liquidaciones del admin (Fase 7 + config de fees)
import { useEffect, useState } from "react";
import {
  getPaymentsSummary,
  getVendorPayments,
  getDeliveryPayments,
  markVendorPayment,
  markDeliveryPayment,
  revertVendorPayment,
  revertDeliveryPayment,
  type EarningRow,
  type PaymentsSummary,
  type PaymentFilter,
} from "../../lib/admin-payments";
import { useToast } from "../../contexts/ToastContext";
import MarkPaidModal from "../../components/admin/MarkPaidModal";
import FeeConfigCard from "../../components/admin/FeeConfigCard"; // 🆕
import { openWhatsapp } from "../../lib/whatsapp";

type Tab = "vendor" | "delivery";

export default function AdminDeliveryPaymentsPage() {
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("vendor");
  const [filter, setFilter] = useState<PaymentFilter>("pending");
  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [rows, setRows] = useState<EarningRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<EarningRow | null>(null);

  // ============================================================
  // Cargar datos
  // ============================================================
  const loadAll = async () => {
    setLoading(true);
    try {
      const [sum, list] = await Promise.all([
        getPaymentsSummary(),
        tab === "vendor"
          ? getVendorPayments(filter)
          : getDeliveryPayments(filter),
      ]);
      setSummary(sum);
      setRows(list);
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudieron cargar las liquidaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filter]);

  // ============================================================
  // Handlers
  // ============================================================
  const openMarkPaid = (row: EarningRow) => {
    setSelected(row);
    setModalOpen(true);
  };

  const handleConfirmPayment = async (notes: string) => {
    if (!selected) return;
    try {
      if (tab === "vendor") {
        await markVendorPayment(selected.id, notes);
        toast.success("✅ Pago registrado", "Vendor marcado como pagado");
      } else {
        await markDeliveryPayment(selected.id, notes);
        toast.success("✅ Pago enviado", "Delivery marcado como pagado");
      }
      await loadAll();
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudo registrar el pago");
    }
  };

  const handleRevert = async (row: EarningRow) => {
    const confirmed = window.confirm(
      "¿Revertir el pago? Se marcará como pendiente nuevamente."
    );
    if (!confirmed) return;

    try {
      if (tab === "vendor") {
        await revertVendorPayment(row.id);
      } else {
        await revertDeliveryPayment(row.id);
      }
      toast.info("Pago revertido", "Marcado como pendiente");
      await loadAll();
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudo revertir");
    }
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          💰 Liquidaciones de Delivery
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Gestiona los pagos entre vendors, plataforma y deliveries
        </p>
      </div>

      {/* 🆕 Configuración de comisión */}
      <FeeConfigCard onUpdated={loadAll} />

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Por cobrar (Vendors)"
          value={`S/. ${summary?.totalToCollect.toFixed(2) ?? "0.00"}`}
          subtitle={`${summary?.pendingVendorCount ?? 0} pendientes`}
          color="amber"
        />
        <KpiCard
          label="Por pagar (Deliveries)"
          value={`S/. ${summary?.totalToPay.toFixed(2) ?? "0.00"}`}
          subtitle={`${summary?.pendingDeliveryCount ?? 0} pendientes`}
          color="rose"
        />
        <KpiCard
          label="Fees este mes"
          value={`S/. ${summary?.feesEarnedMonth.toFixed(2) ?? "0.00"}`}
          subtitle="Ganancia plataforma"
          color="emerald"
        />
        <KpiCard
          label="Entregas del mes"
          value={String(summary?.deliveriesCompletedMonth ?? 0)}
          subtitle="Ciclo completo"
          color="sky"
        />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1">
        <button
          onClick={() => setTab("vendor")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            tab === "vendor"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          🏪 Vendor → Admin
        </button>
        <button
          onClick={() => setTab("delivery")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            tab === "delivery"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          🛵 Admin → Delivery
        </button>
      </div>

      {/* Filtro */}
      <div className="mb-4 flex gap-2">
        {(["pending", "done", "all"] as PaymentFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              filter === f
                ? "bg-rose-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {f === "pending"
              ? "⏳ Pendientes"
              : f === "done"
              ? "✅ Pagados"
              : "📋 Todos"}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-rose-600 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-600">Cargando...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
          <div className="mb-3 text-5xl">🎉</div>
          <h3 className="text-lg font-semibold text-gray-900">
            No hay liquidaciones {filter === "pending" ? "pendientes" : ""}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {tab === "vendor"
              ? "Todos los vendors están al día"
              : "Todos los deliveries están cobrados"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) =>
            tab === "vendor" ? (
              <VendorRow
                key={row.id}
                row={row}
                onMarkPaid={() => openMarkPaid(row)}
                onRevert={() => handleRevert(row)}
              />
            ) : (
              <DeliveryRow
                key={row.id}
                row={row}
                onMarkPaid={() => openMarkPaid(row)}
                onRevert={() => handleRevert(row)}
              />
            )
          )}
        </div>
      )}

      {/* Modal confirmación */}
      {selected && (
        <MarkPaidModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelected(null);
          }}
          onConfirm={handleConfirmPayment}
          title={
            tab === "vendor"
              ? "Confirmar cobro del vendor"
              : "Confirmar pago al delivery"
          }
          description={
            tab === "vendor"
              ? `Pedido ${selected.order?.order_number ?? ""} - ${
                  selected.vendor?.full_name ?? selected.vendor?.email ?? ""
                }`
              : `Pedido ${selected.order?.order_number ?? ""} - ${
                  selected.delivery?.full_name ?? selected.delivery?.email ?? ""
                }`
          }
          amount={
            tab === "vendor"
              ? Number(selected.gross_amount)
              : Number(selected.net_amount)
          }
          colorScheme={tab === "vendor" ? "emerald" : "rose"}
        />
      )}
    </div>
  );
}

// ============================================================
// KPI Card
// ============================================================
function KpiCard({
  label,
  value,
  subtitle,
  color,
}: {
  label: string;
  value: string;
  subtitle: string;
  color: "amber" | "rose" | "emerald" | "sky";
}) {
  const colors = {
    amber: "from-amber-500 to-orange-500",
    rose: "from-rose-500 to-pink-500",
    emerald: "from-emerald-500 to-teal-500",
    sky: "from-sky-500 to-blue-500",
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div
        className={`mb-2 h-1 w-10 rounded-full bg-linear-to-r ${colors[color]}`}
      />
      <p className="text-xs text-gray-600">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

// ============================================================
// Fila Vendor → Admin
// ============================================================
function VendorRow({
  row,
  onMarkPaid,
  onRevert,
}: {
  row: EarningRow;
  onMarkPaid: () => void;
  onRevert: () => void;
}) {
  // Constraint: vendor usa "received" (no "paid")
  const isPaid = row.vendor_payment_status === "received";
  const deliveredAt = row.order?.delivery_delivered_at
    ? new Date(row.order.delivery_delivered_at).toLocaleString("es-PE")
    : "—";

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Info */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-900">
              {row.order?.order_number ?? "Pedido"}
            </span>
            {isPaid ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                ✅ Cobrado
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                ⏳ Pendiente
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-gray-700">
            <span className="font-medium">Vendor:</span>{" "}
            {row.vendor?.full_name ?? row.vendor?.email ?? "—"}
          </p>
          <p className="text-xs text-gray-500">Entregado: {deliveredAt}</p>

          {isPaid && row.vendor_paid_at && (
            <p className="mt-1 text-xs text-emerald-600">
              Cobrado el {new Date(row.vendor_paid_at).toLocaleString("es-PE")}
            </p>
          )}
          {isPaid && row.vendor_payment_notes && (
            <p className="mt-0.5 text-xs italic text-gray-500">
              "{row.vendor_payment_notes}"
            </p>
          )}
        </div>

        {/* Monto + acción */}
        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="text-xs text-gray-500">Debe pagar</p>
            <p className="text-xl font-bold text-amber-600">
              S/. {Number(row.gross_amount).toFixed(2)}
            </p>
          </div>

          {isPaid ? (
            <button
              onClick={onRevert}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Revertir
            </button>
          ) : (
            <button
              onClick={onMarkPaid}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              💰 Marcar cobrado
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Fila Admin → Delivery
// ============================================================
function DeliveryRow({
  row,
  onMarkPaid,
  onRevert,
}: {
  row: EarningRow;
  onMarkPaid: () => void;
  onRevert: () => void;
}) {
  const isPaid = row.delivery_payment_status === "paid";
  const deliveredAt = row.order?.delivery_delivered_at
    ? new Date(row.order.delivery_delivered_at).toLocaleString("es-PE")
    : "—";

  const yapePhone =
    row.delivery_profile?.yape_number ?? row.delivery_profile?.phone ?? null;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Info */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-900">
              {row.order?.order_number ?? "Pedido"}
            </span>
            {isPaid ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                ✅ Pagado
              </span>
            ) : (
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                ⏳ Por pagar
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-gray-700">
            <span className="font-medium">Delivery:</span>{" "}
            {row.delivery?.full_name ?? row.delivery?.email ?? "—"}
          </p>

          {yapePhone && (
            <p className="text-xs text-gray-600">
              📱 Yape: <span className="font-mono">{yapePhone}</span>
            </p>
          )}

          <p className="text-xs text-gray-500">Entregado: {deliveredAt}</p>

          <div className="mt-1 text-xs text-gray-500">
            Bruto: S/. {Number(row.gross_amount).toFixed(2)} · Fee plataforma:
            S/. {Number(row.platform_fee).toFixed(2)}
          </div>

          {isPaid && row.delivery_paid_at && (
            <p className="mt-1 text-xs text-emerald-600">
              Pagado el {new Date(row.delivery_paid_at).toLocaleString("es-PE")}
            </p>
          )}
          {isPaid && row.delivery_payment_notes && (
            <p className="mt-0.5 text-xs italic text-gray-500">
              "{row.delivery_payment_notes}"
            </p>
          )}
        </div>

        {/* Monto + acción */}
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-xs text-gray-500">A pagar</p>
            <p className="text-xl font-bold text-rose-600">
              S/. {Number(row.net_amount).toFixed(2)}
            </p>
          </div>

          <div className="flex gap-2">
            {yapePhone && !isPaid && (
              <button
                onClick={() =>
                  openWhatsapp(
                    yapePhone,
                    `Hola! Te acabo de yapear S/. ${Number(
                      row.net_amount
                    ).toFixed(2)} por la entrega del pedido ${
                      row.order?.order_number ?? ""
                    }. Confirma cuando recibas 🙌`
                  )
                }
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              >
                💬 WhatsApp
              </button>
            )}

            {isPaid ? (
              <button
                onClick={onRevert}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Revertir
              </button>
            ) : (
              <button
                onClick={onMarkPaid}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
              >
                💸 Marcar pagado
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}