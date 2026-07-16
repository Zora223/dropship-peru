export type SeasonalEffect = "none" | "snow" | "confetti" | "hearts" | "stars";

export interface PlatformTheme {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: "brand" | "seasonal" | "commercial" | "custom";
  primary_color: string;
  secondary_color: string;
  font_family: string;
  banner_text: string;
  seasonal_effect: SeasonalEffect;
  preview_gradient: string;
  active_months?: number[]; // 1-12, meses ideales para sugerir
}

export const PLATFORM_THEMES: PlatformTheme[] = [
  // ============ BRAND ============
  {
    id: "default",
    name: "Dropship Rose",
    emoji: "🌹",
    description: "El look clásico de la marca.",
    category: "brand",
    primary_color: "#e11d48",
    secondary_color: "#1e293b",
    font_family: "Inter",
    banner_text: "",
    seasonal_effect: "none",
    preview_gradient: "from-rose-500 to-slate-800",
  },

  // ============ SEASONAL ============
  {
    id: "navidad",
    name: "Navidad",
    emoji: "🎄",
    description: "Verde bosque y rojo festivo con copos de nieve.",
    category: "seasonal",
    primary_color: "#dc2626",
    secondary_color: "#14532d",
    font_family: "Poppins",
    banner_text: "🎄 ¡Ofertas de Navidad! Envío gratis en compras +S/50",
    seasonal_effect: "snow",
    preview_gradient: "from-red-600 to-green-800",
    active_months: [11, 12],
  },
  {
    id: "año-nuevo",
    name: "Año Nuevo",
    emoji: "✨",
    description: "Dorado premium para celebrar el nuevo año.",
    category: "seasonal",
    primary_color: "#eab308",
    secondary_color: "#0f172a",
    font_family: "Montserrat",
    banner_text: "✨ Empieza el año con nuevas ofertas",
    seasonal_effect: "confetti",
    preview_gradient: "from-yellow-500 to-slate-900",
    active_months: [12, 1],
  },
  {
    id: "san-valentin",
    name: "San Valentín",
    emoji: "💝",
    description: "Rosa apasionado para el día del amor.",
    category: "seasonal",
    primary_color: "#e11d48",
    secondary_color: "#831843",
    font_family: "Poppins",
    banner_text: "💝 Regalos perfectos para tu persona especial",
    seasonal_effect: "hearts",
    preview_gradient: "from-rose-500 to-pink-900",
    active_months: [2],
  },
  {
    id: "verano",
    name: "Verano",
    emoji: "🌊",
    description: "Fresh y vibrante para la temporada de playa.",
    category: "seasonal",
    primary_color: "#0891b2",
    secondary_color: "#f97316",
    font_family: "Poppins",
    banner_text: "🌊 ¡Rebajas de verano! Hasta 40% OFF",
    seasonal_effect: "none",
    preview_gradient: "from-cyan-500 to-orange-500",
    active_months: [12, 1, 2, 3],
  },
  {
    id: "fiestas-patrias",
    name: "Fiestas Patrias",
    emoji: "🇵🇪",
    description: "Rojo y blanco para celebrar el Perú.",
    category: "seasonal",
    primary_color: "#dc2626",
    secondary_color: "#7f1d1d",
    font_family: "Montserrat",
    banner_text: "🇵🇪 ¡Viva el Perú! Ofertas de Fiestas Patrias",
    seasonal_effect: "stars",
    preview_gradient: "from-red-600 to-white",
    active_months: [7],
  },
  {
    id: "halloween",
    name: "Halloween",
    emoji: "🎃",
    description: "Naranja calabaza y morado místico.",
    category: "seasonal",
    primary_color: "#ea580c",
    secondary_color: "#581c87",
    font_family: "Inter",
    banner_text: "🎃 Truco o trato: 20% en toda la tienda",
    seasonal_effect: "none",
    preview_gradient: "from-orange-600 to-purple-900",
    active_months: [10],
  },
  {
    id: "dia-madre",
    name: "Día de la Madre",
    emoji: "🌷",
    description: "Rosa pastel y lila delicado para mamá.",
    category: "seasonal",
    primary_color: "#ec4899",
    secondary_color: "#7c3aed",
    font_family: "Poppins",
    banner_text: "🌷 Regalos únicos para la mejor mamá",
    seasonal_effect: "hearts",
    preview_gradient: "from-pink-500 to-purple-600",
    active_months: [5],
  },
  {
    id: "primavera",
    name: "Primavera",
    emoji: "🌸",
    description: "Colores frescos y vivos para la nueva estación.",
    category: "seasonal",
    primary_color: "#ec4899",
    secondary_color: "#65a30d",
    font_family: "Inter",
    banner_text: "🌸 Nueva colección primavera",
    seasonal_effect: "none",
    preview_gradient: "from-pink-500 to-lime-600",
    active_months: [9, 10, 11],
  },

  // ============ COMMERCIAL ============
  {
    id: "cyber-wow",
    name: "Cyber Wow",
    emoji: "⚡",
    description: "Neón vibrante para los días de descuento tech.",
    category: "commercial",
    primary_color: "#06b6d4",
    secondary_color: "#d946ef",
    font_family: "Montserrat",
    banner_text: "⚡ CYBER WOW: Hasta 70% OFF por tiempo limitado",
    seasonal_effect: "none",
    preview_gradient: "from-cyan-500 to-fuchsia-500",
  },
  {
    id: "black-friday",
    name: "Black Friday",
    emoji: "🖤",
    description: "Negro premium con acento amarillo.",
    category: "commercial",
    primary_color: "#facc15",
    secondary_color: "#000000",
    font_family: "Montserrat",
    banner_text: "🖤 BLACK FRIDAY: Los precios más bajos del año",
    seasonal_effect: "none",
    preview_gradient: "from-yellow-400 to-black",
    active_months: [11],
  },
];

/**
 * Sugiere temas relevantes para el mes actual.
 */
export function getSuggestedThemes(): PlatformTheme[] {
  const currentMonth = new Date().getMonth() + 1;
  return PLATFORM_THEMES.filter(
    (theme) => theme.active_months?.includes(currentMonth) ?? false
  );
}

/**
 * Obtiene un tema por ID.
 */
export function getThemeById(id: string): PlatformTheme | undefined {
  return PLATFORM_THEMES.find((theme) => theme.id === id);
}