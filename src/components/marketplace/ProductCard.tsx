// src/components/marketplace/ProductCard.tsx
// 🏪 v22.15 - Card de producto para marketplace público

import { Link } from "react-router-dom";
import type { MarketplaceProduct } from "../../lib/marketplace";

interface Props {
  product: MarketplaceProduct;
}

export default function ProductCard({ product }: Props) {
  const image = product.images[0];
  const hasDiscount =
    product.compare_at_price && product.compare_at_price > product.price;
  const discountPct = hasDiscount
    ? Math.round(
        ((product.compare_at_price! - product.price) / product.compare_at_price!) * 100
      )
    : 0;

  // Link va DIRECTO a la tienda del vendedor (respeta cartera protegida)
  const linkUrl = `/tienda/${product.store.slug}?producto=${product.id}`;

  return (
    <Link
      to={linkUrl}
      className="group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Imagen */}
      <div className="relative aspect-square overflow-hidden bg-linear-to-br from-gray-100 to-gray-200">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl text-gray-300">
            📦
          </div>
        )}

        {product.featured && (
          <span className="absolute left-2 top-2 rounded-full bg-linear-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            ⭐ Destacado
          </span>
        )}

        {hasDiscount && (
          <span className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            -{discountPct}%
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        {product.category && (
          <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {product.category}
          </div>
        )}

        <h3 className="mt-0.5 line-clamp-2 text-sm font-bold text-gray-900 min-h-10">
          {product.name}
        </h3>

        {/* Precio */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-black text-gray-900">
            S/ {product.price.toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              S/ {product.compare_at_price!.toFixed(2)}
            </span>
          )}
        </div>

        {/* Rating */}
        {product.avg_rating && product.avg_rating > 0 && (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
            <span className="text-amber-400">⭐</span>
            <span className="font-semibold">{product.avg_rating.toFixed(1)}</span>
            {product.review_count! > 0 && (
              <span>({product.review_count} reseñas)</span>
            )}
          </div>
        )}

        {/* Tienda */}
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 p-2">
          {product.store.logo_url ? (
            <img
              src={product.store.logo_url}
              alt={product.store.name}
              className="h-6 w-6 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-xs">
              🏪
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-bold text-gray-900">
              {product.store.name}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}