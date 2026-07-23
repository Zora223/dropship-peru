// src/pages/CheckoutPage.tsx
// 🆕 v19 - Sistema de descuentos gamificado + envío gratis
// Costeado con el ahorro real de delivery (S/5-20, tope S/70)
import { useCart } from "../contexts/CartContext";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import DiscountProgressBar from "../components/DiscountProgressBar";
import FreeShippingBadge from "../components/FreeShippingBadge";
import { calculateDiscount, type DiscountResult } from "../lib/discounts";

export default function CheckoutPage() {
  const { items, removeItem, updateQuantity, total, count, storeSlug } = useCart();
  const [discount, setDiscount] = useState<DiscountResult | null>(null);

  const storeName = items[0]?.storeName ?? "esta tienda";
  const backToStoreUrl = storeSlug ? `/tienda/${storeSlug}` : "/";

  useEffect(() => {
    if (count === 0) {
      setDiscount(null);
      return;
    }
    calculateDiscount(count, total).then(setDiscount);
  }, [count, total]);

  const discountAmount = discount?.discount_amount ?? 0;
  const finalTotal = Math.max(0, total - discountAmount);

  if (count === 0) {
    return (
      <div className="flex min-h-[calc(100vh-140px)] flex-col items-center justify-center bg-linear-to-br from-rose-50 via-white to-orange-50 px-6 text-center">
        <div className="text-7xl">🛍️</div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
          Tu carrito está vacío
        </h1>

        <p className="mt-3 max-w-sm text-gray-500">
          Para comprar, ingresa desde el enlace directo que te compartió tu vendedor.
        </p>

        <Link
          to="/"
          className="mt-8 rounded-full bg-gray-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-gray-800 hover:shadow-xl"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-orange-50">
      <div className="bg-linear-to-r from-rose-500 via-pink-500 to-orange-500 text-white">
        <div className="container mx-auto px-6 py-3 text-center text-sm font-medium">
          ✨ Estás comprando en {storeName}
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <Link
            to={backToStoreUrl}
            className="text-sm font-semibold text-gray-500 hover:text-gray-900"
          >
            ← Volver a la tienda
          </Link>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">
            Casi listo 🎉
          </h1>

          <p className="mt-2 text-gray-500">
            Revisa tu pedido antes de confirmar.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {/* Barra gamificada de descuentos */}
            <DiscountProgressBar
              itemCount={count}
              subtotal={total}
              onDiscountChange={setDiscount}
            />

            {items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-4 rounded-2xl border border-white bg-white/80 p-4 shadow-sm backdrop-blur transition hover:shadow-lg"
              >
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-gray-100 to-gray-200 text-3xl">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "📦"
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="truncate text-base font-semibold text-gray-900">
                      {item.name}
                    </h3>
                    <FreeShippingBadge size="sm" />
                  </div>

                  <p className="mt-0.5 text-sm text-gray-500">
                    S/ {item.price.toFixed(2)} por unidad
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity - 1)
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                    >
                      −
                    </button>

                    <span className="w-6 text-center text-sm font-semibold tabular-nums">
                      {item.quantity}
                    </span>

                    <button
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity + 1)
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                    >
                      +
                    </button>

                    <button
                      onClick={() => removeItem(item.productId)}
                      className="ml-3 text-xs font-medium text-gray-400 transition hover:text-red-500"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-base font-bold text-gray-900">
                    S/ {(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/60 p-4 text-center backdrop-blur">
                <div className="text-2xl">🚚</div>
                <div className="mt-1 text-xs font-semibold text-gray-700">
                  Envío GRATIS
                </div>
              </div>

              <div className="rounded-2xl bg-white/60 p-4 text-center backdrop-blur">
                <div className="text-2xl">🔒</div>
                <div className="mt-1 text-xs font-semibold text-gray-700">
                  Compra protegida
                </div>
              </div>

              <div className="rounded-2xl bg-white/60 p-4 text-center backdrop-blur">
                <div className="text-2xl">🏪</div>
                <div className="mt-1 text-xs font-semibold text-gray-700">
                  Tienda verificada
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 overflow-hidden rounded-3xl bg-white shadow-xl">
              <div className="bg-linear-to-br from-gray-900 to-gray-800 px-6 py-5 text-white">
                <h2 className="text-lg font-bold">Tu resumen</h2>

                <p className="text-xs text-gray-300">
                  {count} {count === 1 ? "producto" : "productos"} en el carrito
                </p>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold tabular-nums text-gray-900">
                      S/ {total.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Envío</span>
                    <span className="font-semibold text-emerald-600">
                      🚚 GRATIS
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">IGV</span>
                    <span className="font-semibold text-gray-900">Incluido</span>
                  </div>

                  {/* Descuento aplicado */}
                  {discountAmount > 0 && discount?.current_tier && (
                    <div className="flex justify-between text-sm rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
                      <span className="font-bold text-emerald-700">
                        {discount.current_tier.tier_emoji} Dscto {discount.current_tier.tier_label}
                      </span>
                      <span className="font-black tabular-nums text-emerald-700">
                        -S/ {discountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="my-5 border-t border-dashed border-gray-200" />

                <div className="flex items-baseline justify-between">
                  <span className="text-base font-bold text-gray-900">
                    Total a pagar
                  </span>

                  <div className="text-right">
                    {/* Precio tachado si hay descuento */}
                    {discountAmount > 0 && (
                      <div className="text-sm line-through text-gray-400 tabular-nums">
                        S/ {total.toFixed(2)}
                      </div>
                    )}
                    <div className="text-3xl font-extrabold tabular-nums text-gray-900">
                      S/ {finalTotal.toFixed(2)}
                    </div>
                    {discountAmount > 0 && (
                      <div className="mt-0.5 text-[10px] font-bold text-emerald-600">
                        ¡Ahorras S/ {discountAmount.toFixed(2)}! 🎉
                      </div>
                    )}
                  </div>
                </div>

                <Link
                  to="/payment"
                  className="mt-6 block w-full rounded-full bg-linear-to-r from-rose-500 to-orange-500 py-4 text-center text-sm font-bold text-white shadow-lg transition hover:from-rose-600 hover:to-orange-600 hover:shadow-xl active:scale-[0.98]"
                >
                  Confirmar y pagar →
                </Link>

                <Link
                  to={backToStoreUrl}
                  className="mt-3 block text-center text-xs font-semibold text-gray-400 hover:text-gray-700"
                >
                  Seguir comprando en esta tienda
                </Link>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                  <span>🔒</span>
                  <span>Compra protegida por Dropship Perú</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}