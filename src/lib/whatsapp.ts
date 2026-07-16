// src/lib/whatsapp.ts
// Utilidades centralizadas para WhatsApp (wa.me) - FASE 5A
// Cuando pasemos a FASE 5B (API propia), solo cambiamos la implementación de openWhatsApp

// ============================================
// 🔢 NORMALIZACIÓN DE NÚMEROS
// ============================================

/**
 * Normaliza un teléfono peruano al formato internacional 51XXXXXXXXX.
 * Acepta: "928807560", "+51 928 807 560", "51928807560", etc.
 * Retorna solo dígitos con prefijo 51.
 */
export function normalizePeruPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;

  const digits = phone.replace(/\D/g, "");

  if (digits.length === 0) return null;

  // Si ya empieza con 51 y tiene 11 dígitos → OK
  if (digits.startsWith("51") && digits.length === 11) return digits;

  // Si tiene 9 dígitos (celular peruano estándar) → agregar 51
  if (digits.length === 9) return `51${digits}`;

  // Si tiene menos de 9 dígitos → inválido
  if (digits.length < 9) return null;

  // Cualquier otro caso: devolver tal cual (ya con prefijo país)
  return digits;
}

/**
 * ¿El teléfono es válido para WhatsApp?
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  return normalizePeruPhone(phone) !== null;
}

// ============================================
// 🔗 CONSTRUCTOR DE URL wa.me
// ============================================

/**
 * Construye una URL wa.me válida.
 * Retorna null si el teléfono no es válido.
 */
export function buildWhatsappUrl(
  phone: string | null | undefined,
  message: string
): string | null {
  const normalized = normalizePeruPhone(phone);
  if (!normalized) return null;

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/**
 * Abre WhatsApp en nueva pestaña.
 * Retorna false si no se pudo abrir (teléfono inválido).
 */
export function openWhatsapp(
  phone: string | null | undefined,
  message: string
): boolean {
  const url = buildWhatsappUrl(phone, message);
  if (!url) return false;

  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

// ============================================
// 📝 TEMPLATES DE MENSAJES
// ============================================

/**
 * Datos de contexto que usan los templates
 */
export interface OrderContext {
  orderNumber: string;
  total: number;
  customerName: string;
  storeName?: string | null;
}

export interface DeliveryContext {
  deliveryName: string;
  vehicleType?: string | null;
  address?: string | null;
  reference?: string | null;
}

/**
 * 🛵 Vendor → Delivery: "Te asigné un pedido"
 */
export function msgVendorToDelivery(
  order: OrderContext,
  delivery: DeliveryContext
): string {
  return [
    `¡Hola ${delivery.deliveryName}! 🛵`,
    ``,
    `Te asigné un nuevo pedido:`,
    ``,
    `📦 *Pedido:* ${order.orderNumber}`,
    `💰 *Total:* S/ ${order.total.toFixed(2)}`,
    `👤 *Cliente:* ${order.customerName}`,
    delivery.address ? `📍 *Dirección:* ${delivery.address}` : "",
    delivery.reference ? `💡 *Referencia:* ${delivery.reference}` : "",
    ``,
    `Ingresa a tu app para ver todos los detalles:`,
    `${window.location.origin}/delivery/orders`,
    ``,
    `¡Éxitos con la entrega! 🚀`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * 🛵 Delivery → Cliente: "Ya recogí tu pedido, voy en camino"
 */
export function msgDeliveryPickedUp(order: OrderContext): string {
  return [
    `¡Hola ${order.customerName}! 👋`,
    ``,
    `Soy tu delivery del pedido *${order.orderNumber}* 🛵`,
    ``,
    `✅ Ya recogí tu pedido y voy en camino a entregártelo.`,
    ``,
    `Cualquier duda, contáctame por aquí. ¡Nos vemos pronto!`,
  ].join("\n");
}

/**
 * 🛵 Delivery → Cliente: "¡Entregado! Gracias"
 */
export function msgDeliveryCompleted(order: OrderContext): string {
  return [
    `¡Hola ${order.customerName}! 🎉`,
    ``,
    `Tu pedido *${order.orderNumber}* fue entregado con éxito ✅`,
    ``,
    `Gracias por confiar en ${order.storeName ?? "nosotros"} 💜`,
    ``,
    `Si te gustó nuestro servicio, no olvides dejar tu reseña 🌟`,
  ].join("\n");
}

/**
 * 🛵 Delivery → Vendor/Tienda: "Estoy en camino a recoger"
 */
export function msgDeliveryToStore(order: OrderContext): string {
  return [
    `Hola 👋`,
    ``,
    `Soy el delivery asignado al pedido *${order.orderNumber}* 🛵`,
    `Estoy en camino a la tienda para recogerlo.`,
    ``,
    `¡Nos vemos en unos minutos!`,
  ].join("\n");
}

/**
 * 🛵 Delivery → Cliente: contacto genérico
 */
export function msgDeliveryContact(order: OrderContext): string {
  return `Hola ${order.customerName}, soy tu delivery con el pedido *${order.orderNumber}* 🛵`;
}