// src/lib/supplier-product-quality.ts
// 🆕 v16 FASE 3 - Calidad de productos del proveedor (MÁS ESTRICTO que vendor)

export interface SupplierProductQualityInput {
  name?: string;
  description?: string;
  base_price?: number;
  suggested_price?: number;
  stock?: number;
  sku?: string;
  category?: string;
  brand?: string;
  images?: string[];
}

export interface SupplierQualityIssue {
  type: "error" | "warning" | "success";
  field: string;
  message: string;
  points: number;
}

export interface SupplierQualityResult {
  score: number;
  level: "poor" | "fair" | "good" | "excellent";
  levelLabel: string;
  levelColor: string;
  levelEmoji: string;
  canPublish: boolean;
  issues: SupplierQualityIssue[];
  errorCount: number;
  warningCount: number;
  successCount: number;
}

// 🆕 Score mínimo MÁS ALTO que vendor (proveedor debe ser referencia de calidad)
const MIN_SCORE_TO_PUBLISH = 70; // vendor: 60

// Helpers reusados
function hasExcessiveCaps(text: string): boolean {
  if (!text || text.length < 10) return false;
  const letters = text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, "");
  if (letters.length < 10) return false;
  const upperCount = (letters.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length;
  return upperCount / letters.length > 0.6;
}

function hasSpamCharacters(text: string): boolean {
  if (!text) return false;
  if (/!{3,}/.test(text)) return true;
  if (/\?{3,}/.test(text)) return true;
  if (/[#*]{3,}/.test(text)) return true;
  if (/[A-ZÁÉÍÓÚÑ]{5,}[!$#]/.test(text)) return true;
  return false;
}

function countEmojis(text: string): number {
  if (!text) return 0;
  // eslint-disable-next-line no-misleading-character-class
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  return (text.match(emojiRegex) || []).length;
}

/**
 * Calcula el score de calidad para producto del PROVEEDOR
 * Reglas MÁS ESTRICTAS que el vendor:
 * - Fotos mín: 4 (vendor: 3)
 * - Nombre mín: 15 chars (vendor: 10)
 * - Descripción mín: 100 chars (vendor: 50)
 * - SKU OBLIGATORIO (vendor: opcional)
 * - Precio base > S/ 5
 * - Margen sugerido >= 20%
 * - Score mín para publicar: 70% (vendor: 60%)
 */
export function calculateSupplierProductQuality(
  input: SupplierProductQualityInput
): SupplierQualityResult {
  const issues: SupplierQualityIssue[] = [];
  let score = 0;

  // ========== IMÁGENES (máx 25 pts) - MÁS ESTRICTO ==========
  const imageCount = input.images?.length || 0;

  if (imageCount === 0) {
    issues.push({
      type: "error",
      field: "images",
      message: "OBLIGATORIO: Sube al menos 1 foto (recomendado: 4+)",
      points: 0,
    });
  } else if (imageCount < 2) {
    score += 8;
    issues.push({
      type: "error",
      field: "images",
      message: `Muy pocas fotos (${imageCount}/4). Mínimo 2, ideal 4+`,
      points: 8,
    });
  } else if (imageCount < 4) {
    score += 15;
    issues.push({
      type: "warning",
      field: "images",
      message: `Bien, pero necesitas ${4 - imageCount} foto(s) más para ser catálogo premium`,
      points: 15,
    });
  } else {
    score += 25;
    issues.push({
      type: "success",
      field: "images",
      message: `Excelente: ${imageCount} fotos del producto`,
      points: 25,
    });
  }

  // ========== NOMBRE (máx 15 pts) - MÁS ESTRICTO ==========
  const name = input.name?.trim() || "";
  const nameLen = name.length;

  if (nameLen === 0) {
    issues.push({
      type: "error",
      field: "name",
      message: "El nombre del producto es OBLIGATORIO",
      points: 0,
    });
  } else if (nameLen < 15) {
    score += 5;
    issues.push({
      type: "error",
      field: "name",
      message: `Nombre muy corto (${nameLen}/15 mín). Sé más descriptivo: material + tipo + características.`,
      points: 5,
    });
  } else if (nameLen > 100) {
    score += 8;
    issues.push({
      type: "warning",
      field: "name",
      message: `Nombre muy largo (${nameLen}/100 máx)`,
      points: 8,
    });
  } else if (hasExcessiveCaps(name)) {
    score += 5;
    issues.push({
      type: "error",
      field: "name",
      message: "Evita TODO EN MAYÚSCULAS en el nombre",
      points: 5,
    });
  } else if (hasSpamCharacters(name)) {
    score += 5;
    issues.push({
      type: "error",
      field: "name",
      message: "Evita caracteres como !!! $$$ en el nombre",
      points: 5,
    });
  } else if (countEmojis(name) > 2) {
    score += 10;
    issues.push({
      type: "warning",
      field: "name",
      message: "Demasiados emojis en el nombre (máx 2)",
      points: 10,
    });
  } else {
    score += 15;
    issues.push({
      type: "success",
      field: "name",
      message: "Nombre del producto claro y profesional",
      points: 15,
    });
  }

  // ========== DESCRIPCIÓN (máx 25 pts) - MÁS ESTRICTO ==========
  const desc = input.description?.trim() || "";
  const descLen = desc.length;

  if (descLen === 0) {
    issues.push({
      type: "error",
      field: "description",
      message: "OBLIGATORIA: La descripción es esencial (mín 100 caracteres)",
      points: 0,
    });
  } else if (descLen < 100) {
    score += 8;
    issues.push({
      type: "error",
      field: "description",
      message: `Descripción muy corta (${descLen}/100 mín). Incluye: material, medidas, cuidados, beneficios.`,
      points: 8,
    });
  } else if (descLen < 200) {
    score += 18;
    issues.push({
      type: "warning",
      field: "description",
      message: `Buena descripción. Añade más detalles (${descLen}/200 recomendado)`,
      points: 18,
    });
  } else if (hasExcessiveCaps(desc)) {
    score += 12;
    issues.push({
      type: "error",
      field: "description",
      message: "Evita TODO EN MAYÚSCULAS en la descripción",
      points: 12,
    });
  } else if (hasSpamCharacters(desc)) {
    score += 12;
    issues.push({
      type: "error",
      field: "description",
      message: "Evita caracteres spam (!!!, $$$) en la descripción",
      points: 12,
    });
  } else {
    score += 25;
    issues.push({
      type: "success",
      field: "description",
      message: `Descripción completa y profesional (${descLen} caracteres)`,
      points: 25,
    });
  }

  // ========== PRECIO BASE (máx 10 pts) ==========
  const basePrice = Number(input.base_price) || 0;

  if (basePrice <= 0) {
    issues.push({
      type: "error",
      field: "base_price",
      message: "El precio base es OBLIGATORIO (mayor a S/ 0.00)",
      points: 0,
    });
  } else if (basePrice < 5) {
    score += 5;
    issues.push({
      type: "warning",
      field: "base_price",
      message: `Precio base muy bajo (S/ ${basePrice}). ¿Es correcto?`,
      points: 5,
    });
  } else if (basePrice > 50000) {
    score += 5;
    issues.push({
      type: "warning",
      field: "base_price",
      message: "Precio muy alto. Verifica que sea correcto.",
      points: 5,
    });
  } else {
    score += 10;
    issues.push({
      type: "success",
      field: "base_price",
      message: `Precio base válido: S/ ${basePrice.toFixed(2)}`,
      points: 10,
    });
  }

  // ========== PRECIO SUGERIDO / MARGEN (máx 10 pts) - NUEVO ==========
  const suggestedPrice = Number(input.suggested_price) || 0;

  if (suggestedPrice <= 0) {
    issues.push({
      type: "error",
      field: "suggested_price",
      message: "El precio sugerido es OBLIGATORIO",
      points: 0,
    });
  } else if (basePrice > 0 && suggestedPrice <= basePrice) {
    issues.push({
      type: "error",
      field: "suggested_price",
      message: "El precio sugerido debe ser MAYOR al precio base",
      points: 0,
    });
  } else if (basePrice > 0) {
    const margin = ((suggestedPrice - basePrice) / basePrice) * 100;
    if (margin < 20) {
      score += 5;
      issues.push({
        type: "warning",
        field: "suggested_price",
        message: `Margen bajo (${margin.toFixed(0)}%). Se recomienda 20%+ para que el vendor gane`,
        points: 5,
      });
    } else if (margin > 200) {
      score += 7;
      issues.push({
        type: "warning",
        field: "suggested_price",
        message: `Margen muy alto (${margin.toFixed(0)}%). ¿Es realista?`,
        points: 7,
      });
    } else {
      score += 10;
      issues.push({
        type: "success",
        field: "suggested_price",
        message: `Margen atractivo: ${margin.toFixed(0)}% para el vendor`,
        points: 10,
      });
    }
  }

  // ========== STOCK (máx 5 pts) ==========
  const stock = Number(input.stock);

  if (isNaN(stock) || stock < 0) {
    issues.push({
      type: "error",
      field: "stock",
      message: "Define el stock disponible (0 o más)",
      points: 0,
    });
  } else if (stock === 0) {
    score += 2;
    issues.push({
      type: "warning",
      field: "stock",
      message: "Stock en 0. Los vendors no podrán importarlo.",
      points: 2,
    });
  } else if (stock < 10) {
    score += 4;
    issues.push({
      type: "warning",
      field: "stock",
      message: `Stock bajo (${stock}). Considera aumentarlo.`,
      points: 4,
    });
  } else {
    score += 5;
    issues.push({
      type: "success",
      field: "stock",
      message: `Stock saludable: ${stock} unidades`,
      points: 5,
    });
  }

  // ========== CATEGORÍA (máx 5 pts) ==========
  const category = input.category?.trim() || "";

  if (!category) {
    issues.push({
      type: "error",
      field: "category",
      message: "OBLIGATORIO: Selecciona una categoría",
      points: 0,
    });
  } else {
    score += 5;
    issues.push({
      type: "success",
      field: "category",
      message: `Categoría: ${category}`,
      points: 5,
    });
  }

  // ========== SKU (máx 5 pts) - AHORA OBLIGATORIO ==========
  const sku = input.sku?.trim() || "";

  if (!sku) {
    issues.push({
      type: "error",
      field: "sku",
      message: "OBLIGATORIO: Añade un código SKU único",
      points: 0,
    });
  } else if (sku.length < 4) {
    score += 2;
    issues.push({
      type: "warning",
      field: "sku",
      message: "SKU muy corto. Usa formato como PROV-001",
      points: 2,
    });
  } else {
    score += 5;
    issues.push({
      type: "success",
      field: "sku",
      message: `Código SKU: ${sku}`,
      points: 5,
    });
  }

  const errorCount = issues.filter((i) => i.type === "error").length;
  const warningCount = issues.filter((i) => i.type === "warning").length;
  const successCount = issues.filter((i) => i.type === "success").length;

  const finalScore = Math.min(100, Math.max(0, score));

  let level: SupplierQualityResult["level"];
  let levelLabel: string;
  let levelColor: string;
  let levelEmoji: string;

  if (finalScore >= 90) {
    level = "excellent";
    levelLabel = "Excelente";
    levelColor = "emerald";
    levelEmoji = "🌟";
  } else if (finalScore >= 80) {
    level = "good";
    levelLabel = "Buena";
    levelColor = "green";
    levelEmoji = "✅";
  } else if (finalScore >= MIN_SCORE_TO_PUBLISH) {
    level = "fair";
    levelLabel = "Aceptable";
    levelColor = "yellow";
    levelEmoji = "⚠️";
  } else {
    level = "poor";
    levelLabel = "Insuficiente";
    levelColor = "red";
    levelEmoji = "❌";
  }

  return {
    score: finalScore,
    level,
    levelLabel,
    levelColor,
    levelEmoji,
    canPublish: finalScore >= MIN_SCORE_TO_PUBLISH && errorCount === 0,
    issues,
    errorCount,
    warningCount,
    successCount,
  };
}

/**
 * Categorías predefinidas MAYORISTAS (para proveedor)
 */
export const SUPPLIER_CATEGORIES = [
  { value: "ropa-mujer", label: "👗 Ropa de Mujer" },
  { value: "ropa-hombre", label: "👔 Ropa de Hombre" },
  { value: "ropa-nino", label: "👶 Ropa de Niños" },
  { value: "calzado", label: "👟 Calzado" },
  { value: "accesorios", label: "👜 Accesorios" },
  { value: "joyeria", label: "💍 Joyería" },
  { value: "belleza", label: "💄 Belleza" },
  { value: "cuidado-personal", label: "🧴 Cuidado Personal" },
  { value: "salud", label: "💊 Salud" },
  { value: "hogar", label: "🏠 Hogar" },
  { value: "cocina", label: "🍳 Cocina" },
  { value: "electronica", label: "📱 Electrónica" },
  { value: "deportes", label: "⚽ Deportes" },
  { value: "juguetes", label: "🧸 Juguetes" },
  { value: "mascotas", label: "🐾 Mascotas" },
  { value: "comida", label: "🍔 Comida y Bebidas" },
  { value: "libros", label: "📚 Libros y Papelería" },
  { value: "arte", label: "🎨 Arte y Manualidades" },
  { value: "jardin", label: "🌱 Jardín" },
  { value: "oficina", label: "💼 Oficina" },
  { value: "seguridad-industrial", label: "🦺 Seguridad Industrial" },
  { value: "herramientas", label: "🔧 Herramientas" },
  { value: "automotriz", label: "🚗 Automotriz" },
  { value: "otros", label: "📦 Otros" },
];

/**
 * Sanitiza el nombre para generar un SKU sugerido
 */
export function suggestSupplierSku(name: string): string {
  if (!name) return "";
  const clean = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 15);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PROV-${clean}-${random}`;
}