// src/pages/vendor/DropshipAIPage.tsx
// 🤖 Dropship AI - Dashboard principal
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMySubscription,
  getMyGenerations,
  getMyFavorites,
  removeFavorite,
  AI_PLANS,
  formatCreditsDisplay,
  getDaysUntilTrialEnd,
  getDaysUntilReset,
  type AISubscription,
  type AIGeneration,
  type AIFavorite,
} from "../../lib/dropship-ai";
import UpgradePlanModal from "../../components/vendor/UpgradePlanModal";

const CONTENT_ICONS = {
  caption: "📝",
  hashtags: "🏷️",
  whatsapp: "💬",
  email: "📧",
  reel_script: "🎬",
};

export default function DropshipAIPage() {
  const [subscription, setSubscription] = useState<AISubscription | null>(null);
  const [generations, setGenerations] = useState<AIGeneration[]>([]);
  const [favorites, setFavorites] = useState<AIFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"history" | "favorites">("history");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [sub, gens, favs] = await Promise.all([
        getMySubscription(),
        getMyGenerations(50),
        getMyFavorites(),
      ]);
      setSubscription(sub);
      setGenerations(gens);
      setFavorites(favs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRemoveFavorite(favId: string) {
    if (!confirm("¿Eliminar de favoritos?")) return;
    try {
      await removeFavorite(favId);
      setFavorites((prev) => prev.filter((f) => f.id !== favId));
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-5xl">🤖</div>
          <p className="mt-3 text-sm text-gray-500">Cargando Dropship AI...</p>
        </div>
      </div>
    );
  }

  const plan = subscription ? AI_PLANS[subscription.plan] : null;
  const creditsPct = subscription
    ? subscription.credits_total >= 999999
      ? 100
      : Math.round((subscription.credits_remaining / subscription.credits_total) * 100)
    : 0;

  const trialDays = subscription?.is_trial
    ? getDaysUntilTrialEnd(subscription.expires_at)
    : 0;
  const resetDays = subscription ? getDaysUntilReset(subscription.credits_reset_at) : 0;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="overflow-hidden rounded-3xl bg-linear-to-br from-purple-600 via-fuchsia-600 to-pink-600 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-4xl sm:text-5xl">🤖✨</span>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider opacity-90">
                  Dropship AI
                </div>
                <h1 className="text-2xl font-black sm:text-3xl">
                  Tu marketing en piloto automático
                </h1>
              </div>
            </div>
            <p className="mt-2 max-w-xl text-sm opacity-90">
              Genera captions, hashtags, mensajes y más con inteligencia artificial en segundos.
            </p>
          </div>

          {plan && (
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{plan.emoji}</span>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider opacity-90">
                    Plan actual
                  </div>
                  <div className="text-lg font-black">{plan.name}</div>
                </div>
              </div>
              {subscription?.is_trial && (
                <div className="mt-2 rounded-lg bg-yellow-400 px-3 py-1 text-center text-xs font-black text-yellow-900">
                  🎁 TRIAL · {trialDays}d restantes
                </div>
              )}
            </div>
          )}
        </div>

        {/* Créditos */}
        {subscription && (
          <div className="mt-6 rounded-2xl bg-white/15 p-4 backdrop-blur">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-bold">💎 Créditos disponibles</span>
              <span className="font-black">
                {formatCreditsDisplay(subscription.credits_remaining, subscription.credits_total)}
              </span>
            </div>
            {subscription.credits_total < 999999 && (
              <>
                <div className="h-2 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full bg-linear-to-r from-yellow-300 to-orange-400 transition-all"
                    style={{ width: `${creditsPct}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] opacity-80">
                  Se renuevan en {resetDays} días
                </div>
              </>
            )}
          </div>
        )}

        {/* CTA Upgrade */}
        {subscription && subscription.plan !== "business" && (
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="mt-4 w-full rounded-xl bg-white py-3 text-sm font-black text-purple-600 shadow-lg transition hover:shadow-xl active:scale-95"
          >
            ⚡ Upgrade a {subscription.plan === "starter" ? "Creator" : subscription.plan === "creator" ? "Pro" : "Business"}
          </button>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          to="/vendor/products"
          className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <div className="rounded-xl bg-purple-100 p-3 text-2xl">🎨</div>
          <div>
            <div className="font-bold text-gray-900">Generar contenido</div>
            <div className="text-xs text-gray-500">Elige un producto</div>
          </div>
        </Link>

        <button
          onClick={() => setActiveTab("history")}
          className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <div className="rounded-xl bg-blue-100 p-3 text-2xl">📜</div>
          <div className="text-left">
            <div className="font-bold text-gray-900">Historial</div>
            <div className="text-xs text-gray-500">{generations.length} generaciones</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("favorites")}
          className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <div className="rounded-xl bg-yellow-100 p-3 text-2xl">⭐</div>
          <div className="text-left">
            <div className="font-bold text-gray-900">Favoritos</div>
            <div className="text-xs text-gray-500">{favorites.length} guardados</div>
          </div>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-3 text-sm font-bold transition ${
            activeTab === "history"
              ? "border-b-2 border-purple-500 text-purple-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📜 Historial
        </button>
        <button
          onClick={() => setActiveTab("favorites")}
          className={`px-4 py-3 text-sm font-bold transition ${
            activeTab === "favorites"
              ? "border-b-2 border-purple-500 text-purple-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          ⭐ Favoritos
        </button>
      </div>

      {/* Content */}
      {activeTab === "history" ? (
        generations.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <div className="text-6xl">🎨</div>
            <h3 className="mt-4 text-lg font-bold text-gray-900">
              Aún no has generado contenido
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Ve a "Mis productos" y genera tu primera pieza de marketing con AI.
            </p>
            <Link
              to="/vendor/products"
              className="mt-4 inline-block rounded-full bg-linear-to-r from-purple-600 to-pink-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg"
            >
              🚀 Empezar ahora
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {generations.map((gen) => (
              <div
                key={gen.id}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-lg">
                      {CONTENT_ICONS[gen.content_type] || "📄"}
                    </span>
                    <span className="font-bold uppercase tracking-wider text-gray-600">
                      {gen.content_type}
                    </span>
                    {gen.platform && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        {gen.platform}
                      </span>
                    )}
                    {gen.tone && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                        {gen.tone}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {new Date(gen.created_at).toLocaleString("es-PE", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto p-4">
                  <p className="whitespace-pre-wrap text-sm text-gray-800">
                    {gen.result}
                  </p>
                </div>

                <div className="flex gap-2 border-t border-gray-100 bg-gray-50 p-3">
                  <button
                    onClick={() => handleCopy(gen.result, gen.id)}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                      copiedId === gen.id
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-900 text-white hover:bg-gray-800"
                    }`}
                  >
                    {copiedId === gen.id ? "✅ Copiado" : "📋 Copiar todo"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : favorites.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
          <div className="text-6xl">⭐</div>
          <h3 className="mt-4 text-lg font-bold text-gray-900">
            No tienes favoritos aún
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Marca tus generaciones favoritas para acceder rápido a ellas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="overflow-hidden rounded-2xl border-2 border-yellow-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-gray-100 bg-yellow-50 px-4 py-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-lg">⭐</span>
                  {fav.label && (
                    <span className="font-bold text-gray-700">{fav.label}</span>
                  )}
                  {fav.generation && (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-700">
                      {fav.generation.content_type}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveFavorite(fav.id)}
                  className="text-xs text-gray-500 hover:text-red-600"
                >
                  🗑
                </button>
              </div>
              {fav.generation && (
                <div className="max-h-40 overflow-y-auto p-4">
                  <p className="whitespace-pre-wrap text-sm text-gray-800">
                    {fav.generation.result}
                  </p>
                </div>
              )}
              {fav.generation && (
                <div className="flex gap-2 border-t border-gray-100 bg-gray-50 p-3">
                  <button
                    onClick={() => handleCopy(fav.generation!.result, fav.id)}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                      copiedId === fav.id
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-900 text-white hover:bg-gray-800"
                    }`}
                  >
                    {copiedId === fav.id ? "✅ Copiado" : "📋 Copiar"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal upgrade */}
      <UpgradePlanModal
        isOpen={showUpgradeModal}
        currentPlan={subscription?.plan || "starter"}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={loadData}
      />
    </div>
  );
}