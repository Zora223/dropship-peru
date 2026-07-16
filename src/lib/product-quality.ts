// src/lib/product-quality.ts

/**
 * Sistema de score de calidad para productos
 * Score mínimo para publicar: 60
 */

export interface ProductQualityInput {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  sku?: string;
  category?: string;
  brand?: string;
  images?: string[];
  tags?: string[];
}

export interface QualityIssue {
  type: 'error' | 'warning' | 'success';
  field: string;
  message: string;
  points: number; // Puntos que suma/resta
}

export interface QualityResult {
  score: number; // 0-100
  level: 'poor' | 'fair' | 'good' | 'excellent';
  levelLabel: string;
  levelColor: string;
  levelEmoji: string;
  canPublish: boolean;
  issues: QualityIssue[];
  errorCount: number;
  warningCount: number;
  successCount: number;
}

const MIN_SCORE_TO_PUBLISH = 60;

/**
 * Detecta si el texto tiene ALL CAPS excesivo
 */
function hasExcessiveCaps(text: string): boolean {
  if (!text || text.length < 10) return false;
  const letters = text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '');
  if (letters.length < 10) return false;
  const upperCount = (letters.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length;
  return upperCount / letters.length > 0.6;
}

/**
 * Detecta caracteres spam (!!!, ####, ****, etc)
 */
function hasSpamCharacters(text: string): boolean {
  if (!text) return false;
  // 3+ signos de exclamación seguidos
  if (/!{3,}/.test(text)) return true;
  // 3+ signos de pregunta seguidos
  if (/\?{3,}/.test(text)) return true;
  // 3+ asteriscos, numerales, etc
  if (/[#*]{3,}/.test(text)) return true;
  // Palabras en MAYÚSCULA con signos ($$$, GRATIS!!!)
  if (/[A-ZÁÉÍÓÚÑ]{5,}[!$#]/.test(text)) return true;
  return false;
}

/**
 * Cuenta emojis en un texto
 */
function countEmojis(text: string): number {
  if (!text) return 0;
  // eslint-disable-next-line no-misleading-character-class
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  return (text.match(emojiRegex) || []).length;
}

/**
 * Calcula el score de calidad del producto
 */
export function calculateProductQuality(input: ProductQualityInput): QualityResult {
  const issues: QualityIssue[] = [];
  let score = 0;

  // ========== IMÁGENES (máx 30 pts) ==========
  const imageCount = input.images?.length || 0;

  if (imageCount === 0) {
    issues.push({
      type: 'error',
      field: 'images',
      message: 'Debes subir al menos 1 foto del producto',
      points: 0,
    });
  } else if (imageCount === 1) {
    score += 15;
    issues.push({
      type: 'warning',
      field: 'images',
      message: 'Recomendado: sube 3+ fotos para mejor conversión',
      points: 15,
    });
  } else if (imageCount === 2) {
    score += 22;
    issues.push({
      type: 'warning',
      field: 'images',
      message: 'Bien, pero 3+ fotos aumentan las ventas',
      points: 22,
    });
  } else {
    score += 30;
    issues.push({
      type: 'success',
      field: 'images',
      message: `Excelente: ${imageCount} fotos del producto`,
      points: 30,
    });
  }

  // ========== NOMBRE (máx 15 pts) ==========
  const name = input.name?.trim() || '';
  const nameLen = name.length;

  if (nameLen === 0) {
    issues.push({
      type: 'error',
      field: 'name',
      message: 'El nombre del producto es obligatorio',
      points: 0,
    });
  } else if (nameLen < 10) {
    score += 5;
    issues.push({
      type: 'warning',
      field: 'name',
      message: `Nombre muy corto (${nameLen}/10 mín). Sé más descriptivo.`,
      points: 5,
    });
  } else if (nameLen > 100) {
    score += 8;
    issues.push({
      type: 'warning',
      field: 'name',
      message: `Nombre muy largo (${nameLen}/100 máx). Sé más conciso.`,
      points: 8,
    });
  } else if (hasExcessiveCaps(name)) {
    score += 5;
    issues.push({
      type: 'error',
      field: 'name',
      message: 'Evita usar TODO EN MAYÚSCULAS en el nombre',
      points: 5,
    });
  } else if (hasSpamCharacters(name)) {
    score += 5;
    issues.push({
      type: 'error',
      field: 'name',
      message: 'Evita caracteres como !!! $$$ en el nombre',
      points: 5,
    });
  } else if (countEmojis(name) > 3) {
    score += 10;
    issues.push({
      type: 'warning',
      field: 'name',
      message: 'Demasiados emojis en el nombre (máx 3)',
      points: 10,
    });
  } else {
    score += 15;
    issues.push({
      type: 'success',
      field: 'name',
      message: 'Nombre del producto claro y descriptivo',
      points: 15,
    });
  }

  // ========== DESCRIPCIÓN (máx 25 pts) ==========
  const desc = input.description?.trim() || '';
  const descLen = desc.length;

  if (descLen === 0) {
    issues.push({
      type: 'error',
      field: 'description',
      message: 'La descripción es obligatoria (mín 50 caracteres)',
      points: 0,
    });
  } else if (descLen < 50) {
    score += 8;
    issues.push({
      type: 'error',
      field: 'description',
      message: `Descripción muy corta (${descLen}/50 mín). Describe materiales, medidas, beneficios.`,
      points: 8,
    });
  } else if (descLen < 150) {
    score += 18;
    issues.push({
      type: 'warning',
      field: 'description',
      message: `Buena descripción. Añade más detalles (${descLen}/150 recomendado)`,
      points: 18,
    });
  } else if (hasExcessiveCaps(desc)) {
    score += 12;
    issues.push({
      type: 'error',
      field: 'description',
      message: 'Evita usar TODO EN MAYÚSCULAS en la descripción',
      points: 12,
    });
  } else if (hasSpamCharacters(desc)) {
    score += 12;
    issues.push({
      type: 'error',
      field: 'description',
      message: 'Evita caracteres spam (!!!, $$$) en la descripción',
      points: 12,
    });
  } else {
    score += 25;
    issues.push({
      type: 'success',
      field: 'description',
      message: `Descripción completa y detallada (${descLen} caracteres)`,
      points: 25,
    });
  }

  // ========== PRECIO (máx 10 pts) ==========
  const price = Number(input.price) || 0;

  if (price <= 0) {
    issues.push({
      type: 'error',
      field: 'price',
      message: 'El precio debe ser mayor a S/ 0.00',
      points: 0,
    });
  } else if (price > 50000) {
    score += 5;
    issues.push({
      type: 'warning',
      field: 'price',
      message: 'Precio muy alto. Verifica que sea correcto.',
      points: 5,
    });
  } else {
    score += 10;
    issues.push({
      type: 'success',
      field: 'price',
      message: `Precio válido: S/ ${price.toFixed(2)}`,
      points: 10,
    });
  }

  // ========== STOCK (máx 5 pts) ==========
  const stock = Number(input.stock);

  if (isNaN(stock) || stock < 0) {
    issues.push({
      type: 'error',
      field: 'stock',
      message: 'Define el stock disponible (0 o más)',
      points: 0,
    });
  } else if (stock === 0) {
    score += 3;
    issues.push({
      type: 'warning',
      field: 'stock',
      message: 'Stock en 0. El producto no será visible para compra.',
      points: 3,
    });
  } else {
    score += 5;
    issues.push({
      type: 'success',
      field: 'stock',
      message: `Stock disponible: ${stock} unidades`,
      points: 5,
    });
  }

  // ========== CATEGORÍA (máx 10 pts) ==========
  const category = input.category?.trim() || '';

  if (!category) {
    issues.push({
      type: 'error',
      field: 'category',
      message: 'Selecciona una categoría (ayuda a que te encuentren)',
      points: 0,
    });
  } else {
    score += 10;
    issues.push({
      type: 'success',
      field: 'category',
      message: `Categoría: ${category}`,
      points: 10,
    });
  }

  // ========== SKU (máx 5 pts) ==========
  const sku = input.sku?.trim() || '';

  if (!sku) {
    score += 2;
    issues.push({
      type: 'warning',
      field: 'sku',
      message: 'Recomendado: añade un código SKU para tu control',
      points: 2,
    });
  } else {
    score += 5;
    issues.push({
      type: 'success',
      field: 'sku',
      message: `Código SKU: ${sku}`,
      points: 5,
    });
  }

  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  const successCount = issues.filter(i => i.type === 'success').length;

  // Normalizar score a 0-100 (max posible: 100)
  const finalScore = Math.min(100, Math.max(0, score));

  // Determinar nivel
  let level: QualityResult['level'];
  let levelLabel: string;
  let levelColor: string;
  let levelEmoji: string;

  if (finalScore >= 90) {
    level = 'excellent';
    levelLabel = 'Excelente';
    levelColor = 'emerald';
    levelEmoji = '🌟';
  } else if (finalScore >= 75) {
    level = 'good';
    levelLabel = 'Buena';
    levelColor = 'green';
    levelEmoji = '✅';
  } else if (finalScore >= MIN_SCORE_TO_PUBLISH) {
    level = 'fair';
    levelLabel = 'Aceptable';
    levelColor = 'yellow';
    levelEmoji = '⚠️';
  } else {
    level = 'poor';
    levelLabel = 'Insuficiente';
    levelColor = 'red';
    levelEmoji = '❌';
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
 * Categorías predefinidas para el marketplace
 */
export const PREDEFINED_CATEGORIES = [
  { value: 'ropa-mujer', label: '👗 Ropa de Mujer', emoji: '👗' },
  { value: 'ropa-hombre', label: '👔 Ropa de Hombre', emoji: '👔' },
  { value: 'ropa-nino', label: '👶 Ropa de Niños', emoji: '👶' },
  { value: 'calzado', label: '👟 Calzado', emoji: '👟' },
  { value: 'accesorios', label: '👜 Accesorios', emoji: '👜' },
  { value: 'joyeria', label: '💍 Joyería', emoji: '💍' },
  { value: 'belleza', label: '💄 Belleza', emoji: '💄' },
  { value: 'cuidado-personal', label: '🧴 Cuidado Personal', emoji: '🧴' },
  { value: 'salud', label: '💊 Salud', emoji: '💊' },
  { value: 'hogar', label: '🏠 Hogar', emoji: '🏠' },
  { value: 'cocina', label: '🍳 Cocina', emoji: '🍳' },
  { value: 'electronica', label: '📱 Electrónica', emoji: '📱' },
  { value: 'deportes', label: '⚽ Deportes', emoji: '⚽' },
  { value: 'juguetes', label: '🧸 Juguetes', emoji: '🧸' },
  { value: 'mascotas', label: '🐾 Mascotas', emoji: '🐾' },
  { value: 'comida', label: '🍔 Comida y Bebidas', emoji: '🍔' },
  { value: 'libros', label: '📚 Libros y Papelería', emoji: '📚' },
  { value: 'arte', label: '🎨 Arte y Manualidades', emoji: '🎨' },
  { value: 'jardin', label: '🌱 Jardín', emoji: '🌱' },
  { value: 'oficina', label: '💼 Oficina', emoji: '💼' },
  { value: 'otros', label: '📦 Otros', emoji: '📦' },
];

/**
 * Sanitiza el nombre para generar un SKU sugerido
 */
export function suggestSku(name: string): string {
  if (!name) return '';
  const clean = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 20);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${clean}-${random}`;
}