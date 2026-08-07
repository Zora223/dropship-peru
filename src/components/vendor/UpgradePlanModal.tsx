// src/components/vendor/UpgradePlanModal.tsx
// 🍌 Product Launch AI - Modal para upgrade de plan
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { AI_PLANS_INFO, type AIPlan } from "../../lib/ai-subscription";

// 💜 Yape de Dropship para recibir pagos AI
const DROPSHIP_YAPE = "930-415-718";
const DROPSHIP_YAPE_NAME = "Marco Peña";

interface Props {
  isOpen: boolean;
  currentPlan: AIPlan;
  onClose: () => void;
  onSuccess?: () => void;
}

// 📋 Info extendida de cada plan (features)
const PLAN_FEATURES: Record<AIPlan, { features: string[]; description: string }> = {
  starter: {
    description: "Para probar la AI",
    features: [
      "10 créditos/mes",
      "Solo texto (captions, hashtags)",
      "0 Launch Kits",
      "Soporte básico",
    ],
  },
  creator: {
    description: "Para vendedores que empiezan",
    features: [
      "100 créditos/mes",
      "6 Launch Kits completos",
      "Imagen PRO con Nano Banana",
      "Captions + hashtags + WhatsApp",
      "Soporte prioritario",
    ],
  },
  pro: {
    description: "Para vendedores serios",
    features: [
      "500 créditos/mes",
      "33 Launch Kits completos",
      "Todo lo del plan Creator",
      "Analytics avanzados",
      "Soporte VIP",
    ],
  },
  business: {
    description: "Sin límites",
    features: [
      "♾️ Créditos ILIMITADOS",
      "Launch Kits ilimitados",
      "Todo lo del plan Pro",
      "Publicación automática (próx)",
      "Manager dedicado",
    ],
  },
};

export default function UpgradePlanModal({
  isOpen,
  currentPlan,
  onClose,
  onSuccess,
}: Props) {
  const [selectedPlan, setSelectedPlan] = useState<AIPlan | null>(null);
  const [step, setStep] = useState<"select" | "payment">("select");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Planes a los que puede hacer upgrade
  const upgradablePlans = (["creator", "pro", "business"] as AIPlan[]).filter(
    (p) =>
      p !== currentPlan &&
      AI_PLANS_INFO[p].price > AI_PLANS_INFO[currentPlan].price
  );

  const plan = selectedPlan ? AI_PLANS_INFO[selectedPlan] : null;

  async function handleConfirmPayment() {
    if (!selectedPlan || !plan) return;

    try {
      setLoading(true);
      setError(null);

      // Obtener usuario actual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("No hay sesión activa");
      }

      // Registrar solicitud de pago
      const { error: insertError } = await supabase
        .from("ai_upgrade_requests")
        .insert({
          vendor_id: user.id,
          plan_requested: selectedPlan,
          amount: plan.price,
          payment_method: "yape",
          status: "pending",
          reference_code: `AI-${selectedPlan.toUpperCase()}`,
        });

      if (insertError) {
        // Si la tabla no existe aún, mostrar mensaje amigable
        console.error("Insert error:", insertError);
        throw new Error(
          "No se pudo registrar el pago. Contáctanos por WhatsApp: " +
            DROPSHIP_YAPE
        );
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Error registrando pago");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setStep("select");
    setSelectedPlan(null);
    setSuccess(false);
    setError(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-linear-to-r from-purple-600 via-pink-600 to-orange-500 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-90">
                🍌 Product Launch AI
              </div>
              <h2 className="text-lg font-bold">
                {step === "select" && "⚡ Elige tu plan"}
                {step === "payment" && "💳 Realiza el pago"}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {success ? (
            <div className="py-12 text-center">
              <div className="text-6xl">🎉</div>
              <h3 className="mt-4 text-xl font-bold text-gray-900">
                ¡Pago registrado con éxito!
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Tu solicitud fue enviada al admin. Verificaremos tu pago y
                activaremos tu plan en las próximas horas.
              </p>
              <p className="mt-2 text-xs text-purple-600">
                Recibirás una notificación por WhatsApp cuando esté activo.
              </p>
            </div>
          ) : step === "select" ? (
            /* PASO 1: SELECCIÓN DE PLAN */
            <>
              <p className="mb-6 text-center text-sm text-gray-600">
                Desbloquea el poder completo de Product Launch AI 🚀
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                {upgradablePlans.map((planId) => {
                  const p = AI_PLANS_INFO[planId];
                  const features = PLAN_FEATURES[planId];
                  const isPopular = planId === "creator";
                  const isBusiness = planId === "business";

                  return (
                    <button
                      key={planId}
                      onClick={() => {
                        setSelectedPlan(planId);
                        setStep("payment");
                      }}
                      className={`group relative overflow-hidden rounded-2xl border-2 p-5 text-left transition hover:shadow-xl ${
                        isPopular
                          ? "border-purple-500 bg-linear-to-br from-purple-50 to-pink-50"
                          : isBusiness
                          ? "border-orange-500 bg-linear-to-br from-orange-50 to-yellow-50"
                          : "border-gray-200 bg-white hover:border-purple-300"
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute right-2 top-2 rounded-full bg-purple-500 px-2 py-0.5 text-[10px] font-black text-white">
                          ⭐ POPULAR
                        </div>
                      )}
                      {isBusiness && (
                        <div className="absolute right-2 top-2 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black text-white">
                          💎 PREMIUM
                        </div>
                      )}

                      <div className="text-3xl">{p.emoji}</div>
                      <h3 className="mt-2 text-lg font-black text-gray-900">
                        {p.label}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {features.description}
                      </p>

                      <div className="mt-3">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-gray-900">
                            S/{p.price}
                          </span>
                          <span className="text-xs text-gray-500">/mes</span>
                        </div>
                      </div>

                      <div className="mt-4 space-y-1.5">
                        {features.features.map((f, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-1.5 text-xs text-gray-700"
                          >
                            <span className="text-emerald-600 shrink-0">✓</span>
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>

                      <div
                        className={`mt-4 rounded-lg py-2 text-center text-xs font-bold ${
                          isPopular
                            ? "bg-purple-600 text-white"
                            : isBusiness
                            ? "bg-orange-500 text-white"
                            : "bg-gray-900 text-white"
                        }`}
                      >
                        Elegir plan →
                      </div>
                    </button>
                  );
                })}
              </div>

              {upgradablePlans.length === 0 && (
                <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-6 text-center">
                  <div className="text-4xl">👑</div>
                  <h3 className="mt-2 text-lg font-black text-emerald-900">
                    Ya tienes el plan más alto
                  </h3>
                  <p className="mt-1 text-sm text-emerald-700">
                    Disfruta de todas las funciones ilimitadas
                  </p>
                </div>
              )}
            </>
          ) : (
            /* PASO 2: PAGO CON YAPE */
            plan &&
            selectedPlan && (
              <>
                <button
                  onClick={() => {
                    setStep("select");
                    setSelectedPlan(null);
                  }}
                  className="mb-4 flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-800"
                >
                  ← Volver a planes
                </button>

                <div className="rounded-2xl bg-linear-to-br from-purple-50 to-pink-50 border-2 border-purple-200 p-5">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{plan.emoji}</div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-purple-700">
                        Plan seleccionado
                      </div>
                      <h3 className="text-lg font-black text-gray-900">
                        {plan.label} · S/{plan.price}/mes
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  {/* Instrucciones Yape */}
                  <div className="rounded-2xl bg-purple-50 border-2 border-purple-200 p-5">
                    <h4 className="text-sm font-black text-purple-900 uppercase tracking-wider">
                      💜 Paga con Yape
                    </h4>

                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Yape a:</span>
                        <span className="text-sm font-bold text-gray-900">
                          {DROPSHIP_YAPE}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Nombre:</span>
                        <span className="text-sm font-bold text-gray-900">
                          {DROPSHIP_YAPE_NAME}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-purple-200 pt-2">
                        <span className="text-sm text-gray-600">Monto:</span>
                        <span className="text-lg font-black text-purple-700">
                          S/ {plan.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Código de referencia */}
                  <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-sm">
                    ⚠️ <strong>Importante:</strong> En el mensaje de Yape escribe:
                    <br />
                    <code className="mt-2 block rounded bg-yellow-100 px-3 py-2 font-mono text-center text-lg font-black">
                      AI-{selectedPlan.toUpperCase()}
                    </code>
                  </div>

                  {/* Instrucciones paso a paso */}
                  <div className="rounded-2xl bg-gray-50 p-4 text-sm">
                    <h4 className="font-bold text-gray-900">
                      📋 ¿Cómo funciona?
                    </h4>
                    <ol className="mt-2 space-y-1 text-xs text-gray-700">
                      <li>1. Realiza el Yape con el monto exacto</li>
                      <li>
                        2. Click en "Ya realicé el pago" abajo
                      </li>
                      <li>3. El admin verificará en menos de 24h</li>
                      <li>4. Se activará tu plan y recibirás WhatsApp</li>
                    </ol>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                      ❌ {error}
                    </div>
                  )}

                  {/* Botón confirmar */}
                  <button
                    onClick={handleConfirmPayment}
                    disabled={loading}
                    className="w-full rounded-xl bg-linear-to-r from-purple-600 via-pink-600 to-orange-500 py-3 text-sm font-bold text-white shadow-lg transition hover:shadow-xl disabled:opacity-50"
                  >
                    {loading ? "Registrando..." : "✅ Ya realicé el pago"}
                  </button>
                </div>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}