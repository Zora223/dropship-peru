// src/lib/color-utils.ts
// 🎨 v22.13 - Mapa de colores nombre → hex

export const COLOR_HEX_MAP: Record<string, string> = {
  negro: "#000000",
  blanco: "#FFFFFF",
  gris: "#9CA3AF",
  plomo: "#6B7280",
  rojo: "#EF4444",
  azul: "#3B82F6",
  celeste: "#7DD3FC",
  verde: "#22C55E",
  amarillo: "#EAB308",
  naranja: "#F97316",
  morado: "#A855F7",
  violeta: "#8B5CF6",
  rosa: "#EC4899",
  fucsia: "#D946EF",
  marrón: "#78350F",
  marron: "#78350F",
  beige: "#F5E6D3",
  crema: "#FEF3C7",
  dorado: "#D4AF37",
  plateado: "#C0C0C0",
  turquesa: "#14B8A6",
  vino: "#7F1D1D",
  mostaza: "#CA8A04",
  coral: "#FB7185",
  lila: "#C4B5FD",
  menta: "#86EFAC",
};

export interface ColorObject {
  name: string;
  hex: string;
}

/**
 * Convierte un color (string o objeto) a formato { name, hex }
 * - "Negro" → { name: "Negro", hex: "#000000" }
 * - {name:"Negro", hex:"#000"} → mismo
 */
export function toColorObject(input: string | ColorObject): ColorObject {
  if (typeof input === "string") {
    const hex = COLOR_HEX_MAP[input.toLowerCase().trim()] ?? "#6B7280";
    return { name: input, hex };
  }
  return input;
}

/**
 * Normaliza un array de colores (mezcla de strings/objetos) a Color[]
 */
export function normalizeColorsArray(
  colors: unknown
): ColorObject[] {
  if (!Array.isArray(colors)) return [];
  return colors
    .filter((c) => c !== null && c !== undefined)
    .map((c) => {
      if (typeof c === "string") return toColorObject(c);
      if (typeof c === "object" && c !== null && "name" in c) {
        return toColorObject(c as ColorObject);
      }
      return null;
    })
    .filter((c): c is ColorObject => c !== null);
}

/**
 * Obtiene solo el hex de un color
 */
export function getColorHex(name: string): string {
  return COLOR_HEX_MAP[name.toLowerCase().trim()] ?? "#6B7280";
}