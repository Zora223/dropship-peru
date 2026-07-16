import { useEffect, useMemo, useState } from "react";
import { usePlatformSettings } from "../hooks/usePlatformSettings";

// ========== HOOK DE COUNTDOWN ==========
interface CountdownValues {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
}

function useCountdown(targetDate: string | null): CountdownValues {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return useMemo(() => {
    if (!targetDate) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalMs: 0,
        isExpired: true,
      };
    }

    const target = new Date(targetDate).getTime();
    if (isNaN(target)) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalMs: 0,
        isExpired: true,
      };
    }

    const diff = target - now;

    if (diff <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalMs: 0,
        isExpired: true,
      };
    }

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      totalMs: diff,
      isExpired: false,
    };
  }, [targetDate, now]);
}

// ========== UNIDAD DE TIEMPO ==========
function TimeUnit({
  value,
  label,
  urgent = false,
}: {
  value: number;
  label: string;
  urgent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center min-w-8 sm:min-w-10">
      <div
        className={`
          rounded-md bg-black/25 backdrop-blur-sm px-1.5 py-0.5 sm:px-2 sm:py-1
          font-mono font-black text-sm sm:text-base leading-none tabular-nums
          transition-transform
          ${urgent ? "animate-pulse" : ""}
        `}
      >
        {String(value).padStart(2, "0")}
      </div>
      <span className="text-[8px] sm:text-[9px] uppercase tracking-wider opacity-80 mt-0.5 font-semibold">
        {label}
      </span>
    </div>
  );
}

// ========== HELPER: STORAGE KEY ÚNICO POR CONTENIDO ==========
function getStorageKey(text: string, countdownDate: string | null): string {
  // Genera un hash simple del contenido para que si cambias el texto, se muestre de nuevo
  const content = `${text}_${countdownDate || "no-countdown"}`;
  const hash = content.split("").reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
  return `promo-banner-dismissed-${Math.abs(hash)}`;
}

// ========== COMPONENTE PRINCIPAL ==========
export default function PlatformBanner() {
  const { settings } = usePlatformSettings();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const countdown = useCountdown(settings.promo_countdown_date);
  const storageKey = useMemo(
    () =>
      getStorageKey(
        settings.banner_text || "",
        settings.promo_countdown_date
      ),
    [settings.banner_text, settings.promo_countdown_date]
  );

  // Al montar: verificar si el banner fue cerrado previamente
  useEffect(() => {
    if (!settings.promo_dismissible) {
      setMounted(true);
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const dismissedAt = parseInt(stored, 10);
        // El dismiss dura 24 horas
        const isStillDismissed =
          Date.now() - dismissedAt < 24 * 60 * 60 * 1000;

        if (isStillDismissed) {
          setDismissed(true);
        } else {
          // Expiró el dismiss, limpiar
          localStorage.removeItem(storageKey);
        }
      }
    } catch {
      // localStorage puede no estar disponible (modo privado)
    }

    setMounted(true);
  }, [storageKey, settings.promo_dismissible]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, Date.now().toString());
    } catch {
      // Ignorar si localStorage no está disponible
    }
  };

  // ========== EARLY RETURNS ==========

  // No renderizar hasta verificar localStorage (evita flash)
  if (!mounted) return null;

  // No mostrar si está deshabilitado
  if (!settings.banner_enabled || !settings.banner_text) return null;

  // No mostrar si fue cerrado por el usuario
  if (dismissed) return null;

  // No mostrar si el countdown expiró y así está configurado
  const hasCountdown = Boolean(settings.promo_countdown_date);
  if (hasCountdown && countdown.isExpired && settings.promo_hide_on_expire) {
    return null;
  }

  // Countdown urgente (menos de 1 hora)
  const isUrgent = hasCountdown && !countdown.isExpired && countdown.totalMs < 60 * 60 * 1000;

  // ========== RENDER ==========
  const bannerContent = (
    <div
      className="relative w-full overflow-hidden text-white shadow-sm"
      style={{
        background: `linear-gradient(90deg, ${settings.primary_color}, ${settings.secondary_color})`,
      }}
    >
      {/* Patrón de fondo decorativo */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                           radial-gradient(circle at 80% 20%, white 1px, transparent 1px),
                           radial-gradient(circle at 60% 80%, white 1px, transparent 1px)`,
          backgroundSize: "60px 60px, 80px 80px, 100px 100px",
          animation: "banner-float 30s linear infinite",
        }}
      />

      {/* Contenido */}
      <div className="relative flex flex-wrap items-center justify-center gap-2 sm:gap-4 px-4 py-2 sm:py-2.5">
        {/* Ícono + texto */}
        <div className="flex items-center gap-2 text-center sm:text-left">
          {settings.promo_show_icon && hasCountdown && !countdown.isExpired && (
            <span
              className={`text-base sm:text-lg ${
                isUrgent ? "animate-bounce" : "animate-pulse"
              }`}
              aria-hidden="true"
            >
              {isUrgent ? "🔥" : "⏰"}
            </span>
          )}
          <span className="text-xs sm:text-sm font-bold leading-tight">
            {settings.banner_text}
          </span>
        </div>

        {/* Countdown */}
        {hasCountdown && !countdown.isExpired && (
          <div className="flex items-center gap-1">
            <TimeUnit
              value={countdown.days}
              label="días"
              urgent={isUrgent}
            />
            <span className="text-sm font-bold opacity-60 self-start mt-1">
              :
            </span>
            <TimeUnit
              value={countdown.hours}
              label="hrs"
              urgent={isUrgent}
            />
            <span className="text-sm font-bold opacity-60 self-start mt-1">
              :
            </span>
            <TimeUnit
              value={countdown.minutes}
              label="min"
              urgent={isUrgent}
            />
            <span className="text-sm font-bold opacity-60 self-start mt-1">
              :
            </span>
            <TimeUnit
              value={countdown.seconds}
              label="seg"
              urgent={isUrgent}
            />
          </div>
        )}

        {/* Link/CTA */}
        {settings.banner_link && (
          <span
            className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-1 text-xs font-bold transition-colors"
          >
            {settings.promo_link_text || "Ver más"}
            <span aria-hidden="true">→</span>
          </span>
        )}
      </div>

      {/* Botón cerrar */}
      {settings.promo_dismissible && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDismiss();
          }}
          className="absolute top-1/2 -translate-y-1/2 right-2 sm:right-3 flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/20 transition-colors opacity-70 hover:opacity-100"
          aria-label="Cerrar banner promocional"
        >
          <span className="text-sm leading-none" aria-hidden="true">
            ✕
          </span>
        </button>
      )}

      {/* Estilos de animación */}
      <style>{`
        @keyframes banner-float {
          from {
            transform: translateX(0) translateY(0);
          }
          to {
            transform: translateX(-100px) translateY(-30px);
          }
        }
      `}</style>
    </div>
  );

  // Si hay link, envolver todo en <a>
  if (settings.banner_link) {
    return (
      <a
        href={settings.banner_link}
        target={
          settings.banner_link.startsWith("http") ? "_blank" : undefined
        }
        rel={
          settings.banner_link.startsWith("http")
            ? "noopener noreferrer"
            : undefined
        }
        className="block transition hover:brightness-110"
      >
        {bannerContent}
      </a>
    );
  }

  return bannerContent;
}