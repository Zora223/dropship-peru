import type { CartItem } from "../contexts/CartContext";

export type CartType = "catalog" | "vendor_own" | "mixed";

/**
 * 🆕 v20 - Detecta el tipo de carrito según los items
 */
export function detectCartType(items: CartItem[]): CartType {
  const hasCatalog = items.some((item) => item.source === "catalog");
  const hasOwn = items.some((item) => item.source !== "catalog");

  if (hasCatalog && hasOwn) return "mixed";
  if (hasCatalog) return "catalog";
  return "vendor_own";
}

/**
 * 🆕 v20 - Determina quién recibe el pago según el tipo de carrito
 * - catalog → platform (Dropship)
 * - vendor_own → vendor (Vendor recibe directo)
 * - mixed → platform (Dropship redistribuye)
 */
export function getPaymentReceiver(cartType: CartType): "platform" | "vendor" {
  if (cartType === "vendor_own") return "vendor";
  return "platform";
}

/**
 * 🆕 v20 - Calcula la deuda de delivery del vendor
 * Solo aplica cuando el pago va al vendor (carrito vendor_own)
 */
export function calculateDeliveryDebt(
  cartType: CartType,
  deliveryFee: number
): number {
  if (cartType !== "vendor_own") return 0;
  return deliveryFee;
}

/**
 * 🆕 v20 - Etiqueta amigable del tipo de carrito
 */
export function getCartTypeLabel(cartType: CartType): {
  emoji: string;
  label: string;
  description: string;
} {
  switch (cartType) {
    case "catalog":
      return {
        emoji: "📦",
        label: "Productos del catálogo",
        description: "Envío gestionado por Dropship Perú",
      };
    case "vendor_own":
      return {
        emoji: "🏪",
        label: "Productos propios de la tienda",
        description: "Pago directo al vendedor",
      };
    case "mixed":
      return {
        emoji: "🎁",
        label: "Carrito mixto",
        description: "Combina catálogo + productos propios",
      };
  }
}