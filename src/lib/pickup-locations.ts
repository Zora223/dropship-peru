// src/lib/pickup-locations.ts
// Cliente para gestionar puntos de recojo del vendor
import { supabase } from "./supabase";

// ============================================
// 📋 TIPOS
// ============================================

export interface PickupLocation {
  id: string;
  vendor_id: string;
  name: string;
  street: string;
  district: string;
  city: string;
  reference: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  notes: string | null;
  is_default: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// Snapshot que se guarda en orders.pickup_address (JSONB)
export interface PickupAddressSnapshot {
  location_id?: string | null; // referencia opcional al punto guardado
  name?: string | null;        // "Proveedor Gamarra"
  street: string;
  district: string;
  city: string;
  reference?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
}

export type PickupLocationInput = Omit<
  PickupLocation,
  "id" | "vendor_id" | "usage_count" | "created_at" | "updated_at"
>;

// ============================================
// 📥 LEER
// ============================================

/**
 * Obtiene todos los puntos de recojo del vendor autenticado.
 * Ordenados: default primero, luego por más usados.
 */
export async function getMyPickupLocations(): Promise<PickupLocation[]> {
  const { data, error } = await supabase
    .from("vendor_pickup_locations")
    .select("*")
    .order("is_default", { ascending: false })
    .order("usage_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PickupLocation[];
}

/**
 * Obtiene el punto default del vendor (o null si no tiene).
 */
export async function getDefaultPickupLocation(): Promise<PickupLocation | null> {
  const { data, error } = await supabase
    .from("vendor_pickup_locations")
    .select("*")
    .eq("is_default", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as PickupLocation | null) ?? null;
}

/**
 * Obtiene un punto por ID.
 */
export async function getPickupLocationById(
  id: string
): Promise<PickupLocation | null> {
  const { data, error } = await supabase
    .from("vendor_pickup_locations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as PickupLocation | null) ?? null;
}

// ============================================
// ✏️ CREAR / EDITAR / ELIMINAR
// ============================================

/**
 * Crea un nuevo punto de recojo.
 */
export async function createPickupLocation(
  input: PickupLocationInput
): Promise<PickupLocation> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("vendor_pickup_locations")
    .insert({
      vendor_id: user.id,
      ...input,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as PickupLocation;
}

/**
 * Actualiza un punto existente.
 */
export async function updatePickupLocation(
  id: string,
  input: Partial<PickupLocationInput>
): Promise<PickupLocation> {
  const { data, error } = await supabase
    .from("vendor_pickup_locations")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as PickupLocation;
}

/**
 * Elimina un punto.
 */
export async function deletePickupLocation(id: string): Promise<void> {
  const { error } = await supabase
    .from("vendor_pickup_locations")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/**
 * Marca un punto como default (desmarca los demás automáticamente).
 */
export async function setDefaultPickupLocation(id: string): Promise<void> {
  const { error } = await supabase.rpc("set_default_pickup_location", {
    p_location_id: id,
  });
  if (error) throw new Error(error.message);
}

/**
 * Incrementa el contador de uso (llamar al asignar delivery).
 */
export async function incrementPickupUsage(id: string): Promise<void> {
  const { error } = await supabase.rpc("increment_pickup_usage", {
    p_location_id: id,
  });
  if (error) throw new Error(error.message);
}

// ============================================
// 🔄 CONVERTIR A SNAPSHOT
// ============================================

/**
 * Convierte un PickupLocation guardado en snapshot para orders.pickup_address.
 * El snapshot se guarda en el pedido para que no cambie si el vendor edita
 * el punto guardado después.
 */
export function locationToSnapshot(
  location: PickupLocation
): PickupAddressSnapshot {
  return {
    location_id:    location.id,
    name:           location.name,
    street:         location.street,
    district:       location.district,
    city:           location.city,
    reference:      location.reference,
    contact_name:   location.contact_name,
    contact_phone:  location.contact_phone,
    notes:          location.notes,
  };
}

// ============================================
// 🏷️ HELPERS UI
// ============================================

/**
 * Formatea una dirección de pickup en texto legible.
 */
export function formatPickupAddress(
  pickup: PickupAddressSnapshot | null | undefined
): string {
  if (!pickup) return "Sin punto de recojo";
  const parts: string[] = [];
  if (pickup.street)   parts.push(pickup.street);
  if (pickup.district) parts.push(pickup.district);
  if (pickup.city)     parts.push(pickup.city);
  return parts.length > 0 ? parts.join(", ") : "Sin dirección";
}

/**
 * Genera link de Google Maps para navegar al punto.
 */
export function getPickupMapUrl(
  pickup: PickupAddressSnapshot | null | undefined
): string | null {
  if (!pickup?.street) return null;
  const query = encodeURIComponent(formatPickupAddress(pickup));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/**
 * Emoji sugerido según el nombre del punto (heurística simple).
 */
export function guessPickupEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("casa") || lower.includes("hogar")) return "🏠";
  if (lower.includes("proveedor") || lower.includes("mayorista")) return "🏬";
  if (lower.includes("almacén") || lower.includes("almacen") || lower.includes("depósito")) return "📦";
  if (lower.includes("tienda") || lower.includes("local")) return "🏪";
  if (lower.includes("mercado") || lower.includes("gamarra")) return "🏙️";
  if (lower.includes("oficina")) return "🏢";
  return "📍";
}
// ============================================
// 🆕 v16 FASE 3 - Pickup para clientes
// ============================================

/**
 * 🆕 Obtiene puntos de recojo activos de una tienda (para el checkout del cliente).
 * Filtra solo los que aceptan pickup.
 */
export async function getStorePickupLocations(
  storeId: string
): Promise<PickupLocation[]> {
  // Obtener el vendor_id de la tienda
  const { data: store, error: storeErr } = await supabase
    .from("stores")
    .select("vendor_id")
    .eq("id", storeId)
    .maybeSingle();

  if (storeErr || !store) return [];

  const { data, error } = await supabase
    .from("vendor_pickup_locations")
    .select("*")
    .eq("vendor_id", store.vendor_id)
    .eq("accepts_pickup", true)
    .order("is_default", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PickupLocation[];
}

/**
 * 🆕 Genera franjas horarias disponibles para los próximos 7 días
 * basado en los horarios del punto de recojo.
 */
export interface TimeSlot {
  date: string;       // "2026-07-22"
  day_name: string;   // "Lunes"
  slots: string[];    // ["09:00-13:00", "15:00-19:00"]
}

export function generateAvailableSlots(
  openingHours: Record<string, string[]> | null,
  daysAhead: number = 7
): TimeSlot[] {
  if (!openingHours) return [];

  const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayNames = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  const result: TimeSlot[] = [];
  const now = new Date();

  for (let i = 1; i <= daysAhead; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);

    const dayIndex = date.getDay(); // 0=domingo
    const dayKey = dayKeys[dayIndex];
    const slots = openingHours[dayKey] ?? [];

    if (slots.length > 0) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");

      result.push({
        date: `${yyyy}-${mm}-${dd}`,
        day_name: dayNames[dayIndex],
        slots,
      });
    }
  }

  return result;
}

/**
 * 🆕 Formatea un time_slot guardado en la orden.
 * Ej: "2026-07-22 14:00-17:00" → "Miércoles 22 Jul, 14:00-17:00"
 */
export function formatTimeSlot(timeSlot: string | null): string {
  if (!timeSlot) return "";

  const [date, hours] = timeSlot.split(" ");
  if (!date || !hours) return timeSlot;

  const d = new Date(date + "T00:00:00");
  const dayNames = [
    "Dom",
    "Lun",
    "Mar",
    "Mié",
    "Jue",
    "Vie",
    "Sáb",
  ];
  const monthNames = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];

  return `${dayNames[d.getDay()]} ${d.getDate()} ${
    monthNames[d.getMonth()]
  }, ${hours}`;
}