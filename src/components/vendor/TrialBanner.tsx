import type { DbStore } from "../../types/database";
import { getSubscriptionState } from "../../lib/vendor-subscription";

interface TrialBannerProps {
  store: Pick<DbStore, "subscription_status" | "trial_ends_at" | "plan_price">;
}

export default function TrialBanner({ store }: TrialBannerProps) {
  const state = getSubscriptionState(store);

  // No mostramos banner si la suscripción está activa
  if (state.urgency === "active") return null;

  // No mostramos si no hay datos válidos
  if (state.urgency === "unknown") return null;

  const price = Number(store.plan_price ?? 15).toFixed(2);
  const days = state.daysLeft ?? 0;

  // Configuración visual según urgencia
  const config = {
    healthy: {
      icon: "🎁",
      border: "border-emerald-500",
      bg: "bg-emerald-50",
      title: "text-emerald-900",
      text: "text-emerald-800",
      button: "bg-emerald-600 hover:bg-emerald-700",
      titleText: `Tienes ${days} días de prueba gratis`,
      description: `Disfruta todas las funciones. Después: S/${price} al mes.`,
    },
    notice: {
      icon: "⏰",
      border: "border-amber-500",
      bg: "bg-amber-50",
      title: "text-amber-900",
      text: "text-amber-800",
      button: "bg-amber-600 hover:bg-amber-700",
      titleText: `Tu prueba termina en ${days} días`,
      description: `Prepara tu método de pago para no interrumpir tu tienda. S/${price}/mes.`,
    },
    warning: {
      icon: "⚠️",
      border: "border-orange-500",
      bg: "bg-orange-50",
      title: "text-orange-900",
      text: "text-orange-800",
      button: "bg-orange-600 hover:bg-orange-700",
      titleText:
        days === 1
          ? "¡Solo te queda 1 día de prueba!"
          : `Solo te quedan ${days} días de prueba`,
      description: `Renueva ya para seguir vendiendo. S/${price}/mes.`,
    },
    expired: {
      icon: "❌",
      border: "border-red-500",
      bg: "bg-red-50",
      title: "text-red-900",
      text: "text-red-800",
      button: "bg-red-600 hover:bg-red-700",
      titleText: "Tu prueba gratuita expiró",
      description: `Renueva tu suscripción para seguir vendiendo. S/${price}/mes.`,
    },
  }[state.urgency as "healthy" | "notice" | "warning" | "expired"];

  return (
    <div
      className={`rounded-2xl border-l-4 ${config.border} ${config.bg} p-4 sm:p-5`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{config.icon}</span>

          <div>
            <div className={`font-bold ${config.title}`}>
              {config.titleText}
            </div>
            <div className={`mt-0.5 text-sm ${config.text}`}>
              {config.description}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            // Por ahora solo un aviso. Cuando integres pasarela, aquí va la ruta.
            alert(
              "Pronto podrás renovar directo desde aquí. Contáctanos por WhatsApp mientras tanto."
            );
          }}
          className={`shrink-0 rounded-full ${config.button} px-5 py-2.5 text-sm font-bold text-white shadow-sm transition`}
        >
          {state.urgency === "expired" ? "Renovar ahora" : "Ver planes"}
        </button>
      </div>
    </div>
  );
}