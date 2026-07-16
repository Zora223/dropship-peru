// src/lib/order-tracking.ts
// Tracking público de pedidos - FASE 4A
// Cualquiera con el order_number puede ver el estado del pedido

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

export interface OrderTrackingData {
  // Orden
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  subtotal: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: DbShippingAddress;
  items: DbOrderItem[];
  payment_method: PaymentMethodType;
  notes: string | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;

  // Delivery
  delivery_id: string | null;
  delivery_status: string | null;
  delivery_assigned_at: string | null;
  delivery_delivered_at: string | null;

  // Relaciones
  store: OrderTrackingStore | null;
  delivery: OrderTrackingDelivery | null;
}

// ============================================
// 📥 QUERIES
// ============================================

/**
 * Obtiene la información pública de tracking de un pedido por su order_number.
 * Funciona para invitados y registrados (RLS ya permite customer_id IS NULL).
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

  // 3️⃣ Aplanar el store
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
    shipping_address: order.shipping_address as DbShippingAddress,
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
    store,
    delivery,
  };
}

// ============================================
// 🎨 HELPERS UI
// ============================================

/**
 * Devuelve el paso actual del tracking (0-3) para el timeline visual
 */
export function getTrackingStep(data: OrderTrackingData): number {
  // 0 = Pedido registrado
  // 1 = Delivery asignado
  // 2 = En camino (picked_up)
  // 3 = Entregado

  if (
    data.status === "delivered" ||
    data.delivery_status === "delivered"
  ) {
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