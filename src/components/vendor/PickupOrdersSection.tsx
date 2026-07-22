// src/components/vendor/PickupOrdersSection.tsx
// 🆕 v17 - Sección de pedidos pickup en el dashboard del vendor
import { useEffect, useState } from "react";
import {
  listMyPickupOrders,
  completePickup,
  type VendorPickupOrder,
} from "../../lib/vendor-pickup-orders";
import { useToast } from "../../contexts/ToastContext";

export default function PickupOrdersSection({ storeId }: { storeId: string }) {
  const toast = useToast();
  const [orders, setOrders] = useState<VendorPickupOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [codeInputs, setCodeInputs] = useState<Record<string, string>>({});

  async function loadOrders() {
    try {
      setLoading(true);
      const data = await listMyPickupOrders(storeId);
      setOrders(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (storeId) loadOrders();
  }, [storeId]);

  async function handleComplete(order: VendorPickupOrder) {
    const code = codeInputs[order.id]?.trim();
    if (!code || code.length !== 6) {
      toast.warning("Código inválido", "Debe ser de 6 dígitos");
      return;
    }

    try {
      setVerifying(order.id);
      await completePickup(order.id, code);
      toast.success("¡Pedido entregado!", `${order.customer_name} recogió su pedido`);
      setCodeInputs((prev) => {
        const next = { ...prev };
        delete next[order.id];
        return next;
      });
      loadOrders();
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setVerifying(null);
    }
  }

  if (loading) return null;
  if (orders.length === 0) return null;

  const readyOrders = orders.filter((o) => o.pickup_ready_at);
  const preparingOrders = orders.filter((o) => !o.pickup_ready_at);

  return (
    <div className="rounded-2xl border-2 border-purple-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            🏪 Pedidos para recoger en tienda
            <span className="inline-flex items-center justify-center rounded-full bg-purple-500 px-2 py-0.5 text-xs font-bold text-white">
              {orders.length}
            </span>
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Verifica el código del cliente y marca como entregado
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Órdenes listas para recoger */}
      {readyOrders.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            ✅ Listos para recoger ({readyOrders.length})
          </p>
          {readyOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-500">
                      {order.order_number}
                    </span>
                    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      LISTO
                    </span>
                  </div>
                  <h3 className="mt-1 font-bold text-gray-900">
                    👤 {order.customer_name}
                  </h3>
                  <p className="text-xs text-gray-600">
                    📞 {order.customer_phone}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    💰 S/ {Number(order.total).toFixed(2)} ·{" "}
                    {order.items?.length ?? 0} items
                  </p>
                  {order.pickup_time_slot && (
                    <p className="text-xs text-gray-500 mt-1">
                      🕒 {order.pickup_time_slot}
                    </p>
                  )}
                </div>
              </div>

              {/* Input código */}
              <div className="mt-3 rounded-xl bg-white p-3 border border-gray-200">
                <p className="text-xs font-bold text-gray-700 mb-2">
                  🔐 Pide al cliente el código de 6 dígitos:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={codeInputs[order.id] ?? ""}
                    onChange={(e) =>
                      setCodeInputs((prev) => ({
                        ...prev,
                        [order.id]: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                    className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-center text-2xl font-mono font-black tracking-widest focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleComplete(order)}
                    disabled={
                      verifying === order.id ||
                      !codeInputs[order.id] ||
                      codeInputs[order.id].length !== 6
                    }
                    className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {verifying === order.id ? "..." : "✓ Entregar"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Órdenes en preparación */}
      {preparingOrders.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
            ⏳ En preparación ({preparingOrders.length})
          </p>
          {preparingOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-xs text-gray-500">
                    {order.order_number}
                  </span>
                  <p className="font-bold text-gray-900">
                    👤 {order.customer_name}
                  </p>
                </div>
                <p className="font-semibold text-gray-900">
                  S/ {Number(order.total).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}