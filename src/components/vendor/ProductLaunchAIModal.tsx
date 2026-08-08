// src/components/vendor/ProductLaunchAIModal.tsx
// 🍌 v22.6 - Con reutilización de kits + prop onCreditsUpdate

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
  onCreditsUpdate?: (credits: number) => void; // 🆕 v22.6
}

type Step = "checking" | "reuse_option" | "confirm" | "generating" | "completed" | "error";

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
  creditsRemaining: initialCredits,
  plan,
  onSuccess,
  onCreditsUpdate, // 🆕
}: ProductLaunchAIModalProps) {
  const [step, setStep] = useState<Step>("checking");
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [resultKit, setResultKit] = useState<LaunchKit | null>(null);
  const [existingKit, setExistingKit] = useState<LaunchKit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState(initialCredits);

  const CREDITS_COST = 15;
  const isUnlimited = plan === "business";
  const canAfford = isUnlimited || credits >= CREDITS_COST;

  // 🔥 Al abrir: buscar si ya existe kit
  useEffect(() => {
    if (!isOpen) return;

    setStep("checking");
    setProgress(0);
    setCurrentStage(0);
    setResultKit(null);
    setExistingKit(null);
    setError(null);
    setCredits(initialCredits);

    const checkExisting = async () => {
      try {
        const kit = await getKitByProductId(params.product_id);
        if (kit) {
          console.log("♻️ Kit existente encontrado:", kit.id);
          setExistingKit(kit);
          setStep("reuse_option");
        } else {
          console.log("🆕 No hay kit previo, mostrar confirmación");
          setStep("confirm");
        }
      } catch (err) {
        console.error("Error buscando kit:", err);
        setStep("confirm");
      }
    };

    checkExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, params.product_id]);

  // Animación progreso
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
    setStep("generating");
    setProgress(GENERATION_STAGES[0].pct);
    setCurrentStage(0);
    setError(null);

    try {
      console.log("🚀 Enviando request...");
      const response = await generateLaunchKit(params);
      console.log("✅ Respuesta:", response);

      setResultKit(response.kit);
      setCredits(response.credits_remaining);
      onCreditsUpdate?.(response.credits_remaining); // 🆕 Notifica al padre
      setProgress(100);
      setCurrentStage(GENERATION_STAGES.length - 1);

      setTimeout(() => {
        setStep("completed");
        onSuccess?.(response.kit);
      }, 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al generar el kit";
      console.error("🔴 Error:", err);
      setError(message);
      setStep("error");
    }
  };

  const handleReuseExisting = () => {
    if (!existingKit) return;
    console.log("♻️ Reutilizando kit existente (0 créditos)");
    setResultKit(existingKit);
    setStep("completed");
    onSuccess?.(existingKit);
  };

  const handleGenerateNew = () => {
    setStep("confirm");
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

  // Si ya está completado → mostrar viewer
  if (step === "completed" && resultKit) {
    return (
      <ProductLaunchKitViewer
        isOpen={true}
        kit={resultKit}
        onClose={onClose}
        onRegenerate={canAfford ? handleGenerateNew : undefined}
      />
    );
  }

  const safePrice = Number(params.product_price) || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={step === "confirm" || step === "reuse_option" ? handleClose : undefined}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-linear-to-br from-purple-600 via-pink-600 to-orange-500 p-5 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl animate-bounce">🍌</div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                  Product Launch AI
                </div>
                <h2 className="text-lg font-black">Marketing en 30s</h2>
              </div>
            </div>

            {step !== "generating" && (
              <button
                onClick={handleClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xl text-white transition hover:bg-white/30"
              >
                ×
              </button>
            )}
          </div>

          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
            <span className="text-xs font-bold">
              {isUnlimited ? "♾️ ILIMITADO" : `⚡ ${credits} créditos`}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {/* CHECKING */}
          {step === "checking" && (
            <div className="py-12 text-center">
              <div className="text-5xl animate-spin inline-block">⚙️</div>
              <p className="mt-4 text-sm text-gray-600">
                Verificando si ya tienes un kit para este producto...
              </p>
            </div>
          )}

          {/* REUSE OPTION - Ya existe kit */}
          {step === "reuse_option" && existingKit && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="text-5xl mb-2">♻️</div>
                <h3 className="text-2xl font-black text-gray-900">
                  Ya tienes un kit para este producto
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Puedes reutilizarlo sin gastar créditos
                </p>
              </div>

              {/* Preview del kit existente */}
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={existingKit.enhanced_image_url}
                    alt="Producto"
                    className="h-16 w-16 rounded-xl object-cover shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold uppercase text-emerald-700">
                      Kit existente
                    </div>
                    <div className="text-sm font-bold text-gray-900 truncate">
                      {params.product_name}
                    </div>
                    <div className="text-[10px] text-emerald-600">
                      Generado: {new Date(existingKit.created_at || "").toLocaleDateString("es-PE")}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-emerald-800 bg-white/50 rounded-lg p-2">
                  ✅ Captions Instagram + Facebook
                  <br />✅ {existingKit.hashtags?.length || 15} hashtags
                  <br />✅ Mensaje WhatsApp + Email
                </div>
              </div>

              {/* Botones */}
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={handleReuseExisting}
                  className="rounded-2xl bg-linear-to-r from-emerald-500 to-teal-500 py-4 text-base font-black text-white shadow-lg hover:shadow-xl transition"
                >
                  ♻️ USAR KIT EXISTENTE (0 créditos)
                </button>

                <button
                  onClick={handleGenerateNew}
                  disabled={!canAfford}
                  className="rounded-2xl border-2 border-purple-300 bg-purple-50 py-3 text-sm font-black text-purple-700 hover:bg-purple-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔄 Generar NUEVO kit (15 créditos)
                </button>
              </div>

              <div className="text-center text-xs text-gray-500">
                💡 Los kits nuevos tienen contenido diferente cada vez
              </div>
            </div>
          )}

          {/* CONFIRM - Nuevo kit */}
          {step === "confirm" && (
            <div className="space-y-5">
              <div className="text-center">
                <h3 className="text-2xl font-black text-gray-900">
                  ✨ Kit Personalizado
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Contenido con datos de tu tienda
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

              <div className="rounded-2xl border-2 border-purple-100 bg-linear-to-br from-purple-50 to-pink-50 p-5">
                <h4 className="mb-3 text-sm font-black uppercase text-purple-900">
                  🎁 Recibirás (personalizado con TU tienda):
                </h4>
                <ul className="space-y-2 text-sm">
                  {[
                    { icon: "📝", label: "Caption Instagram viral + tu @usuario" },
                    { icon: "📘", label: "Post Facebook con tu página" },
                    { icon: "🏷️", label: "15 hashtags optimizados Perú" },
                    { icon: "💬", label: "Mensaje WhatsApp con tu número" },
                    { icon: "📧", label: "Email marketing con tu marca" },
                    { icon: "🔗", label: "Link directo a TU tienda incluido" },
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
                <div className="text-xs font-bold uppercase text-emerald-700">
                  Costo del Kit
                </div>
                <div className="mt-1 text-3xl font-black text-emerald-900">
                  ⚡ 15 créditos
                </div>
                <div className="mt-1 text-xs text-emerald-600">
                  {isUnlimited
                    ? "✅ Plan Business - Ilimitado"
                    : `Te quedarán ${credits - CREDITS_COST} créditos`}
                </div>
              </div>

              {!canAfford && (
                <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-center">
                  <p className="text-sm font-bold text-red-800">
                    ⚠️ Créditos insuficientes
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 rounded-xl border-2 border-gray-200 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!canAfford}
                  className="flex-1 rounded-xl bg-linear-to-r from-purple-600 via-pink-600 to-orange-500 py-3 text-sm font-black text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className="absolute inset-0 rounded-full bg-linear-to-r from-purple-400/30 to-pink-400/30 animate-ping" />
                </div>
                <h3 className="mt-6 text-xl font-black text-gray-900">
                  {GENERATION_STAGES[currentStage].label}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Personalizando con datos de tu tienda...
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-bold text-gray-700">Progreso</span>
                  <span className="font-black text-purple-600">{progress}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-linear-to-r from-purple-500 via-pink-500 to-orange-500 transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-center">
                <p className="text-xs text-blue-800">
                  💡 <strong>Tip:</strong> Este kit quedará guardado para reutilizar.
                </p>
              </div>
            </div>
          )}

          {/* ERROR */}
          {step === "error" && (
            <div className="py-12 space-y-6 text-center">
              <div className="text-6xl">😔</div>
              <div>
                <h3 className="text-xl font-black text-gray-900">
                  Ups, algo salió mal
                </h3>
                <p className="mt-2 text-sm text-red-600">{error}</p>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleClose}
                  className="rounded-xl border-2 border-gray-200 px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => setStep("confirm")}
                  className="rounded-xl bg-linear-to-r from-purple-600 to-pink-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg"
                >
                  🔄 Reintentar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}