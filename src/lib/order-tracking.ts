// src/lib/order-tracking.ts
// Tracking público de pedidos - FASE 4A
// 🔥 v17: Agregado pickup fields + pickup location
// 🆕 v20: Fix - vendor_pickup_locations usa 'street' no 'address'

import { supabase } from "./supabase";
import type {
  DbOrderItem,
  DbShippingAddress,
  OrderStatus,
  PaymentMethodType,
} from "../types/database";
import type { VehicleType } from "./delivery";

// ============================================
// 📋 TIPOS
// ============================================

export interface OrderTrackingStore {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
}

export interface OrderTrackingDelivery {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string;
  vehicle_type: VehicleType | null;
  vehicle_plate: string | null;
  photo_url: string | null;
  rating: number;
  total_deliveries: number;
}

// 🆕 v17: Ubicación de pickup
export interface OrderTrackingPickupLocation {
  id: string;
  name: string;
  address: string; // Se compone desde street en el mapper
  district: string | null;
  city: string | null;
  phone: string | null;
  reference: string | null;
  opening_hours: any | null;
}

export interface OrderTrackingData {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  subtotal: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: DbShippingAddress | null; // 🆕 v20 - puede ser null (pickup)
  items: DbOrderItem[];
  payment_method: PaymentMethodType;
  notes: string | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;

  delivery_id: string | null;
  delivery_status: string | null;
  delivery_assigned_at: string | null;
  delivery_delivered_at: string | null;

  delivery_mode: "home_delivery" | "store_pickup" | null;
  delivery_date: string | null;
  delivery_time_slot: string | null;
  pickup_location_id: string | null;
  pickup_time_slot: string | null;
  pickup_confirmation_code: string | null;
  pickup_ready_at: string | null;
  pickup_completed_at: string | null;

  store: OrderTrackingStore | null;
  delivery: OrderTrackingDelivery | null;
  pickup_location: OrderTrackingPickupLocation | null;
}

// ============================================
// 📥 QUERIES
// ============================================

/**
 * Obtiene la información pública de tracking de un pedido por su order_number.
 */
export async function fetchOrderTracking(
  orderNumber: string
): Promise<OrderTrackingData | null> {
  if (!orderNumber?.trim()) return null;

  // 1️⃣ Obtener la orden con la tienda
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      status,
      total,
      subtotal,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      items,
      payment_method,
      notes,
      tracking_number,
      created_at,
      updated_at,
      delivery_id,
      delivery_status,
      delivery_assigned_at,
      delivery_delivered_at,
      delivery_mode,
      delivery_date,
      delivery_time_slot,
      pickup_location_id,
      pickup_time_slot,
      pickup_confirmation_code,
      pickup_ready_at,
      pickup_completed_at,
      store:stores (
        id,
        name,
        slug,
        logo_url,
        whatsapp,
        instagram,
        facebook
      )
      `
    )
    .eq("order_number", orderNumber.trim())
    .maybeSingle();

  if (orderError) throw new Error(orderError.message);
  if (!order) return null;

  // 2️⃣ Si tiene delivery asignado, obtener sus datos
  let delivery: OrderTrackingDelivery | null = null;

  if (order.delivery_id) {
    const { data: deliveryData, error: deliveryError } = await supabase
      .from("delivery_profiles")
      .select(
        `
        id,
        phone,
        vehicle_type,
        vehicle_plate,
        photo_url,
        rating,
        total_deliveries,
        profiles:id (
          full_name,
          avatar_url
        )
        `
      )
      .eq("id", order.delivery_id)
      .maybeSingle();

    if (!deliveryError && deliveryData) {
      const profileData = (deliveryData as any).profiles ?? null;
      delivery = {
        id: deliveryData.id,
        full_name: profileData?.full_name ?? null,
        avatar_url: profileData?.avatar_url ?? null,
        phone: deliveryData.phone,
        vehicle_type: deliveryData.vehicle_type as VehicleType | null,
        vehicle_plate: deliveryData.vehicle_plate,
        photo_url: deliveryData.photo_url,
        rating: Number(deliveryData.rating ?? 0),
        total_deliveries: Number(deliveryData.total_deliveries ?? 0),
      };
    }
  }

  // 3️⃣ 🆕 v17: Si tiene pickup_location_id, obtener ubicación
  // 🆕 v20: FIX - la tabla usa 'street' + 'contact_phone', no 'address' ni 'phone'
  let pickup_location: OrderTrackingPickupLocation | null = null;

  if (order.pickup_location_id) {
    const { data: pickupData, error: pickupError } = await supabase
      .from("vendor_pickup_locations")
      .select(
        "id, name, street, district, city, contact_phone, reference, opening_hours"
      )
      .eq("id", order.pickup_location_id)
      .maybeSingle();

    if (!pickupError && pickupData) {
      pickup_location = {
        id: pickupData.id,
        name: pickupData.name,
        address: pickupData.street, // 🆕 v20 - mapeo street → address
        district: pickupData.district,
        city: pickupData.city,
        phone: pickupData.contact_phone, // 🆕 v20 - mapeo contact_phone → phone
        reference: pickupData.reference,
        opening_hours: pickupData.opening_hours,
      };
    } else if (pickupError) {
      console.warn("Error cargando pickup location:", pickupError);
    }
  }

  // 4️⃣ Aplanar el store
  const storeData = (order as any).store ?? null;
  const store: OrderTrackingStore | null = storeData
    ? {
        id: storeData.id,
        name: storeData.name,
        slug: storeData.slug,
        logo_url: storeData.logo_url,
        whatsapp: storeData.whatsapp,
        instagram: storeData.instagram,
        facebook: storeData.facebook,
      }
    : null;

  return {
    id: order.id,
    order_number: order.order_number,
    status: order.status as OrderStatus,
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    customer_phone: order.customer_phone,
    shipping_address: order.shipping_address as DbShippingAddress | null, // 🆕 v20
    items: (order.items as DbOrderItem[]) ?? [],
    payment_method: order.payment_method as PaymentMethodType,
    notes: order.notes,
    tracking_number: order.tracking_number,
    created_at: order.created_at,
    updated_at: order.updated_at,
    delivery_id: order.delivery_id,
    delivery_status: order.delivery_status,
    delivery_assigned_at: order.delivery_assigned_at,
    delivery_delivered_at: order.delivery_delivered_at,
    delivery_mode: order.delivery_mode as any,
    delivery_date: order.delivery_date,
    delivery_time_slot: order.delivery_time_slot,
    pickup_location_id: order.pickup_location_id,
    pickup_time_slot: order.pickup_time_slot,
    pickup_confirmation_code: order.pickup_confirmation_code,
    pickup_ready_at: order.pickup_ready_at,
    pickup_completed_at: order.pickup_completed_at,
    store,
    delivery,
    pickup_location,
  };
}

// ============================================
// 🎨 HELPERS UI
// ============================================

/**
 * Devuelve el paso actual del tracking (0-3) para el timeline visual
 */
export function getTrackingStep(data: OrderTrackingData): number {
  // 🆕 v17: Si es pickup, usa lógica diferente
  if (data.delivery_mode === "store_pickup") {
    if (data.status === "delivered" || data.pickup_completed_at) return 3;
    if (data.pickup_ready_at) return 2;
    if (data.status === "confirmed") return 1;
    return 0;
  }

  // Delivery normal
  if (data.status === "delivered" || data.delivery_status === "delivered") {
    return 3;
  }
  if (data.delivery_status === "picked_up") {
    return 2;
  }
  if (data.delivery_id || data.delivery_status === "assigned") {
    return 1;
  }
  return 0;
}

/**
 * Etiqueta visible del estado del tracking
 */
export function getTrackingLabel(data: OrderTrackingData): string {
  if (data.status === "cancelled") return "Pedido cancelado";
  if (data.status === "delivered") return "¡Entregado!";

  // 🆕 v17: Labels específicos para pickup
  if (data.delivery_mode === "store_pickup") {
    if (data.pickup_completed_at) return "¡Recogido!";
    if (data.pickup_ready_at) return "¡Listo para recoger! 🏪";
    if (data.status === "confirmed") return "Preparando tu pedido";
    return "Pedido recibido";
  }

  // Delivery normal
  if (data.delivery_status === "picked_up") return "En camino 🛵";
  if (data.delivery_status === "assigned") return "Delivery asignado";
  if (data.status === "confirmed") return "Preparando pedido";
  return "Pedido recibido";
}

/**
 * Formatea tiempo relativo (hace 5 min, hace 2 h)
 */
export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "hace un momento";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} día${days > 1 ? "s" : ""}`;
  return date.toLocaleDateString("es-PE");
}