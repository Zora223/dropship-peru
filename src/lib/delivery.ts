// src/lib/delivery.ts
import { supabase } from "./supabase";

// ============================================
// 📋 TIPOS
// ============================================

export type VehicleType = "moto" | "bici" | "auto" | "a_pie";

export type DeliveryStatus =
  | "unassigned"
  | "assigned"
  | "picked_up"
  | "delivered"
  | "failed";

export type AssignmentStatus =
  | "assigned"
  | "picked_up"
  | "delivered"
  | "failed"
  | "cancelled";

export interface DeliveryProfile {
  id: string;
  phone: string;
  yape_number: string;
  vehicle_type: VehicleType;
  vehicle_plate: string | null;
  base_rate: number;
  zone_description: string | null;
  photo_url: string | null;
  is_active: boolean;
  available: boolean;
  rating: number;
  total_deliveries: number;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderAssignment {
  id: string;
  order_id: string;
  delivery_id: string;
  vendor_id: string;
  status: AssignmentStatus;
  assigned_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  delivery_photo: string | null;
  delivery_notes: string | null;
  vendor_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryEarning {
  id: string;
  order_id: string;
  delivery_id: string;
  vendor_id: string;
  assignment_id: string | null;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  vendor_payment_status: "pending" | "received";
  vendor_paid_at: string | null;
  delivery_payment_status: "pending" | "paid";
  delivery_paid_at: string | null;
  created_at: string;
}

// ============================================
// 👤 PERFIL DEL DELIVERY
// ============================================

export async function getMyDeliveryProfile(userId: string) {
  const { data, error } = await supabase
    .from("delivery_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as DeliveryProfile | null;
}

export async function upsertDeliveryProfile(
  userId: string,
  data: Partial<DeliveryProfile>
) {
  const { data: result, error } = await supabase
    .from("delivery_profiles")
    .upsert({ id: userId, ...data })
    .select()
    .single();

  if (error) throw error;
  return result as DeliveryProfile;
}

export async function toggleAvailability(userId: string, available: boolean) {
  const { error } = await supabase
    .from("delivery_profiles")
    .update({ available })
    .eq("id", userId);

  if (error) throw error;
}

// ============================================
// 📦 PEDIDOS ASIGNADOS AL DELIVERY
// ============================================

// ⚠️ shipping_address y pickup_address son JSONB, items es JSONB (dentro de orders)
export async function getMyOrders(
  deliveryId: string,
  status?: AssignmentStatus | AssignmentStatus[]
) {
  let query = supabase
    .from("order_assignments")
    .select(
      `
      *,
      order:orders (
        id,
        order_number,
        total,
        status,
        customer_name,
        customer_phone,
        customer_email,
        shipping_address,
        pickup_address,
        items,
        created_at,
        store:stores (
          id,
          name,
          slug,
          owner_id,
          whatsapp
        )
      )
    `
    )
    .eq("delivery_id", deliveryId)
    .order("assigned_at", { ascending: false });

  if (status) {
    if (Array.isArray(status)) {
      query = query.in("status", status);
    } else {
      query = query.eq("status", status);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getMyOrderDetail(assignmentId: string) {
  const { data, error } = await supabase
    .from("order_assignments")
    .select(
      `
      *,
      order:orders (
        id,
        order_number,
        total,
        subtotal,
        status,
        customer_name,
        customer_phone,
        customer_email,
        shipping_address,
        pickup_address,
        items,
        payment_method,
        notes,
        created_at,
        store:stores (
          id,
          name,
          slug,
          owner_id,
          whatsapp
        )
      )
    `
    )
    .eq("id", assignmentId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ============================================
// ✅ ACCIONES DEL DELIVERY
// ============================================

export async function markPickedUp(assignmentId: string) {
  const { error } = await supabase
    .from("order_assignments")
    .update({ status: "picked_up" })
    .eq("id", assignmentId);

  if (error) throw error;
}

export async function confirmDelivery(
  assignmentId: string,
  notes?: string,
  photo?: string
) {
  const { data, error } = await supabase.rpc("confirm_delivery", {
    p_assignment_id: assignmentId,
    p_delivery_notes: notes ?? null,
    p_delivery_photo: photo ?? null,
  });

  if (error) throw error;
  return data as { success: boolean; error?: string; message?: string };
}

export async function markFailed(assignmentId: string, notes: string) {
  const { error } = await supabase
    .from("order_assignments")
    .update({
      status: "failed",
      delivery_notes: notes,
    })
    .eq("id", assignmentId);

  if (error) throw error;
}

// ============================================
// 💰 GANANCIAS DEL DELIVERY
// ============================================

export async function getMyEarnings(deliveryId: string) {
  const { data, error } = await supabase
    .from("delivery_earnings")
    .select(
      `
      *,
      order:orders (
        order_number,
        customer_name
      )
    `
    )
    .eq("delivery_id", deliveryId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getEarningsSummary(deliveryId: string) {
  const { data, error } = await supabase
    .from("delivery_earnings")
    .select("net_amount, delivery_payment_status")
    .eq("delivery_id", deliveryId);

  if (error) throw error;

  const rows = data ?? [];

  const pending = rows
    .filter((r) => r.delivery_payment_status === "pending")
    .reduce((sum, r) => sum + Number(r.net_amount), 0);

  const paid = rows
    .filter((r) => r.delivery_payment_status === "paid")
    .reduce((sum, r) => sum + Number(r.net_amount), 0);

  return { pending, paid, total: pending + paid, count: rows.length };
}

// ============================================
// 🏷️ HELPERS UI
// ============================================

export function getStatusLabel(status: AssignmentStatus): string {
  const labels: Record<AssignmentStatus, string> = {
    assigned: "🆕 Asignado",
    picked_up: "🛵 En camino",
    delivered: "✅ Entregado",
    failed: "❌ Fallido",
    cancelled: "🚫 Cancelado",
  };
  return labels[status] ?? status;
}

export function getStatusColor(status: AssignmentStatus): string {
  const colors: Record<AssignmentStatus, string> = {
    assigned: "bg-blue-100 text-blue-700 border-blue-200",
    picked_up: "bg-amber-100 text-amber-700 border-amber-200",
    delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
    failed: "bg-rose-100 text-rose-700 border-rose-200",
    cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return colors[status] ?? "bg-gray-100 text-gray-700";
}

export function getVehicleLabel(type: VehicleType): string {
  const labels: Record<VehicleType, string> = {
    moto: "🏍️ Moto",
    bici: "🚴 Bicicleta",
    auto: "🚗 Auto",
    a_pie: "🚶 A pie",
  };
  return labels[type] ?? type;
}

// ============================================
// 🏠 HELPERS PARA SHIPPING_ADDRESS (JSONB)
// ============================================

export interface ShippingAddress {
  full_name?: string;
  phone?: string;
  street?: string;
  district?: string;
  city?: string;
  reference?: string | null;
}

// Extrae la dirección legible del JSONB
export function formatShippingAddress(address: any): string {
  if (!address) return "Sin dirección";
  if (typeof address === "string") return address;

  const parts: string[] = [];
  if (address.street) parts.push(address.street);
  if (address.district) parts.push(address.district);
  if (address.city) parts.push(address.city);

  return parts.length > 0 ? parts.join(", ") : "Sin dirección";
}

// Extrae el distrito del JSONB
export function getDistrict(address: any): string {
  if (!address) return "Sin distrito";
  if (typeof address === "string") return "Sin distrito";
  return address.district || "Sin distrito";
}

// Extrae la referencia
export function getReference(address: any): string | null {
  if (!address || typeof address === "string") return null;
  return address.reference || null;
}

// ============================================
// 🚚 FASE 3 — ASIGNACIÓN DE DELIVERY DESDE VENDOR
// ============================================

/**
 * Tipo para mostrar deliveries disponibles en el modal de asignación.
 * Incluye datos del delivery_profile + join con profiles (nombre, avatar).
 * ✅ full_name vive en profiles, NO en delivery_profiles
 */
export interface AvailableDelivery {
  id: string;
  phone: string;
  yape_number: string;
  vehicle_type: VehicleType;
  vehicle_plate: string | null;
  base_rate: number;
  zone_description: string | null;
  photo_url: string | null;
  available: boolean;
  is_active: boolean;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

/**
 * Obtiene lista de deliveries activos y disponibles para asignar a un pedido.
 * - is_active=true  → activado por el admin
 * - available=true  → el delivery se marcó como disponible
 * Ordenados por tarifa (más barato primero).
 *
 * ✅ FIX v13: profiles ( ... ) sin hint :id
 * Supabase detecta FK delivery_profiles.id → profiles.id automáticamente
 */
export async function getAvailableDeliveries(): Promise<AvailableDelivery[]> {
  const { data, error } = await supabase
    .from("delivery_profiles")
    .select(
      `
      id,
      phone,
      yape_number,
      vehicle_type,
      vehicle_plate,
      base_rate,
      zone_description,
      photo_url,
      available,
      is_active,
      profiles (
        full_name,
        avatar_url
      )
      `
    )
    .eq("is_active", true)
    .eq("available", true)
    .order("base_rate", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AvailableDelivery[];
}

/**
 * Asigna un delivery a un pedido vía RPC (SECURITY DEFINER).
 * La RPC crea el registro en order_assignments y sincroniza orders.delivery_id.
 */
export async function assignDeliveryToOrder(
  orderId: string,
  deliveryId: string
): Promise<void> {
  const { error } = await supabase.rpc("assign_delivery_to_order", {
    p_order_id: orderId,
    p_delivery_id: deliveryId,
  });

  if (error) throw new Error(error.message);
}