// src/components/marketplace/StoreCard.tsx
// 🏪 v22.15 - Card de tienda para marketplace

import { Link } from "react-router-dom";
import type { MarketplaceStore } from "../../lib/marketplace";

interface Props {
  store: MarketplaceStore;
}

export default function StoreCard({ store }: Props) {
  return (
    <Link
      to={`/tienda/${store.slug}`}
      className="group flex flex-col items-center overflow-hidden rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Logo */}
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-rose-100 to-pink-100 text-3xl">
        {store.logo_url ? (
          <img
            src={store.logo_url}
            alt={store.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          "🏪"
        )}
      </div>

      {/* Nombre */}
      <h3 className="mt-3 line-clamp-1 text-sm font-bold text-gray-900 text-center">
        {store.name}
      </h3>

      {/* Stats */}
      <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
        <span>📦 {store.product_count}</span>
        {store.avg_rating > 0 && (
          <>
            <span>·</span>
            <span>⭐ {store.avg_rating.toFixed(1)}</span>
          </>
        )}
      </div>

      {/* Badge verificado */}
      <span className="mt-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
        ✓ Verificada
      </span>
    </Link>
  );
}