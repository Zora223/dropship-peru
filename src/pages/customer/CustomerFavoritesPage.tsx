import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchMyCustomerFavorites,
  removeMyCustomerFavoriteById,
  type CustomerFavoriteWithProduct,
} from "../../lib/customer-favorites";

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default function CustomerFavoritesPage() {
  const [favorites, setFavorites] = useState<CustomerFavoriteWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "available" | "unavailable">(
    "all"
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadFavorites() {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchMyCustomerFavorites();
      setFavorites(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al cargar favoritos"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFavorites();
  }, []);

  const stats = useMemo(() => {
    const available = favorites.filter((favorite) => {
      const product = favorite.product;
      return Boolean(product?.is_active && product.store?.is_active);
    });

    const unavailable = favorites.length - available.length;

    return {
      total: favorites.length,
      available: available.length,
      unavailable,
    };
  }, [favorites]);

  const filteredFavorites = useMemo(() => {
    if (activeFilter === "all") return favorites;

    if (activeFilter === "available") {
      return favorites.filter((favorite) => {
        const product = favorite.product;
        return Boolean(product?.is_active && product.store?.is_active);
      });
    }

    return favorites.filter((favorite) => {
      const product = favorite.product;
      return !product || !product.is_active || !product.store?.is_active;
    });
  }, [favorites, activeFilter]);

  async function handleRemove(favorite: CustomerFavoriteWithProduct) {
    const productName = favorite.product?.name ?? "este producto";

    const confirmed = window.confirm(
      `¿Seguro que deseas quitar "${productName}" de tus favoritos?`
    );

    if (!confirmed) return;

    try {
      setRemovingId(favorite.id);
      setError(null);
      setSuccess(null);

      await removeMyCustomerFavoriteById(favorite.id);

      setFavorites((prev) => prev.filter((item) => item.id !== favorite.id));

      setSuccess("Producto eliminado de favoritos.");

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al quitar favorito"
      );
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-56 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-100" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-2xl bg-gray-100"
            />
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="h-80 animate-pulse rounded-3xl bg-gray-100"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Mis favoritos
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Productos que guardaste para comprar después.
          </p>
        </div>

        <button
          onClick={loadFavorites}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          Actualizar
        </button>
      </div>

      {success && (
        <div className="rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-4 text-sm text-emerald-800">
          ✅ {success}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Total favoritos
          </div>

          <div className="mt-2 text-3xl font-bold text-gray-900">
            {stats.total}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Disponibles
          </div>

          <div className="mt-2 text-3xl font-bold text-emerald-600">
            {stats.available}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            No disponibles
          </div>

          <div className="mt-2 text-3xl font-bold text-red-600">
            {stats.unavailable}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "all" as const, label: "Todos", count: stats.total },
          {
            id: "available" as const,
            label: "Disponibles",
            count: stats.available,
          },
          {
            id: "unavailable" as const,
            label: "No disponibles",
            count: stats.unavailable,
          },
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeFilter === filter.id
                ? "bg-gray-900 text-white shadow"
                : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"
            }`}
          >
            {filter.label}
            <span className="ml-2 opacity-70">{filter.count}</span>
          </button>
        ))}
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
  <div className="text-6xl">♡</div>

  <h2 className="mt-4 text-xl font-bold text-gray-900">
    Aún no tienes favoritos
  </h2>

  <p className="mt-2 text-sm text-gray-500">
    Cuando visites una tienda desde el enlace de tu vendedor, podrás guardar productos aquí.
  </p>

  <Link
    to="/"
    className="mt-6 inline-block rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
  >
    Volver al inicio
  </Link>
</div>
      ) : filteredFavorites.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
          <div className="text-5xl">🔍</div>

          <p className="mt-4 text-sm text-gray-500">
            No hay favoritos en este filtro.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFavorites.map((favorite) => {
            const product = favorite.product;
            const store = product?.store ?? null;
            const available = Boolean(product?.is_active && store?.is_active);

            if (!product) {
              return (
                <div
                  key={favorite.id}
                  className="rounded-3xl bg-white p-6 shadow-sm"
                >
                  <div className="flex h-40 items-center justify-center rounded-2xl bg-gray-50 text-5xl">
                    📦
                  </div>

                  <h2 className="mt-4 text-lg font-bold text-gray-900">
                    Producto no disponible
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Este producto fue eliminado o ya no existe.
                  </p>

                  <button
                    onClick={() => handleRemove(favorite)}
                    disabled={removingId === favorite.id}
                    className="mt-5 w-full rounded-xl bg-red-50 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                  >
                    {removingId === favorite.id
                      ? "Quitando..."
                      : "Quitar de favoritos"}
                  </button>
                </div>
              );
            }

            return (
              <div
                key={favorite.id}
                className={`group overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                  !available ? "opacity-75" : ""
                }`}
              >
                <div className="relative aspect-4/3 overflow-hidden bg-linear-to-br from-gray-100 to-gray-200">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className={`h-full w-full object-cover transition group-hover:scale-110 ${
                        !available ? "grayscale" : ""
                      }`}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl text-gray-300">
                      📦
                    </div>
                  )}

                  <button
                    onClick={() => handleRemove(favorite)}
                    disabled={removingId === favorite.id}
                    className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-lg text-rose-500 shadow-md backdrop-blur transition hover:bg-white disabled:opacity-60"
                    title="Quitar de favoritos"
                  >
                    ♥
                  </button>

                  {!available && (
                    <div className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow">
                      No disponible
                    </div>
                  )}

                  {available && product.featured && (
                    <div className="absolute left-3 top-3 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white shadow">
                      Destacado
                    </div>
                  )}
                </div>

                <div className="p-5">
                  {product.category && (
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {product.category}
                    </div>
                  )}

                  <h2 className="mt-1 line-clamp-2 text-base font-bold text-gray-900">
                    {product.name}
                  </h2>

                  {product.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                      {product.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-gray-500">S/</span>
                        <span className="text-2xl font-black text-gray-900">
                          {Number(product.price).toFixed(2)}
                        </span>
                      </div>

                      {product.compare_at_price && (
                        <div className="text-xs text-gray-400 line-through">
                          Antes {formatCurrency(product.compare_at_price)}
                        </div>
                      )}
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        product.source === "catalog"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {product.source === "catalog" ? "Catálogo" : "Propio"}
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl bg-gray-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Tienda
                    </div>

                    {store?.slug ? (
                      <Link
                        to={`/tienda/${store.slug}`}
                        className="mt-1 flex items-center gap-2 text-sm font-bold text-rose-600 hover:underline"
                      >
                        {store.logo_url ? (
                          <img
                            src={store.logo_url}
                            alt={store.name}
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <span>🏪</span>
                        )}
                        <span>{store.name}</span>
                      </Link>
                    ) : (
                      <div className="mt-1 text-sm font-bold text-gray-500">
                        Tienda no disponible
                      </div>
                    )}
                  </div>

                  <div className="mt-4 text-xs text-gray-400">
                    Guardado el {formatDate(favorite.created_at)}
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {store?.slug && available ? (
                      <Link
                        to={`/tienda/${store.slug}`}
                        className="rounded-xl bg-gray-900 px-4 py-2.5 text-center text-xs font-bold text-white transition hover:bg-gray-800"
                      >
                        Ver tienda
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="rounded-xl bg-gray-100 px-4 py-2.5 text-center text-xs font-bold text-gray-400"
                      >
                        No disponible
                      </button>
                    )}

                    <button
                      onClick={() => handleRemove(favorite)}
                      disabled={removingId === favorite.id}
                      className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                    >
                      {removingId === favorite.id ? "Quitando..." : "Quitar"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}