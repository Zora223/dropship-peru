// src/components/vendor/DropshipAIModal.tsx
// 🤖 Dropship AI - Modal principal
import { useState, useEffect } from "react";
import {
  generateContent,
  getMySubscription,
  addFavorite,
  parseGeneratedContent,
  AI_PLANS,
  type AISubscription,
  type ContentType,
  type Tone,
  type Focus,
  type Platform,
} from "../../lib/dropship-ai";
import type { VendorProductWithRealStock } from "../../lib/vendor-products";
import { useMyStore } from "../../hooks/useMyStore";

interface Props {
  isOpen: boolean;
  product: VendorProductWithRealStock | null;
  onClose: () => void;
  onUpgrade?: () => void;
}

type ContentTypeOption = {
  id: ContentType;
  label: string;
  icon: string;
  desc: string;
};

const CONTENT_TYPES: ContentTypeOption[] = [
  { id: "caption", label: "Caption", icon: "📝", desc: "Post para Instagram/Facebook" },
  { id: "hashtags", label: "Hashtags", icon: "🏷️", desc: "Hashtags optimizados" },
  { id: "whatsapp", label: "WhatsApp", icon: "💬", desc: "Mensaje broadcast" },
  { id: "email", label: "Email", icon: "📧", desc: "Email marketing" },
];

const TONES: { id: Tone; label: string; emoji: string }[] = [
  { id: "friendly", label: "Amigable", emoji: "😊" },
  { id: "professional", label: "Profesional", emoji: "💼" },
  { id: "urgent", label: "Urgente", emoji: "🔥" },
  { id: "storytelling", label: "Historia", emoji: "📖" },
];

const FOCUSES: { id: Focus; label: string; emoji: string }[] = [
  { id: "sales", label: "Ventas", emoji: "💰" },
  { id: "benefits", label: "Beneficios", emoji: "✨" },
  { id: "story", label: "Storytelling", emoji: "📚" },
];

const PLATFORMS: { id: Platform; label: string; emoji: string }[] = [
  { id: "instagram", label: "Instagram", emoji: "📸" },
  { id: "facebook", label: "Facebook", emoji: "👥" },
  { id: "whatsapp", label: "WhatsApp", emoji: "💬" },
  { id: "tiktok", label: "TikTok", emoji: "🎵" },
];

export default function DropshipAIModal({ isOpen, product, onClose, onUpgrade }: Props) {
  const { store } = useMyStore();

  const [contentType, setContentType] = useState<ContentType>("caption");
  const [tone, setTone] = useState<Tone>("friendly");
  const [focus, setFocus] = useState<Focus>("sales");
  const [platform, setPlatform] = useState<Platform>("instagram");

  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<AISubscription | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);

  const [results, setResults] = useState<{
    content: string;
    variations: string[];
    generationId: string;
    contentType: ContentType;
  } | null>(null);

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [favoritedIds, setFavoritedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadSubscription();
      setError(null);
      setResults(null);
      setOutOfCredits(false);
    }
  }, [isOpen]);

  async function loadSubscription() {
    try {
      setLoadingSub(true);
      const sub = await getMySubscription();
      setSubscription(sub);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSub(false);
    }
  }

  async function handleGenerate() {
    if (!product || !store) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setCopiedIndex(null);
    setFavoritedIds(new Set());

    try {
      const result = await generateContent({
        contentType,
        tone,
        focus,
        platform,
        productData: {
          id: product.id,
          name: product.name,
          description: product.description || "",
          price: Number(product.price),
          category: product.category || "General",
        },
        storeData: {
          name: store.name,
          city: "Iquitos", // ✅ FIX: DbStore no tiene 'city', hardcodeado por ahora
          phone: store.whatsapp || undefined,
        },
      });

      const variations = parseGeneratedContent(result.result, contentType);

      setResults({
        content: result.result,
        variations,
        generationId: result.generation_id,
        contentType,
      });

      // Actualizar créditos
      if (subscription) {
        setSubscription({
          ...subscription,
          credits_remaining: result.credits_remaining,
        });
      }
    } catch (err: any) {
      const msg = err.message || "Error generando contenido";
      if (msg.includes("no_credits") || msg.includes("Sin créditos")) {
        setOutOfCredits(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Error copying:", err);
    }
  }

  async function handleFavorite(index: number, text: string) {
    if (!results) return;
    try {
      await addFavorite(results.generationId, text.substring(0, 100));
      setFavoritedIds((prev) => new Set(prev).add(index));
    } catch (err) {
      console.error("Error favoriting:", err);
    }
  }

  if (!isOpen || !product) return null;

  const plan = subscription ? AI_PLANS[subscription.plan] : null;
  const creditsUnlimited = subscription && subscription.credits_total >= 999999;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-linear-to-r from-purple-600 to-pink-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤖✨</span>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider opacity-90">
                    Dropship AI
                  </div>
                  <h2 className="text-lg font-bold">
                    Tu marketing en piloto automático
                  </h2>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Info del plan y créditos */}
          {!loadingSub && subscription && plan && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="text-lg">{plan.emoji}</span>
                <span className="text-sm font-bold">Plan {plan.name}</span>
                {subscription.is_trial && (
                  <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-black text-yellow-900">
                    TRIAL
                  </span>
                )}
              </div>
              <div className="ml-auto text-sm">
                <span className="opacity-80">Créditos:</span>{" "}
                <span className="font-black">
                  {creditsUnlimited
                    ? "∞ ILIMITADO"
                    : `${subscription.credits_remaining} / ${subscription.credits_total}`}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          {/* Producto seleccionado */}
          <div className="mb-6 flex items-center gap-4 rounded-2xl bg-gray-50 p-4">
            {product.images && Array.isArray(product.images) && product.images[0] && (
              <img
                src={String(product.images[0])}
                alt={product.name}
                className="h-16 w-16 rounded-xl object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Generando para:
              </div>
              <h3 className="mt-0.5 truncate font-bold text-gray-900">
                {product.name}
              </h3>
              <div className="text-sm text-gray-500">
                S/ {Number(product.price).toFixed(2)} · {product.category}
              </div>
            </div>
          </div>

          {/* CONFIGURACIÓN */}
          <div className="space-y-6">
            {/* Tipo de contenido */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                🎯 ¿Qué quieres generar?
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CONTENT_TYPES.map((ct) => (
                  <button
                    key={ct.id}
                    onClick={() => setContentType(ct.id)}
                    className={`rounded-2xl border-2 p-3 text-left transition ${
                      contentType === ct.id
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl">{ct.icon}</div>
                    <div className="mt-1 text-sm font-bold text-gray-900">
                      {ct.label}
                    </div>
                    <div className="mt-0.5 text-[10px] text-gray-500">{ct.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tono */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                🎭 Tono del mensaje
              </label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition ${
                      tone === t.id
                        ? "border-purple-500 bg-purple-500 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Enfoque - solo para caption */}
            {contentType === "caption" && (
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  🎯 Enfoque
                </label>
                <div className="flex flex-wrap gap-2">
                  {FOCUSES.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFocus(f.id)}
                      className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition ${
                        focus === f.id
                          ? "border-pink-500 bg-pink-500 text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {f.emoji} {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Plataforma - solo para caption y hashtags */}
            {(contentType === "caption" || contentType === "hashtags") && (
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  📱 Plataforma
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition ${
                        platform === p.id
                          ? "border-indigo-500 bg-indigo-500 text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {p.emoji} {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Botón generar */}
            <button
              onClick={handleGenerate}
              disabled={loading || outOfCredits}
              className="w-full rounded-2xl bg-linear-to-r from-purple-600 to-pink-600 py-4 text-base font-bold text-white shadow-lg transition hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">🧠</span>
                  Creando magia...
                </span>
              ) : (
                <>🚀 Generar con AI</>
              )}
            </button>

            {/* Error */}
            {error && (
              <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">
                ❌ {error}
              </div>
            )}

            {/* Sin créditos */}
            {outOfCredits && (
              <div className="rounded-2xl border-2 border-purple-300 bg-linear-to-br from-purple-50 to-pink-50 p-6 text-center">
                <div className="text-5xl">🎨</div>
                <h3 className="mt-3 text-lg font-bold text-purple-900">
                  ¡Sin créditos por este mes!
                </h3>
                <p className="mt-1 text-sm text-purple-700">
                  Upgrade tu plan para seguir generando contenido increíble.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onUpgrade?.();
                  }}
                  className="mt-4 rounded-full bg-linear-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:shadow-xl"
                >
                  ⚡ Ver planes Premium
                </button>
              </div>
            )}

            {/* Resultados */}
            {results && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                  <div className="text-3xl">✨</div>
                  <p className="mt-2 text-sm font-bold text-emerald-900">
                    ¡Contenido generado con éxito!
                  </p>
                  <p className="text-xs text-emerald-700">
                    {results.variations.length}{" "}
                    {results.variations.length === 1 ? "variación" : "variaciones"} disponibles
                  </p>
                </div>

                {results.variations.map((variation, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                        {results.variations.length > 1
                          ? `Versión ${index + 1}`
                          : "Contenido generado"}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {variation.length} caracteres
                      </span>
                    </div>

                    <div className="p-4">
                      <p className="whitespace-pre-wrap text-sm text-gray-800">
                        {variation}
                      </p>
                    </div>

                    <div className="flex gap-2 border-t border-gray-100 bg-gray-50 p-3">
                      <button
                        onClick={() => handleCopy(variation, index)}
                        className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                          copiedIndex === index
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-900 text-white hover:bg-gray-800"
                        }`}
                      >
                        {copiedIndex === index ? "✅ Copiado" : "📋 Copiar"}
                      </button>

                      <button
                        onClick={() => handleFavorite(index, variation)}
                        disabled={favoritedIds.has(index)}
                        className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                          favoritedIds.has(index)
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                        }`}
                      >
                        {favoritedIds.has(index) ? "⭐ Guardado" : "☆ Favorito"}
                      </button>

                      {store?.whatsapp && contentType === "whatsapp" && (
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(variation)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-600"
                        >
                          💬 Enviar
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}