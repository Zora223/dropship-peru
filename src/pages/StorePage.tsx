// src/pages/StorePage.tsx
import WhatsappFloatingButton from "../components/WhatsappFloatingButton";
import FreeShippingBadge from "../components/FreeShippingBadge"; // 🆕 v19
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import {
  fetchPublicStoreBySlug,
  fetchPublicStoreProducts,
} from "../lib/public-store";
import {
  fetchMyCustomerFavorites,
  toggleMyCustomerFavorite,
} from "../lib/customer-favorites";
import { supabase } from "../lib/supabase";
import { getProductBadges, isPurchasable } from "../lib/product-badges";
import { trackPageView } from "../lib/analytics";
import type {
  DbStore,
  DbStoreTheme,
  PaymentMethodType,
} from "../types/database";
import type { PublicStoreProduct } from "../lib/public-store";

import { ProductRatingBadge } from "../components/reviews/ProductRatingBadge";
import { ReviewsModal } from "../components/reviews/ReviewsModal";

const DEFAULT_STORE_THEME: DbStoreTheme = {
  primary_color: "#e11d48",
  secondary_color: "#fb923c",
  font_family: "Inter",
  banner_text: "🚚 ENVÍO GRATIS + Descuentos hasta 20% al comprar más 🎁", // 🆕 v19
  show_banner: true,
  store_motto: "Productos seleccionados con amor",
};

const PAYMENT_LABELS: Record<PaymentMethodType, string> = {
  yape: "Yape",
  plin: "Plin",
  card: "Tarjeta",
  transfer: "Transferencia",
  cash_on_delivery: "Pago contra entrega",
};

const PAYMENT_ICONS: Record<PaymentMethodType, string> = {
  yape: "💜",
  plin: "💙",
  card: "💳",
  transfer: "🏦",
  cash_on_delivery: "📦",
};

function normalizeTheme(theme?: DbStoreTheme | null): DbStoreTheme {
  if (!theme || typeof theme !== "object") {
    return { ...DEFAULT_STORE_THEME };
  }
  return {
    ...DEFAULT_STORE_THEME,
    ...theme,
  };
}

function getWhatsappUrl(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.startsWith("51")) return `https://wa.me/${digits}`;
  if (digits.length === 9) return `https://wa.me/51${digits}`;
  return `https://wa.me/${digits}`;
}

function cleanSocialUsername(value: string) {
  return value.replace(/^@/, "").trim();
}

function normalizeImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((img): img is string => typeof img === "string");
  }
  return [];
}

interface ReviewsModalState {
  productId: string;
  productName: string;
  productImage?: string;
}

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem, count } = useCart();

  const [store, setStore] = useState<DbStore | null>(null);
  const [products, setProducts] = useState<PublicStoreProduct[]>([]);
  const [favoriteProductIds, setFavoriteProductIds] = useState<Set<string>>(
    () => new Set()
  );

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Todo");
  const [addedId, setAddedId] = useState<string | null>(null);
  const [favoriteLoadingId, setFavoriteLoadingId] = useState<string | null>(
    null
  );
  const [favoriteMessage, setFavoriteMessage] = useState<string | null>(null);
  const [reviewsModal, setReviewsModal] = useState<ReviewsModalState | null>(
    null
  );

  // ── Carga de tienda y productos ──────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      try {
        setLoading(true);
        setNotFound(false);

        const storeData = await fetchPublicStoreBySlug(slug);

        if (!storeData) {
          setNotFound(true);
          return;
        }

        setStore(storeData);

        const productsData = await fetchPublicStoreProducts(storeData.id);
        setProducts(Array.isArray(productsData) ? productsData : []);

        // Cargar favoritos solo si hay sesión activa
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            const favorites = await fetchMyCustomerFavorites();
            const productIds = Array.isArray(favorites)
              ? favorites.map((f) => f.product_id).filter(Boolean)
              : [];
            setFavoriteProductIds(new Set(productIds));
          } else {
            setFavoriteProductIds(new Set());
          }
        } catch {
          // Favoritos no críticos — continuar sin ellos
          setFavoriteProductIds(new Set());
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("[StorePage] Error al cargar tienda:", err);
        }
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  // ── Tracking de visita ───────────────────────────────────────────────────
  useEffect(() => {
    if (!store?.id) return;

    const timer = setTimeout(() => {
      trackPageView({
        storeId: store.id,
        pageType: "store",
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [store?.id]);

  // ── Categorías y filtros ─────────────────────────────────────────────────
  const categories = useMemo(() => {
    if (!Array.isArray(products)) return ["Todo"];
    return [
      "Todo",
      ...new Set(
        products
          .map((product) => product.category)
          .filter(Boolean) as string[]
      ),
    ];
  }, [products]);

  const filtered = useMemo(() => {
    if (!Array.isArray(products)) return [];
    if (activeCategory === "Todo") return products;
    return products.filter((product) => product.category === activeCategory);
  }, [products, activeCategory]);

  const theme = normalizeTheme(store?.theme);

  const enabledPaymentMethods = useMemo(() => {
    const methods = store?.payment_methods;
    if (!Array.isArray(methods)) return [];
    return methods.filter((method) => method && method.enabled);
  }, [store?.payment_methods]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAdd = (product: PublicStoreProduct) => {
    if (!isPurchasable(product.real_stock) || !store) return;
    const images = normalizeImages(product.images);
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      storeId: store.id,
      storeSlug: store.slug,
      storeName: store.name,
      source: product.source,
      catalogProductId: product.catalog_product_id,
      image: images[0] ?? null,
    });
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1000);
  };

  const handleToggleFavorite = async (productId: string) => {
    try {
      setFavoriteLoadingId(productId);
      setFavoriteMessage(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate(`/login?redirect=/tienda/${slug ?? ""}`);
        return;
      }

      const isNowFavorite = await toggleMyCustomerFavorite(productId);
      setFavoriteProductIds((prev) => {
        const next = new Set(prev);
        if (isNowFavorite) next.add(productId);
        else next.delete(productId);
        return next;
      });

      setFavoriteMessage(
        isNowFavorite
          ? "Producto agregado a favoritos."
          : "Producto eliminado de favoritos."
      );
      setTimeout(() => setFavoriteMessage(null), 2200);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo actualizar favoritos.";
      setFavoriteMessage(msg);
      setTimeout(() => setFavoriteMessage(null), 3000);
    } finally {
      setFavoriteLoadingId(null);
    }
  };

  const handleOpenReviews = (product: PublicStoreProduct) => {
    const images = normalizeImages(product.images);
    setReviewsModal({
      productId: product.id,
      productName: product.name,
      productImage: images[0],
    });
  };

  // ── Estados de carga y error ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-rose-50 via-white to-orange-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-rose-500" />
      </div>
    );
  }

  if (notFound || !store) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-rose-50 via-white to-orange-50 px-6 text-center">
        <div className="text-7xl">🏪</div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
          Tienda no encontrada
        </h1>
        <p className="mt-2 max-w-md text-gray-500">
          Esta tienda no existe o ya no está disponible.
        </p>
        <Link
          to="/"
          className="mt-8 rounded-full bg-gray-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-gray-800"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  // ── Render principal ─────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: theme.font_family,
        background: `linear-gradient(135deg, ${theme.primary_color}12 0%, #ffffff 45%, ${theme.secondary_color}14 100%)`,
      }}
    >
      {/* Banner de tienda */}
      {theme.show_banner && theme.banner_text && (
        <div
          className="text-white"
          style={{
            background: `linear-gradient(90deg, ${theme.primary_color}, ${theme.secondary_color})`,
          }}
        >
          <div className="container mx-auto px-6 py-2.5 text-center text-sm font-medium">
            {theme.banner_text}
          </div>
        </div>
      )}

      {/* Header sticky */}
      <div className="sticky top-0 z-40 border-b border-gray-200/60 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-lg shadow-md">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={store.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                "🏪"
              )}
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-gray-900">
                {store.name}
              </h1>
              <p className="text-xs text-gray-500">Vendedor verificado ✓</p>
            </div>
          </div>

          <Link
            to="/checkout"
            className="relative rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl"
            style={{
              background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
            }}
          >
            🛒 Carrito
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white shadow ring-2 ring-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Toast de favoritos */}
      {favoriteMessage && (
        <div className="fixed left-1/2 top-24 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {favoriteMessage}
        </div>
      )}

      {/* Hero de tienda */}
      <div className="container mx-auto px-6 pb-8 pt-12 text-center">
        <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
          Bienvenido a{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
            }}
          >
            {store.name}
          </span>
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
          {theme.store_motto}
        </p>

        {store.description && (
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-gray-500">
            {store.description}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {/* 🆕 v19 - Chip destacado ENVÍO GRATIS */}
          <span className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm">
            🚚 ENVÍO GRATIS incluido
          </span>
          <span className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-sm">
            🔒 Compra protegida
          </span>
          {enabledPaymentMethods.length > 0 && (
            <span className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-sm">
              💳 {enabledPaymentMethods.length} método
              {enabledPaymentMethods.length === 1 ? "" : "s"} de pago
            </span>
          )}
        </div>
      </div>

      {/* Filtro por categorías */}
      {categories.length > 1 && (
        <div className="container mx-auto px-6 pb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  activeCategory === category
                    ? "text-white shadow-md"
                    : "bg-white text-gray-600 shadow-sm hover:bg-gray-100"
                }`}
                style={
                  activeCategory === category
                    ? {
                        background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                      }
                    : undefined
                }
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid de productos */}
      <div className="container mx-auto px-6 pb-16">
        {products.length === 0 ? (
          <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
            <div className="text-6xl">📦</div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">
              Tienda en preparación
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Aún no hay productos publicados. Vuelve pronto.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => {
              const productImages = normalizeImages(product.images);
              const firstImage = productImages[0];

              const badges = getProductBadges({
                stock: product.real_stock,
                featured: product.featured,
                price: Number(product.price),
                compare_at_price: product.compare_at_price
                  ? Number(product.compare_at_price)
                  : null,
                created_at: product.created_at,
              });

              const canBuy = isPurchasable(product.real_stock);
              const isFavorite = favoriteProductIds.has(product.id);
              const favoriteBusy = favoriteLoadingId === product.id;
              const avgRating = product.avg_rating || 0;
              const reviewCount = product.review_count || 0;

              return (
                <div
                  key={product.id}
                  className={`group overflow-hidden rounded-3xl bg-white shadow-sm transition ${
                    canBuy
                      ? "hover:-translate-y-1 hover:shadow-2xl"
                      : "opacity-75"
                  }`}
                >
                  {/* Imagen */}
                  <div className="relative aspect-4/3 overflow-hidden bg-linear-to-br from-gray-100 to-gray-200">
                    {firstImage ? (
                      <img
                        src={firstImage}
                        alt={product.name}
                        className={`h-full w-full object-cover transition ${
                          canBuy ? "group-hover:scale-110" : "grayscale"
                        }`}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-5xl text-gray-300">
                        📦
                      </div>
                    )}

                    {/* Badges */}
                    <div className="absolute left-3 top-3 flex flex-col gap-1.5">
                      {badges.map((badge, index) => (
                        <span
                          key={index}
                          className={`rounded-full px-3 py-1 text-xs font-bold shadow-md ${badge.bg} ${badge.text_color}`}
                        >
                          {badge.text}
                        </span>
                      ))}
                    </div>

                    {/* Botón favorito */}
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(product.id)}
                      disabled={favoriteBusy}
                      className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-lg shadow-md backdrop-blur transition hover:scale-110 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 ${
                        isFavorite ? "text-rose-500" : "text-gray-500"
                      }`}
                      title={
                        isFavorite
                          ? "Quitar de favoritos"
                          : "Agregar a favoritos"
                      }
                    >
                      {favoriteBusy ? "…" : isFavorite ? "♥" : "♡"}
                    </button>
                  </div>

                  {/* Info del producto */}
                  <div className="p-5">
                    {product.category && (
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        {product.category}
                      </div>
                    )}

                    <h3 className="mt-1 text-base font-bold text-gray-900">
                      {product.name}
                    </h3>

                    {/* 🆕 v19 - Badge envío gratis */}
                    <div className="mt-1.5">
                      <FreeShippingBadge size="sm" />
                    </div>

                    {/* Rating */}
                    <div className="mt-1.5">
                      {reviewCount > 0 ? (
                        <button
                          onClick={() => handleOpenReviews(product)}
                          className="inline-flex transition-opacity hover:opacity-75"
                          title="Ver reseñas"
                        >
                          <ProductRatingBadge
                            avgRating={avgRating}
                            reviewCount={reviewCount}
                          />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenReviews(product)}
                          className="text-xs text-gray-400 transition-colors hover:text-rose-500"
                          title="Sé el primero en opinar"
                        >
                          ⭐ Sé el primero en opinar
                        </button>
                      )}
                    </div>

                    {product.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                        {product.description}
                      </p>
                    )}

                    {/* Precio y botón */}
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs text-gray-500">S/</span>
                          <span className="text-2xl font-extrabold text-gray-900">
                            {Number(product.price).toFixed(2)}
                          </span>
                        </div>

                        {product.compare_at_price && (
                          <div className="mt-0.5 text-xs text-gray-400 line-through">
                            Antes S/{" "}
                            {Number(product.compare_at_price).toFixed(2)}
                          </div>
                        )}

                        <div className="mt-1 text-[11px] font-medium text-gray-400">
                          Stock:{" "}
                          {product.real_stock > 0
                            ? `${product.real_stock} disponible${
                                product.real_stock === 1 ? "" : "s"
                              }`
                            : "agotado"}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAdd(product)}
                        disabled={!canBuy}
                        className={`rounded-full px-5 py-2.5 text-sm font-bold shadow-md transition active:scale-95 ${
                          !canBuy
                            ? "cursor-not-allowed bg-gray-200 text-gray-400"
                            : addedId === product.id
                            ? "bg-emerald-500 text-white"
                            : "text-white hover:shadow-lg"
                        }`}
                        style={
                          canBuy && addedId !== product.id
                            ? {
                                background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                              }
                            : undefined
                        }
                      >
                        {!canBuy
                          ? "Agotado"
                          : addedId === product.id
                          ? "✓ Agregado"
                          : "+ Agregar"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sin resultados en categoría */}
        {filtered.length === 0 && products.length > 0 && (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <div className="text-5xl">🔍</div>
            <p className="mt-4 text-sm text-gray-500">
              No hay productos en esta categoría.
            </p>
          </div>
        )}
      </div>

      {/* Footer de tienda */}
      <div className="border-t border-gray-100 bg-white/60 py-12 backdrop-blur">
        <div className="container mx-auto px-6">
          <div className="grid gap-8 text-center md:grid-cols-2">
            <div>
              <div className="text-4xl">🚚</div>
              {/* 🆕 v19 - Mensaje transparente CEO */}
              <h3 className="mt-3 text-base font-bold text-gray-900">
                Envío GRATIS a tu puerta 🎁
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Sin costos adicionales al final. El precio que ves es el precio que pagas.
              </p>
            </div>
            <div>
              <div className="text-4xl">🔒</div>
              <h3 className="mt-3 text-base font-bold text-gray-900">
                Pago seguro
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Compra con métodos de pago configurados por la tienda.
              </p>
            </div>
          </div>

          {/* Métodos de pago */}
          {enabledPaymentMethods.length > 0 && (
            <div className="mt-10 rounded-3xl bg-white p-6 text-center shadow-sm">
              <h3 className="text-base font-bold text-gray-900">
                Métodos de pago disponibles
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Esta tienda acepta los siguientes métodos de pago:
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {enabledPaymentMethods.map((method) => (
                  <span
                    key={method.id}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                    }}
                  >
                    <span>{PAYMENT_ICONS[method.id]}</span>
                    <span>{PAYMENT_LABELS[method.id]}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Redes sociales */}
          {(store.instagram || store.facebook || store.whatsapp) && (
            <div className="mt-10 text-center">
              <p className="text-sm font-semibold text-gray-600">
                Síguenos en redes
              </p>
              <div className="mt-3 flex justify-center gap-3">
                {store.instagram && (
                  <a
                    href={`https://instagram.com/${cleanSocialUsername(store.instagram)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-purple-500 to-pink-500 text-white shadow transition hover:scale-110"
                    title="Instagram"
                  >
                    📷
                  </a>
                )}
                {store.facebook && (
                  <a
                    href={`https://facebook.com/${cleanSocialUsername(store.facebook)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow transition hover:scale-110"
                    title="Facebook"
                  >
                    📘
                  </a>
                )}
                {store.whatsapp && (
                  <a
                    href={getWhatsappUrl(store.whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow transition hover:scale-110"
                    title="WhatsApp"
                  >
                    💬
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="mt-10 text-center text-xs text-gray-400">
            Tienda creada con Dropship Perú
          </div>
        </div>
      </div>

      {/* WhatsApp flotante */}
      {store.whatsapp && (
        <WhatsappFloatingButton
          phone={store.whatsapp}
          storeId={store.id}
          tooltip={`¿Consultas sobre ${store.name}?`}
          subtitle="Estamos aquí para ayudarte"
          message={`Hola! Vi tu tienda ${store.name} y quiero hacerte una consulta 🛍️`}
        />
      )}

      {/* Modal de reseñas */}
      {reviewsModal && store && (
        <ReviewsModal
          isOpen={!!reviewsModal}
          onClose={() => setReviewsModal(null)}
          productId={reviewsModal.productId}
          storeId={store.id}
          productName={reviewsModal.productName}
          productImage={reviewsModal.productImage}
        />
      )}
    </div>
  );
}