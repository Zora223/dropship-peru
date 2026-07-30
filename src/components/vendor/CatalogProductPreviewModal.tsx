import { useState } from "react";
import type { CatalogProductWithSupplier } from "../../lib/catalog";

interface Props {
  product: CatalogProductWithSupplier | null;
  isImported: boolean;
  onClose: () => void;
  onImport: (product: CatalogProductWithSupplier) => void;
}

function normalizeImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((img): img is string => typeof img === "string");
  }
  return [];
}

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

export default function CatalogProductPreviewModal({
  product,
  isImported,
  onClose,
  onImport,
}: Props) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);

  if (!product) return null;

  const images = normalizeImages(product.images);
  const base = Number(product.base_price);
  const suggested = Number(product.suggested_price);
  const margin = base > 0 ? (((suggested - base) / base) * 100).toFixed(0) : "0";
  const marginAbs = suggested - base;

  const currentImage = images[selectedImageIndex] || null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header sticky */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-6 py-4 backdrop-blur">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Vista previa del producto
              </div>
              <h2 className="mt-0.5 truncate text-lg font-bold text-gray-900 sm:text-xl">
                {product.name}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="ml-4 shrink-0 rounded-full bg-gray-100 p-2 text-gray-600 transition hover:bg-gray-200"
              aria-label="Cerrar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-2">
            {/* Columna IZQUIERDA - Galería */}
            <div className="space-y-3">
              <div
                onClick={() => currentImage && setShowFullscreenImage(true)}
                className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl bg-linear-to-br from-gray-100 to-gray-200"
              >
                {currentImage ? (
                  <>
                    <img
                      src={currentImage}
                      alt={product.name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <div className="absolute right-3 top-3 rounded-full bg-black/60 p-2 opacity-0 backdrop-blur transition group-hover:opacity-100">
                      <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-6xl text-gray-300">
                    📦
                  </div>
                )}

                {isImported && (
                  <div className="absolute left-3 top-3 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                    ✓ Ya en tu tienda
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`aspect-square overflow-hidden rounded-xl border-2 transition ${
                        selectedImageIndex === idx
                          ? "border-rose-500 ring-2 ring-rose-200"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {images.length > 0 && (
                <p className="text-center text-xs text-gray-400">
                  {images.length} {images.length === 1 ? "imagen" : "imágenes"} · Click para ampliar
                </p>
              )}
            </div>

            {/* Columna DERECHA - Info */}
            <div className="space-y-4">
              {product.category && (
                <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  {product.category}
                </span>
              )}

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  📝 Descripción
                </h3>
                {product.description ? (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {product.description}
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm italic text-gray-400">
                    Sin descripción disponible.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="rounded bg-gray-100 px-2 py-0.5 font-mono">
                  SKU: {product.sku}
                </span>
              </div>

              {product.supplier && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    🏭 Proveedor
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    {product.supplier.logo_url ? (
                      <img
                        src={product.supplier.logo_url}
                        alt={product.supplier.business_name}
                        className="h-12 w-12 shrink-0 rounded-xl object-cover ring-2 ring-amber-300"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-xl">
                        🏭
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-bold text-amber-900">
                          {product.supplier.business_name}
                        </p>
                        {product.supplier.is_verified && (
                          <span
                            className="shrink-0 rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px] font-bold text-white"
                            title="Proveedor verificado"
                          >
                            ✓ VERIFICADO
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-amber-700">
                        {product.supplier.city && (
                          <span>📍 {product.supplier.city}</span>
                        )}
                        {product.supplier.rating !== null &&
                          product.supplier.rating > 0 && (
                            <span>⭐ {product.supplier.rating.toFixed(1)}</span>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 rounded-2xl bg-gray-50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  💰 Precios
                </h3>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Precio base (proveedor)</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(base)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Precio sugerido</span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(suggested)}
                  </span>
                </div>

                <div className="my-2 border-t border-dashed border-gray-300" />

                <div className="flex items-center justify-between rounded-xl bg-emerald-100 px-3 py-2">
                  <span className="text-xs font-bold text-emerald-800">
                    💚 Ganancia por unidad
                  </span>
                  <div className="text-right">
                    <div className="text-base font-black text-emerald-700">
                      {formatCurrency(marginAbs)}
                    </div>
                    <div className="text-[10px] font-bold text-emerald-600">
                      +{margin}% margen
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500">
                  💡 Puedes cambiar el precio de venta al importar y también después.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-blue-50 p-3">
                <span className="text-xs font-bold text-blue-700">
                  📦 Stock disponible
                </span>
                <span
                  className={`text-lg font-black ${
                    product.stock === 0
                      ? "text-red-600"
                      : product.stock <= 10
                      ? "text-orange-600"
                      : "text-blue-700"
                  }`}
                >
                  {product.stock} {product.stock === 1 ? "unidad" : "unidades"}
                </span>
              </div>
            </div>
          </div>

          {/* Footer sticky */}
          <div className="sticky bottom-0 flex gap-3 border-t border-gray-100 bg-white p-4 sm:p-6">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cerrar
            </button>

            {isImported ? (
              <button
                disabled
                className="flex-1 rounded-xl bg-emerald-100 py-3 text-sm font-bold text-emerald-700"
              >
                ✓ Ya está en tu tienda
              </button>
            ) : (
              <button
                onClick={() => onImport(product)}
                disabled={product.stock === 0}
                className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-bold text-white shadow transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {product.stock === 0 ? "Sin stock" : "+ Importar a mi tienda"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen viewer */}
      {showFullscreenImage && currentImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setShowFullscreenImage(false)}
        >
          <button
            onClick={() => setShowFullscreenImage(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/20"
            aria-label="Cerrar"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <img
            src={currentImage}
            alt={product.name}
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/60 px-4 py-2 backdrop-blur">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(idx);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    selectedImageIndex === idx
                      ? "w-6 bg-white"
                      : "w-2 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}