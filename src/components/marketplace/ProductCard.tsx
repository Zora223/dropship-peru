// src/components/marketplace/ProductCard.tsx
// 🎨 v22.16 - Diseño limpio + badge "disponible en X tiendas"

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

  const linkUrl = `/tienda/${product.store.slug}?producto=${product.id}`;
  const isFromCatalog = (product.stores_count ?? 1) > 1;

  return (
    <Link
      to={linkUrl}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md"
    >
      {/* Imagen — más compacta */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-gray-300">
            📦
          </div>
        )}

        {/* Badges superpuestos */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.featured && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
              ⭐ Destacado
            </span>
          )}
          {hasDiscount && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
              -{discountPct}%
            </span>
          )}
        </div>
      </div>

      {/* Info compacta */}
      <div className="flex flex-1 flex-col p-3">
        {product.category && (
          <div className="truncate text-[9px] font-semibold uppercase tracking-wider text-gray-400">
            {product.category}
          </div>
        )}

        <h3 className="mt-0.5 line-clamp-2 text-xs font-semibold text-gray-800 min-h-8 leading-tight">
          {product.name}
        </h3>

        {/* Precio */}
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-base font-black text-gray-900">
            S/ {product.price.toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-[10px] text-gray-400 line-through">
              S/ {product.compare_at_price!.toFixed(2)}
            </span>
          )}
        </div>

        {/* Rating pequeño */}
        {product.avg_rating && product.avg_rating > 0 && (
          <div className="mt-1 flex items-center gap-0.5 text-[10px] text-gray-500">
            <span className="text-amber-400">⭐</span>
            <span className="font-semibold">{product.avg_rating.toFixed(1)}</span>
            {product.review_count! > 0 && (
              <span className="text-gray-400">({product.review_count})</span>
            )}
          </div>
        )}

        {/* Info tienda o "disponible en X tiendas" */}
        <div className="mt-auto pt-2">
          {isFromCatalog ? (
            <div className="flex items-center justify-center gap-1 rounded-lg bg-emerald-50 py-1.5 text-[10px] font-semibold text-emerald-700">
              <span>🏪</span>
              <span>Disponible en {product.stores_count} tiendas</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2 py-1.5">
              {product.store.logo_url ? (
                <img
                  src={product.store.logo_url}
                  alt={product.store.name}
                  className="h-4 w-4 shrink-0 rounded object-cover"
                />
              ) : (
                <span className="text-[10px]">🏪</span>
              )}
              <span className="truncate text-[10px] font-semibold text-gray-700">
                {product.store.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}