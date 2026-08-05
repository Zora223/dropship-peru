// src/components/vendor/PhotoStudioAIModal.tsx
import { useState, useEffect } from "react";
import {
  getImagePresets,
  generateAIImage,
  downloadImage,
  getGenerationTypeInfo,
  type ImagePreset,
  type GenerationType,
  type GenerateImageResponse,
} from "../../lib/photo-studio-ai";

interface PhotoStudioAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
  productId?: string;
  productName: string;
  productDescription?: string;
  productImageUrl?: string;
  creditsRemaining: number;
  plan: string;
  onCreditsUpdate?: (newCredits: number) => void;
}

type Step = "select_type" | "select_preset" | "generating" | "result";

export default function PhotoStudioAIModal({
  isOpen,
  onClose,
  vendorId,
  productId,
  productName,
  productDescription,
  productImageUrl,
  creditsRemaining: initialCredits,
  plan,
  onCreditsUpdate,
}: PhotoStudioAIModalProps) {
  const [step, setStep] = useState<Step>("select_type");
  const [selectedType, setSelectedType] = useState<GenerationType | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<ImagePreset | null>(null);
  const [presets, setPresets] = useState<{
    background: ImagePreset[];
    context: ImagePreset[];
    model: ImagePreset[];
  }>({ background: [], context: [], model: [] });
  const [result, setResult] = useState<GenerateImageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState(initialCredits);

  const isUnlimited = plan === "business";

  useEffect(() => {
    if (isOpen) {
      loadPresets();
      setCredits(initialCredits);
    }
  }, [isOpen, initialCredits]);

  useEffect(() => {
    if (!isOpen) {
      // Reset al cerrar
      setStep("select_type");
      setSelectedType(null);
      setSelectedPreset(null);
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  const loadPresets = async () => {
    try {
      const data = await getImagePresets();
      setPresets(data);
    } catch (err) {
      console.error("Error cargando presets:", err);
    }
  };

  const handleSelectType = (type: GenerationType) => {
    setSelectedType(type);
    setStep("select_preset");
  };

  const handleSelectPreset = async (preset: ImagePreset) => {
    if (!isUnlimited && credits < preset.credits_cost) {
      setError(
        `Necesitas ${preset.credits_cost} créditos pero solo tienes ${credits}. Actualiza tu plan.`
      );
      return;
    }

    setSelectedPreset(preset);
    setStep("generating");
    setError(null);

    try {
      const response = await generateAIImage({
        vendor_id: vendorId,
        product_id: productId,
        product_name: productName,
        product_description: productDescription,
        generation_type: selectedType!,
        preset_id: preset.id,
        input_image_url: productImageUrl,
      });

      setResult(response);
      setCredits(response.credits_remaining);
      onCreditsUpdate?.(response.credits_remaining);
      setStep("result");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al generar imagen";
      setError(message);
      setStep("select_preset");
    }
  };

  const handleDownload = async () => {
    if (!result?.image_url) return;
    try {
      await downloadImage(
        result.image_url,
        `${productName.replace(/\s+/g, "-")}-ai.png`
      );
    } catch (err) {
      console.error(err);
      alert("Error al descargar la imagen");
    }
  };

  const handleGenerateAnother = () => {
    setStep("select_type");
    setSelectedType(null);
    setSelectedPreset(null);
    setResult(null);
    setError(null);
  };

  if (!isOpen) return null;

  const currentPresets = selectedType
    ? selectedType === "remove_background"
      ? presets.background
      : selectedType === "context"
      ? presets.context
      : presets.model
    : [];

  const typeInfo = selectedType ? getGenerationTypeInfo(selectedType) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-5 bg-linear-to-r from-purple-600 to-pink-600">
          <div className="flex items-center gap-3 text-white">
            <span className="text-2xl">📸</span>
            <div>
              <h2 className="text-lg font-bold">Photo Studio AI</h2>
              <p className="text-xs text-purple-100">{productName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Créditos */}
            <div className="rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-sm">
              <span className="text-xs font-bold text-white">
                {isUnlimited ? "♾️ ILIMITADO" : `⚡ ${credits} créditos`}
              </span>
            </div>

            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-white transition hover:bg-white/20"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: Seleccionar tipo */}
          {step === "select_type" && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                ¿Qué quieres crear?
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Elige el tipo de imagen profesional que quieres generar con IA
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["remove_background", "context", "model"] as GenerationType[]).map(
                  (type) => {
                    const info = getGenerationTypeInfo(type);
                    return (
                      <button
                        key={type}
                        onClick={() => handleSelectType(type)}
                        className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 p-6 text-left transition hover:border-purple-400 hover:shadow-lg"
                      >
                        <div
                          className={`inline-flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br ${info.color} text-3xl shadow-lg mb-4`}
                        >
                          {info.emoji}
                        </div>

                        <h4 className="text-base font-bold text-gray-900 mb-2">
                          {info.title}
                        </h4>
                        <p className="text-xs text-gray-600 leading-relaxed mb-4">
                          {info.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500">
                            Desde
                          </span>
                          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                            ⚡ {info.minCredits} créditos
                          </span>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>

              {/* Tip */}
              <div className="mt-6 rounded-xl bg-blue-50 border border-blue-200 p-4">
                <p className="text-xs text-blue-800">
                  💡 <strong>Tip:</strong> Para mejores resultados, describe bien
                  tu producto. Cuanto más específico seas, mejor será la imagen
                  generada.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Seleccionar preset */}
          {step === "select_preset" && typeInfo && (
            <div>
              <button
                onClick={() => setStep("select_type")}
                className="flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-700 mb-4"
              >
                ← Volver
              </button>

              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{typeInfo.emoji}</span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {typeInfo.title}
                  </h3>
                  <p className="text-sm text-gray-600">{typeInfo.description}</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-800">⚠️ {error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {currentPresets.map((preset) => {
                  const canAfford = isUnlimited || credits >= preset.credits_cost;

                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      disabled={!canAfford}
                      className={`group relative overflow-hidden rounded-xl border-2 p-4 text-center transition ${
                        canAfford
                          ? "border-gray-200 hover:border-purple-400 hover:shadow-md cursor-pointer"
                          : "border-gray-100 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="text-4xl mb-2">{preset.emoji}</div>
                      <h4 className="text-xs font-bold text-gray-900 mb-2 line-clamp-2">
                        {preset.name}
                      </h4>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          canAfford
                            ? "bg-purple-100 text-purple-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        ⚡ {preset.credits_cost}
                      </span>
                    </button>
                  );
                })}
              </div>

              {!isUnlimited && (
                <div className="mt-6 text-center text-sm text-gray-600">
                  Tienes <strong className="text-purple-700">{credits} créditos</strong>{" "}
                  disponibles
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Generando */}
          {step === "generating" && selectedPreset && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="h-24 w-24 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-3xl">
                  {selectedPreset.emoji}
                </div>
              </div>

              <h3 className="mt-6 text-lg font-bold text-gray-900">
                Generando tu imagen...
              </h3>
              <p className="mt-2 text-sm text-gray-600 text-center max-w-md">
                La IA está creando tu imagen profesional.
                <br />
                Esto tomará entre 5 y 15 segundos.
              </p>

              <div className="mt-6 flex items-center gap-2 text-xs text-purple-600 font-semibold">
                <span className="animate-pulse">✨</span>
                <span>Powered by Cloudflare AI + FLUX</span>
              </div>
            </div>
          )}

          {/* STEP 4: Resultado */}
          {step === "result" && result && (
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 mb-3">
                  <span className="text-lg">✅</span>
                  <span className="text-sm font-bold text-green-700">
                    ¡Imagen generada!
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {result.preset_name}
                </h3>
              </div>

              {/* Imagen resultado */}
              <div className="relative rounded-2xl overflow-hidden bg-gray-100 border-2 border-gray-200 mb-4">
                <img
                  src={result.image_url}
                  alt="Imagen generada"
                  className="w-full h-auto max-h-125 object-contain"
                />
              </div>

              {/* Info */}
              <div className="flex items-center justify-between mb-6 text-sm">
                <span className="text-gray-600">
                  Créditos usados:{" "}
                  <strong className="text-purple-700">
                    ⚡ {result.credits_used}
                  </strong>
                </span>
                <span className="text-gray-600">
                  Restantes:{" "}
                  <strong className="text-purple-700">
                    {isUnlimited ? "♾️" : `⚡ ${result.credits_remaining}`}
                  </strong>
                </span>
              </div>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 rounded-xl bg-linear-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition"
                >
                  📥 Descargar imagen
                </button>
                <button
                  onClick={handleGenerateAnother}
                  className="flex-1 rounded-xl border-2 border-purple-600 px-6 py-3 text-sm font-bold text-purple-600 hover:bg-purple-50 transition"
                >
                  ✨ Generar otra
                </button>
                <button
                  onClick={onClose}
                  className="rounded-xl border-2 border-gray-200 px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}