// src/pages/OrderTrackingPage.tsx
// Página pública de tracking de pedido - FASE 4A
// URL: /pedido/:orderNumber
// Funciona para invitados y registrados por igual

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  fetchOrderTracking,
  getTrackingStep,
  getTrackingLabel,
  timeAgo,
  type OrderTrackingData,
} from "../lib/order-tracking";
import { openWhatsapp, msgDeliveryContact } from "../lib/whatsapp";
const VEHICLE_LABELS: Record<string, string> = {
  moto: "🏍️ Moto",
  bici: "🚴 Bicicleta",
  auto: "🚗 Auto",
  a_pie: "🚶 A pie",
};

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function formatAddress(address: any) {
  if (!address) return "";
  return [address.street, address.district, address.city]
    .filter(Boolean)
    .join(", ");
}

/**
 * Timeline visual con 4 pasos
 */
function TrackingTimeline({ step }: { step: number }) {
  const steps = [
    { label: "Pedido recibido", icon: "📦" },
    { label: "Delivery asignado", icon: "🛵" },
    { label: "En camino", icon: "🚚" },
    { label: "Entregado", icon: "🎉" },
  ];

  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        const done = i <= step;
        const current = i === step;

        return (
          <div key={i} className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg transition ${
                done
                  ? "bg-emerald-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-400"
              } ${current ? "ring-4 ring-emerald-200" : ""}`}
            >
              {done ? s.icon : "○"}
            </div>

            <div className="min-w-0 flex-1">
              <div
                className={`text-sm font-semibold ${
                  done ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {s.label}
              </div>
              {current && (
                <div className="text-xs text-emerald-600">Estado actual</div>
              )}
            </div>

            {done && !current && (
              <span className="text-xs font-bold text-emerald-500">✓</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderTrackingPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [data, setData] = useState<OrderTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    if (!orderNumber) return;
    try {
      setLoading(true);
      setError(null);
      const result = await fetchOrderTracking(orderNumber);
      if (!result) {
        setError("No encontramos este pedido. Verifica el número.");
        return;
      }
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el pedido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Refrescar cada 30 segundos para ver cambios en vivo
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  // Copiar link al portapapeles
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignorar
    }
  }

  // Compartir por WhatsApp
  function shareByWhatsapp() {
    if (!data) return;
    const message = [
      `📦 Sigue el estado de mi pedido *${data.order_number}*`,
      ``,
      `🏪 Tienda: ${data.store?.name ?? ""}`,
      `💰 Total: ${formatCurrency(data.total)}`,
      ``,
      `Ver tracking en vivo:`,
      window.location.href,
    ].join("\n");

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // Contactar al delivery
  function contactDelivery() {
    if (!data?.delivery) return;
    const message = msgDeliveryContact({
      orderNumber: data.order_number,
      total: data.total,
      customerName: data.customer_name,
    });
    const opened = openWhatsapp(data.delivery.phone, message);
    if (!opened) {
      alert("El delivery no tiene un teléfono válido");
    }
  }

  // Contactar a la tienda
  function contactStore() {
    if (!data?.store?.whatsapp) return;
    const message = `¡Hola ${data.store.name}! 👋\n\nTengo una consulta sobre mi pedido *${data.order_number}*.`;
    const opened = openWhatsapp(data.store.whatsapp, message);
    if (!opened) {
      alert("La tienda no tiene WhatsApp configurado");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-rose-50 via-white to-orange-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-rose-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-rose-50 via-white to-orange-50 px-6 text-center">
        <div className="text-7xl">🔍</div>
        <h1 className="mt-6 text-3xl font-bold text-gray-900">
          Pedido no encontrado
        </h1>
        <p className="mt-2 max-w-md text-gray-500">
          {error ?? "Verifica que el número de pedido sea correcto."}
        </p>
        <Link
          to="/"
          className="mt-8 rounded-full bg-gray-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-gray-800"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  const step = getTrackingStep(data);
  const label = getTrackingLabel(data);
  const isCancelled = data.status === "cancelled";
  const isDelivered = data.status === "delivered";

  return (
    <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-orange-50">
      {/* Banner superior */}
      <div className="bg-linear-to-r from-rose-500 to-orange-500 text-white">
        <div className="container mx-auto px-6 py-3 text-center text-sm font-medium">
          📦 Seguimiento de pedido en tiempo real
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Header con tienda */}
        {data.store && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 text-2xl">
              {data.store.logo_url ? (
                <img
                  src={data.store.logo_url}
                  alt={data.store.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                "🏪"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Comprado en
              </div>
              <Link
                to={`/tienda/${data.store.slug}`}
                className="truncate text-base font-bold text-gray-900 hover:text-rose-600"
              >
                {data.store.name} →
              </Link>
            </div>
          </div>
        )}

        {/* Card principal de estado */}
        <div
          className={`overflow-hidden rounded-3xl shadow-lg ${
            isCancelled
              ? "bg-linear-to-br from-red-500 to-rose-600"
              : isDelivered
              ? "bg-linear-to-br from-emerald-500 to-teal-600"
              : "bg-linear-to-br from-blue-500 to-indigo-600"
          } text-white`}
        >
          <div className="p-6 sm:p-8">
            <div className="text-xs font-bold uppercase tracking-wider opacity-80">
              Pedido
            </div>
            <div className="mt-1 font-mono text-lg font-black">
              {data.order_number}
            </div>

            <div className="mt-4 text-3xl font-black sm:text-4xl">{label}</div>
            <div className="mt-1 text-sm opacity-90">
              Actualizado {timeAgo(data.updated_at)}
            </div>

            <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2 border-t border-white/20 pt-4">
              <div>
                <div className="text-xs opacity-80">Total del pedido</div>
                <div className="text-2xl font-black">
                  {formatCurrency(data.total)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">Productos</div>
                <div className="font-bold">
                  {data.items.length}{" "}
                  {data.items.length === 1 ? "item" : "items"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        {!isCancelled && (
          <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              📍 Estado del envío
            </h2>
            <div className="mt-5">
              <TrackingTimeline step={step} />
            </div>
          </div>
        )}

        {/* Card del delivery */}
        {data.delivery && !isCancelled && (
          <div className="mt-6 overflow-hidden rounded-3xl border-2 border-emerald-200 bg-white shadow-sm">
            <div className="bg-linear-to-r from-emerald-500 to-teal-500 px-6 py-3 text-white">
              <div className="text-xs font-bold uppercase tracking-wider">
                🛵 Tu delivery
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4">
                {data.delivery.photo_url || data.delivery.avatar_url ? (
                  <img
                    src={
                      data.delivery.photo_url ??
                      data.delivery.avatar_url ??
                      ""
                    }
                    alt={data.delivery.full_name ?? "Delivery"}
                    className="h-16 w-16 rounded-full object-cover ring-4 ring-emerald-100"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl ring-4 ring-emerald-50">
                    🛵
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="text-base font-bold text-gray-900">
                    {data.delivery.full_name ?? "Delivery asignado"}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    {data.delivery.vehicle_type && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium">
                        {VEHICLE_LABELS[data.delivery.vehicle_type] ??
                          data.delivery.vehicle_type}
                        {data.delivery.vehicle_plate && (
                          <span className="ml-1 font-mono">
                            {data.delivery.vehicle_plate}
                          </span>
                        )}
                      </span>
                    )}

                    {data.delivery.total_deliveries > 0 && (
                      <span>
                        ⭐{" "}
                        {data.delivery.rating > 0
                          ? data.delivery.rating.toFixed(1)
                          : "Nuevo"}
                        {" · "}
                        {data.delivery.total_deliveries} entregas
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={contactDelivery}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 hover:shadow-lg"
              >
                💬 Escribir al delivery
              </button>
            </div>
          </div>
        )}

        {/* Sin delivery aún */}
        {!data.delivery && !isCancelled && data.status !== "pending_payment" && (
          <div className="mt-6 rounded-3xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
            <div className="text-4xl">⏳</div>
            <p className="mt-2 text-sm font-semibold text-gray-700">
              Esperando asignación de delivery
            </p>
            <p className="mt-1 text-xs text-gray-500">
              La tienda te asignará un delivery pronto.
            </p>
          </div>
        )}

        {/* Dirección de entrega */}
        <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            📍 Dirección de entrega
          </h2>
          <div className="mt-3 rounded-2xl bg-gray-50 p-4 text-sm">
            <div className="font-bold text-gray-900">
              {data.shipping_address.full_name}
            </div>
            <div className="mt-1 text-gray-700">
              {formatAddress(data.shipping_address)}
            </div>
            <div className="mt-1 text-gray-600">
              📞 {data.shipping_address.phone}
            </div>
            {data.shipping_address.reference && (
              <div className="mt-1 text-xs text-gray-500">
                💡 {data.shipping_address.reference}
              </div>
            )}
          </div>
        </div>

        {/* Productos */}
        <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            📦 Productos
          </h2>
          <div className="mt-3 space-y-2">
            {data.items.map((item, i) => (
              <div
                key={`${item.product_id}-${i}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-gray-900">
                    {item.product_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    x{item.quantity} · {formatCurrency(item.unit_price)} c/u
                  </div>
                </div>
                <div className="shrink-0 font-bold text-gray-900">
                  {formatCurrency(item.subtotal)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-baseline justify-between border-t border-gray-100 pt-4">
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-xl font-black text-gray-900">
              {formatCurrency(data.total)}
            </span>
          </div>
        </div>

        {/* Botones de contacto tienda */}
        {data.store?.whatsapp && (
          <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              🏪 Contactar a la tienda
            </h2>
            <button
              onClick={contactStore}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
            >
              💬 Escribir a {data.store.name}
            </button>
          </div>
        )}

        {/* Compartir tracking */}
        <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            🔗 Compartir seguimiento
          </h2>
          <p className="mt-2 text-xs text-gray-500">
            Copia el link o compártelo con quien recibirá el pedido.
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              onClick={copyLink}
              className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-200"
            >
              {copied ? "✅ Copiado" : "📋 Copiar link"}
            </button>
            <button
              onClick={shareByWhatsapp}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
            >
              💬 Compartir por WhatsApp
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>
            Esta página se actualiza automáticamente cada 30 segundos.
          </p>
          <p className="mt-2">
            <Link to="/" className="hover:text-gray-600">
              Dropship Perú
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}