// src/components/ProductDetailModal.tsx
import { useState, useEffect } from "react";
import FreeShippingBadge from "./FreeShippingBadge";
import { ProductRatingBadge } from "./reviews/ProductRatingBadge";
import { isPurchasable } from "../lib/product-badges";
import type { PublicStoreProduct } from "../lib/public-store";

interface Color {
  name: string;
  hex: string;
  stock?: number;
}

interface ProductDetailModalProps {
  product: PublicStoreProduct;
  onClose: () => void;
  onAddToCart: (product: PublicStoreProduct, quantity: number, selectedColor: string | null) => void;
  onOpenReviews: (product: PublicStoreProduct) => void;
  onToggleFavorite: (productId: string) => void;
  isFavorite: boolean;
  favoriteBusy: boolean;
  themeColor: string;
  themeSecondaryColor: string;
}

function normalizeImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((img): img is string => typeof img === "string");
  }
  return [];
}

function normalizeColors(colors: unknown): Color[] {
  if (!Array.isArray(colors)) return [];
  return colors.filter((c: any) => c && typeof c === "object" && c.name);
}

export default function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  onOpenReviews,
  onToggleFavorite,
  isFavorite,
  favoriteBusy,
  themeColor,
  themeSecondaryColor,
}: ProductDetailModalProps) {
  const images = normalizeImages(product.images);
  const colors = normalizeColors((product as any).colors);
  const canBuy = isPurchasable(product.real_stock);
  const avgRating = product.avg_rating || 0;
  const reviewCount = product.review_count || 0;

  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(
    colors.length > 0 ? colors[0].name : null
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleAdd = () => {
    if (!canBuy) return;
    onAddToCart(product, quantity, selectedColor);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description ?? "",
          url,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(url);
      alert("¡Enlace copiado!");
    }
  };

  const nextImage = () => {
    setCurrentImageIdx((prev) => (prev + 1) % Math.max(images.length, 1));
  };

  const prevImage = () => {
    setCurrentImageIdx((prev) => (prev - 1 + Math.max(images.length, 1)) % Math.max(images.length, 1));
  };

  const discountPct = product.compare_at_price
    ? Math.round(
        ((Number(product.compare_at_price) - Number(product.price)) /
          Number(product.compare_at_price)) *
          100
      )
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-5xl max-h-[95vh] sm:max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <button
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-2xl text-gray-700 shadow-lg backdrop-blur transition hover:bg-white hover:scale-110"
          aria-label="Cerrar"
        >
          ×
        </button>

        <div className="grid gap-0 md:grid-cols-2">
          {/* Galería */}
          <div className="relative bg-gray-100">
            <div className="relative aspect-square overflow-hidden bg-linear-to-br from-gray-100 to-gray-200">
              {images[currentImageIdx] ? (
                <img
                  src={images[currentImageIdx]}
                  alt={`${product.name} - ${currentImageIdx + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-8xl text-gray-300">
                  📦
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur transition hover:bg-white hover:scale-110"
                  >
                    ←
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur transition hover:bg-white hover:scale-110"
                  >
                    →
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">
                    {currentImageIdx + 1} / {images.length}
                  </div>
                </>
              )}

              {discountPct > 0 && (
                <div className="absolute left-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-sm font-black text-white shadow-lg">
                  -{discountPct}%
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3 scrollbar-hide">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIdx(idx)}
                    className={`shrink-0 overflow-hidden rounded-lg transition ${
                      idx === currentImageIdx
                        ? "ring-2 ring-offset-2 ring-gray-900"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="h-16 w-16 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col p-5 sm:p-6 md:p-8">
            {product.category && (
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {product.category}
              </div>
            )}

            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
              {product.name}
            </h2>

            <div className="mt-3">
              {reviewCount > 0 ? (
                <button
                  onClick={() => onOpenReviews(product)}
                  className="inline-flex transition-opacity hover:opacity-75"
                >
                  <ProductRatingBadge
                    avgRating={avgRating}
                    reviewCount={reviewCount}
                  />
                </button>
              ) : (
                <button
                  onClick={() => onOpenReviews(product)}
                  className="text-sm text-gray-400 transition-colors hover:text-rose-500"
                >
                  ⭐ Sé el primero en opinar
                </button>
              )}
            </div>

            <div className="mt-4 flex items-baseline gap-3 flex-wrap">
              <span className="text-4xl sm:text-5xl font-black text-gray-900">
                S/ {Number(product.price).toFixed(2)}
              </span>
              {product.compare_at_price && (
                <>
                  <span className="text-xl text-gray-400 line-through">
                    S/ {Number(product.compare_at_price).toFixed(2)}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    -{discountPct}% OFF
                  </span>
                </>
              )}
            </div>

            <div className="mt-3">
              <FreeShippingBadge size="lg" />
            </div>

            <div className="mt-4 flex items-center gap-2">
              {canBuy ? (
                <>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-semibold text-emerald-700">
                    {product.real_stock} disponibles
                  </span>
                </>
              ) : (
                <>
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="text-sm font-semibold text-red-700">
                    Sin stock
                  </span>
                </>
              )}
            </div>

            {product.description && (
              <div className="mt-5 rounded-2xl bg-gray-50 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2">
                  📝 Descripción
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {colors.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">
                  🎨 Color: <span className="font-normal text-gray-600">{selectedColor}</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => {
                    const isSelected = selectedColor === color.name;
                    const hasStock = color.stock === undefined || color.stock > 0;
                    return (
                      <button
                        key={color.name}
                        onClick={() => hasStock && setSelectedColor(color.name)}
                        disabled={!hasStock}
                        className={`relative flex items-center gap-2 rounded-full border-2 px-4 py-2 transition ${
                          isSelected
                            ? "border-gray-900 bg-gray-900 text-white"
                            : hasStock
                            ? "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                            : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through"
                        }`}
                      >
                        <span
                          className="h-5 w-5 rounded-full border border-gray-300"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="text-sm font-semibold">{color.name}</span>
                        {color.stock !== undefined && color.stock <= 3 && hasStock && (
                          <span className="text-[10px] font-bold text-orange-500">
                            (últimos {color.stock})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {canBuy && (
              <div className="mt-5">
                <h3 className="text-sm font-bold text-gray-900 mb-2">
                  Cantidad
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-200 text-lg font-bold text-gray-700 transition hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-xl font-bold text-gray-900 tabular-nums">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.real_stock, q + 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-200 text-lg font-bold text-gray-700 transition hover:border-gray-900 hover:bg-gray-900 hover:text-white"
                  >
                    +
                  </button>
                  <span className="ml-2 text-xs text-gray-500">
                    Subtotal: <b className="text-gray-900">S/ {(Number(product.price) * quantity).toFixed(2)}</b>
                  </span>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={handleAdd}
                disabled={!canBuy}
                className={`flex-1 rounded-full py-4 text-base font-black shadow-lg transition active:scale-95 ${
                  !canBuy
                    ? "cursor-not-allowed bg-gray-200 text-gray-400"
                    : added
                    ? "bg-emerald-500 text-white"
                    : "text-white hover:shadow-2xl"
                }`}
                style={
                  canBuy && !added
                    ? {
                        background: `linear-gradient(135deg, ${themeColor}, ${themeSecondaryColor})`,
                      }
                    : undefined
                }
              >
                {!canBuy
                  ? "❌ Sin stock"
                  : added
                  ? "✓ Agregado al carrito"
                  : `+ Agregar al carrito`}
              </button>

              <button
                onClick={() => onToggleFavorite(product.id)}
                disabled={favoriteBusy}
                className={`flex items-center justify-center gap-2 rounded-full border-2 px-6 py-4 text-base font-bold transition hover:scale-105 disabled:opacity-60 ${
                  isFavorite
                    ? "border-rose-500 bg-rose-50 text-rose-500"
                    : "border-gray-200 bg-white text-gray-700 hover:border-rose-500 hover:text-rose-500"
                }`}
              >
                {favoriteBusy ? "…" : isFavorite ? "♥" : "♡"}
                <span className="hidden sm:inline text-sm">
                  {isFavorite ? "Guardado" : "Guardar"}
                </span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 rounded-full border-2 border-gray-200 bg-white px-6 py-4 text-base font-bold text-gray-700 transition hover:scale-105 hover:border-gray-900"
                title="Compartir"
              >
                📤
                <span className="hidden sm:inline text-sm">Compartir</span>
              </button>
            </div>

            <div className="mt-5 space-y-2 rounded-2xl border border-gray-100 bg-linear-to-br from-gray-50 to-white p-4">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-lg">🚚</span>
                <span className="text-gray-700">
                  <b>Envío GRATIS</b> a Iquitos y Lima
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-lg">🔒</span>
                <span className="text-gray-700">
                  <b>Compra protegida</b> por Dropship Perú
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-lg">🏪</span>
                <span className="text-gray-700">
                  <b>Vendedor verificado</b> ✓
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}