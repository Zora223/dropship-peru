// src/lib/color-utils.ts
// 🎨 v22.20 - Fix parsing colores + soporte legacy JSON strings

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
  café: "#78350F",
  cafe: "#78350F",
};

export interface ColorObject {
  name: string;
  hex: string;
}

function tryParseJsonColor(str: string): ColorObject | null {
  try {
    const trimmed = str.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && typeof parsed.name === "string") {
        return {
          name: parsed.name,
          hex: typeof parsed.hex === "string" ? parsed.hex : getColorHex(parsed.name),
        };
      }
    }
  } catch {
    // No es JSON válido
  }
  return null;
}

export function toColorObject(input: string | ColorObject): ColorObject {
  if (typeof input === "string") {
    const parsed = tryParseJsonColor(input);
    if (parsed) return parsed;
    const hex = COLOR_HEX_MAP[input.toLowerCase().trim()] ?? "#6B7280";
    return { name: input, hex };
  }

  if (input && typeof input === "object" && "name" in input) {
    return {
      name: input.name,
      hex: input.hex || getColorHex(input.name),
    };
  }

  return { name: "Color", hex: "#6B7280" };
}

export function normalizeColorsArray(colors: unknown): ColorObject[] {
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

export function getColorHex(name: string): string {
  return COLOR_HEX_MAP[name.toLowerCase().trim()] ?? "#6B7280";
}