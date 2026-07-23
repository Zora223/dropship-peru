// src/pages/delivery/DeliveryOrderDetailPage.tsx
// v13: WhatsApp automáticos ahora los envían triggers de Supabase
// + Sección de "Punto de recojo" del pedido
// 🆕 v20: Soporte para pickup en tienda (shipping_address puede ser null)

import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getMyOrderDetail,
  markPickedUp,
  confirmDelivery,
  getStatusLabel,
  getStatusColor,
  formatShippingAddress,
  getDistrict,
  getReference,
} from "../../lib/delivery";
import {
  formatPickupAddress,
  getPickupMapUrl,
  guessPickupEmoji,
  type PickupAddressSnapshot,
} from "../../lib/pickup-locations";
import { useToast } from "../../contexts/ToastContext";
import {
  openWhatsapp,
  msgDeliveryToStore,
  msgDeliveryContact,
  isValidPhone,
} from "../../lib/whatsapp";

export default function DeliveryOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [assignment, setAssignment] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState("");

  useEffect(() => {
    if (!id) return;
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadDetail() {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getMyOrderDetail(id);
      if (!data) {
        toast.error("No encontrado", "Este pedido no existe o no te pertenece");
        navigate("/delivery/orders");
        return;
      }
      setAssignment(data);
    } catch (err: any) {
      console.error(err);
      toast.error("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePickup() {
    if (!id) return;
    try {
      setProcessing(true);
      await markPickedUp(id);
      toast.success(
        "¡En camino! 🛵",
        "Pedido marcado como recogido. Se notificó al cliente automáticamente"
      );
      await loadDetail();
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setProcessing(false);
    }
  }

  async function handleConfirmDelivery() {
    if (!id) return;
    try {
      setProcessing(true);
      const result = await confirmDelivery(id, deliveryNotes || undefined);
      if (!result.success) {
        toast.error("Error", result.error ?? "No se pudo confirmar");
        return;
      }
      toast.success(
        "¡Entregado! ✅",
        "Se notificó al cliente y al vendor automáticamente"
      );
      setShowConfirmModal(false);
      await loadDetail();
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setProcessing(false);
    }
  }

  function getOrderContext() {
    return {
      orderNumber: order?.order_number ?? "",
      total: Number(order?.total ?? 0),
      customerName: order?.customer_name ?? "",
      storeName: store?.name ?? null,
    };
  }

  function contactCustomer() {
    const msg = msgDeliveryContact(getOrderContext());
    const opened = openWhatsapp(order?.customer_phone, msg);
    if (!opened) {
      toast.error("Sin teléfono", "El cliente no tiene teléfono válido");
    }
  }

  function contactStore() {
    const msg = msgDeliveryToStore(getOrderContext());
    const opened = openWhatsapp(store?.whatsapp, msg);
    if (!opened) {
      toast.warning("Sin teléfono", "La tienda no tiene WhatsApp configurado");
    }
  }

  function contactPickupContact(phone: string, name?: string | null) {
    const msg = `Hola${name ? ` ${name}` : ""}, soy tu delivery. Voy a recoger el pedido #${order?.order_number}. ¿En qué momento puedo pasar?`;
    const opened = openWhatsapp(phone, msg);
    if (!opened) {
      toast.error("Teléfono inválido", "No se puede abrir WhatsApp con este número");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-500" />
      </div>
    );
  }

  if (!assignment) return null;

  const order = assignment.order;
  const store = order?.store;
  const pickup: PickupAddressSnapshot | null = order?.pickup_address ?? null;
  const items = Array.isArray(order?.items) ? order.items : [];
  const reference = getReference(order?.shipping_address);
  const isAssigned = assignment.status === "assigned";
  const isPickedUp = assignment.status === "picked_up";
  const isDelivered = assignment.status === "delivered";

  // 🆕 v20 - Detectar si es pickup en tienda (no requiere delivery)
  const isStorePickup = order?.delivery_mode === "store_pickup";

  const clientePhoneValido = isValidPhone(order?.customer_phone);
  const tiendaWhatsappValido = isValidPhone(store?.whatsapp);
  const pickupContactValido = isValidPhone(pickup?.contact_phone);
  const pickupMapUrl = getPickupMapUrl(pickup);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/delivery/orders"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-600 shadow-sm transition hover:bg-gray-100"
        >
          ←
        </Link>
        <div className="min-w-0 grow">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              #{order?.order_number}
            </h1>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusColor(
                assignment.status
              )}`}
            >
              {getStatusLabel(assignment.status)}
            </span>
            {isStorePickup && (
              <span className="rounded-full bg-purple-100 border border-purple-300 px-3 py-1 text-xs font-bold text-purple-700">
                🏪 PICKUP
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Total: <b>S/. {Number(order?.total ?? 0).toFixed(2)}</b>
          </p>
        </div>
      </div>

      {/* 🆕 v20 - Alerta si es pickup en tienda */}
      {isStorePickup && (
        <div className="rounded-2xl border-2 border-purple-300 bg-linear-to-br from-purple-50 to-fuchsia-50 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="text-3xl">🏪</span>
            <div>
              <h3 className="text-sm font-bold text-purple-900">
                Este pedido es de RECOJO EN TIENDA
              </h3>
              <p className="mt-1 text-sm text-purple-800">
                El cliente lo recogerá directamente en la tienda. No requiere delivery a domicilio.
              </p>
              {order?.pickup_time_slot && (
                <div className="mt-2 rounded-xl bg-white/60 px-3 py-2 text-xs">
                  <span className="font-bold text-purple-700">📅 Horario:</span>{" "}
                  <span className="text-purple-900">{order.pickup_time_slot}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🏪 PUNTO DE RECOJO */}
      {pickup && pickup.street && (
        <div className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-linear-to-br from-amber-50 to-orange-50 shadow-sm">
          <div className="flex items-center justify-between border-b border-amber-200/60 bg-amber-100/40 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏪</span>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-amber-900">
                  Punto de recojo
                </h2>
                <p className="text-xs text-amber-700">Recoge aquí primero</p>
              </div>
            </div>
            {pickupMapUrl && (
              <a
                href={pickupMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-amber-800 shadow-sm transition hover:bg-amber-50"
              >
                🗺️ Mapa
              </a>
            )}
          </div>

          <div className="space-y-3 p-4 sm:p-6">
            {pickup.name && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">{guessPickupEmoji(pickup.name)}</span>
                <p className="text-lg font-bold text-gray-900">{pickup.name}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                📍 Dirección
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatPickupAddress(pickup)}
              </p>
            </div>

            {pickup.reference && (
              <div className="rounded-lg bg-white/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                  💡 Referencia
                </p>
                <p className="mt-1 text-sm text-gray-800">{pickup.reference}</p>
              </div>
            )}

            {(pickup.contact_name || pickup.contact_phone) && (
              <div className="rounded-lg bg-white/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                  👤 Persona de contacto
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="min-w-0 grow">
                    {pickup.contact_name && (
                      <p className="font-semibold text-gray-900">{pickup.contact_name}</p>
                    )}
                    {pickup.contact_phone && (
                      <p className="text-sm text-gray-600">📞 {pickup.contact_phone}</p>
                    )}
                  </div>
                  {pickupContactValido && pickup.contact_phone && (
                    <button
                      onClick={() => contactPickupContact(pickup.contact_phone!, pickup.contact_name)}
                      className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600"
                    >
                      💬 Coordinar
                    </button>
                  )}
                </div>
              </div>
            )}

            {pickup.notes && (
              <div className="rounded-lg bg-yellow-100 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-yellow-800">
                  📝 Notas importantes
                </p>
                <p className="mt-1 text-sm text-yellow-900">{pickup.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fallback: sin pickup asignado, mostrar coordinar con tienda */}
      {(!pickup || !pickup.street) && store && !isStorePickup && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                Sin punto de recojo definido
              </h3>
              <p className="mt-1 text-sm text-amber-800">
                Coordina directamente con la tienda <b>{store.name}</b> para saber dónde recoger este pedido.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 👤 INFO DEL CLIENTE (DESTINO) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            {isStorePickup ? "Cliente que recogerá" : "Entregar a"}
          </h2>
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-lg font-bold text-gray-900">{order?.customer_name}</p>
          {order?.customer_phone && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">📞 {order.customer_phone}</span>
              {clientePhoneValido && (
                <button
                  onClick={contactCustomer}
                  className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-bold text-white transition hover:bg-emerald-600"
                >
                  💬 Chatear
                </button>
              )}
            </div>
          )}
        </div>

        {/* 🆕 v20 - Solo mostrar dirección si NO es pickup */}
        {!isStorePickup && order?.shipping_address ? (
          <div className="mt-4 rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              📍 Dirección de entrega
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              {formatShippingAddress(order?.shipping_address)}
            </p>
            <p className="text-sm text-gray-600">{getDistrict(order?.shipping_address)}</p>
            {reference && (
              <p className="mt-2 text-xs text-gray-500">💡 Referencia: {reference}</p>
            )}
          </div>
        ) : isStorePickup ? (
          <div className="mt-4 rounded-xl bg-purple-50 border border-purple-200 p-4">
            <p className="text-sm font-bold text-purple-900">
              🏪 Este pedido no requiere delivery
            </p>
            <p className="mt-1 text-xs text-purple-700">
              El cliente lo recogerá directamente en la tienda.
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm text-amber-800">
              ⚠️ Sin dirección de entrega registrada
            </p>
          </div>
        )}
      </div>

      {/* Info de la tienda */}
      {store && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            🏪 Tienda
          </h2>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-gray-900">{store.name}</p>
              {store.whatsapp && (
                <p className="text-sm text-gray-600">📞 {store.whatsapp}</p>
              )}
            </div>
            {tiendaWhatsappValido && (
              <button
                onClick={contactStore}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-600"
              >
                💬 Contactar tienda
              </button>
            )}
          </div>

          {!tiendaWhatsappValido && (
            <p className="mt-2 text-xs text-amber-600">
              ⚠️ La tienda no tiene WhatsApp configurado
            </p>
          )}
        </div>
      )}

      {/* Productos */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            📦 Productos ({items.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-4 sm:p-6">
              <div className="min-w-0 grow">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {item.product_name ?? item.name ?? "Producto"}
                </p>
                <p className="text-xs text-gray-500">Cantidad: {item.quantity ?? 1}</p>
              </div>
              <div className="text-sm font-bold text-gray-900">
                S/. {Number(item.subtotal ?? item.price ?? 0).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notas del vendor */}
      {assignment.vendor_notes && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-6">
          <h3 className="text-sm font-bold text-amber-900">📝 Notas del vendor</h3>
          <p className="mt-2 text-sm text-amber-800">{assignment.vendor_notes}</p>
        </div>
      )}

      {/* Acciones */}
      {!isDelivered && !isStorePickup && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 sm:p-6">
          <h3 className="text-sm font-bold text-emerald-900">🎯 Próxima acción</h3>

          {isAssigned && (
            <>
              <p className="mt-2 text-sm text-emerald-800">
                Recoge el pedido en el punto indicado y márcalo como <b>recogido</b> para iniciar la ruta. El cliente será notificado automáticamente por WhatsApp 📲
              </p>
              <button
                onClick={handlePickup}
                disabled={processing}
                className="mt-4 w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50 sm:w-auto"
              >
                {processing ? "Procesando..." : "🛵 Marcar como recogido"}
              </button>
            </>
          )}

          {isPickedUp && (
            <>
              <p className="mt-2 text-sm text-emerald-800">
                Al entregar al cliente, confirma la entrega para completar el pedido. Se le enviará un mensaje automático de agradecimiento 📲
              </p>
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={processing}
                className="mt-4 w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50 sm:w-auto"
              >
                ✅ Confirmar entrega
              </button>
            </>
          )}
        </div>
      )}

      {/* Panel post-entrega */}
      {isDelivered && (
        <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 sm:p-6">
          <h3 className="text-sm font-bold text-blue-900">🎉 Pedido entregado</h3>
          <p className="mt-2 text-sm text-blue-800">
            ¡Excelente trabajo! El cliente ya recibió su notificación de agradecimiento automáticamente por WhatsApp.
          </p>
        </div>
      )}

      {/* Modal de confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900">✅ Confirmar entrega</h3>
            <p className="mt-2 text-sm text-gray-600">
              ¿Confirmas que entregaste el pedido a {order?.customer_name}?
            </p>

            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Notas (opcional)
              </label>
              <textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Ej: Entregado en portería..."
                rows={3}
                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={processing}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelivery}
                disabled={processing}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {processing ? "Confirmando..." : "✅ Sí, entregado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}