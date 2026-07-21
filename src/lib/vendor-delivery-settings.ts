// src/lib/vendor-delivery-settings.ts
// 🆕 v16 FASE 3 - Gestión de configuración de entregas del vendor
import { supabase } from "./supabase";

// ============================================
// 📋 TIPOS
// ============================================

export interface VendorDeliverySettings {
  vendor_id: string;
  accepts_same_day: boolean;
  same_day_cutoff: string; // "12:00"
  days_ahead: number;
  opening_hours: Record<string, string[]>;
  delivery_cost: number;
  delivery_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryTimeSlot {
  date: string;       // "2026-07-22"
  day_name: string;   // "Miércoles"
  day_short: string;  // "Mié 22 Jul"
  is_today: boolean;
  slots: string[];    // ["09:00-12:00", "15:00-18:00"]
}

// Días de la semana
export const DAYS_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DAYS_LABELS: Record<string, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};

// Franjas predefinidas para elegir
export const PRESET_SLOTS = [
  "09:00-12:00",
  "12:00-15:00",
  "15:00-18:00",
  "18:00-21:00",
];

// ============================================
// 📥 LEER
// ============================================

/**
 * Obtiene la configuración del vendor autenticado.
 * Si no existe, crea una con defaults.
 */
export async function getMyDeliverySettings(): Promise<VendorDeliverySettings> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("vendor_delivery_settings")
    .select("*")
    .eq("vendor_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  // Si no existe, crear una con defaults
  if (!data) {
    const { data: created, error: createErr } = await supabase
      .from("vendor_delivery_settings")
      .insert({ vendor_id: user.id })
      .select()
      .single();

    if (createErr) throw new Error(createErr.message);
    return created as VendorDeliverySettings;
  }

  return data as VendorDeliverySettings;
}

/**
 * 🆕 Obtiene la configuración de un vendor por store_id (para checkout público).
 */
export async function getStoreDeliverySettings(
  storeId: string
): Promise<VendorDeliverySettings | null> {
  const { data: store, error: storeErr } = await supabase
    .from("stores")
    .select("owner_id")
    .eq("id", storeId)
    .maybeSingle();

  if (storeErr || !store) {
    console.error("Error obteniendo tienda:", storeErr);
    return null;
  }

  const { data, error } = await supabase
    .from("vendor_delivery_settings")
    .select("*")
    .eq("vendor_id", store.owner_id)
    .maybeSingle();

  if (error) {
    console.error("Error obteniendo delivery settings:", error);
    return null;
  }

  return (data as VendorDeliverySettings) ?? null;
}

// ============================================
// ✏️ ACTUALIZAR
// ============================================

/**
 * Actualiza la configuración del vendor autenticado.
 */
export async function updateMyDeliverySettings(
  updates: Partial<
    Omit<VendorDeliverySettings, "vendor_id" | "created_at" | "updated_at">
  >
): Promise<VendorDeliverySettings> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Asegurar que existe
  await getMyDeliverySettings();

  const { data, error } = await supabase
    .from("vendor_delivery_settings")
    .update(updates)
    .eq("vendor_id", user.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as VendorDeliverySettings;
}

// ============================================
// 🕐 GENERAR FRANJAS DISPONIBLES
// ============================================

/**
 * 🎯 Genera franjas disponibles para el CLIENTE en base a la config del vendor.
 * Respeta:
 * - Días con horarios activos
 * - Cutoff para mismo día
 * - N días adelante
 */
export function generateDeliverySlots(
  settings: VendorDeliverySettings
): DeliveryTimeSlot[] {
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
  const monthShort = [
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
  const dayShortNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const result: DeliveryTimeSlot[] = [];
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  // Parsear cutoff (ej: "12:00")
  const [cutH, cutM] = (settings.same_day_cutoff || "12:00")
    .split(":")
    .map(Number);
  const cutoffMinutes = cutH * 60 + cutM;

  // ¿Puede mismo día?
  const canSameDay =
    settings.accepts_same_day && currentTime < cutoffMinutes;

  const startOffset = canSameDay ? 0 : 1;
  const endOffset = settings.days_ahead;

  for (let i = startOffset; i <= endOffset; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);

    const dayIndex = date.getDay();
    const dayKey = dayKeys[dayIndex];
    const slots = settings.opening_hours?.[dayKey] ?? [];

    if (slots.length === 0) continue;

    // Si es hoy, filtrar franjas que ya pasaron
    let availableSlots = slots;
    if (i === 0) {
      availableSlots = slots.filter((slot) => {
        const [startHM] = slot.split("-");
        const [h, m] = startHM.split(":").map(Number);
        return h * 60 + m > currentTime;
      });
    }

    if (availableSlots.length === 0) continue;

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");

    result.push({
      date: `${yyyy}-${mm}-${dd}`,
      day_name: dayNames[dayIndex],
      day_short: `${dayShortNames[dayIndex]} ${date.getDate()} ${
        monthShort[date.getMonth()]
      }`,
      is_today: i === 0,
      slots: availableSlots,
    });
  }

  return result;
}

/**
 * Formatea un delivery_date + delivery_time_slot para mostrar.
 * Ej: "2026-07-22" + "15:00-18:00" → "Mié 22 Jul, 15:00-18:00"
 */
export function formatDeliverySlot(
  date: string | null,
  timeSlot: string | null
): string {
  if (!date || !timeSlot) return "";

  const d = new Date(date + "T00:00:00");
  const dayShortNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const monthShort = [
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

  return `${dayShortNames[d.getDay()]} ${d.getDate()} ${
    monthShort[d.getMonth()]
  }, ${timeSlot}`;
}