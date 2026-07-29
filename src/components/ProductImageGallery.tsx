// src/components/ProductImageGallery.tsx
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  canBuy?: boolean;
}

export default function ProductImageGallery({
  images,
  productName,
  canBuy = true,
}: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const hasMultiple = images.length > 1;
  const currentImage = images[currentIndex];

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  // Teclado en lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxOpen, goNext, goPrev, closeLightbox]);

  // Bloquear scroll cuando lightbox abierto
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  // Swipe táctil
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) goNext();
    if (distance < -50) goPrev();
  };

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-linear-to-br from-gray-100 to-gray-200 text-3xl text-gray-300 sm:text-5xl">
        📦
      </div>
    );
  }

  // LIGHTBOX en Portal (fuera del DOM del padre)
  const lightbox = lightboxOpen ? (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/95 p-4"
      style={{ zIndex: 9999 }}
      onClick={closeLightbox}
    >
      {/* Botón cerrar */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          closeLightbox();
        }}
        className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl font-bold text-gray-900 shadow-xl transition hover:scale-110 hover:bg-gray-100"
        style={{ zIndex: 10000 }}
        aria-label="Cerrar"
      >
        ✕
      </button>

      {/* Contador arriba */}
      {hasMultiple && (
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur"
          style={{ zIndex: 10000 }}
        >
          {currentIndex + 1} de {images.length}
        </div>
      )}

      {/* Imagen ampliada */}
      <div
        className="relative flex h-full w-full items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={currentImage}
          alt={`${productName} - ${currentIndex + 1}`}
          className="max-h-[85vh] max-w-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Flechas grandes */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-3xl text-white backdrop-blur transition hover:bg-white/30 sm:left-6 sm:h-14 sm:w-14"
              style={{ zIndex: 10000 }}
              aria-label="Anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-3xl text-white backdrop-blur transition hover:bg-white/30 sm:right-6 sm:h-14 sm:w-14"
              style={{ zIndex: 10000 }}
              aria-label="Siguiente"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Thumbnails abajo */}
      {hasMultiple && (
        <div
          className="absolute bottom-4 left-1/2 flex max-w-full -translate-x-1/2 gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide"
          style={{ zIndex: 10000 }}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-16 sm:w-16 ${
                idx === currentIndex
                  ? "border-white scale-110"
                  : "border-white/30 opacity-60 hover:opacity-100"
              }`}
            >
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  ) : null;

  return (
    <>
      {/* IMAGEN PRINCIPAL en la card */}
      <div
        className="relative aspect-square overflow-hidden bg-linear-to-br from-gray-100 to-gray-200 sm:aspect-4/3"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={currentImage}
          alt={`${productName} - ${currentIndex + 1}`}
          onClick={(e) => {
            e.stopPropagation();
            setLightboxOpen(true);
          }}
          className={`h-full w-full cursor-zoom-in object-cover transition ${
            canBuy ? "group-hover:scale-110" : "grayscale"
          }`}
        />

        {/* Flechas — solo si hay más de una imagen */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-1 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-800 shadow-md backdrop-blur transition hover:bg-white sm:left-2 sm:h-9 sm:w-9"
              aria-label="Imagen anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-1 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-800 shadow-md backdrop-blur transition hover:bg-white sm:right-2 sm:h-9 sm:w-9"
              aria-label="Imagen siguiente"
            >
              ›
            </button>

            {/* Contador */}
            <div className="absolute bottom-2 right-2 z-20 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur sm:text-xs">
              {currentIndex + 1} / {images.length}
            </div>

            {/* Puntos indicadores */}
            <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-1">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentIndex ? "w-4 bg-white" : "w-1.5 bg-white/60"
                  }`}
                  aria-label={`Ir a imagen ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* LIGHTBOX renderizado en Portal (fuera del DOM padre) */}
      {typeof document !== "undefined" && lightbox && createPortal(lightbox, document.body)}
    </>
  );
} 