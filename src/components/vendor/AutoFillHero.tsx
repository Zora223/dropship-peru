// src/components/vendor/AutoFillHero.tsx
// 🪄 Botón mágico grande "Rellenar TODO con IA" - Ilimitado con Membresía

import { useState } from "react";
import { autoFillProduct, type AutoFillData } from "../../lib/auto-fill-ai";

interface AutoFillHeroProps {
  imageUrl: string | null;
  creditsRemaining: number;
  plan: string;
  onFillComplete: (data: AutoFillData) => void;
  onCreditsUpdate: (newCredits: number) => void;
  disabled?: boolean;
}

const STAGES = [
  { pct: 15, icon: "📸", label: "Analizando tu foto..." },
  { pct: 35, icon: "🧠", label: "Detectando qué es el producto..." },
  { pct: 55, icon: "✍️", label: "Generando nombre profesional..." },
  { pct: 75, icon: "📝", label: "Escribiendo descripción..." },
  { pct: 90, icon: "💰", label: "Calculando precio sugerido..." },
  { pct: 100, icon: "✨", label: "¡Listo!" },
];

export default function AutoFillHero({
  imageUrl,
  onFillComplete,
  onCreditsUpdate,
  disabled = false,
}: AutoFillHeroProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const noImage = !imageUrl;

  const handleAutoFill = async () => {
    if (!imageUrl) return;

    setLoading(true);
    setProgress(0);
    setCurrentStage(0);
    setError(null);

    const interval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev >= STAGES.length - 2) return prev;
        const next = prev + 1;
        setProgress(STAGES[next].pct);
        return next;
      });
    }, 2500);

    try {
      const response = await autoFillProduct(imageUrl, "all");

      clearInterval(interval);
      setProgress(100);
      setCurrentStage(STAGES.length - 1);

      onFillComplete(response.data);
      onCreditsUpdate(response.credits_remaining);

      setTimeout(() => {
        setLoading(false);
        setProgress(0);
        setCurrentStage(0);
      }, 800);
    } catch (err) {
      clearInterval(interval);
      const msg = err instanceof Error ? err.message : "Error inesperado";
      setError(msg);
      setLoading(false);
      setProgress(0);
      setCurrentStage(0);
    }
  };

  if (noImage) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-5 text-center">
        <div className="text-3xl opacity-40">🪄</div>
        <p className="mt-2 text-sm font-semibold text-gray-500">
          Sube una foto para activar Auto-Fill AI
        </p>
        <p className="mt-1 text-xs text-gray-400">
          La AI analizará tu imagen y rellenará los campos automáticamente
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-linear-to-br from-purple-600 via-pink-600 to-orange-500 p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="text-4xl animate-bounce">
            {STAGES[currentStage].icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider opacity-90">
              🪄 Auto-Fill AI trabajando...
            </div>
            <div className="text-sm font-bold truncate">
              {STAGES[currentStage].label}
            </div>
          </div>
          <div className="text-2xl font-black">{progress}%</div>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20">
          <div
            className="h-full bg-white transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-2 text-xs opacity-90 text-center">
          ⏱️ Esto toma entre 10 y 20 segundos
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-3">
          <div className="text-3xl">😔</div>
          <div className="flex-1">
            <div className="text-sm font-bold text-red-900">
              Error al procesar imagen
            </div>
            <p className="mt-1 text-xs text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
            >
              🔄 Intentar de nuevo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-linear-to-br from-purple-600 via-pink-600 to-orange-500 p-5 text-white shadow-lg relative overflow-hidden">
      <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-3xl">🪄</div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider opacity-90">
                Herramienta Express
              </div>
              <div className="text-base font-black">
                ¿Quieres rellenar todo con un click?
              </div>
            </div>
          </div>

          <div className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">
            <div className="text-[10px] font-bold uppercase opacity-90">
              Membresía
            </div>
            <div className="text-sm font-black">⚡ GRATIS</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
          <div className="flex items-center gap-1">
            <span>✍️</span>
            <span>Nombre profesional</span>
          </div>
          <div className="flex items-center gap-1">
            <span>📝</span>
            <span>Descripción detallada</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🏷️</span>
            <span>Sugerencia de Categoría</span>
          </div>
          <div className="flex items-center gap-1">
            <span>💰</span>
            <span>Precio sugerido local</span>
          </div>
        </div>

        <button
          onClick={handleAutoFill}
          disabled={disabled}
          className="mt-4 w-full rounded-xl bg-white py-3 text-sm font-black text-purple-700 shadow-lg hover:shadow-xl active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🪄 RELLENAR TODO CON IA
        </button>

        <div className="mt-2 text-center text-[10px] opacity-90">
          ⚡ Cargas Auto-Fill IA: Activas e Ilimitadas con tu plan
        </div>
      </div>
    </div>
  );
}