// src/components/vendor/PriceSuggestionBox.tsx
// 🆕 v19 - Caja de precio sugerido con desglose para vendor
import { useEffect, useState } from "react";
import { getPlatformConfig } from "../../lib/platform-config";
import {
  calculateSuggestedPrice,
  calculateMinPrice,
  analyzePrice,
  type PriceBreakdown,
} from "../../lib/pricing";

interface Props {
  supplierCost: number;
  currentPrice: number;
  onSuggestedClick?: (price: number) => void;
}

export default function PriceSuggestionBox({
  supplierCost,
  currentPrice,
  onSuggestedClick,
}: Props) {
  const [suggested, setSuggested] = useState(0);
  const [minPrice, setMinPrice] = useState(0);
  const [analysis, setAnalysis] = useState<PriceBreakdown | null>(null);

  useEffect(() => {
    if (supplierCost <= 0) return;

    getPlatformConfig().then((config) => {
      const pricingConfig = {
        commission_pct: config.commission_pct,
        vendor_margin_pct: config.vendor_margin_pct,
        vendor_min_margin_pct: config.vendor_min_margin_pct,
        delivery_cost: config.delivery_cost_default,
      };

      setSuggested(calculateSuggestedPrice(supplierCost, pricingConfig));
      setMinPrice(calculateMinPrice(supplierCost, pricingConfig));

      if (currentPrice > 0) {
        setAnalysis(analyzePrice(currentPrice, supplierCost, pricingConfig));
      }
    });
  }, [supplierCost, currentPrice]);

  if (supplierCost <= 0) return null;

  return (
    <div className="rounded-2xl border-2 border-purple-200 bg-linear-to-br from-purple-50 to-fuchsia-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💡</span>
          <div>
            <div className="text-xs font-bold uppercase text-purple-700">
              Precio sugerido
            </div>
            <div className="text-2xl font-black text-purple-900">
              S/ {suggested}
            </div>
          </div>
        </div>
        {onSuggestedClick && (
          <button
            onClick={() => onSuggestedClick(suggested)}
            className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700"
          >
            Usar sugerido
          </button>
        )}
      </div>

      {analysis && (
        <div className="rounded-xl bg-white border border-purple-200 p-3">
          <div className="text-[10px] font-bold uppercase text-gray-500 mb-2">
            📊 Desglose de tu precio (S/ {currentPrice})
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">📦 Supplier</span>
              <span className="font-bold">S/ {analysis.supplier_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">🚚 Delivery</span>
              <span className="font-bold">S/ {analysis.delivery_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">💼 Comisión Dropship</span>
              <span className="font-bold">S/ {analysis.commission_amount.toFixed(2)}</span>
            </div>
            <hr className="my-1" />
            <div className="flex justify-between rounded-lg bg-emerald-50 px-2 py-1.5">
              <span className="font-bold text-emerald-700">💰 Tu ganancia</span>
              <span className="font-black text-emerald-700">
                S/ {analysis.vendor_earning.toFixed(2)} ({analysis.vendor_margin_pct}%)
              </span>
            </div>
          </div>

          {analysis.warning && (
            <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-800">
              {analysis.warning}
            </div>
          )}
        </div>
      )}

      <div className="mt-2 text-[10px] text-purple-700 text-center">
        Precio mínimo permitido: <b>S/ {minPrice}</b> · Envío incluido 🚚
      </div>
    </div>
  );
}