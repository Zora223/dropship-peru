// src/components/vendor/AssignDeliveryModal.tsx
// v13: Selector de punto de recojo + asignación (WhatsApp lo envía el trigger)

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAvailableDeliveries,
  assignDeliveryToOrder,
  type AvailableDelivery,
} from "../../lib/delivery";
import {
  getMyPickupLocations,
  incrementPickupUsage,
  locationToSnapshot,
  guessPickupEmoji,
  type PickupLocation,
  type PickupAddressSnapshot,
} from "../../lib/pickup-locations";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";

interface AssignDeliveryModalProps {
  orderId: string;
  orderNumber: string;
  orderTotal: number;
  customerName: string;
  shippingAddress?: string | null;
  shippingReference?: string | null;
  onClose: () => void;
  onAssigned: () => void;
}

const VEHICLE_LABELS: Record<string, string> = {
  moto: "🏍️ Moto",
  bici: "🚴 Bicicleta",
  auto: "🚗 Auto",
  a_pie: "🚶 A pie",
};

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function getDeliveryName(delivery: AvailableDelivery): string {
  return delivery.profiles?.full_name ?? "Delivery sin nombre";
}

function getDeliveryAvatar(delivery: AvailableDelivery): string | null {
  return delivery.photo_url ?? delivery.profiles?.avatar_url ?? null;
}

// ============================================
// 🎯 COMPONENTE PRINCIPAL
// ============================================

export default function AssignDeliveryModal({
  orderId,
  orderNumber,
  orderTotal: _orderTotal,
  customerName: _customerName,
  shippingAddress: _shippingAddress,
  shippingReference: _shippingReference,
  onClose,
  onAssigned,
}: AssignDeliveryModalProps) {
  const toast = useToast();

  // Estado deliveries
  const [deliveries, setDeliveries] = useState<AvailableDelivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadyAssigned, setAlreadyAssigned] = useState(false);

  // Estado puntos de recojo
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [customPickup, setCustomPickup] = useState<PickupAddressSnapshot>({
    street: "",
    district: "",
    city: "Lima",
    reference: "",
    contact_name: "",
    contact_phone: "",
    notes: "",
  });

  // Estado post-asignación
  const [assignedDelivery, setAssignedDelivery] =
    useState<AvailableDelivery | null>(null);

  // ============================================
  // 📥 CARGA INICIAL
  // ============================================

  useEffect(() => {
    async function cargarTodo() {
      try {
        setLoadingDeliveries(true);
        setLoadingLocations(true);
        setError(null);

        const [dels, locs] = await Promise.all([
          getAvailableDeliveries(),
          getMyPickupLocations(),
        ]);

        setDeliveries(dels);
        setPickupLocations(locs);

        // Preseleccionar el default o el primero
        const defaultLoc = locs.find((l) => l.is_default);
        if (defaultLoc) {
          setSelectedLocationId(defaultLoc.id);
        } else if (locs.length > 0) {
          setSelectedLocationId(locs[0].id);
        } else {
          // No hay puntos guardados → activar modo custom
          setSelectedLocationId("__custom__");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar datos");
      } finally {
        setLoadingDeliveries(false);
        setLoadingLocations(false);
      }
    }

    cargarTodo();
  }, []);

  // ============================================
  // ✅ VALIDACIÓN DE PICKUP
  // ============================================

  function validatePickup(): PickupAddressSnapshot | null {
    // Modo: usar un punto guardado
    if (selectedLocationId && selectedLocationId !== "__custom__") {
      const loc = pickupLocations.find((l) => l.id === selectedLocationId);
      if (!loc) {
        toast.warning("Falta punto de recojo", "Selecciona uno de la lista");
        return null;
      }
      return locationToSnapshot(loc);
    }

    // Modo: custom (personalizado para este pedido)
    if (selectedLocationId === "__custom__") {
      if (!customPickup.street.trim() || !customPickup.district.trim()) {
        toast.warning(
          "Faltan datos",
          "Completa dirección y distrito del punto de recojo"
        );
        return null;
      }
      return {
        location_id:   null,
        name:          "Punto personalizado",
        street:        customPickup.street.trim(),
        district:      customPickup.district.trim(),
        city:          customPickup.city?.trim() || "Lima",
        reference:     customPickup.reference?.trim() || null,
        contact_name:  customPickup.contact_name?.trim() || null,
        contact_phone: customPickup.contact_phone?.trim() || null,
        notes:         customPickup.notes?.trim() || null,
      };
    }

    toast.warning("Falta punto de recojo", "Selecciona dónde recoger el pedido");
    return null;
  }

  // ============================================
  // 🚀 ASIGNAR
  // ============================================

  async function handleAsignar(delivery: AvailableDelivery) {
    if (alreadyAssigned || assigning) return;

    // 1. Validar punto de recojo
    const pickup = validatePickup();
    if (!pickup) return;

    try {
      setAssigning(delivery.id);
      setError(null);

      // 2. Guardar pickup_address en el pedido ANTES de asignar
      //    (para que el trigger tenga los datos al enviar el WhatsApp)
      const { error: updateErr } = await supabase
        .from("orders")
        .update({ pickup_address: pickup })
        .eq("id", orderId);

      if (updateErr) throw new Error(updateErr.message);

      // 3. Asignar delivery (esto dispara el trigger de WhatsApp)
      await assignDeliveryToOrder(orderId, delivery.id);

      // 4. Incrementar contador de uso si es un punto guardado
      if (pickup.location_id) {
        try {
          await incrementPickupUsage(pickup.location_id);
        } catch {
          // No crítico si falla
        }
      }

      setAlreadyAssigned(true);

      toast.success(
        "¡Delivery asignado! 🛵",
        `${getDeliveryName(delivery)} recibió el pedido por WhatsApp automáticamente`
      );

      setAssignedDelivery(delivery);

      setTimeout(() => {
        onAssigned();
      }, 300);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al asignar delivery";
      setError(msg);
      toast.error("Error al asignar", msg);
      setAlreadyAssigned(false);
    } finally {
      setAssigning(null);
    }
  }

  function handleClose() {
    setAssignedDelivery(null);
    setAlreadyAssigned(false);
    onClose();
  }

  // ============================================
  // 🎉 VISTA DE ÉXITO POST-ASIGNACIÓN
  // ============================================
  if (assignedDelivery) {
    const nombre = getDeliveryName(assignedDelivery);
    const avatar = getDeliveryAvatar(assignedDelivery);

    return (
      <div
        className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={handleClose}
      >
        <div
          className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-linear-to-br from-emerald-500 to-teal-500 px-6 py-8 text-center text-white">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-4xl">
              ✅
            </div>
            <h2 className="mt-4 text-xl font-bold">¡Delivery asignado!</h2>
            <p className="mt-1 text-sm opacity-90">
              Pedido{" "}
              <span className="font-mono font-bold">{orderNumber}</span>
            </p>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-4 rounded-2xl bg-gray-50 p-4">
              {avatar ? (
                <img
                  src={avatar}
                  alt={nombre}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
                  🛵
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="font-bold text-gray-900">{nombre}</div>
                <div className="text-xs text-gray-500">
                  📞 {assignedDelivery.phone}
                </div>
                <div className="text-xs font-semibold text-emerald-700">
                  Tarifa: {formatCurrency(assignedDelivery.base_rate)}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-center">
              <div className="text-2xl">📲</div>
              <p className="mt-2 text-sm font-semibold text-emerald-900">
                Notificación enviada automáticamente
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                El delivery ya recibió por WhatsApp los datos del pedido y del
                punto de recojo.
              </p>
            </div>

            <button
              onClick={handleClose}
              className="mt-6 w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
            >
              ✅ Listo, cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // 📋 VISTA NORMAL
  // ============================================
  const isCustomMode = selectedLocationId === "__custom__";

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              🛵 Asignar Delivery
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Pedido{" "}
              <span className="font-mono font-bold text-gray-700">
                {orderNumber}
              </span>
            </p>
          </div>

          <button
            onClick={handleClose}
            className="shrink-0 text-2xl leading-none text-gray-400 transition hover:text-gray-600"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Contenido */}
        <div className="max-h-[70vh] overflow-y-auto">
          {/* ═══════════════════════════════════════ */}
          {/* SECCIÓN 1: PUNTO DE RECOJO */}
          {/* ═══════════════════════════════════════ */}
          <div className="border-b border-gray-100 px-6 py-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">
              📍 Punto de recojo
            </h3>

            {loadingLocations && (
              <div className="space-y-2">
                <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
              </div>
            )}

            {!loadingLocations && (
              <div className="space-y-2">
                {/* Puntos guardados */}
                {pickupLocations.map((loc) => (
                  <label
                    key={loc.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition ${
                      selectedLocationId === loc.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pickup"
                      checked={selectedLocationId === loc.id}
                      onChange={() => setSelectedLocationId(loc.id)}
                      className="mt-1 h-4 w-4 accent-emerald-600"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {guessPickupEmoji(loc.name)}
                        </span>
                        <span className="truncate font-bold text-gray-900">
                          {loc.name}
                        </span>
                        {loc.is_default && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            ⭐ DEFAULT
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-600">
                        {loc.street}, {loc.district}
                      </p>
                      {loc.contact_name && (
                        <p className="text-xs text-gray-500">
                          👤 {loc.contact_name}
                          {loc.contact_phone && ` · 📞 ${loc.contact_phone}`}
                        </p>
                      )}
                    </div>
                  </label>
                ))}

                {/* Opción personalizar */}
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition ${
                    isCustomMode
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-dashed border-gray-300 bg-gray-50 hover:border-gray-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="pickup"
                    checked={isCustomMode}
                    onChange={() => setSelectedLocationId("__custom__")}
                    className="mt-1 h-4 w-4 accent-emerald-600"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✏️</span>
                      <span className="font-bold text-gray-900">
                        Personalizar para este pedido
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-600">
                      Punto único que no se guardará
                    </p>
                  </div>
                </label>

                {/* Mini-form para custom */}
                {isCustomMode && (
                  <div className="mt-3 space-y-3 rounded-xl bg-emerald-50 p-4">
                    <MiniField label="📍 Dirección *">
                      <input
                        type="text"
                        value={customPickup.street}
                        onChange={(e) =>
                          setCustomPickup({ ...customPickup, street: e.target.value })
                        }
                        placeholder="Calle y número"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                      />
                    </MiniField>

                    <div className="grid grid-cols-2 gap-2">
                      <MiniField label="Distrito *">
                        <input
                          type="text"
                          value={customPickup.district}
                          onChange={(e) =>
                            setCustomPickup({ ...customPickup, district: e.target.value })
                          }
                          placeholder="San Miguel"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                        />
                      </MiniField>
                      <MiniField label="Ciudad">
                        <input
                          type="text"
                          value={customPickup.city}
                          onChange={(e) =>
                            setCustomPickup({ ...customPickup, city: e.target.value })
                          }
                          placeholder="Lima"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                        />
                      </MiniField>
                    </div>

                    <MiniField label="💡 Referencia">
                      <input
                        type="text"
                        value={customPickup.reference ?? ""}
                        onChange={(e) =>
                          setCustomPickup({ ...customPickup, reference: e.target.value })
                        }
                        placeholder="Frente al banco BCP"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                      />
                    </MiniField>

                    <div className="grid grid-cols-2 gap-2">
                      <MiniField label="👤 Contacto">
                        <input
                          type="text"
                          value={customPickup.contact_name ?? ""}
                          onChange={(e) =>
                            setCustomPickup({ ...customPickup, contact_name: e.target.value })
                          }
                          placeholder="Sr. Kevin"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                        />
                      </MiniField>
                      <MiniField label="📞 Teléfono">
                        <input
                          type="tel"
                          value={customPickup.contact_phone ?? ""}
                          onChange={(e) =>
                            setCustomPickup({ ...customPickup, contact_phone: e.target.value })
                          }
                          placeholder="977666555"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                        />
                      </MiniField>
                    </div>

                    <MiniField label="📝 Notas">
                      <input
                        type="text"
                        value={customPickup.notes ?? ""}
                        onChange={(e) =>
                          setCustomPickup({ ...customPickup, notes: e.target.value })
                        }
                        placeholder="Horario 10am-6pm"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                      />
                    </MiniField>
                  </div>
                )}

                {/* Link a gestión */}
                <Link
                  to="/vendor/pickup-locations"
                  target="_blank"
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-600 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  ➕ Guardar nuevo punto en Mis puntos de recojo
                </Link>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════ */}
          {/* SECCIÓN 2: LISTA DE DELIVERIES */}
          {/* ═══════════════════════════════════════ */}
          <div className="px-6 py-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">
              🛵 Delivery disponible
            </h3>

            {loadingDeliveries && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-2xl bg-gray-100"
                  />
                ))}
              </div>
            )}

            {error && !loadingDeliveries && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {!loadingDeliveries && !error && deliveries.length === 0 && (
              <div className="py-10 text-center">
                <div className="text-5xl">😔</div>
                <p className="mt-3 font-semibold text-gray-700">
                  No hay deliveries disponibles
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Todos están ocupados o sin conexión en este momento.
                </p>
              </div>
            )}

            {!loadingDeliveries && !error && deliveries.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-gray-400">
                  {deliveries.length}{" "}
                  {deliveries.length === 1
                    ? "delivery disponible"
                    : "deliveries disponibles"}
                </p>

                {deliveries.map((delivery) => {
                  const estaAsignando = assigning === delivery.id;
                  const bloqueado =
                    alreadyAssigned ||
                    (assigning !== null && assigning !== delivery.id);

                  const nombre = getDeliveryName(delivery);
                  const avatar = getDeliveryAvatar(delivery);

                  return (
                    <div
                      key={delivery.id}
                      className={`flex items-start gap-4 rounded-2xl border border-gray-100 p-4 transition ${
                        bloqueado
                          ? "bg-gray-100 opacity-50"
                          : "bg-gray-50 hover:border-emerald-200 hover:bg-emerald-50"
                      }`}
                    >
                      <div className="shrink-0">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={nombre}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl">
                            🛵
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-gray-900">{nombre}</div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          {delivery.vehicle_type && (
                            <span className="rounded-full bg-white px-2 py-0.5 font-medium">
                              {VEHICLE_LABELS[delivery.vehicle_type] ??
                                delivery.vehicle_type}
                              {delivery.vehicle_plate && (
                                <span className="ml-1 font-mono">
                                  {delivery.vehicle_plate}
                                </span>
                              )}
                            </span>
                          )}
                          <span>📞 {delivery.phone}</span>
                        </div>

                        {delivery.zone_description && (
                          <div className="mt-1 truncate text-xs text-gray-500">
                            📍 {delivery.zone_description}
                          </div>
                        )}

                        <div className="mt-1.5 text-sm font-bold text-emerald-700">
                          Tarifa: {formatCurrency(delivery.base_rate)}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAsignar(delivery)}
                        disabled={estaAsignando || bloqueado}
                        className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {estaAsignando ? (
                          <span className="flex items-center gap-1.5">
                            <svg
                              className="h-4 w-4 animate-spin"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v8H4z"
                              />
                            </svg>
                            Asignando...
                          </span>
                        ) : (
                          "Asignar"
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          <button
            onClick={handleClose}
            className="w-full rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 🧩 Mini-campo con label
// ============================================

function MiniField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </label>
      {children}
    </div>
  );
}