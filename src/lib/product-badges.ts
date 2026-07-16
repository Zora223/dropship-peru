export interface ProductBadge {
  text: string;
  bg: string;
  text_color: string;
  priority: number; // mayor = se muestra primero
}

export interface BadgeInput {
  stock: number;
  featured: boolean;
  price: number;
  compare_at_price: number | null;
  created_at: string;
}

/**
 * Devuelve todos los badges que aplican a un producto.
 * Ordenados por prioridad (el más importante primero).
 */
export function getProductBadges(p: BadgeInput): ProductBadge[] {
  const badges: ProductBadge[] = [];

  // 🔴 AGOTADO (prioridad máxima)
  if (p.stock === 0) {
    badges.push({
      text: "Agotado",
      bg: "bg-gray-900",
      text_color: "text-white",
      priority: 100,
    });
    return badges; // Si está agotado, no mostramos otros badges
  }

  // 🟠 ÚLTIMAS UNIDADES
  if (p.stock <= 5) {
    badges.push({
      text: `¡Últimas ${p.stock} ${p.stock === 1 ? "unidad" : "unidades"}!`,
      bg: "bg-orange-500",
      text_color: "text-white",
      priority: 90,
    });
  } else if (p.stock <= 10) {
    badges.push({
      text: "Pocas unidades",
      bg: "bg-amber-500",
      text_color: "text-white",
      priority: 80,
    });
  }

  // 🔥 MÁS VENDIDO (manual)
  if (p.featured) {
    badges.push({
      text: "🔥 Más vendido",
      bg: "bg-rose-500",
      text_color: "text-white",
      priority: 70,
    });
  }

  // 💸 DESCUENTO (calculado)
  if (p.compare_at_price && p.compare_at_price > p.price) {
    const discount = Math.round((1 - p.price / p.compare_at_price) * 100);
    badges.push({
      text: `-${discount}%`,
      bg: "bg-emerald-500",
      text_color: "text-white",
      priority: 60,
    });
  }

  // ✨ NUEVO (creado en últimos 7 días)
  const createdDate = new Date(p.created_at);
  const daysSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreation <= 7) {
    badges.push({
      text: "✨ Nuevo",
      bg: "bg-purple-500",
      text_color: "text-white",
      priority: 50,
    });
  }

  // Ordenar por prioridad (mayor primero)
  return badges.sort((a, b) => b.priority - a.priority);
}

/**
 * Devuelve solo el badge principal (el de mayor prioridad).
 * Útil para cards compactas.
 */
export function getPrimaryBadge(p: BadgeInput): ProductBadge | null {
  const badges = getProductBadges(p);
  return badges[0] ?? null;
}

/**
 * Indica si el producto se puede comprar.
 */
export function isPurchasable(stock: number): boolean {
  return stock > 0;
}