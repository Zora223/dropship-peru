import WhatsappFloatingButton from "../components/WhatsappFloatingButton";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { createOrder } from "../lib/orders-checkout";
import type { DeliveryMode } from "../lib/orders-checkout";
import { calculateDiscount, type DiscountResult } from "../lib/discounts";
import { fetchPublicStoreById } from "../lib/public-store";
import {
  getStorePickupLocations,
  generateAvailableSlots,
} from "../lib/pickup-locations";
import type {
  PickupLocation,
  TimeSlot,
} from "../lib/pickup-locations";
import {
  getStoreDeliverySettings,
  generateDeliverySlots,
} from "../lib/vendor-delivery-settings";
import type {
  VendorDeliverySettings,
  DeliveryTimeSlot,
} from "../lib/vendor-delivery-settings";
import type {
  DbStore,
  DbStorePaymentMethod,
  PaymentMethodType,
} from "../types/database";

const PAYMENT_INFO: Record<
  PaymentMethodType,
  { name: string; icon: string; description: string }
> = {
  yape: {
    name: "Yape",
    icon: "💜",
    description: "Pago instantáneo con tu celular",
  },
  plin: {
    name: "Plin",
    icon: "💙",
    description: "Transferencia inmediata desde tu app",
  },
  card: { name: "Tarjeta", icon: "💳", description: "Crédito o débito" },
  transfer: {
    name: "Transferencia",
    icon: "🏦",
    description: "Depósito o transferencia bancaria",
  },
  cash_on_delivery: {
    name: "Pago contra entrega",
    icon: "📦",
    description: "Paga al recibir tu pedido",
  },
};

const PAYMENT_ORDER: PaymentMethodType[] = [
  "yape",
  "plin",
  "transfer",
  "card",
  "cash_on_delivery",
];

function getStoreTheme(store: DbStore | null) {
  const theme =
    store?.theme && typeof store.theme === "object" ? store.theme : null;
  return {
    primary_color: theme?.primary_color ?? "#e11d48",
    secondary_color: theme?.secondary_color ?? "#fb923c",
    font_family: theme?.font_family ?? "Inter",
  };
}

function getWhatsappUrl(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.startsWith("51")) return `https://wa.me/${digits}`;
  if (digits.length === 9) return `https://wa.me/51${digits}`;
  return `https://wa.me/${digits}`;
}

function getEnabledPaymentMethods(
  paymentMethods: unknown
): DbStorePaymentMethod[] {
  if (!Array.isArray(paymentMethods)) return [];
  return (paymentMethods as DbStorePaymentMethod[])
    .filter((method) => method && method.enabled)
    .sort(
      (a, b) => PAYMENT_ORDER.indexOf(a.id) - PAYMENT_ORDER.indexOf(b.id)
    );
}

function PaymentInstructions({
  method,
  store,
}: {
  method: DbStorePaymentMethod | null;
  store: DbStore | null;
}) {
  if (!method) return null;
  const config = method.config ?? {};
  const info = PAYMENT_INFO[method.id];

  return (
    <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center gap-3">
        <div className="text-3xl">{info.icon}</div>
        <div>
          <h3 className="font-bold text-gray-900">
            Datos para pagar con {info.name}
          </h3>
          <p className="text-xs text-gray-500">
            Usa esta información para completar tu pago.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        {(method.id === "yape" || method.id === "plin") && (
          <>
            {config.phone && (
              <div className="flex justify-between gap-4 rounded-xl bg-white p-3">
                <span className="text-gray-500">Número</span>
                <span className="font-bold text-gray-900">{config.phone}</span>
              </div>
            )}
            {config.holder_name && (
              <div className="flex justify-between gap-4 rounded-xl bg-white p-3">
                <span className="text-gray-500">Titular</span>
                <span className="font-bold text-gray-900">
                  {config.holder_name}
                </span>
              </div>
            )}
            {config.qr_url && (
              <div className="rounded-xl bg-white p-3 text-center">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  QR de pago
                </div>
                <img
                  src={config.qr_url}
                  alt={`QR ${info.name}`}
                  className="mx-auto max-h-56 rounded-xl object-contain"
                />
              </div>
            )}
          </>
        )}

        {method.id === "transfer" && (
          <>
            {config.bank_name && (
              <div className="flex justify-between gap-4 rounded-xl bg-white p-3">
                <span className="text-gray-500">Banco</span>
                <span className="font-bold text-gray-900">
                  {config.bank_name}
                </span>
              </div>
            )}
            {config.account_holder && (
              <div className="flex justify-between gap-4 rounded-xl bg-white p-3">
                <span className="text-gray-500">Titular</span>
                <span className="font-bold text-gray-900">
                  {config.account_holder}
                </span>
              </div>
            )}
            {config.account_number && (
              <div className="flex justify-between gap-4 rounded-xl bg-white p-3">
                <span className="text-gray-500">Cuenta</span>
                <span className="font-bold text-gray-900">
                  {config.account_number}
                </span>
              </div>
            )}
            {config.cci && (
              <div className="flex justify-between gap-4 rounded-xl bg-white p-3">
                <span className="text-gray-500">CCI</span>
                <span className="font-bold text-gray-900">{config.cci}</span>
              </div>
            )}
            {config.document_number && (
              <div className="flex justify-between gap-4 rounded-xl bg-white p-3">
                <span className="text-gray-500">DNI/RUC</span>
                <span className="font-bold text-gray-900">
                  {config.document_number}
                </span>
              </div>
            )}
          </>
        )}

        {method.id === "card" && (
          <div className="rounded-xl bg-white p-3 text-gray-600">
            El pago con tarjeta será gestionado por la plataforma o confirmado
            por la tienda.
          </div>
        )}

        {method.id === "cash_on_delivery" && (
          <div className="rounded-xl bg-white p-3 text-gray-600">
            Pagarás cuando recibas tu pedido. La tienda coordinará contigo la
            entrega.
          </div>
        )}

        {config.instructions && (
          <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 p-3 text-amber-900">
            <div className="text-xs font-bold uppercase tracking-wider">
              Instrucciones
            </div>
            <p className="mt-1 text-sm">{config.instructions}</p>
          </div>
        )}

        {store?.whatsapp && (
          <a
            href={getWhatsappUrl(store.whatsapp)}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-emerald-600"
          >
            Enviar comprobante por WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const { items, total: subtotal, count, clearCart, storeId, storeSlug } = useCart();
  const navigate = useNavigate();

  const [store, setStore] = useState<DbStore | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethodType | null>(null);

  // 🆕 v16 FASE 3 - Modo de entrega
  const [deliveryMode, setDeliveryMode] =
    useState<DeliveryMode>("home_delivery");

  // 🆕 v16 FASE 3 - Delivery settings del vendor
  const [deliverySettings, setDeliverySettings] =
    useState<VendorDeliverySettings | null>(null);
  const [deliverySlots, setDeliverySlots] = useState<DeliveryTimeSlot[]>([]);
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState<
    string | null
  >(null);
  const [selectedDeliverySlot, setSelectedDeliverySlot] = useState<
    string | null
  >(null);

  // 🆕 v16 FASE 3 - Pickup locations
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [selectedPickupId, setSelectedPickupId] = useState<string | null>(null);
  const [pickupSlots, setPickupSlots] = useState<TimeSlot[]>([]);
  const [selectedPickupSlot, setSelectedPickupSlot] = useState<string | null>(
    null
  );

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    street: "",
    district: "",
    city: "Lima",
    reference: "",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = getStoreTheme(store);

  useEffect(() => {
    async function loadStore() {
      if (!storeId) {
        setLoadingStore(false);
        return;
      }

      try {
        setLoadingStore(true);
        setError(null);

        const data = await fetchPublicStoreById(storeId);
        if (!data) {
          setError("La tienda ya no está disponible.");
          return;
        }

        setStore(data);
        const activeMethods = getEnabledPaymentMethods(data.payment_methods);
        setSelectedMethod(activeMethods[0]?.id ?? null);

        // 🆕 Cargar delivery settings del vendor
        try {
          const settings = await getStoreDeliverySettings(storeId);
          setDeliverySettings(settings);
          if (settings) {
            const slots = generateDeliverySlots(settings);
            setDeliverySlots(slots);
          }
        } catch (settingsErr) {
          console.warn("No se pudo cargar delivery settings:", settingsErr);
        }

        // 🆕 Cargar puntos de recojo
        try {
          const locations = await getStorePickupLocations(storeId);
          setPickupLocations(locations);
          if (locations.length > 0) {
            const defaultLoc =
              locations.find((l) => l.is_default) ?? locations[0];
            setSelectedPickupId(defaultLoc.id);
          }
        } catch (locErr) {
          console.warn("No se pudieron cargar los puntos de recojo:", locErr);
        }
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar métodos de pago"
        );
      } finally {
        setLoadingStore(false);
      }
    }

    loadStore();
  }, [storeId]);

  // 🆕 Al cambiar pickup location, actualizar franjas
  useEffect(() => {
    if (!selectedPickupId) {
      setPickupSlots([]);
      setSelectedPickupSlot(null);
      return;
    }
    const location = pickupLocations.find((l) => l.id === selectedPickupId);
    if (!location) return;
    const openingHours =
      (location as any).opening_hours as Record<string, string[]> | null;
    const slots = generateAvailableSlots(openingHours ?? null, 7);
    setPickupSlots(slots);
    setSelectedPickupSlot(null);
  }, [selectedPickupId, pickupLocations]);

  const enabledPaymentMethods = useMemo(() => {
    return getEnabledPaymentMethods(store?.payment_methods);
  }, [store]);

  const selectedPaymentMethod = useMemo(() => {
    if (!selectedMethod) return null;
    return (
      enabledPaymentMethods.find((method) => method.id === selectedMethod) ??
      null
    );
  }, [enabledPaymentMethods, selectedMethod]);

  // 🆕 Delivery fee INTERNO (para pagar al delivery). NO se muestra al cliente.
  const deliveryFee = useMemo(() => {
    if (deliveryMode !== "home_delivery" || !deliverySettings) return 0;
    return Number(deliverySettings.delivery_cost) || 0;
  }, [deliveryMode, deliverySettings]);

  // 🆕 v20 - Descuento gamificado
  const [discount, setDiscount] = useState<DiscountResult | null>(null);

  useEffect(() => {
    if (count === 0) {
      setDiscount(null);
      return;
    }
    calculateDiscount(count, subtotal).then(setDiscount);
  }, [count, subtotal]);

  const discountAmount = discount?.discount_amount ?? 0;
  const discountPct = discount?.discount_pct_display ?? 0;
  const discountTier = discount?.current_tier?.tier_label ?? null;

  // 🆕 Total = subtotal - descuento (delivery ya viene INCLUIDO en el precio del producto)
  const total = Math.max(0, subtotal - discountAmount);

  if (count === 0 || !storeId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-rose-50 via-white to-orange-50 px-6 text-center">
        <div className="text-7xl">🛍️</div>
        <h1 className="mt-6 text-3xl font-bold text-gray-900">
          Tu carrito está vacío
        </h1>
        <Link
          to="/"
          className="mt-8 rounded-full bg-gray-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-gray-800"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  if (loadingStore) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-rose-50 via-white to-orange-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-rose-500" />
      </div>
    );
  }

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedMethod) {
      setError("Selecciona un método de pago para continuar.");
      return;
    }

    if (enabledPaymentMethods.length === 0) {
      setError("Esta tienda aún no tiene métodos de pago disponibles.");
      return;
    }

    if (deliveryMode === "home_delivery") {
      if (!selectedDeliveryDate || !selectedDeliverySlot) {
        setError("Selecciona la fecha y franja horaria de entrega.");
        return;
      }
    }

    if (deliveryMode === "store_pickup") {
      if (!selectedPickupId) {
        setError("Selecciona un punto de recojo.");
        return;
      }
      if (!selectedPickupSlot) {
        setError("Selecciona una franja horaria para recoger tu pedido.");
        return;
      }
    }

    setError(null);
    setSubmitting(true);

    try {
      const order = await createOrder({
        storeId,
        customer_name: form.name.trim(),
        customer_email: form.email.trim(),
        customer_phone: form.phone.trim(),

        delivery_mode: deliveryMode,

        shipping_address:
          deliveryMode === "home_delivery"
            ? {
                full_name: form.name.trim(),
                phone: form.phone.trim(),
                street: form.street.trim(),
                district: form.district.trim(),
                city: form.city.trim(),
                reference: form.reference.trim() || null,
              }
            : null,

        delivery_date:
          deliveryMode === "home_delivery" ? selectedDeliveryDate : null,
        delivery_time_slot:
          deliveryMode === "home_delivery" ? selectedDeliverySlot : null,
        delivery_fee: deliveryFee, // 🆕 Se guarda internamente aunque no se muestre

        pickup_location_id:
          deliveryMode === "store_pickup" ? selectedPickupId : null,
        pickup_time_slot:
          deliveryMode === "store_pickup" ? selectedPickupSlot : null,

        items,
        subtotal,
        total,

        // 🆕 v20 - Descuento gamificado
        discount_amount: discountAmount,
        discount_pct: discountPct,
        discount_tier: discountTier,

        payment_method: selectedMethod,
        notes: form.notes.trim() || null,
      });

      clearCart();
      navigate(`/order-success?order=${order.order_number}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al procesar pedido");
    } finally {
      setSubmitting(false);
    }
  };

  const hasPickupAvailable = pickupLocations.length > 0;

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
          🔒 Estás a un paso de completar tu compra
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <Link
            to="/checkout"
            className="text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            ← Volver al carrito
          </Link>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">
            Datos de envío y pago
          </h1>

          <p className="mt-2 text-gray-500">
            Completa tus datos para finalizar el pedido
            {store?.name ? ` en ${store.name}.` : "."}
          </p>
        </div>

        {error && (
          <div className="mb-6 whitespace-pre-line rounded-2xl border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">
            {error}
            {storeSlug && (
              <div className="mt-3">
                <Link
                  to={`/tienda/${storeSlug}`}
                  className="font-semibold text-red-800 underline"
                >
                  Volver a la tienda →
                </Link>
              </div>
            )}
          </div>
        )}

        {enabledPaymentMethods.length === 0 && (
          <div className="mb-6 rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-4">
            <div className="font-bold text-amber-900">
              Esta tienda aún no tiene métodos de pago activos
            </div>
            <p className="mt-1 text-sm text-amber-800">
              No se puede completar el pedido hasta que el vendedor configure al
              menos un método de cobro.
            </p>
            {storeSlug && (
              <Link
                to={`/tienda/${storeSlug}`}
                className="mt-3 inline-block text-sm font-semibold text-amber-900 underline"
              >
                Volver a la tienda →
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Selector de modo de entrega */}
            {hasPickupAvailable && (
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">
                  🚚 ¿Cómo quieres recibir tu pedido?
                </h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label
                    className={`flex cursor-pointer flex-col rounded-2xl border-2 p-4 transition ${
                      deliveryMode === "home_delivery"
                        ? "bg-rose-50/50"
                        : "border-gray-100 hover:border-gray-300"
                    }`}
                    style={
                      deliveryMode === "home_delivery"
                        ? { borderColor: theme.primary_color }
                        : undefined
                    }
                  >
                    <input
                      type="radio"
                      name="deliveryMode"
                      value="home_delivery"
                      checked={deliveryMode === "home_delivery"}
                      onChange={() => setDeliveryMode("home_delivery")}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">🛵</div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900">
                          Delivery a domicilio
                        </div>
                        <div className="text-xs text-gray-500">
                          Lo recibes en tu casa
                        </div>
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex cursor-pointer flex-col rounded-2xl border-2 p-4 transition ${
                      deliveryMode === "store_pickup"
                        ? "bg-rose-50/50"
                        : "border-gray-100 hover:border-gray-300"
                    }`}
                    style={
                      deliveryMode === "store_pickup"
                        ? { borderColor: theme.primary_color }
                        : undefined
                    }
                  >
                    <input
                      type="radio"
                      name="deliveryMode"
                      value="store_pickup"
                      checked={deliveryMode === "store_pickup"}
                      onChange={() => setDeliveryMode("store_pickup")}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">🏪</div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900">
                          Recojo en tienda
                        </div>
                        <div className="text-xs text-gray-500">
                          Retira tu pedido personalmente
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Datos de contacto */}
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">
                📦 Datos de contacto
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Nombre completo
                  </label>
                  <input
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                    placeholder="Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Correo
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Celular
                  </label>
                  <input
                    name="phone"
                    required
                    value={form.phone}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                    placeholder="987 654 321"
                  />
                </div>

                {/* Dirección SOLO si es delivery */}
                {deliveryMode === "home_delivery" && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Dirección
                      </label>
                      <input
                        name="street"
                        required
                        value={form.street}
                        onChange={handleChange}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                        placeholder="Av. Arequipa 1234"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Distrito
                      </label>
                      <input
                        name="district"
                        required
                        value={form.district}
                        onChange={handleChange}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                        placeholder="Miraflores"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Ciudad
                      </label>
                      <input
                        name="city"
                        required
                        value={form.city}
                        onChange={handleChange}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                        placeholder="Lima"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Referencia opcional
                      </label>
                      <input
                        name="reference"
                        value={form.reference}
                        onChange={handleChange}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                        placeholder="Edificio azul, frente al parque"
                      />
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Notas opcionales
                  </label>
                  <textarea
                    name="notes"
                    rows={2}
                    value={form.notes}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                    placeholder="Color preferido, indicaciones especiales, etc."
                  />
                </div>
              </div>
            </div>

            {/* Selector de fecha/hora para DELIVERY */}
            {deliveryMode === "home_delivery" && deliverySlots.length > 0 && (
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">
                  📅 ¿Cuándo quieres recibir tu pedido?
                </h2>
                {deliverySettings?.delivery_notes && (
                  <p className="mt-1 text-xs text-gray-500">
                    ℹ️ {deliverySettings.delivery_notes}
                  </p>
                )}

                <div className="mt-5 space-y-3">
                  {deliverySlots.map((daySlot) => (
                    <div
                      key={daySlot.date}
                      className="rounded-2xl border border-gray-100 bg-gray-50 p-3"
                    >
                      <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                        {daySlot.is_today && "🔥 "}
                        {daySlot.day_short}
                        {daySlot.is_today && (
                          <span className="ml-2 rounded-full bg-orange-500 px-2 py-0.5 text-[9px] text-white">
                            HOY
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {daySlot.slots.map((slot) => {
                          const active =
                            selectedDeliveryDate === daySlot.date &&
                            selectedDeliverySlot === slot;
                          return (
                            <button
                              type="button"
                              key={slot}
                              onClick={() => {
                                setSelectedDeliveryDate(daySlot.date);
                                setSelectedDeliverySlot(slot);
                              }}
                              className={`rounded-full border-2 px-4 py-1.5 text-xs font-semibold transition ${
                                active
                                  ? "text-white"
                                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                              }`}
                              style={
                                active
                                  ? {
                                      borderColor: theme.primary_color,
                                      backgroundColor: theme.primary_color,
                                    }
                                  : undefined
                              }
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deliveryMode === "home_delivery" && deliverySlots.length === 0 && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                ⚠️ Esta tienda aún no ha configurado sus horarios de entrega. El
                vendedor coordinará contigo por WhatsApp.
              </div>
            )}

            {/* Selector de punto de recojo + franja */}
            {deliveryMode === "store_pickup" && (
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">
                  🏪 Elige dónde y cuándo recoger
                </h2>

                {pickupLocations.length === 0 ? (
                  <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                    Esta tienda aún no tiene puntos de recojo configurados.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {pickupLocations.map((location) => {
                      const active = selectedPickupId === location.id;
                      return (
                        <label
                          key={location.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${
                            active
                              ? "bg-rose-50/50"
                              : "border-gray-100 hover:border-gray-300"
                          }`}
                          style={
                            active
                              ? { borderColor: theme.primary_color }
                              : undefined
                          }
                        >
                          <input
                            type="radio"
                            name="pickup"
                            value={location.id}
                            checked={active}
                            onChange={() => setSelectedPickupId(location.id)}
                            className="sr-only"
                          />
                          <div className="text-2xl">📍</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900">
                              {location.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {location.street}
                              {location.district && `, ${location.district}`}
                              {location.city && `, ${location.city}`}
                            </div>
                            {location.reference && (
                              <div className="text-xs text-gray-400 mt-1">
                                📌 {location.reference}
                              </div>
                            )}
                            {location.contact_phone && (
                              <div className="text-xs text-gray-500 mt-1">
                                📞 {location.contact_phone}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {selectedPickupId && pickupSlots.length > 0 && (
                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Elige día y horario
                    </label>

                    <div className="space-y-3">
                      {pickupSlots.map((daySlot) => (
                        <div
                          key={daySlot.date}
                          className="rounded-2xl border border-gray-100 bg-gray-50 p-3"
                        >
                          <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                            {daySlot.day_name}{" "}
                            {new Date(daySlot.date + "T00:00:00").getDate()}{" "}
                            {new Date(
                              daySlot.date + "T00:00:00"
                            ).toLocaleDateString("es-PE", { month: "short" })}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {daySlot.slots.map((slot) => {
                              const fullSlot = `${daySlot.date} ${slot}`;
                              const active = selectedPickupSlot === fullSlot;
                              return (
                                <button
                                  type="button"
                                  key={slot}
                                  onClick={() => setSelectedPickupSlot(fullSlot)}
                                  className={`rounded-full border-2 px-4 py-1.5 text-xs font-semibold transition ${
                                    active
                                      ? "text-white"
                                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                                  }`}
                                  style={
                                    active
                                      ? {
                                          borderColor: theme.primary_color,
                                          backgroundColor: theme.primary_color,
                                        }
                                      : undefined
                                  }
                                >
                                  {slot}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Método de pago */}
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">
                💳 Método de pago
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Elige uno de los métodos activos de esta tienda.
              </p>

              <div className="mt-5 space-y-3">
                {enabledPaymentMethods.map((method) => {
                  const info = PAYMENT_INFO[method.id];
                  const active = selectedMethod === method.id;
                  return (
                    <label
                      key={method.id}
                      className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition ${
                        active
                          ? "bg-rose-50/50"
                          : "border-gray-100 hover:border-gray-300"
                      }`}
                      style={
                        active
                          ? { borderColor: theme.primary_color }
                          : undefined
                      }
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.id}
                        checked={active}
                        onChange={() => setSelectedMethod(method.id)}
                        className="sr-only"
                      />
                      <div className="text-3xl">{info.icon}</div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900">
                          {info.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {info.description}
                        </div>
                      </div>
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full border-2 transition"
                        style={
                          active
                            ? {
                                borderColor: theme.primary_color,
                                backgroundColor: theme.primary_color,
                              }
                            : undefined
                        }
                      >
                        {active && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              <PaymentInstructions
                method={selectedPaymentMethod}
                store={store}
              />
            </div>
          </div>

          {/* Resumen */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 overflow-hidden rounded-3xl bg-white shadow-xl">
              <div className="bg-linear-to-br from-gray-900 to-gray-800 px-6 py-5 text-white">
                <h2 className="text-lg font-bold">Tu pedido</h2>
                <p className="text-xs text-gray-300">
                  {count} {count === 1 ? "producto" : "productos"}
                </p>
              </div>

              <div className="p-6">
                <div className="max-h-48 space-y-3 overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex justify-between text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-gray-900">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          x{item.quantity}
                        </div>
                      </div>
                      <div className="ml-3 font-semibold tabular-nums text-gray-900">
                        S/ {(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Info del modo de entrega */}
                <div className="mt-4 rounded-xl bg-gray-50 p-3 text-xs">
                  <div className="font-semibold text-gray-700">
                    {deliveryMode === "home_delivery"
                      ? "🛵 Entrega a domicilio"
                      : "🏪 Recojo en tienda"}
                  </div>
                  {deliveryMode === "home_delivery" &&
                    selectedDeliveryDate &&
                    selectedDeliverySlot && (
                      <div className="mt-1 text-gray-500">
                        📅 {selectedDeliveryDate} · {selectedDeliverySlot}
                      </div>
                    )}
                  {deliveryMode === "store_pickup" && selectedPickupSlot && (
                    <div className="mt-1 text-gray-500">
                      📅 {selectedPickupSlot}
                    </div>
                  )}
                </div>

                <div className="my-4 border-t border-dashed border-gray-200" />

                {/* 🆕 Desglose - Delivery INCLUIDO en el precio */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold tabular-nums text-gray-900">
                      S/ {subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Envío</span>
                    <span className="font-semibold tabular-nums text-emerald-600">
                      {deliveryMode === "store_pickup"
                        ? "SIN ENVÍO"
                        : "INCLUIDO"}
                    </span>
                  </div>

                  {/* 🆕 v20 - Descuento aplicado */}
                  {discountAmount > 0 && discount?.current_tier && (
                    <div className="flex justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
                      <span className="font-bold text-emerald-700">
                        {discount.current_tier.tier_emoji} Dscto {discount.current_tier.tier_label} (-{discountPct}%)
                      </span>
                      <span className="font-black tabular-nums text-emerald-700">
                        -S/ {discountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="my-4 border-t border-dashed border-gray-200" />

                <div className="flex items-baseline justify-between">
                  <span className="text-base font-bold text-gray-900">
                    Total
                  </span>
                  <div className="text-right">
                    {discountAmount > 0 && (
                      <div className="text-sm line-through text-gray-400 tabular-nums">
                        S/ {subtotal.toFixed(2)}
                      </div>
                    )}
                    <div className="text-3xl font-extrabold tabular-nums text-gray-900">
                      S/ {total.toFixed(2)}
                    </div>
                    {discountAmount > 0 && (
                      <div className="mt-0.5 text-[10px] font-bold text-emerald-600">
                        ¡Ahorras {discountPct}% (S/ {discountAmount.toFixed(2)})! 🎉
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    enabledPaymentMethods.length === 0 ||
                    !selectedMethod
                  }
                  className="mt-6 w-full rounded-full py-4 text-sm font-bold text-white shadow-lg transition hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                  }}
                >
                  {submitting ? "Procesando..." : "Confirmar pedido →"}
                </button>

                <p className="mt-4 text-center text-xs leading-relaxed text-gray-400">
                  Al confirmar aceptas los términos y condiciones de compra.
                </p>

                {storeSlug && (
                  <Link
                    to={`/tienda/${storeSlug}`}
                    className="mt-4 block text-center text-xs font-semibold text-gray-500 underline hover:text-gray-900"
                  >
                    Volver a la tienda
                  </Link>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      {store?.whatsapp && (
        <WhatsappFloatingButton
          phone={store.whatsapp}
          tooltip="¿Dudas con el pago?"
          subtitle="Te ayudamos a completar tu compra"
          message={`Hola! Tengo una consulta sobre mi pedido en ${store.name} 💳`}
        />
      )}
    </div>
  );
}