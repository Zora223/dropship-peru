// src/pages/StorePage.tsx
import WhatsappFloatingButton from "../components/WhatsappFloatingButton";
import FreeShippingBadge from "../components/FreeShippingBadge";
import ProductDetailModal from "../components/ProductDetailModal"; // 🆕
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
import type { DbStore, DbStoreTheme, PaymentMethodType } from "../types/database";
import type { PublicStoreProduct } from "../lib/public-store";

import { ProductRatingBadge } from "../components/reviews/ProductRatingBadge";
import { ReviewsModal } from "../components/reviews/ReviewsModal";

const DEFAULT_STORE_THEME: DbStoreTheme = {
  primary_color: "#e11d48",
  secondary_color: "#fb923c",
  font_family: "Inter",
  banner_text: "🚚 ENVÍO GRATIS + Descuentos hasta 20% al comprar más 🎁",
  show_banner: true,
  store_motto: "Productos seleccionados con amor",
};

const PAYMENT_LABELS: Record<PaymentMethodType, string> = {
  yape: "Yape",
  plin: "Plin",
  card: "Tarjeta",
  transfer: "Transferencia",
  cash_on_delivery: "Contra entrega",
};

const PAYMENT_ICONS: Record<PaymentMethodType, string> = {
  yape: "💜", plin: "💙", card: "💳", transfer: "🏦", cash_on_delivery: "📦",
};

function normalizeTheme(theme?: DbStoreTheme | null): DbStoreTheme {
  if (!theme || typeof theme !== "object") return { ...DEFAULT_STORE_THEME };
  return { ...DEFAULT_STORE_THEME, ...theme };
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
  if (Array.isArray(images)) return images.filter((img): img is string => typeof img === "string");
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
  const [favoriteProductIds, setFavoriteProductIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Todo");
  const [addedId, setAddedId] = useState<string | null>(null);
  const [favoriteLoadingId, setFavoriteLoadingId] = useState<string | null>(null);
  const [favoriteMessage, setFavoriteMessage] = useState<string | null>(null);
  const [reviewsModal, setReviewsModal] = useState<ReviewsModalState | null>(null);

  // 🆕 Estado para el modal de detalle del producto
  const [selectedProduct, setSelectedProduct] = useState<PublicStoreProduct | null>(null);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      try {
        setLoading(true);
        setNotFound(false);
        const storeData = await fetchPublicStoreBySlug(slug);
        if (!storeData) { setNotFound(true); return; }
        setStore(storeData);
        const productsData = await fetchPublicStoreProducts(storeData.id);
        setProducts(Array.isArray(productsData) ? productsData : []);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const favorites = await fetchMyCustomerFavorites();
            const productIds = Array.isArray(favorites) ? favorites.map(f => f.product_id).filter(Boolean) : [];
            setFavoriteProductIds(new Set(productIds));
          } else {
            setFavoriteProductIds(new Set());
          }
        } catch { setFavoriteProductIds(new Set()); }
      } catch (err) {
        if (import.meta.env.DEV) console.error("[StorePage]", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  useEffect(() => {
    if (!store?.id) return;
    const timer = setTimeout(() => {
      trackPageView({ storeId: store.id, pageType: "store" });
    }, 800);
    return () => clearTimeout(timer);
  }, [store?.id]);

  const categories = useMemo(() => {
    if (!Array.isArray(products)) return ["Todo"];
    return ["Todo", ...new Set(products.map(p => p.category).filter(Boolean) as string[])];
  }, [products]);

  const filtered = useMemo(() => {
    if (!Array.isArray(products)) return [];
    if (activeCategory === "Todo") return products;
    return products.filter(p => p.category === activeCategory);
  }, [products, activeCategory]);

  const theme = normalizeTheme(store?.theme);

  const enabledPaymentMethods = useMemo(() => {
    const methods = store?.payment_methods;
    if (!Array.isArray(methods)) return [];
    return methods.filter(m => m && m.enabled);
  }, [store?.payment_methods]);

  // 🆕 handleAdd ahora acepta cantidad y color opcionales
  const handleAdd = (product: PublicStoreProduct, quantity: number = 1, selectedColor: string | null = null) => {
    if (!isPurchasable(product.real_stock) || !store) return;
    const images = normalizeImages(product.images);
    for (let i = 0; i < quantity; i++) {
      addItem({
        productId: product.id,
        name: selectedColor ? `${product.name} (${selectedColor})` : product.name,
        price: Number(product.price),
        storeId: store.id,
        storeSlug: store.slug,
        storeName: store.name,
        source: product.source,
        catalogProductId: product.catalog_product_id,
        image: images[0] ?? null,
      });
    }
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1000);
  };

  const handleToggleFavorite = async (productId: string) => {
    try {
      setFavoriteLoadingId(productId);
      setFavoriteMessage(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate(`/login?redirect=/tienda/${slug ?? ""}`); return; }
      const isNowFavorite = await toggleMyCustomerFavorite(productId);
      setFavoriteProductIds(prev => {
        const next = new Set(prev);
        if (isNowFavorite) next.add(productId); else next.delete(productId);
        return next;
      });
      setFavoriteMessage(isNowFavorite ? "Agregado a favoritos ❤️" : "Eliminado de favoritos");
      setTimeout(() => setFavoriteMessage(null), 2200);
    } catch (err) {
      setFavoriteMessage(err instanceof Error ? err.message : "Error");
      setTimeout(() => setFavoriteMessage(null), 3000);
    } finally {
      setFavoriteLoadingId(null);
    }
  };

  const handleOpenReviews = (product: PublicStoreProduct) => {
    const images = normalizeImages(product.images);
    setReviewsModal({ productId: product.id, productName: product.name, productImage: images[0] });
  };

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
        <div className="text-6xl sm:text-7xl">🏪</div>
        <h1 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Tienda no encontrada</h1>
        <p className="mt-2 max-w-md text-sm text-gray-500">Esta tienda no existe o ya no está disponible.</p>
        <Link to="/" className="mt-8 rounded-full bg-gray-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-gray-800">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: theme.font_family,
        background: `linear-gradient(135deg, ${theme.primary_color}12 0%, #ffffff 45%, ${theme.secondary_color}14 100%)`,
      }}
    >
      {/* Banner */}
      {theme.show_banner && theme.banner_text && (
        <div className="text-white" style={{ background: `linear-gradient(90deg, ${theme.primary_color}, ${theme.secondary_color})` }}>
          <div className="container mx-auto px-4 py-2 text-center text-xs sm:text-sm font-medium">
            {theme.banner_text}
          </div>
        </div>
      )}

      {/* Header sticky */}
      <div className="sticky top-0 z-40 border-b border-gray-200/60 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-lg shadow-md">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
              ) : "🏪"}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-gray-900 truncate">{store.name}</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Vendedor verificado ✓</p>
            </div>
          </div>

          <Link
            to="/checkout"
            className="relative rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg transition hover:shadow-xl shrink-0"
            style={{ background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})` }}
          >
            🛒 <span className="hidden sm:inline">Carrito</span>
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white shadow ring-2 ring-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Toast favoritos */}
      {favoriteMessage && (
        <div className="fixed left-1/2 top-20 sm:top-24 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-xl">
          {favoriteMessage}
        </div>
      )}

      {/* Hero */}
      <div className="container mx-auto px-4 pb-6 sm:pb-8 pt-8 sm:pt-12 text-center">
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
          Bienvenido a{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})` }}
          >
            {store.name}
          </span>
        </h2>
        <p className="mx-auto mt-3 sm:mt-4 max-w-xl text-sm sm:text-lg text-gray-600 px-2">{theme.store_motto}</p>

        {store.description && (
          <p className="mx-auto mt-2 sm:mt-3 max-w-2xl text-xs sm:text-sm leading-relaxed text-gray-500 px-2">
            {store.description}
          </p>
        )}

        <div className="mt-4 sm:mt-6 flex flex-wrap justify-center gap-2 sm:gap-3 px-2">
          <span className="rounded-full bg-emerald-500 px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold text-white shadow-sm">
            🚚 ENVÍO GRATIS
          </span>
          <span className="rounded-full bg-white px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-gray-700 shadow-sm">
            🔒 Compra protegida
          </span>
          {enabledPaymentMethods.length > 0 && (
            <span className="rounded-full bg-white px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-gray-700 shadow-sm">
              💳 {enabledPaymentMethods.length} método{enabledPaymentMethods.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      {/* Categorías */}
      {categories.length > 1 && (
        <div className="container mx-auto px-4 pb-6 sm:pb-8">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`shrink-0 rounded-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold transition ${
                  activeCategory === category ? "text-white shadow-md" : "bg-white text-gray-600 shadow-sm hover:bg-gray-100"
                }`}
                style={activeCategory === category ? {
                  background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                } : undefined}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GRID DE PRODUCTOS */}
      <div className="container mx-auto px-4 pb-12 sm:pb-16">
        {products.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 sm:p-16 text-center shadow-sm">
            <div className="text-5xl sm:text-6xl">📦</div>
            <h2 className="mt-4 text-lg sm:text-xl font-bold text-gray-900">Tienda en preparación</h2>
            <p className="mt-2 text-sm text-gray-500">Aún no hay productos publicados. Vuelve pronto.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 md:grid-cols-3">
            {filtered.map((product) => {
              const productImages = normalizeImages(product.images);
              const firstImage = productImages[0];
              const badges = getProductBadges({
                stock: product.real_stock,
                featured: product.featured,
                price: Number(product.price),
                compare_at_price: product.compare_at_price ? Number(product.compare_at_price) : null,
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
                  className={`group overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-sm transition cursor-pointer ${
                    canBuy ? "hover:-translate-y-1 hover:shadow-2xl" : "opacity-75"
                  }`}
                  onClick={() => setSelectedProduct(product)} // 🆕 Click abre modal
                >
                  {/* Imagen */}
                  <div className="relative aspect-square sm:aspect-4/3 overflow-hidden bg-linear-to-br from-gray-100 to-gray-200">
                    {firstImage ? (
                      <img
                        src={firstImage}
                        alt={product.name}
                        className={`h-full w-full object-cover transition ${canBuy ? "group-hover:scale-110" : "grayscale"}`}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl sm:text-5xl text-gray-300">📦</div>
                    )}

                    {/* Badges */}
                    <div className="absolute left-2 top-2 sm:left-3 sm:top-3 flex flex-col gap-1">
                      {badges.slice(0, 2).map((badge, index) => (
                        <span
                          key={index}
                          className={`rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-xs font-bold shadow-md ${badge.bg} ${badge.text_color}`}
                        >
                          {badge.text}
                        </span>
                      ))}
                    </div>

                    {/* Favorito — con stopPropagation para no abrir el modal */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(product.id);
                      }}
                      disabled={favoriteBusy}
                      className={`absolute right-2 top-2 sm:right-3 sm:top-3 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/90 text-base sm:text-lg shadow-md backdrop-blur transition hover:scale-110 hover:bg-white disabled:opacity-60 ${
                        isFavorite ? "text-rose-500" : "text-gray-500"
                      }`}
                    >
                      {favoriteBusy ? "…" : isFavorite ? "♥" : "♡"}
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-3 sm:p-4 md:p-5">
                    {product.category && (
                      <div className="text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-gray-400 truncate">
                        {product.category}
                      </div>
                    )}

                    <h3 className="mt-1 text-xs sm:text-base font-bold text-gray-900 line-clamp-2">
                      {product.name}
                    </h3>

                    <div className="mt-1 sm:mt-1.5 hidden sm:block">
                      <FreeShippingBadge size="sm" />
                    </div>

                    <div className="mt-1 sm:mt-1.5">
                      {reviewCount > 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenReviews(product);
                          }}
                          className="inline-flex transition-opacity hover:opacity-75"
                        >
                          <ProductRatingBadge avgRating={avgRating} reviewCount={reviewCount} />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenReviews(product);
                          }}
                          className="text-[10px] sm:text-xs text-gray-400 transition-colors hover:text-rose-500"
                        >
                          ⭐ Sé el primero
                        </button>
                      )}
                    </div>

                    {product.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500 hidden sm:block">
                        {product.description}
                      </p>
                    )}

                    <div className="mt-2 sm:mt-3 flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] sm:text-xs text-gray-500">S/</span>
                          <span className="text-base sm:text-xl md:text-2xl font-extrabold text-gray-900">
                            {Number(product.price).toFixed(2)}
                          </span>
                        </div>

                        {product.compare_at_price && (
                          <div className="mt-0.5 text-[10px] sm:text-xs text-gray-400 line-through">
                            S/ {Number(product.compare_at_price).toFixed(2)}
                          </div>
                        )}

                        <div className="mt-1 text-[9px] sm:text-[11px] font-medium text-gray-400 truncate">
                          {product.real_stock > 0 ? `${product.real_stock} disp.` : "agotado"}
                        </div>
                      </div>

                      {/* Botón agregar — con stopPropagation */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdd(product);
                        }}
                        disabled={!canBuy}
                        className={`shrink-0 rounded-full px-3 sm:px-5 py-2 sm:py-2.5 text-[11px] sm:text-sm font-bold shadow-md transition active:scale-95 ${
                          !canBuy
                            ? "cursor-not-allowed bg-gray-200 text-gray-400"
                            : addedId === product.id
                            ? "bg-emerald-500 text-white"
                            : "text-white hover:shadow-lg"
                        }`}
                        style={canBuy && addedId !== product.id ? {
                          background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                        } : undefined}
                      >
                        {!canBuy ? "❌" : addedId === product.id ? "✓" : "+ Agregar"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && products.length > 0 && (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">🔍</div>
            <p className="mt-4 text-sm text-gray-500">No hay productos en esta categoría.</p>
          </div>
        )}
      </div>

      {/* Footer tienda */}
      <div className="border-t border-gray-100 bg-white/60 py-8 sm:py-12 backdrop-blur">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 sm:gap-8 text-center md:grid-cols-2">
            <div>
              <div className="text-3xl sm:text-4xl">🚚</div>
              <h3 className="mt-3 text-sm sm:text-base font-bold text-gray-900">Envío GRATIS 🎁</h3>
              <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-xs mx-auto">
                Sin costos adicionales al final. El precio que ves es el que pagas.
              </p>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl">🔒</div>
              <h3 className="mt-3 text-sm sm:text-base font-bold text-gray-900">Pago seguro</h3>
              <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-xs mx-auto">
                Compra con métodos de pago configurados por la tienda.
              </p>
            </div>
          </div>

          {enabledPaymentMethods.length > 0 && (
            <div className="mt-8 sm:mt-10 rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 text-center shadow-sm">
              <h3 className="text-sm sm:text-base font-bold text-gray-900">Métodos de pago disponibles</h3>
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:gap-3">
                {enabledPaymentMethods.map((method) => (
                  <span
                    key={method.id}
                    className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})` }}
                  >
                    <span>{PAYMENT_ICONS[method.id]}</span>
                    <span>{PAYMENT_LABELS[method.id]}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {(store.instagram || store.facebook || store.whatsapp) && (
            <div className="mt-8 sm:mt-10 text-center">
              <p className="text-xs sm:text-sm font-semibold text-gray-600">Síguenos en redes</p>
              <div className="mt-3 flex justify-center gap-3">
                {store.instagram && (
                  <a href={`https://instagram.com/${cleanSocialUsername(store.instagram)}`} target="_blank" rel="noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-purple-500 to-pink-500 text-white shadow transition hover:scale-110">
                    📷
                  </a>
                )}
                {store.facebook && (
                  <a href={`https://facebook.com/${cleanSocialUsername(store.facebook)}`} target="_blank" rel="noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow transition hover:scale-110">
                    📘
                  </a>
                )}
                {store.whatsapp && (
                  <a href={getWhatsappUrl(store.whatsapp)} target="_blank" rel="noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow transition hover:scale-110">
                    💬
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 sm:mt-10 text-center text-xs text-gray-400">
            Tienda creada con Dropship Perú 🌴
          </div>
        </div>
      </div>

      {store.whatsapp && (
        <WhatsappFloatingButton
          phone={store.whatsapp}
          storeId={store.id}
          tooltip={`¿Consultas sobre ${store.name}?`}
          subtitle="Estamos aquí para ayudarte"
          message={`Hola! Vi tu tienda ${store.name} y quiero hacerte una consulta 🛍️`}
        />
      )}

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

      {/* 🆕 MODAL DE DETALLE DEL PRODUCTO */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAdd}
          onOpenReviews={handleOpenReviews}
          onToggleFavorite={handleToggleFavorite}
          isFavorite={favoriteProductIds.has(selectedProduct.id)}
          favoriteBusy={favoriteLoadingId === selectedProduct.id}
          themeColor={theme.primary_color}
          themeSecondaryColor={theme.secondary_color}
        />
      )}
    </div>
  );
}