// src/pages/delivery/DeliveryEarningsPage.tsx
import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { getMyEarnings, getEarningsSummary } from "../../lib/delivery";

export default function DeliveryEarningsPage() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;

  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    pending: 0,
    paid: 0,
    total: 0,
    count: 0,
  });

  useEffect(() => {
    if (!user?.id) return;
    loadEarnings();
  }, [user?.id]);

  async function loadEarnings() {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [list, sum] = await Promise.all([
        getMyEarnings(user.id),
        getEarningsSummary(user.id),
      ]);
      setEarnings(list);
      setSummary(sum);
    } catch (err) {
      console.error("Error cargando ganancias:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          💰 Mis Ganancias
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Historial de pagos y saldo pendiente por Yape
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 sm:p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
            ⏳ Pendiente por cobrar
          </div>
          <div className="mt-2 text-3xl font-bold text-amber-900">
            S/. {summary.pending.toFixed(2)}
          </div>
          <p className="mt-1 text-xs text-amber-700">
            Te lo paga el admin por Yape
          </p>
        </div>

        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 sm:p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            ✅ Ya cobrado
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-900">
            S/. {summary.paid.toFixed(2)}
          </div>
          <p className="mt-1 text-xs text-emerald-700">
            Total recibido histórico
          </p>
        </div>

        <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 sm:p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
            📦 Total entregas
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {summary.count}
          </div>
          <p className="mt-1 text-xs text-gray-500">Entregas completadas</p>
        </div>
      </div>

      {/* Lista de earnings */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900">
            📋 Historial ({earnings.length})
          </h2>
        </div>

        {earnings.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-5xl">💸</div>
            <p className="mt-3 text-sm font-semibold text-gray-900">
              Sin ganancias aún
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Al confirmar entregas verás tus pagos aquí
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {earnings.map((e) => (
              <EarningRow key={e.id} earning={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EarningRow({ earning }: { earning: any }) {
  const isPaid = earning.delivery_payment_status === "paid";

  return (
    <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="grow">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">
            #{earning.order?.order_number ?? "—"}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              isPaid
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isPaid ? "✅ Pagado" : "⏳ Pendiente"}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-600">
          {earning.order?.customer_name ?? "Cliente"} •{" "}
          {new Date(earning.created_at).toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>
        {isPaid && earning.delivery_paid_at && (
          <p className="mt-0.5 text-xs text-emerald-600">
            💸 Pagado el{" "}
            {new Date(earning.delivery_paid_at).toLocaleDateString("es-PE")}
          </p>
        )}
      </div>

      <div className="text-right">
        <div className="text-lg font-bold text-gray-900">
          S/. {Number(earning.net_amount).toFixed(2)}
        </div>
        <div className="text-xs text-gray-500">
          Bruto S/. {Number(earning.gross_amount).toFixed(2)} - Fee S/.{" "}
          {Number(earning.platform_fee).toFixed(2)}
        </div>
      </div>
    </div>
  );
}