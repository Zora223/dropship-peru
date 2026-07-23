// src/lib/pricing.ts
// 🆕 v19 - Calculadora de precio sugerido (regla de 3)

export interface PriceBreakdown {
  supplier_cost: number;       // costo mayorista
  delivery_cost: number;       // costo delivery
  commission_amount: number;   // comisión Dropship
  vendor_earning: number;      // lo que gana el vendor
  vendor_margin_pct: number;   // margen real del vendor
  total_price: number;         // precio final al cliente
  is_valid: boolean;           // ¿cumple el margen mínimo?
  warning?: string;            // mensaje si algo está mal
}

export interface PricingConfig {
  commission_pct: number;      // 3
  vendor_margin_pct: number;   // 40
  vendor_min_margin_pct: number; // 20
  delivery_cost: number;       // 7
}

/**
 * 🧮 Calcula el PRECIO SUGERIDO usando regla de 3 inversa.
 * 
 * Fórmula: Precio = Costos / (1 - VendorMargin% - Commission%)
 * 
 * Ejemplo:
 *   supplier=50, delivery=7, vendorMargin=40%, commission=3%
 *   Precio = 57 / (1 - 0.40 - 0.03) = 57 / 0.57 = S/ 100
 */
export function calculateSuggestedPrice(
  supplierCost: number,
  config: PricingConfig
): number {
  const totalCosts = supplierCost + config.delivery_cost;
  const marginFactor = 1 - config.vendor_margin_pct / 100 - config.commission_pct / 100;

  if (marginFactor <= 0) {
    throw new Error("Configuración inválida: margen + comisión ≥ 100%");
  }

  const rawPrice = totalCosts / marginFactor;

  // Redondear al entero más cercano (mejor UX: S/ 100 vs S/ 100.03)
  return Math.round(rawPrice);
}

/**
 * 🧮 Calcula el PRECIO MÍNIMO (con margen mínimo permitido).
 * Debajo de esto, el vendor pierde dinero.
 */
export function calculateMinPrice(
  supplierCost: number,
  config: PricingConfig
): number {
  const totalCosts = supplierCost + config.delivery_cost;
  const marginFactor = 1 - config.vendor_min_margin_pct / 100 - config.commission_pct / 100;

  if (marginFactor <= 0) return totalCosts;

  return Math.ceil(totalCosts / marginFactor);
}

/**
 * 📊 Analiza un precio dado y muestra el desglose completo.
 * Útil para mostrar al vendor: "Con este precio ganas S/X"
 */
export function analyzePrice(
  totalPrice: number,
  supplierCost: number,
  config: PricingConfig
): PriceBreakdown {
  const commission_amount = (totalPrice * config.commission_pct) / 100;
  const delivery_cost = config.delivery_cost;
  const vendor_earning = totalPrice - supplierCost - delivery_cost - commission_amount;
  const vendor_margin_pct = totalPrice > 0 ? (vendor_earning / totalPrice) * 100 : 0;

  const minPrice = calculateMinPrice(supplierCost, config);
  const is_valid = totalPrice >= minPrice && vendor_earning > 0;

  let warning: string | undefined;
  if (vendor_earning < 0) {
    warning = `⚠️ PIERDES S/ ${Math.abs(vendor_earning).toFixed(2)} con este precio`;
  } else if (vendor_margin_pct < config.vendor_min_margin_pct) {
    warning = `⚠️ Margen bajo (${vendor_margin_pct.toFixed(1)}%). Mínimo recomendado: ${config.vendor_min_margin_pct}%`;
  }

  return {
    supplier_cost: supplierCost,
    delivery_cost,
    commission_amount: Number(commission_amount.toFixed(2)),
    vendor_earning: Number(vendor_earning.toFixed(2)),
    vendor_margin_pct: Number(vendor_margin_pct.toFixed(1)),
    total_price: totalPrice,
    is_valid,
    warning,
  };
}

/**
 * 🎯 Genera texto legible del desglose (para mostrar al vendor).
 */
export function breakdownToText(breakdown: PriceBreakdown): string {
  return [
    `Precio total: S/ ${breakdown.total_price.toFixed(2)}`,
    `├─ Supplier: S/ ${breakdown.supplier_cost.toFixed(2)}`,
    `├─ Delivery: S/ ${breakdown.delivery_cost.toFixed(2)}`,
    `├─ Comisión: S/ ${breakdown.commission_amount.toFixed(2)}`,
    `└─ Tú ganas: S/ ${breakdown.vendor_earning.toFixed(2)} (${breakdown.vendor_margin_pct}%)`,
  ].join("\n");
}