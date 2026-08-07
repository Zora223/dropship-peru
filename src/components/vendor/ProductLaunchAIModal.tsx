// src/components/vendor/ProductLaunchAIModal.tsx
// 🍌 Product Launch AI - Wizard con progreso animado
// v22.2.4 - Fix remount bug (resultKit se preserva)

import { useState, useEffect } from "react";
import {
  generateLaunchKit,
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
  onCreditsUpdate?: (newCredits: number) => void;
}

type Step = "confirm" | "generating" | "completed" | "error";

const GENERATION_STAGES = [
  { pct: 10, icon: "🔍", label: "Analizando tu producto...", duration: 2000 },
  { pct: 30, icon: "🎯", label: "Detectando categoría automáticamente...", duration: 2000 },
  { pct: 50, icon: "🍌", label: "Groq está creando magia...", duration: 8000 },
  { pct: 70, icon: "💾", label: "Guardando contenido...", duration: 2000 },
  { pct: 85, icon: "✍️", label: "Generando captions virales...", duration: 3000 },
  { pct: 95, icon: "🏷️", label: "Optimizando hashtags para Perú...", duration: 2000 },
  { pct: 100, icon: "✨", label: "¡Kit completo listo!", duration: 500 },
];

export default function ProductLaunchAIModal({
  isOpen,
  onClose,
  params,
  creditsRemaining: initialCredits,
  plan,
  onSuccess,
  onCreditsUpdate,
}: ProductLaunchAIModalProps) {
  const [step, setStep] = useState<Step>("confirm");
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [resultKit, setResultKit] = useState<LaunchKit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState(initialCredits);

  const CREDITS_COST = 15;
  const isUnlimited = plan === "business";
  const canAfford = isUnlimited || credits >= CREDITS_COST;

  // 🔥 DEBUG
  useEffect(() => {
    if (isOpen) {
      console.log("🍌 [Launch AI Modal] Abierto con:", {
        step,
        credits: initialCredits,
        plan,
        canAfford,
        params: {
          product_id: params.product_id,
          product_name: params.product_name,
          product_price: params.product_price,
          product_price_type: typeof params.product_price,
          input_image_url: params.input_image_url,
          has_image: !!params.input_image_url,
        },
      });
    }
  }, [isOpen, initialCredits, plan]);

  // 🔥 FIX v22.2.4: SOLO resetea cuando isOpen pasa de false a true
  // NO agregar initialCredits como dependencia (causa remount)
  useEffect(() => {
    if (isOpen) {
      setStep("confirm");
      setProgress(0);
      setCurrentStage(0);
      setResultKit(null);
      setError(null);
      setCredits(initialCredits);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
    }, 3500);

    return () => clearInterval(interval);
  }, [step]);

  const handleGenerate = async () => {
    setStep("generating");
    setProgress(GENERATION_STAGES[0].pct);
    setCurrentStage(0);
    setError(null);

    try {
      console.log("🚀 [Launch AI] Enviando request...");
      const response = await generateLaunchKit(params);
      console.log("✅ [Launch AI] Respuesta:", response);

      setResultKit(response.kit);
      setCredits(response.credits_remaining);
      onCreditsUpdate?.(response.credits_remaining);
      setProgress(100);
      setCurrentStage(GENERATION_STAGES.length - 1);

      console.log("⏰ [Launch AI] Programando cambio a 'completed' en 800ms...");
      setTimeout(() => {
        console.log("✅ [Launch AI] Cambiando step a 'completed', kit:", response.kit);
        setStep("completed");
        onSuccess?.(response.kit);
      }, 800);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al generar el kit";
      console.error("🔴 [Launch AI] Error:", err);
      setError(message);
      setStep("error");
    }
  };

  const handleClose = () => {
    if (step === "generating") {
      if (!confirm("¿Cancelar la generación? Los créditos ya se descontaron.")) {
        return;
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  // 🔥 DEBUG RENDER
  console.log("🎬 [Launch AI Render] step:", step, "hasKit:", !!resultKit);

  if (step === "completed" && resultKit) {
    console.log("🚀 [Launch AI] Mostrando KitViewer con:", resultKit);
    return (
      <ProductLaunchKitViewer
        isOpen={true}
        kit={resultKit}
        onClose={onClose}
      />
    );
  }

  // 🔥 Safety: precio siempre número
  const safePrice = Number(params.product_price) || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={step === "confirm" ? handleClose : undefined}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-linear-to-br from-purple-600 via-pink-600 to-orange-500 p-6 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl animate-bounce">🍌</div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider opacity-90">
                  Product Launch AI
                </div>
                <h2 className="text-xl font-black">
                  Powered by Nano Banana
                </h2>
              </div>
            </div>

            {step !== "generating" && (
              <button
                onClick={handleClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-2xl text-white transition hover:bg-white/30"
              >
                ×
              </button>
            )}
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur">
            <span className="text-xs font-bold">
              {isUnlimited ? "♾️ ILIMITADO" : `⚡ ${credits} créditos`}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {/* STEP 1: CONFIRMAR */}
          {step === "confirm" && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-black text-gray-900">
                  ✨ Kit Completo de Marketing
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  La AI creará TODO por ti en 30 segundos
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
                    {params.product_name || "Sin nombre"}
                  </h4>
                  <div className="text-sm font-semibold text-purple-600">
                    S/ {safePrice.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-purple-100 bg-linear-to-br from-purple-50 to-pink-50 p-5">
                <h4 className="mb-3 text-sm font-black uppercase tracking-wider text-purple-900">
                  🎁 Recibirás:
                </h4>
                <ul className="space-y-2 text-sm">
                  {[
                    { icon: "📸", label: "Imagen del producto lista" },
                    { icon: "🎯", label: "Detección automática de categoría" },
                    { icon: "📝", label: "Caption para Instagram (viral)" },
                    { icon: "📘", label: "Caption para Facebook" },
                    { icon: "🏷️", label: "15 hashtags optimizados para Perú" },
                    { icon: "💬", label: "Mensaje WhatsApp Broadcast" },
                    { icon: "📧", label: "Email marketing profesional" },
                    { icon: "🚀", label: "Botones 1-tap para publicar" },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-800">
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 text-center">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Costo del Kit Completo
                </div>
                <div className="mt-1 text-3xl font-black text-emerald-900">
                  ⚡ 15 créditos
                </div>
                <div className="mt-1 text-xs text-emerald-600">
                  {isUnlimited
                    ? "✅ Plan Business - Ilimitado"
                    : `Te quedarán ${credits - CREDITS_COST} créditos después`}
                </div>
              </div>

              {!canAfford && (
                <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-center">
                  <p className="text-sm font-bold text-red-800">
                    ⚠️ Créditos insuficientes
                  </p>
                  <p className="mt-1 text-xs text-red-600">
                    Necesitas {CREDITS_COST} créditos y tienes {credits}.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 rounded-xl border-2 border-gray-200 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!canAfford}
                  className="flex-1 rounded-xl bg-linear-to-r from-purple-600 via-pink-600 to-orange-500 py-3 text-sm font-black text-white shadow-lg transition hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🚀 GENERAR KIT AHORA
                </button>
              </div>

              <div className="text-center text-xs text-gray-400">
                🍌 Groq Llama 3.3 · Tiempo estimado: 15-30s
              </div>
            </div>
          )}

          {/* STEP 2: GENERANDO */}
          {step === "generating" && (
            <div className="py-8 space-y-6">
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="text-7xl animate-bounce">
                    {GENERATION_STAGES[currentStage].icon}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-linear-to-r from-purple-400/30 to-pink-400/30 animate-ping" />
                </div>

                <h3 className="mt-6 text-xl font-black text-gray-900">
                  {GENERATION_STAGES[currentStage].label}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Esto tomará entre 15 y 30 segundos
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-bold text-gray-700">Progreso</span>
                  <span className="font-black text-purple-600">{progress}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-linear-to-r from-purple-500 via-pink-500 to-orange-500 transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {GENERATION_STAGES.map((stage, index) => {
                  const isCompleted = index < currentStage;
                  const isCurrent = index === currentStage;
                  const isPending = index > currentStage;

                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-3 rounded-xl p-3 transition ${
                        isCompleted
                          ? "bg-emerald-50 text-emerald-700"
                          : isCurrent
                          ? "bg-purple-50 text-purple-900 shadow-md scale-105"
                          : "bg-gray-50 text-gray-400"
                      }`}
                    >
                      <span className="text-2xl">
                        {isCompleted ? "✅" : isCurrent ? stage.icon : "⏸️"}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          isPending ? "opacity-50" : ""
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-center">
                <p className="text-xs text-blue-800">
                  💡 <strong>Tip:</strong> No cierres esta ventana.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: ERROR */}
          {step === "error" && (
            <div className="py-12 space-y-6 text-center">
              <div className="text-6xl">😔</div>
              <div>
                <h3 className="text-xl font-black text-gray-900">
                  Ups, algo salió mal
                </h3>
                <p className="mt-2 text-sm text-red-600 max-w-md mx-auto">
                  {error}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-left max-w-md mx-auto">
                <p className="text-xs text-amber-900">
                  <strong>💡 ¿Qué hacer?</strong>
                  <br />• Verifica que tu producto tenga una imagen válida
                  <br />• Intenta con otro producto
                  <br />• Si el problema persiste, contáctanos
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleClose}
                  className="rounded-xl border-2 border-gray-200 px-6 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => setStep("confirm")}
                  className="rounded-xl bg-linear-to-r from-purple-600 to-pink-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition hover:shadow-xl"
                >
                  🔄 Intentar de nuevo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}