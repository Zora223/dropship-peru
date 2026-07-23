// src/components/DiscountProgressBar.tsx
// 🆕 v19.3 - Barra de progreso con % prominente
import { useEffect, useState } from "react";
import { calculateDiscount, type DiscountResult } from "../lib/discounts";

interface Props {
  itemCount: number;
  subtotal: number;
  onDiscountChange?: (result: DiscountResult) => void;
}

export default function DiscountProgressBar({
  itemCount,
  subtotal,
  onDiscountChange,
}: Props) {
  const [result, setResult] = useState<DiscountResult | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [prevTier, setPrevTier] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    calculateDiscount(itemCount, subtotal).then((r) => {
      if (!mounted) return;
      setResult(r);
      onDiscountChange?.(r);

      const currentTierName = r.current_tier?.tier_name ?? null;
      if (prevTier && currentTierName && currentTierName !== prevTier) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2500);
      }
      setPrevTier(currentTierName);
    });
    return () => {
      mounted = false;
    };
  }, [itemCount, subtotal]);

  if (!result || itemCount === 0) return null;

  const {
    current_tier,
    next_tier,
    discount_amount,
    discount_pct_display,
    capped,
    progress_pct,
    message,
  } = result;

  return (
    <div className="relative rounded-2xl border-2 border-purple-200 bg-linear-to-br from-purple-50 to-fuchsia-50 p-4">
      {/* Animación celebración */}
      {showCelebration && current_tier && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-purple-600/90 backdrop-blur-sm animate-in fade-in zoom-in duration-500">
          <div className="text-center text-white">
            <div className="text-5xl animate-bounce">{current_tier.tier_emoji}</div>
            <div className="mt-2 text-2xl font-black">
              ¡{current_tier.discount_pct}% DE DESCUENTO!
            </div>
            <div className="mt-1 text-sm opacity-90">
              Nivel {current_tier.tier_label} desbloqueado 🎉
            </div>
          </div>
        </div>
      )}

      {/* Tier actual con % PROMINENTE */}
      {current_tier && (
        <div className="flex items-center gap-3 mb-3">
          <div className="text-3xl">{current_tier.tier_emoji}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-purple-700">
                NIVEL {current_tier.tier_label}
              </span>
              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                DESCUENTO ACTIVO
              </span>
              {capped && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  🏆 TOPE MÁX
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600">{current_tier.tier_tagline}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-emerald-600">
              -{discount_pct_display}%
            </div>
            <div className="text-xs font-bold text-emerald-700">
              -S/ {discount_amount.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Barra de progreso al siguiente tier */}
      {next_tier && (
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-gray-700">
              {current_tier
                ? `${current_tier.tier_emoji} ${current_tier.tier_label} (${current_tier.discount_pct}%)`
                : "🎯 Inicio"}
            </span>
            <span className="font-semibold text-gray-700">
              {next_tier.tier_emoji} {next_tier.tier_label} ({next_tier.discount_pct}%)
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-linear-to-r from-purple-500 to-fuchsia-500 transition-all duration-700 ease-out"
              style={{ width: `${progress_pct}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs font-semibold text-purple-700">
            💡 {message}
          </p>
        </div>
      )}

      {/* Nivel máximo alcanzado */}
      {!next_tier && current_tier && (
        <div className="mt-2 rounded-xl bg-linear-to-r from-yellow-100 to-amber-100 p-2 text-center">
          <span className="text-sm font-bold text-amber-700">
            🏆 ¡Nivel máximo! {discount_pct_display}% de descuento aplicado
          </span>
        </div>
      )}
    </div>
  );
}