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
  accepts_pickup?: boolean;
  opening_hours?: Record<string, string[]> | null;
  latitude?: number | null;
  longitude?: number | null;
  google_place_id?: string | null;
  formatted_address?: string | null;
}

export interface PickupAddressSnapshot {
  location_id?: string | null;
  name?: string | null;
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
 * 🆕 v20.8 FIX - Obtiene los puntos del vendor autenticado.
 * Ahora filtra EXPLÍCITAMENTE por vendor_id (auth.uid()).
 */
export async function getMyPickupLocations(): Promise<PickupLocation[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("vendor_pickup_locations")
    .select("*")
    .eq("vendor_id", user.id) // 🆕 FIX v20.8 - Filtro explícito
    .order("is_default", { ascending: false })
    .order("usage_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PickupLocation[];
}

export async function getDefaultPickupLocation(): Promise<PickupLocation | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("vendor_pickup_locations")
    .select("*")
    .eq("vendor_id", user.id) // 🆕 FIX v20.8
    .eq("is_default", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as PickupLocation | null) ?? null;
}

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

export async function deletePickupLocation(id: string): Promise<void> {
  const { error } = await supabase
    .from("vendor_pickup_locations")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function setDefaultPickupLocation(id: string): Promise<void> {
  const { error } = await supabase.rpc("set_default_pickup_location", {
    p_location_id: id,
  });
  if (error) throw new Error(error.message);
}

export async function incrementPickupUsage(id: string): Promise<void> {
  const { error } = await supabase.rpc("increment_pickup_usage", {
    p_location_id: id,
  });
  if (error) throw new Error(error.message);
}

// ============================================
// 🔄 CONVERTIR A SNAPSHOT
// ============================================

export function locationToSnapshot(
  location: PickupLocation
): PickupAddressSnapshot {
  return {
    location_id: location.id,
    name: location.name,
    street: location.street,
    district: location.district,
    city: location.city,
    reference: location.reference,
    contact_name: location.contact_name,
    contact_phone: location.contact_phone,
    notes: location.notes,
  };
}

// ============================================
// 🏷️ HELPERS UI
// ============================================

export function formatPickupAddress(
  pickup: PickupAddressSnapshot | null | undefined
): string {
  if (!pickup) return "Sin punto de recojo";
  const parts: string[] = [];
  if (pickup.street) parts.push(pickup.street);
  if (pickup.district) parts.push(pickup.district);
  if (pickup.city) parts.push(pickup.city);
  return parts.length > 0 ? parts.join(", ") : "Sin dirección";
}

export function getPickupMapUrl(
  pickup: PickupAddressSnapshot | null | undefined
): string | null {
  if (!pickup?.street) return null;
  const query = encodeURIComponent(formatPickupAddress(pickup));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function guessPickupEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("casa") || lower.includes("hogar")) return "🏠";
  if (lower.includes("proveedor") || lower.includes("mayorista")) return "🏬";
  if (
    lower.includes("almacén") ||
    lower.includes("almacen") ||
    lower.includes("depósito")
  )
    return "📦";
  if (lower.includes("tienda") || lower.includes("local")) return "🏪";
  if (lower.includes("mercado") || lower.includes("gamarra")) return "🏙️";
  if (lower.includes("oficina")) return "🏢";
  return "📍";
}

// ============================================
// 🆕 v16 FASE 3 - Pickup para clientes
// ============================================

export async function getStorePickupLocations(
  storeId: string
): Promise<PickupLocation[]> {
  const { data: store, error: storeErr } = await supabase
    .from("stores")
    .select("owner_id")
    .eq("id", storeId)
    .maybeSingle();

  if (storeErr) {
    console.error("Error obteniendo tienda:", storeErr);
    return [];
  }
  if (!store) return [];

  const { data, error } = await supabase
    .from("vendor_pickup_locations")
    .select("*")
    .eq("vendor_id", store.owner_id)
    .eq("accepts_pickup", true)
    .order("is_default", { ascending: false });

  if (error) {
    console.error("Error obteniendo pickup locations:", error);
    return [];
  }
  return (data ?? []) as PickupLocation[];
}

// ============================================
// 🆕 v16 FASE 3 - Franjas horarias
// ============================================

export interface TimeSlot {
  date: string;
  day_name: string;
  slots: string[];
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

    const dayIndex = date.getDay();
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

export function formatTimeSlot(timeSlot: string | null): string {
  if (!timeSlot) return "";

  const [date, hours] = timeSlot.split(" ");
  if (!date || !hours) return timeSlot;

  const d = new Date(date + "T00:00:00");
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
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