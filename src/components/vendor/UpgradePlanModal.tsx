// src/components/vendor/UpgradePlanModal.tsx
// 🤖 Dropship AI - Modal para upgrade de plan
import { useState } from "react";
import { AI_PLANS, requestPlanUpgrade, type AIPlan } from "../../lib/dropship-ai";

// 💜 Yape de Dropship para recibir pagos AI
const DROPSHIP_YAPE = "930-415-718";
const DROPSHIP_YAPE_NAME = "Marco Peña";

interface Props {
  isOpen: boolean;
  currentPlan: AIPlan;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UpgradePlanModal({
  isOpen,
  currentPlan,
  onClose,
  onSuccess,
}: Props) {
  const [selectedPlan, setSelectedPlan] = useState<AIPlan | null>(null);
  const [step, setStep] = useState<"select" | "payment" | "confirm">("select");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const upgradablePlans = (["creator", "pro", "business"] as AIPlan[]).filter(
    (p) => p !== currentPlan && AI_PLANS[p].price > AI_PLANS[currentPlan].price
  );

  const plan = selectedPlan ? AI_PLANS[selectedPlan] : null;

  async function handleConfirmPayment() {
    if (!selectedPlan || !plan) return;

    try {
      setLoading(true);
      setError(null);

      await requestPlanUpgrade({
        plan: selectedPlan as "creator" | "pro" | "business",
        amount: plan.price,
        paymentMethod: "yape",
      });

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
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-linear-to-r from-purple-600 to-pink-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-90">
                🤖 Dropship AI
              </div>
              <h2 className="text-lg font-bold">
                {step === "select" && "⚡ Elige tu plan"}
                {step === "payment" && "💳 Realiza el pago"}
                {step === "confirm" && "⏳ Confirma tu pago"}
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
                Tu solicitud fue enviada al admin. Verificaremos tu pago y activaremos tu plan en las próximas horas.
              </p>
              <p className="mt-2 text-xs text-purple-600">
                Recibirás una notificación por WhatsApp cuando esté activo.
              </p>
            </div>
          ) : step === "select" ? (
            <>
              <p className="mb-6 text-center text-sm text-gray-600">
                Desbloquea el poder completo de Dropship AI 🚀
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                {upgradablePlans.map((planId) => {
                  const p = AI_PLANS[planId];
                  const isPopular = p.id === "creator";

                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPlan(planId);
                        setStep("payment");
                      }}
                      className={`group relative overflow-hidden rounded-2xl border-2 p-6 text-left transition hover:shadow-xl ${
                        isPopular
                          ? "border-purple-500 bg-linear-to-br from-purple-50 to-pink-50"
                          : "border-gray-200 bg-white hover:border-purple-300"
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute right-2 top-2 rounded-full bg-purple-500 px-2 py-0.5 text-[10px] font-black text-white">
                          ⭐ POPULAR
                        </div>
                      )}

                      <div className="text-4xl">{p.emoji}</div>
                      <h3 className="mt-2 text-lg font-black text-gray-900">
                        {p.name}
                      </h3>
                      <div className="mt-1">
                        <span className="text-3xl font-black text-purple-600">
                          S/{p.price}
                        </span>
                        <span className="text-sm text-gray-500">/mes</span>
                      </div>

                      <div className="mt-3 rounded-xl bg-white/50 p-2 text-center">
                        <div className="text-xs font-bold text-purple-700">
                          {p.credits >= 999999 ? "∞ ILIMITADO" : `${p.credits} créditos/mes`}
                        </div>
                      </div>

                      <ul className="mt-4 space-y-1.5 text-xs text-gray-700">
                        {p.features.slice(0, 4).map((f, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-500">✓</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-4 rounded-xl bg-linear-to-r from-purple-600 to-pink-600 py-2 text-center text-sm font-bold text-white transition group-hover:shadow-lg">
                        Elegir plan
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : step === "payment" && plan ? (
            <>
              <div className="mb-6 rounded-2xl bg-linear-to-br from-purple-50 to-pink-50 p-4 text-center">
                <div className="text-3xl">{plan.emoji}</div>
                <h3 className="mt-2 text-lg font-bold text-gray-900">
                  Plan {plan.name}
                </h3>
                <div className="mt-1 text-3xl font-black text-purple-600">
                  S/ {plan.price}.00
                </div>
                <div className="text-xs text-gray-500">por 30 días</div>
              </div>

              {/* Instrucciones de pago */}
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-purple-200 bg-white p-4">
                  <h4 className="font-bold text-purple-900">
                    💜 Pagar con Yape
                  </h4>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between rounded-xl bg-purple-50 p-3">
                      <span className="text-gray-600">Número Yape:</span>
                      <span className="font-black text-purple-900">
                        {DROPSHIP_YAPE}
                      </span>
                    </div>
                    <div className="flex justify-between rounded-xl bg-purple-50 p-3">
                      <span className="text-gray-600">Titular:</span>
                      <span className="font-bold text-purple-900">
                        {DROPSHIP_YAPE_NAME}
                      </span>
                    </div>
                    <div className="flex justify-between rounded-xl bg-purple-50 p-3">
                      <span className="text-gray-600">Monto exacto:</span>
                      <span className="text-lg font-black text-purple-900">
                        S/ {plan.price}.00
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800">
                    ⚠️ <strong>Importante:</strong> En el mensaje de Yape escribe:
                    <br />
                    <code className="mt-1 block rounded bg-yellow-100 px-2 py-1 font-mono">
                      AI-{plan.id.toUpperCase()}
                    </code>
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4 text-sm">
                  <h4 className="font-bold text-gray-900">📋 ¿Cómo funciona?</h4>
                  <ol className="mt-2 space-y-1 text-xs text-gray-700">
                    <li>1. Realiza el Yape con el monto exacto</li>
                    <li>2. Click en "Ya realicé el pago" abajo</li>
                    <li>3. El admin verificará en menos de 24h</li>
                    <li>4. Se activará tu plan y recibirás WhatsApp</li>
                  </ol>
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    ❌ {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("select")}
                    className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    ← Atrás
                  </button>
                  <button
                    onClick={handleConfirmPayment}
                    disabled={loading}
                    className="flex-1 rounded-xl bg-linear-to-r from-purple-600 to-pink-600 py-3 text-sm font-bold text-white shadow-lg transition hover:shadow-xl disabled:opacity-50"
                  >
                    {loading ? "Registrando..." : "✓ Ya realicé el pago"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}