import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchOrderSuccessData } from "../lib/order-success";
import WhatsappFloatingButton from "../components/WhatsappFloatingButton";
import type {
  DbOrder,
  DbStore,
  DbStorePaymentMethod,
  OrderStatus,
  PaymentMethodType,
} from "../types/database";

const PAYMENT_LABELS: Record<PaymentMethodType, string> = {
  yape: "Yape",
  plin: "Plin",
  card: "Tarjeta",
  transfer: "Transferencia",
  cash_on_delivery: "Pago contra entrega",
};

const PAYMENT_ICONS: Record<PaymentMethodType, string> = {
  yape: "💜",
  plin: "💙",
  card: "💳",
  transfer: "🏦",
  cash_on_delivery: "📦",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_CONFIG: Record<
  OrderStatus,
  { bg: string; text: string; message: string }
> = {
  pending_payment: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    message:
      "Tu pedido fue registrado correctamente. Completa el pago siguiendo las instrucciones.",
  },
  confirmed: {
    bg: "bg-blue-50",
    text: "text-blue-800",
    message: "Tu pedido fue confirmado por la tienda.",
  },
  shipped: {
    bg: "bg-purple-50",
    text: "text-purple-800",
    message: "Tu pedido ya fue enviado.",
  },
  delivered: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    message: "Tu pedido fue entregado.",
  },
  cancelled: {
    bg: "bg-red-50",
    text: "text-red-800",
    message: "Este pedido fue cancelado.",
  },
};

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getWhatsappUrl(phone: string, message: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  const normalized = digits.startsWith("51")
    ? digits
    : digits.length === 9
    ? `51${digits}`
    : digits;

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function getTheme(store: DbStore | null) {
  const theme = store?.theme && typeof store.theme === "object" ? store.theme : null;
  return {
    primary_color: theme?.primary_color ?? "#e11d48",
    secondary_color: theme?.secondary_color ?? "#fb923c",
    font_family: theme?.font_family ?? "Inter",
  };
}

function buildPaymentMessage(order: DbOrder, storeName: string): string {
  const paymentLabel = PAYMENT_LABELS[order.payment_method];

  return [
    `¡Hola ${storeName}! 👋`,
    ``,
    `Acabo de realizar un pedido y quiero enviar mi comprobante de pago 📸`,
    ``,
    `📋 *Nº de pedido:* ${order.order_number}`,
    `💰 *Total:* ${formatCurrency(order.total)}`,
    `💳 *Método de pago:* ${paymentLabel}`,
    `👤 *Cliente:* ${order.customer_name}`,
    ``,
    `¡Adjunto la foto del pago!`,
  ].join("\n");
}

function PaymentDetails({
  order,
  store,
  method,
}: {
  order: DbOrder;
  store: DbStore | null;
  method: DbStorePaymentMethod | null;
}) {
  const config = method?.config ?? {};
  const paymentLabel = PAYMENT_LABELS[order.payment_method];
  const paymentIcon = PAYMENT_ICONS[order.payment_method];

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="text-3xl">{paymentIcon}</div>

        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Pago con {paymentLabel}
          </h2>

          <p className="text-sm text-gray-500">
            Método elegido para este pedido.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3 text-sm">
        {(order.payment_method === "yape" ||
          order.payment_method === "plin") && (
          <>
            {config.phone && (
              <div className="flex justify-between gap-4 rounded-xl bg-gray-50 p-3">
                <span className="text-gray-500">Número</span>
                <span className="font-bold text-gray-900">{config.phone}</span>
              </div>
            )}

            {config.holder_name && (
              <div className="flex justify-between gap-4 rounded-xl bg-gray-50 p-3">
                <span className="text-gray-500">Titular</span>
                <span className="font-bold text-gray-900">
                  {config.holder_name}
                </span>
              </div>
            )}

            {config.qr_url && (
              <div className="rounded-xl bg-gray-50 p-4 text-center">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                  QR de pago
                </div>

                <img
                  src={config.qr_url}
                  alt={`QR ${paymentLabel}`}
                  className="mx-auto max-h-60 rounded-xl object-contain"
                />
              </div>
            )}
          </>
        )}

        {order.payment_method === "transfer" && (
          <>
            {config.bank_name && (
              <div className="flex justify-between gap-4 rounded-xl bg-gray-50 p-3">
                <span className="text-gray-500">Banco</span>
                <span className="font-bold text-gray-900">
                  {config.bank_name}
                </span>
              </div>
            )}

            {config.account_holder && (
              <div className="flex justify-between gap-4 rounded-xl bg-gray-50 p-3">
                <span className="text-gray-500">Titular</span>
                <span className="font-bold text-gray-900">
                  {config.account_holder}
                </span>
              </div>
            )}

            {config.account_number && (
              <div className="flex justify-between gap-4 rounded-xl bg-gray-50 p-3">
                <span className="text-gray-500">Cuenta</span>
                <span className="font-bold text-gray-900">
                  {config.account_number}
                </span>
              </div>
            )}

            {config.cci && (
              <div className="flex justify-between gap-4 rounded-xl bg-gray-50 p-3">
                <span className="text-gray-500">CCI</span>
                <span className="font-bold text-gray-900">{config.cci}</span>
              </div>
            )}

            {config.document_number && (
              <div className="flex justify-between gap-4 rounded-xl bg-gray-50 p-3">
                <span className="text-gray-500">DNI/RUC</span>
                <span className="font-bold text-gray-900">
                  {config.document_number}
                </span>
              </div>
            )}
          </>
        )}

        {order.payment_method === "card" && (
          <div className="rounded-xl bg-gray-50 p-3 text-gray-600">
            Tu pago con tarjeta será validado por la plataforma o la tienda.
          </div>
        )}

        {order.payment_method === "cash_on_delivery" && (
          <div className="rounded-xl bg-gray-50 p-3 text-gray-600">
            Pagarás cuando recibas el pedido. La tienda coordinará contigo la
            entrega.
          </div>
        )}

        {config.instructions && (
          <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 p-3 text-amber-900">
            <div className="text-xs font-bold uppercase tracking-wider">
              Instrucciones
            </div>
            <p className="mt-1">{config.instructions}</p>
          </div>
        )}

        {store?.whatsapp && (
          <a
            href={getWhatsappUrl(
              store.whatsapp,
              buildPaymentMessage(order, store.name)
            )}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-emerald-600 hover:shadow-lg"
          >
            📸 Enviar comprobante por WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get("order");

  const [order, setOrder] = useState<DbOrder | null>(null);
  const [store, setStore] = useState<DbStore | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<DbStorePaymentMethod | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const theme = getTheme(store);

  useEffect(() => {
    async function loadOrder() {
      if (!orderNumber) {
        setLoading(false);
        setError("No se encontró el número de pedido.");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data = await fetchOrderSuccessData(orderNumber);

        if (!data) {
          setError("No encontramos este pedido.");
          return;
        }

        setOrder(data.order);
        setStore(data.store);
        setPaymentMethod(data.paymentMethod);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar la información del pedido"
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderNumber]);

  const storeUrl = useMemo(() => {
    if (!store?.slug) return "/";
    return `/tienda/${store.slug}`;
  }, [store?.slug]);

  const whatsappMessage = useMemo(() => {
    if (!order || !store) return "";
    return buildPaymentMessage(order, store.name);
  }, [order, store]);

  // 🆕 URL de tracking público
  const trackingUrl = useMemo(() => {
    if (!order) return "";
    return `${window.location.origin}/pedido/${order.order_number}`;
  }, [order]);

  // 🆕 Copiar link de tracking
  async function copyTrackingLink() {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      // ignorar
    }
  }

  // 🆕 Compartir tracking por WhatsApp
  function shareTrackingByWhatsapp() {
    if (!order || !store) return;
    const message = [
      `📦 Sigue el estado de mi pedido *${order.order_number}*`,
      ``,
      `🏪 Tienda: ${store.name}`,
      `💰 Total: ${formatCurrency(order.total)}`,
      ``,
      `Ver tracking en vivo:`,
      trackingUrl,
    ].join("\n");

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-rose-50 via-white to-orange-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-rose-500" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-rose-50 via-white to-orange-50 px-6 text-center">
        <div className="text-7xl">🧾</div>

        <h1 className="mt-6 text-3xl font-bold text-gray-900">
          Pedido no encontrado
        </h1>

        <p className="mt-2 max-w-md text-gray-500">
          {error ?? "No pudimos encontrar la información de tu pedido."}
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

  const statusConfig = STATUS_CONFIG[order.status];
  const needsPaymentProof =
    order.status === "pending_payment" &&
    order.payment_method !== "cash_on_delivery" &&
    order.payment_method !== "card";

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: theme.font_family,
        background: `linear-gradient(135deg, ${theme.primary_color}12 0%, #ffffff 45%, ${theme.secondary_color}14 100%)`,
      }}
    >
      <div
        className="text-white"
        style={{
          background: `linear-gradient(90deg, ${theme.primary_color}, ${theme.secondary_color})`,
        }}
      >
        <div className="container mx-auto px-6 py-3 text-center text-sm font-medium">
          ✅ Pedido registrado correctamente
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-6 py-12">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-5xl">
            ✅
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight text-gray-900">
            ¡Gracias por tu compra!
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-gray-500">
            Tu pedido fue registrado correctamente. Guarda tu número de pedido
            para cualquier consulta.
          </p>

          <div className="mt-6 inline-flex rounded-full bg-white px-6 py-3 shadow-sm">
            <span className="text-sm font-semibold text-gray-500">
              Pedido:
            </span>

            <span className="ml-2 font-mono text-sm font-black text-gray-900">
              {order.order_number}
            </span>
          </div>
        </div>

        {/* 🆕 CARD DESTACADO — Link de tracking (FASE 4B) */}
        <div className="mt-8 overflow-hidden rounded-3xl border-2 border-blue-200 bg-linear-to-br from-blue-50 to-indigo-50 shadow-lg">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-indigo-500 text-2xl text-white shadow-lg">
                📦
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black text-blue-900">
                  Sigue tu pedido en vivo
                </h3>
                <p className="mt-1 text-sm text-blue-800">
                  Guarda este link o compártelo. Actualizado en tiempo real.
                </p>
              </div>
            </div>

            {/* Link visible */}
            <div className="mt-4 rounded-xl bg-white/70 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Tu link de seguimiento
              </div>
              <div className="mt-1 truncate font-mono text-xs text-blue-900 sm:text-sm">
                {trackingUrl}
              </div>
            </div>

            {/* Botones */}
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Link
                to={`/pedido/${order.order_number}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg"
              >
                📦 Ver tracking
              </Link>

              <button
                onClick={copyTrackingLink}
                className="flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
              >
                {linkCopied ? "✅ Copiado" : "📋 Copiar link"}
              </button>

              <button
                onClick={shareTrackingByWhatsapp}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-600 hover:shadow-lg"
              >
                💬 Compartir
              </button>
            </div>
          </div>
        </div>

        {/* Aviso destacado si necesita enviar comprobante */}
        {needsPaymentProof && store?.whatsapp && (
          <div className="mt-6 overflow-hidden rounded-3xl border-2 border-emerald-200 bg-linear-to-br from-emerald-50 to-teal-50 shadow-lg">
            <div className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-3xl text-white shadow-lg">
                📸
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-black text-emerald-900">
                  ¡Último paso! Envía tu comprobante
                </h3>
                <p className="mt-1 text-sm text-emerald-800">
                  Para acelerar la confirmación de tu pedido, envía la foto o
                  captura de tu pago por WhatsApp a la tienda.
                </p>
              </div>

              <a
                href={getWhatsappUrl(store.whatsapp, whatsappMessage)}
                target="_blank"
                rel="noreferrer"
                className="w-full rounded-xl bg-emerald-500 px-6 py-3 text-center text-sm font-bold text-white shadow-md transition hover:bg-emerald-600 hover:shadow-xl sm:w-auto"
              >
                💬 Enviar por WhatsApp
              </a>
            </div>
          </div>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div
              className={`rounded-3xl p-6 shadow-sm ${statusConfig.bg} ${statusConfig.text}`}
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl">
                  {order.status === "pending_payment"
                    ? "⏳"
                    : order.status === "confirmed"
                    ? "✅"
                    : order.status === "shipped"
                    ? "🚚"
                    : order.status === "delivered"
                    ? "🎉"
                    : "⚠️"}
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider opacity-70">
                    Estado del pedido
                  </div>

                  <h2 className="mt-1 text-xl font-black">
                    {STATUS_LABELS[order.status]}
                  </h2>

                  <p className="mt-1 text-sm">{statusConfig.message}</p>
                </div>
              </div>
            </div>

            <PaymentDetails
              order={order}
              store={store}
              method={paymentMethod}
            />

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">
                Productos comprados
              </h2>

              <div className="mt-5 space-y-3">
                {order.items.map((item, index) => (
                  <div
                    key={`${item.product_id}-${index}`}
                    className="flex justify-between gap-4 rounded-2xl bg-gray-50 p-4"
                  >
                    <div>
                      <div className="font-semibold text-gray-900">
                        {item.product_name}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>x{item.quantity}</span>
                        <span>·</span>
                        <span>{formatCurrency(item.unit_price)} c/u</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            item.source === "catalog"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {item.source === "catalog" ? "Catálogo" : "Propio"}
                        </span>
                      </div>
                    </div>

                    <div className="font-bold text-gray-900">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-dashed border-gray-200 pt-5">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>

                <div className="mt-2 flex justify-between text-xl font-black text-gray-900">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">
                Dirección de envío
              </h2>

              <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
                <div className="font-bold text-gray-900">
                  {order.shipping_address.full_name}
                </div>

                <div className="mt-1">
                  {order.shipping_address.street},{" "}
                  {order.shipping_address.district},{" "}
                  {order.shipping_address.city}
                </div>

                <div className="mt-1">
                  Teléfono: {order.shipping_address.phone}
                </div>

                {order.shipping_address.reference && (
                  <div className="mt-1 text-gray-500">
                    Referencia: {order.shipping_address.reference}
                  </div>
                )}
              </div>

              {order.notes && (
                <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                  <strong>Nota:</strong> {order.notes}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
                <div
                  className="p-6 text-white"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                  }}
                >
                  <div className="text-xs font-bold uppercase tracking-wider text-white/70">
                    Tienda
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/20 text-2xl">
                      {store?.logo_url ? (
                        <img
                          src={store.logo_url}
                          alt={store.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        "🏪"
                      )}
                    </div>

                    <div>
                      <div className="font-black">
                        {store?.name ?? "Tienda"}
                      </div>

                      {store?.slug && (
                        <div className="text-xs text-white/70">
                          /{store.slug}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-6">
                  <div className="rounded-2xl bg-gray-50 p-4 text-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Fecha
                    </div>

                    <div className="mt-1 font-semibold text-gray-900">
                      {formatDate(order.created_at)}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4 text-sm">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Cliente
                    </div>

                    <div className="mt-1 font-semibold text-gray-900">
                      {order.customer_name}
                    </div>

                    <div className="text-xs text-gray-500">
                      {order.customer_email}
                    </div>

                    <div className="text-xs text-gray-500">
                      {order.customer_phone}
                    </div>
                  </div>

                  {order.tracking_number && (
                    <div className="rounded-2xl bg-gray-900 p-4 text-center text-white">
                      <div className="text-xs uppercase tracking-wider opacity-70">
                        Tracking
                      </div>

                      <div className="mt-1 font-mono text-lg font-bold">
                        {order.tracking_number}
                      </div>
                    </div>
                  )}

                  <Link
                    to={storeUrl}
                    className="block rounded-xl bg-gray-900 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-gray-800"
                  >
                    Volver a la tienda
                  </Link>

                  <Link
                    to="/"
                    className="block rounded-xl border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Ir al inicio
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="font-bold text-blue-900">💡 Recomendación</div>

                <p className="mt-1 text-sm text-blue-800">
                  Si realizaste un pago por Yape, Plin o transferencia, envía el
                  comprobante a la tienda para acelerar la confirmación.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pb-10 text-center text-xs text-gray-400">
        Tienda creada con Dropship Perú
      </div>

      {store?.whatsapp && (
        <WhatsappFloatingButton
          phone={store.whatsapp}
          message={whatsappMessage}
          tooltip={
            needsPaymentProof
              ? "📸 ¡Envía tu comprobante!"
              : `¿Consultas sobre tu pedido?`
          }
          subtitle={
            needsPaymentProof
              ? "Acelera la confirmación de tu pedido"
              : "Responderemos lo más pronto posible"
          }
          highlight={needsPaymentProof}
          pulse={true}
        />
      )}
    </div>
  );
}