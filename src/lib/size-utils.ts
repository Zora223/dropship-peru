// src/lib/size-utils.ts
// 👕 v22.20 - Helper para tallas y detección de ropa/calzado

/**
 * Tallas de ropa comunes
 */
export const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

/**
 * Tallas numéricas de calzado
 */
export const SHOE_SIZES = [
  "35", "36", "37", "38", "39", "40",
  "41", "42", "43", "44", "45", "46",
];

/**
 * Tallas numéricas de ropa (opcional)
 */
export const NUMERIC_CLOTHING_SIZES = [
  "0", "2", "4", "6", "8", "10", "12", "14", "16",
  "28", "30", "32", "34", "36", "38", "40",
];

/**
 * Detecta si una categoría es de ropa o calzado
 * (para mostrar automáticamente el selector de tallas)
 */
export function isClothingCategory(category: string | null | undefined): boolean {
  if (!category) return false;

  const cat = category.toLowerCase().trim();

  const clothingKeywords = [
    "ropa", "polo", "polos", "camisa", "camisas", "blusa", "blusas",
    "vestido", "vestidos", "pantalon", "pantalones", "jean", "jeans",
    "short", "shorts", "falda", "faldas", "chompa", "chompas",
    "casaca", "casacas", "abrigo", "abrigos", "chaqueta", "chaquetas",
    "ropa interior", "pijama", "pijamas", "bikini", "traje",
    "camiseta", "camisetas", "top", "tops", "leggins", "leggings",
    "buzo", "buzos", "sudadera", "sudaderas", "hoodie", "hoodies",
    "moda", "vestimenta", "textil", "textiles",
    "dama", "mujer", "hombre", "niño", "niña", "bebé",
  ];

  const shoeKeywords = [
    "calzado", "zapato", "zapatos", "zapatilla", "zapatillas",
    "sandalia", "sandalias", "bota", "botas", "botín", "botines",
    "tacos", "tacones", "mocasin", "mocasines", "sneaker", "sneakers",
  ];

  return (
    clothingKeywords.some((kw) => cat.includes(kw)) ||
    shoeKeywords.some((kw) => cat.includes(kw))
  );
}

/**
 * Detecta si la categoría es específicamente calzado
 * (para mostrar tallas numéricas en vez de S/M/L)
 */
export function isShoeCategory(category: string | null | undefined): boolean {
  if (!category) return false;

  const cat = category.toLowerCase().trim();
  const shoeKeywords = [
    "calzado", "zapato", "zapatilla", "sandalia",
    "bota", "botín", "tacon", "mocasin", "sneaker",
  ];

  return shoeKeywords.some((kw) => cat.includes(kw));
}

/**
 * Devuelve las tallas sugeridas según la categoría
 */
export function getSuggestedSizes(category: string | null | undefined): string[] {
  if (isShoeCategory(category)) return SHOE_SIZES;
  if (isClothingCategory(category)) return CLOTHING_SIZES;
  return [];
}

/**
 * Valida si un producto necesita tallas
 */
export function needsSizes(
  category: string | null | undefined,
  hasSizes: boolean
): boolean {
  return isClothingCategory(category) || hasSizes;
}

/**
 * Normaliza array de tallas (limpia strings, elimina duplicados)
 */
export function normalizeSizes(sizes: unknown): string[] {
  if (!Array.isArray(sizes)) return [];
  return Array.from(
    new Set(
      sizes
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length > 0)
    )
  );
}