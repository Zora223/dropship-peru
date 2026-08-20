// src/components/vendor/ProductLaunchAIModal.tsx
// 🍌 v22.9 - Control Automático de Límites por Nivel/Plan de Vendedor

import { useState, useEffect } from "react";
import {
  generateLaunchKit,
  getKitByProductId,
  type LaunchKit,
  type LaunchAIParams,
} from "../../lib/product-launch-ai";
import ProductLaunchKitViewer from "./ProductLaunchKitViewer";

interface ProductLaunchAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: LaunchAIParams;
  creditsRemaining: number;
  plan: string;
  onSuccess?: (kit: LaunchKit) => void;
  onCreditsUpdate?: (credits: number) => void;
}

type Step = "checking" | "reuse_option" | "confirm" | "generating" | "completed" | "error" | "limit_reached";

const GENERATION_STAGES = [
  { pct: 10, icon: "🔍", label: "Analizando tu producto..." },
  { pct: 25, icon: "🏪", label: "Cargando datos de tu tienda..." },
  { pct: 40, icon: "🎯", label: "Detectando categoría..." },
  { pct: 55, icon: "✍️", label: "Escribiendo caption viral Instagram..." },
  { pct: 70, icon: "📘", label: "Creando post Facebook..." },
  { pct: 82, icon: "🏷️", label: "Optimizando hashtags Perú..." },
  { pct: 92, icon: "💬", label: "Personalizando mensaje WhatsApp..." },
  { pct: 100, icon: "✨", label: "¡Kit personalizado listo!" },
];

export default function ProductLaunchAIModal({
  isOpen,
  onClose,
  params,
  creditsRemaining,
  plan,
  onSuccess,
  onCreditsUpdate,
}: ProductLaunchAIModalProps) {
  const [step, setStep] = useState<Step>("checking");
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [resultKit, setResultKit] = useState<LaunchKit | null>(null);
  const [existingKit, setExistingKit] = useState<LaunchKit | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 🤖 CONTROL AUTOMÁTICO DE LÍMITES
  const CREDITS_PER_KIT = 15;
  const isUnlimited = plan === "business";
  const hasQuotaLeft = isUnlimited || creditsRemaining >= CREDITS_PER_KIT;

  useEffect(() => {
    if (!isOpen) return;

    setStep("checking");
    setProgress(0);
    setCurrentStage(0);
    setResultKit(null);
    setExistingKit(null);
    setError(null);

    const checkExisting = async () => {
      try {
        const kit = await getKitByProductId(params.product_id);
        if (kit) {
          setExistingKit(kit);
          setStep("reuse_option");
        } else {
          // Si no tiene cuota disponible y no tiene kit guardado → Bloqueo automático
          if (!hasQuotaLeft) {
            setStep("limit_reached");
          } else {
            setStep("confirm");
          }
        }
      } catch (err) {
        console.error("Error buscando kit:", err);
        setStep(hasQuotaLeft ? "confirm" : "limit_reached");
      }
    };

    checkExisting();
  }, [isOpen, params.product_id, hasQuotaLeft]);

  useEffect(() => {
    if (step !== "generating") return;

    let stageIndex = 0;
    const interval = setInterval(() => {
      if (stageIndex >= GENERATION_STAGES.length - 1) {
        clearInterval(interval);
        return;
      }
      stageIndex++;
      setCurrentStage(stageIndex);
      setProgress(GENERATION_STAGES[stageIndex].pct);
    }, 2500);

    return () => clearInterval(interval);
  }, [step]);

  const handleGenerate = async () => {
    if (!hasQuotaLeft) {
      setStep("limit_reached");
      return;
    }

    setStep("generating");
    setProgress(GENERATION_STAGES[0].pct);
    setCurrentStage(0);
    setError(null);

    try {
      const response = await generateLaunchKit(params);
      setResultKit(response.kit);
      onCreditsUpdate?.(response.credits_remaining);
      setProgress(100);
      setCurrentStage(GENERATION_STAGES.length - 1);

      setTimeout(() => {
        setStep("completed");
        onSuccess?.(response.kit);
      }, 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al generar el kit";
      setError(message);
      setStep("error");
    }
  };

  const handleReuseExisting = () => {
    if (!existingKit) return;
    setResultKit(existingKit);
    setStep("completed");
    onSuccess?.(existingKit);
  };

  if (!isOpen) return null;

  if (step === "completed" && resultKit) {
    return (
      <ProductLaunchKitViewer
        isOpen={true}
        kit={resultKit}
        onClose={onClose}
        onRegenerate={hasQuotaLeft ? () => setStep("confirm") : undefined}
      />
    );
  }

  const safePrice = Number(params.product_price) || 0;

  return (
    <div
      className="fixed inset-0 z-55 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={step === "confirm" || step === "reuse_option" || step === "limit_reached" ? onClose : undefined}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-linear-to-br from-purple-600 via-pink-600 to-orange-500 p-5 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl animate-bounce">🎨</div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                  Herramientas IA Pro
                </div>
                <h2 className="text-lg font-black">Kits de Publicidad IA</h2>
              </div>
            </div>

            {step !== "generating" && (
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xl text-white transition hover:bg-white/30"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {/* CHECKING */}
          {step === "checking" && (
            <div className="py-12 text-center">
              <div className="text-5xl animate-spin inline-block">⚙️</div>
              <p className="mt-4 text-sm text-gray-600">
                Verificando cuota disponible...
              </p>
            </div>
          )}

          {/* 🛑 BLOQUEO AUTOMÁTICO POR LÍMITE DE PLAN */}
          {step === "limit_reached" && (
            <div className="space-y-5 text-center py-4">
              <div className="text-6xl animate-bounce">🔒</div>
              <div>
                <h3 className="text-2xl font-black text-gray-900">
                  Alcanzaste tu cuota de Kits IA de este mes
                </h3>
                <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
                  Has agotado los Kits nuevos incluidos en tu nivel actual. ¡Reutilizar tus kits ya guardados sigue siendo <strong>100% GRATIS</strong>!
                </p>
              </div>

              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-left space-y-2">
                <div className="text-xs font-bold uppercase text-amber-900">
                  💡 ¿Cómo desbloquear más Kits?
                </div>
                <ul className="text-xs text-amber-800 space-y-1">
                  <li>🚀 <strong>Opción 1:</strong> Vende más en tu tienda. Al llegar a 30 ventas este mes subes a Bronce (+15 Kits + Membresía GRATIS).</li>
                  <li>💳 <strong>Opción 2:</strong> Realiza un Upgrade de Plan hoy para acceso inmediato.</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl border-2 border-gray-200 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Entendido
                </button>
              </div>
            </div>
          )}

          {/* REUSE OPTION */}
          {step === "reuse_option" && existingKit && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="text-5xl mb-2">💾</div>
                <h3 className="text-2xl font-black text-gray-900">
                  Ya tienes un kit guardado
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Reutilizar tus kits guardados es 100% GRATIS e ilimitado
                </p>
              </div>

              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={existingKit.enhanced_image_url}
                    alt="Producto"
                    className="h-16 w-16 rounded-xl object-cover shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold uppercase text-emerald-700">
                      Kit guardado
                    </div>
                    <div className="text-sm font-bold text-gray-900 truncate">
                      {params.product_name}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={handleReuseExisting}
                  className="rounded-2xl bg-linear-to-r from-emerald-500 to-teal-500 py-4 text-base font-black text-white shadow-lg hover:shadow-xl transition"
                >
                  ♻️ USAR KIT GUARDADO (Gratis)
                </button>

                {hasQuotaLeft ? (
                  <button
                    onClick={() => setStep("confirm")}
                    className="rounded-2xl border-2 border-purple-300 bg-purple-50 py-3 text-sm font-black text-purple-700 hover:bg-purple-100 transition"
                  >
                    🔄 Generar NUEVO Kit de Publicidad ✨
                  </button>
                ) : (
                  <div className="text-center text-xs text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200">
                    🔒 Cuota de nuevos kits del mes agotada. Logra 30 ventas para desbloquear más.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CONFIRM */}
          {step === "confirm" && (
            <div className="space-y-5">
              <div className="text-center">
                <h3 className="text-2xl font-black text-gray-900">
                  ✨ Kit de Publicidad Personalizado
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Genera automáticamente captions, hashtags y mensajes listos para vender
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4 flex items-center gap-4">
                {params.input_image_url ? (
                  <img
                    src={params.input_image_url}
                    alt={params.product_name}
                    className="h-20 w-20 rounded-xl object-cover shadow-md"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-xl bg-gray-200 flex items-center justify-center text-3xl">
                    📦
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Producto
                  </div>
                  <h4 className="mt-0.5 truncate text-lg font-bold text-gray-900">
                    {params.product_name}
                  </h4>
                  <div className="text-sm font-semibold text-purple-600">
                    S/ {safePrice.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl border-2 border-gray-200 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex-1 rounded-xl bg-linear-to-r from-purple-600 via-pink-600 to-orange-500 py-3 text-sm font-black text-white shadow-lg hover:shadow-xl active:scale-95 transition"
                >
                  🚀 GENERAR AHORA
                </button>
              </div>
            </div>
          )}

          {/* GENERATING */}
          {step === "generating" && (
            <div className="py-8 space-y-6">
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="text-7xl animate-bounce">
                    {GENERATION_STAGES[currentStage].icon}
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-black text-gray-900">
                  {GENERATION_STAGES[currentStage].label}
                </h3>
              </div>

              <div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-linear-to-r from-purple-500 via-pink-500 to-orange-500 transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ERROR */}
          {step === "error" && (
            <div className="py-12 space-y-6 text-center">
              <div className="text-6xl">😔</div>
              <p className="mt-2 text-sm text-red-600">{error}</p>
              <button
                onClick={onClose}
                className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}