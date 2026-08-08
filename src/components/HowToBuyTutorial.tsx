// src/components/HowToBuyTutorial.tsx
// 🎓 v22.13.1 - Tutorial premium interactivo para customers
// Meliora Dropship
// FIX: Posición del botón + nombre de tienda dinámico + solo Iquitos

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface TutorialProps {
  storeName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  onClose: () => void;
  autoStart?: boolean;
}

interface Slide {
  emoji: string;
  emojiSize: string;
  title: string;
  subtitle: string;
  description: string;
  tip: string;
  gradient: string;
  mockup?: React.ReactNode;
}

function getSlides(storeName: string): Slide[] {
  return [
    {
      emoji: "👋",
      emojiSize: "text-8xl sm:text-9xl",
      title: `¡Bienvenido a ${storeName}!`,
      subtitle: "Tu compra en 6 pasos súper fáciles",
      description:
        "Comprar en nuestra tienda es rápido, seguro y sin complicaciones. Te enseñamos cómo hacerlo en menos de 2 minutos.",
      tip: "Envío GRATIS en Iquitos 🚚",
      gradient: "from-purple-600 via-pink-600 to-orange-500",
      mockup: (
        <div className="flex items-center justify-center gap-2 text-4xl animate-pulse">
          🛍️ ✨ 💝
        </div>
      ),
    },
    {
      emoji: "🛍️",
      emojiSize: "text-8xl sm:text-9xl",
      title: "1. Explora productos",
      subtitle: "Encuentra lo que amas",
      description:
        "Navega por el catálogo, usa los filtros de categoría y toca cualquier producto para ver todos sus detalles, fotos y reseñas.",
      tip: "💡 Guarda tus favoritos con el corazón ♥",
      gradient: "from-blue-500 via-cyan-500 to-teal-500",
      mockup: (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-xl bg-linear-to-br from-white/20 to-white/5 backdrop-blur border border-white/30 flex items-center justify-center text-3xl"
            >
              📦
            </div>
          ))}
        </div>
      ),
    },
    {
      emoji: "🎨",
      emojiSize: "text-8xl sm:text-9xl",
      title: "2. Elige tu color",
      subtitle: "Personaliza tu compra",
      description:
        "Si el producto tiene varios colores disponibles, selecciona el que más te guste tocando el círculo del color.",
      tip: "💡 El color elegido llegará en tu pedido",
      gradient: "from-rose-500 via-pink-500 to-fuchsia-500",
      mockup: (
        <div className="flex gap-2 justify-center flex-wrap">
          {[
            { color: "#000000", name: "Negro" },
            { color: "#EF4444", name: "Rojo" },
            { color: "#3B82F6", name: "Azul" },
            { color: "#22C55E", name: "Verde" },
          ].map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur border border-white/30 px-3 py-1.5"
            >
              <span
                className="h-4 w-4 rounded-full border border-white/50"
                style={{ backgroundColor: c.color }}
              />
              <span className="text-xs font-semibold">{c.name}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      emoji: "🛒",
      emojiSize: "text-8xl sm:text-9xl",
      title: "3. Al carrito",
      subtitle: "Suma tus productos",
      description:
        "Toca 'Agregar al carrito', elige la cantidad y sigue comprando. Puedes agregar productos de diferentes proveedores.",
      tip: "💡 Revisa tu carrito en la esquina superior 🛒",
      gradient: "from-emerald-500 via-green-500 to-lime-500",
      mockup: (
        <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/30 p-3 flex items-center gap-3">
          <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
            👕
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-bold">Producto elegido</div>
            <div className="text-xs opacity-80">S/ 45.00 × 1</div>
          </div>
          <div className="rounded-full bg-white/30 px-2 py-0.5 text-xs font-bold">
            ✓
          </div>
        </div>
      ),
    },
    {
      emoji: "🚚",
      emojiSize: "text-8xl sm:text-9xl",
      title: "4. Entrega o recojo",
      subtitle: "Tú eliges cómo recibirlo",
      description:
        "Escoge entre delivery a tu casa (rápido y seguro) o recojo gratis en la tienda del vendor. Ingresa tus datos de contacto.",
      tip: "💡 Delivery en menos de 24h en Iquitos ⚡",
      gradient: "from-amber-500 via-orange-500 to-red-500",
      mockup: (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/15 backdrop-blur border border-white/30 p-3 text-center">
            <div className="text-2xl">🏠</div>
            <div className="text-xs font-bold mt-1">Delivery</div>
            <div className="text-[10px] opacity-80">A tu casa</div>
          </div>
          <div className="rounded-xl bg-white/15 backdrop-blur border border-white/30 p-3 text-center">
            <div className="text-2xl">🏪</div>
            <div className="text-xs font-bold mt-1">Recojo</div>
            <div className="text-[10px] opacity-80">Gratis</div>
          </div>
        </div>
      ),
    },
    {
      emoji: "💜",
      emojiSize: "text-8xl sm:text-9xl",
      title: "5. Paga con Yape",
      subtitle: "Rápido y 100% seguro",
      description:
        "Escanea el QR o copia el número, paga con Yape/Plin, y sube tu comprobante. ¡Nuestra AI lo valida en segundos!",
      tip: "🔒 Compra 100% protegida por Meliora",
      gradient: "from-violet-600 via-purple-600 to-indigo-600",
      mockup: (
        <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/30 p-4 text-center">
          <div className="text-4xl mb-1">💜</div>
          <div className="text-sm font-black">Yape / Plin</div>
          <div className="text-[10px] opacity-80 mt-1">
            Validación automática con AI 🤖
          </div>
        </div>
      ),
    },
    {
      emoji: "🎉",
      emojiSize: "text-8xl sm:text-9xl",
      title: "¡Y listo!",
      subtitle: "Recibirás tu pedido pronto",
      description:
        "Te enviaremos actualizaciones por WhatsApp desde que se confirma tu pago hasta que llega a tus manos.",
      tip: "🌟 ¡Deja tu reseña después de recibir!",
      gradient: "from-pink-500 via-rose-500 to-red-500",
      mockup: (
        <div className="flex items-center justify-center gap-2 text-5xl animate-bounce">
          📦 ➡️ 🏠
        </div>
      ),
    },
  ];
}

const STORAGE_KEY = "meliora_tutorial_seen_v1";

export default function HowToBuyTutorial({
  storeName = "esta tienda",
  onClose,
  autoStart = false,
}: TutorialProps) {
  const SLIDES = getSlides(storeName);

  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  // Auto-abrir la primera vez
  useEffect(() => {
    if (autoStart) {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        setTimeout(() => setIsOpen(true), 1500);
      }
    }
  }, [autoStart]);

  const handleClose = useCallback(() => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, "1");
    }
    setIsOpen(false);
    setCurrentSlide(0);
    setIsFinished(false);
    onClose();
  }, [dontShowAgain, onClose]);

  const handleNext = useCallback(() => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide((p) => p + 1);
    } else {
      setIsFinished(true);
      setTimeout(handleClose, 1200);
    }
  }, [currentSlide, handleClose, SLIDES.length]);

  const handlePrev = useCallback(() => {
    if (currentSlide > 0) setCurrentSlide((p) => p - 1);
  }, [currentSlide]);

  // Keyboard nav
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, handleClose, handleNext, handlePrev]);

  // Bloquear scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Swipe táctil móvil
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
    if (distance > 50) handleNext();
    if (distance < -50) handlePrev();
  };

  // 🆕 v22.13.1 - Botón flotante REPOSICIONADO
  // Ubicación: BOTTOM-LEFT para no chocar con WhatsApp (que está en bottom-right)
  const FloatingButton = (
    <button
      type="button"
      onClick={() => {
        setCurrentSlide(0);
        setIsFinished(false);
        setIsOpen(true);
      }}
      className="fixed bottom-6 left-6 z-40 group flex items-center gap-2 rounded-full bg-linear-to-r from-purple-600 via-pink-600 to-orange-500 px-4 py-3 text-white shadow-2xl hover:shadow-purple-500/50 hover:scale-110 active:scale-95 transition-all duration-300"
      aria-label="¿Cómo comprar?"
    >
      <span className="text-2xl animate-pulse">💡</span>
      <span className="text-sm font-bold hidden sm:inline whitespace-nowrap">
        ¿Cómo comprar?
      </span>
      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-ping" />
    </button>
  );

  if (!isOpen) {
    return typeof document !== "undefined"
      ? createPortal(FloatingButton, document.body)
      : null;
  }

  const slide = SLIDES[currentSlide];
  const isFirst = currentSlide === 0;
  const isLast = currentSlide === SLIDES.length - 1;
  const progress = ((currentSlide + 1) / SLIDES.length) * 100;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
      style={{ zIndex: 9999 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={handleClose}
      />

      {/* Modal principal */}
      <div
        className="relative w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[92vh] overflow-hidden bg-white sm:rounded-3xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header con progress bar */}
        <div className="relative shrink-0 border-b border-gray-100 bg-white">
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100">
            <div
              className="h-full bg-linear-to-r from-purple-600 via-pink-600 to-orange-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between p-4 pt-6">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl shrink-0">🎓</span>
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400 truncate">
                  Tutorial · {storeName}
                </div>
                <div className="text-sm font-black text-gray-900">
                  Paso {currentSlide + 1} de {SLIDES.length}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="text-sm font-semibold text-gray-500 hover:text-gray-900 underline shrink-0 ml-2"
            >
              Saltar
            </button>
          </div>

          {/* Dots indicadores */}
          <div className="flex justify-center gap-1.5 pb-3">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentSlide
                    ? "w-8 h-2 bg-linear-to-r from-purple-600 to-pink-600"
                    : idx < currentSlide
                    ? "w-2 h-2 bg-purple-400"
                    : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Ir al paso ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Contenido del slide */}
        <div
          key={currentSlide}
          className={`flex-1 overflow-y-auto bg-linear-to-br ${slide.gradient} text-white relative animate-fadeIn`}
        >
          {/* Efectos de fondo animados */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/10 blur-3xl animate-pulse" />
            <div
              className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl animate-pulse"
              style={{ animationDelay: "1s" }}
            />
            <div
              className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full bg-white/5 blur-2xl animate-pulse"
              style={{ animationDelay: "2s" }}
            />
          </div>

          <div className="relative flex flex-col items-center justify-center min-h-125 p-6 sm:p-10 text-center">
            {/* Emoji grande animado */}
            <div
              className={`${slide.emojiSize} mb-4 animate-bounce`}
              style={{ animationDuration: "2s" }}
            >
              {slide.emoji}
            </div>

            {/* Subtitle pequeño */}
            <div className="text-xs sm:text-sm font-bold uppercase tracking-widest opacity-80 mb-2">
              {slide.subtitle}
            </div>

            {/* Título grande */}
            <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-4 max-w-md">
              {slide.title}
            </h2>

            {/* Descripción */}
            <p className="text-base sm:text-lg leading-relaxed opacity-95 max-w-md mb-6">
              {slide.description}
            </p>

            {/* Mockup */}
            {slide.mockup && (
              <div className="mb-6 max-w-sm w-full">{slide.mockup}</div>
            )}

            {/* Tip pro */}
            <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/30 px-4 py-3 max-w-md">
              <p className="text-sm font-semibold">{slide.tip}</p>
            </div>
          </div>
        </div>

        {/* Footer con navegación */}
        <div className="shrink-0 border-t border-gray-100 bg-white p-4 sm:p-5">
          {/* Checkbox "no volver a mostrar" */}
          {isFirst && (
            <label className="flex items-center gap-2 mb-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <span className="text-xs text-gray-600 group-hover:text-gray-900">
                No volver a mostrar este tutorial
              </span>
            </label>
          )}

          <div className="flex items-center gap-3">
            {/* Botón Atrás */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={isFirst}
              className={`flex items-center justify-center gap-1 rounded-full border-2 border-gray-200 px-5 py-3 text-sm font-bold transition-all ${
                isFirst
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:border-gray-900 hover:bg-gray-900 hover:text-white active:scale-95"
              }`}
              aria-label="Anterior"
            >
              ← <span className="hidden sm:inline">Atrás</span>
            </button>

            {/* Botón Siguiente / Finalizar */}
            <button
              type="button"
              onClick={handleNext}
              className={`flex-1 flex items-center justify-center gap-2 rounded-full py-3 text-sm sm:text-base font-black text-white shadow-lg hover:shadow-xl active:scale-95 transition-all ${
                isLast
                  ? "bg-linear-to-r from-emerald-500 via-green-500 to-teal-500"
                  : "bg-linear-to-r from-purple-600 via-pink-600 to-orange-500"
              }`}
            >
              {isLast ? (
                <>
                  🚀 <span>¡Empezar a comprar!</span>
                </>
              ) : (
                <>
                  <span>Siguiente</span> →
                </>
              )}
            </button>
          </div>

          {/* Hint móvil */}
          <div className="mt-2 text-center text-[10px] text-gray-400 sm:hidden">
            💡 Desliza a los lados para navegar
          </div>
        </div>

        {/* Overlay al terminar */}
        {isFinished && (
          <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-emerald-500/95 via-green-500/95 to-teal-500/95 backdrop-blur z-10 animate-fadeIn">
            <div className="text-center text-white">
              <div className="text-8xl mb-4 animate-bounce">🎉</div>
              <h2 className="text-3xl font-black mb-2">¡Genial!</h2>
              <p className="text-lg opacity-95">Ahora eres un experto</p>
              <div className="mt-4 text-4xl">✨🛍️✨</div>
            </div>
          </div>
        )}
      </div>

      {/* CSS para animaciones */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}