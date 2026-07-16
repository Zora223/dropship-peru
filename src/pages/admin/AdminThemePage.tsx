import { useEffect, useState } from "react";
import { usePlatformSettings } from "../../hooks/usePlatformSettings";
import { useToast } from "../../contexts/ToastContext";
import {
  PLATFORM_THEMES,
  getSuggestedThemes,
  type PlatformTheme,
  type SeasonalEffect,
} from "../../lib/platform-themes";

const FONT_OPTIONS = [
  { name: "System", value: "system-ui" },
  { name: "Inter", value: "Inter" },
  { name: "Poppins", value: "Poppins" },
  { name: "Roboto", value: "Roboto" },
  { name: "Montserrat", value: "Montserrat" },
];

const EFFECT_OPTIONS: {
  value: SeasonalEffect;
  label: string;
  emoji: string;
}[] = [
  { value: "none", label: "Sin efecto", emoji: "🚫" },
  { value: "snow", label: "Nieve", emoji: "❄️" },
  { value: "confetti", label: "Confetti", emoji: "🎊" },
  { value: "hearts", label: "Corazones", emoji: "💗" },
  { value: "stars", label: "Estrellas", emoji: "⭐" },
];

const CATEGORY_LABELS = {
  brand: "🌹 Marca",
  seasonal: "🎉 Temporadas",
  commercial: "🛒 Comerciales",
  custom: "🎨 Personalizado",
};

// Helper: convierte ISO string a formato compatible con datetime-local
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch {
    return "";
  }
}

// Helper: convierte datetime-local a ISO
function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

// Helper: calcula tiempo restante amigable
function getTimeRemaining(iso: string | null): string {
  if (!iso) return "";
  const target = new Date(iso).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) return "⚠️ Ya expiró";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `⏰ Faltan ${days}d ${hours}h`;
  if (hours > 0) return `⏰ Faltan ${hours}h ${minutes}m`;
  return `⏰ Faltan ${minutes} minutos`;
}

export default function AdminThemePage() {
  const { settings, loading, updateSettings } = usePlatformSettings();
  const toast = useToast();

  // Estados generales
  const [platformName, setPlatformName] = useState(settings.platform_name);
  const [logoUrl, setLogoUrl] = useState<string | null>(settings.logo_url);
  const [primaryColor, setPrimaryColor] = useState(settings.primary_color);
  const [secondaryColor, setSecondaryColor] = useState(
    settings.secondary_color
  );
  const [fontFamily, setFontFamily] = useState(settings.font_family);
  const [activeThemeId, setActiveThemeId] = useState(settings.active_theme_id);
  const [seasonalEffect, setSeasonalEffect] = useState<SeasonalEffect>(
    settings.seasonal_effect as SeasonalEffect
  );

  // Estados del banner (ampliados)
  const [bannerEnabled, setBannerEnabled] = useState(settings.banner_enabled);
  const [bannerText, setBannerText] = useState(settings.banner_text);
  const [bannerLink, setBannerLink] = useState(settings.banner_link);
  const [promoCountdownDate, setPromoCountdownDate] = useState<string>(
    toDatetimeLocal(settings.promo_countdown_date)
  );
  const [promoDismissible, setPromoDismissible] = useState(
    settings.promo_dismissible ?? true
  );
  const [promoLinkText, setPromoLinkText] = useState(
    settings.promo_link_text || "Ver ofertas"
  );
  const [promoHideOnExpire, setPromoHideOnExpire] = useState(
    settings.promo_hide_on_expire ?? true
  );
  const [promoShowIcon, setPromoShowIcon] = useState(
    settings.promo_show_icon ?? true
  );

  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!loading) {
      setPlatformName(settings.platform_name);
      setLogoUrl(settings.logo_url);
      setPrimaryColor(settings.primary_color);
      setSecondaryColor(settings.secondary_color);
      setFontFamily(settings.font_family);
      setActiveThemeId(settings.active_theme_id);
      setBannerEnabled(settings.banner_enabled);
      setBannerText(settings.banner_text);
      setBannerLink(settings.banner_link);
      setSeasonalEffect(settings.seasonal_effect as SeasonalEffect);
      setPromoCountdownDate(toDatetimeLocal(settings.promo_countdown_date));
      setPromoDismissible(settings.promo_dismissible ?? true);
      setPromoLinkText(settings.promo_link_text || "Ver ofertas");
      setPromoHideOnExpire(settings.promo_hide_on_expire ?? true);
      setPromoShowIcon(settings.promo_show_icon ?? true);
      setHasChanges(false);
    }
  }, [loading, settings]);

  const markChanged = () => setHasChanges(true);

  const suggestedThemes = getSuggestedThemes();

  function applyPresetTheme(theme: PlatformTheme) {
    setActiveThemeId(theme.id);
    setPrimaryColor(theme.primary_color);
    setSecondaryColor(theme.secondary_color);
    setFontFamily(theme.font_family);
    setSeasonalEffect(theme.seasonal_effect);

    if (theme.banner_text) {
      setBannerText(theme.banner_text);
      setBannerEnabled(true);
    }
    markChanged();
    toast.info(
      `Tema "${theme.name}" aplicado`,
      "No olvides guardar los cambios"
    );
  }

  // Helpers para countdown
  function setCountdownIn(hours: number) {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    setPromoCountdownDate(toDatetimeLocal(date.toISOString()));
    markChanged();
    toast.info(`Countdown configurado a ${hours}h`);
  }

  function clearCountdown() {
    setPromoCountdownDate("");
    markChanged();
    toast.info("Countdown eliminado");
  }

  async function handleSave() {
    if (!platformName.trim()) {
      toast.warning(
        "Nombre requerido",
        "El nombre de la plataforma no puede estar vacío"
      );
      return;
    }

    if (bannerEnabled && !bannerText.trim()) {
      toast.warning(
        "Banner sin texto",
        "Añade un texto o desactiva el banner"
      );
      return;
    }

    try {
      setSaving(true);

      await updateSettings({
        platform_name: platformName.trim(),
        logo_url: logoUrl?.trim() || null,
        primary_color: primaryColor.trim(),
        secondary_color: secondaryColor.trim(),
        font_family: fontFamily,
        active_theme_id: activeThemeId,
        banner_enabled: bannerEnabled,
        banner_text: bannerText.trim(),
        banner_link: bannerLink.trim(),
        seasonal_effect: seasonalEffect,
        promo_countdown_date: fromDatetimeLocal(promoCountdownDate),
        promo_dismissible: promoDismissible,
        promo_link_text: promoLinkText.trim() || "Ver ofertas",
        promo_hide_on_expire: promoHideOnExpire,
        promo_show_icon: promoShowIcon,
      });

      setHasChanges(false);
      toast.success(
        "¡Cambios guardados!",
        "La configuración global se actualizó correctamente"
      );
    } catch (err) {
      console.error(err);
      toast.error(
        "Error al guardar",
        err instanceof Error ? err.message : "Intenta de nuevo"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-rose-500" />
      </div>
    );
  }

  const themesByCategory = PLATFORM_THEMES.reduce((acc, theme) => {
    (acc[theme.category] ||= []).push(theme);
    return acc;
  }, {} as Record<string, PlatformTheme[]>);

  const countdownRemaining = getTimeRemaining(
    fromDatetimeLocal(promoCountdownDate)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            🎨 Temas y branding
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Personaliza la identidad visual global de la plataforma con temas de
            temporada.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow transition disabled:cursor-not-allowed disabled:opacity-60 ${
            hasChanges ? "bg-gray-900 hover:bg-gray-800" : "bg-gray-400"
          }`}
        >
          {saving
            ? "Guardando..."
            : hasChanges
            ? "💾 Guardar cambios"
            : "✓ Sin cambios"}
        </button>
      </div>

      {/* Temas sugeridos */}
      {suggestedThemes.length > 0 && (
        <div className="rounded-3xl border-2 border-amber-200 bg-linear-to-br from-amber-50 to-orange-50 p-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <h2 className="text-lg font-bold text-gray-900">
              Temas sugeridos para este mes
            </h2>
          </div>

          <p className="mt-1 text-sm text-gray-600">
            Aprovecha la temporada actual para conectar mejor con tus clientes.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {suggestedThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => applyPresetTheme(theme)}
                className={`group relative overflow-hidden rounded-2xl bg-linear-to-br ${
                  theme.preview_gradient
                } p-4 text-left text-white shadow-lg transition hover:scale-105 ${
                  activeThemeId === theme.id ? "ring-4 ring-gray-900" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-3xl">{theme.emoji}</div>
                  {activeThemeId === theme.id && (
                    <span className="rounded-full bg-white/30 px-2 py-0.5 text-xs font-bold backdrop-blur">
                      ✓ Activo
                    </span>
                  )}
                </div>
                <div className="mt-3 text-base font-bold">{theme.name}</div>
                <div className="mt-1 text-xs opacity-90">
                  {theme.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna izquierda */}
        <div className="space-y-6 lg:col-span-2">
          {/* Galería completa */}
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              📚 Galería de temas
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Aplica un tema con un solo click. Puedes personalizar los colores
              después.
            </p>

            {(
              Object.keys(themesByCategory) as Array<
                keyof typeof CATEGORY_LABELS
              >
            ).map((category) => (
              <div key={category} className="mt-6">
                <h3 className="text-sm font-bold text-gray-700">
                  {CATEGORY_LABELS[category]}
                </h3>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {themesByCategory[category].map((theme) => {
                    const active = activeThemeId === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => applyPresetTheme(theme)}
                        className={`group relative overflow-hidden rounded-2xl bg-linear-to-br ${
                          theme.preview_gradient
                        } p-4 text-left text-white shadow transition hover:scale-105 hover:shadow-lg ${
                          active ? "ring-4 ring-gray-900 ring-offset-2" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-2xl">{theme.emoji}</div>
                          {active && (
                            <span className="rounded-full bg-white/30 px-2 py-0.5 text-[10px] font-bold backdrop-blur">
                              ✓ ACTIVO
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-sm font-bold">
                          {theme.name}
                        </div>
                        <div className="mt-1 line-clamp-2 text-[11px] opacity-90">
                          {theme.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Identidad */}
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              🏛️ Identidad de la plataforma
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Nombre de la plataforma
                </label>
                <input
                  value={platformName}
                  onChange={(e) => {
                    setPlatformName(e.target.value);
                    markChanged();
                  }}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  URL del logo
                </label>
                <input
                  value={logoUrl ?? ""}
                  onChange={(e) => {
                    setLogoUrl(e.target.value || null);
                    markChanged();
                  }}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:bg-white"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* ==================================== */}
          {/*   📢 BANNER PROMOCIONAL (ampliado)   */}
          {/* ==================================== */}
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  📢 Banner promocional
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Mensaje destacado en la parte superior de toda la plataforma.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setBannerEnabled(!bannerEnabled);
                  markChanged();
                }}
                className={`relative h-7 w-13 shrink-0 rounded-full transition ${
                  bannerEnabled ? "bg-emerald-500" : "bg-gray-300"
                }`}
                aria-label={
                  bannerEnabled ? "Desactivar banner" : "Activar banner"
                }
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                    bannerEnabled ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>

            {bannerEnabled && (
              <div className="mt-5 space-y-5">
                {/* Texto principal */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Texto del banner
                  </label>
                  <input
                    value={bannerText}
                    onChange={(e) => {
                      setBannerText(e.target.value);
                      markChanged();
                    }}
                    placeholder="🎄 ¡Ofertas de Navidad! Envío gratis en compras +S/50"
                    maxLength={120}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:bg-white"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {bannerText.length}/120 caracteres
                  </p>
                </div>

                {/* Link + texto link */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700">
                      Enlace (opcional)
                    </label>
                    <input
                      value={bannerLink}
                      onChange={(e) => {
                        setBannerLink(e.target.value);
                        markChanged();
                      }}
                      placeholder="/promociones o https://..."
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700">
                      Texto del botón CTA
                    </label>
                    <input
                      value={promoLinkText}
                      onChange={(e) => {
                        setPromoLinkText(e.target.value);
                        markChanged();
                      }}
                      placeholder="Ver ofertas"
                      maxLength={30}
                      disabled={!bannerLink}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:bg-white disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* ========== COUNTDOWN ========== */}
                <div className="rounded-2xl border-2 border-purple-100 bg-linear-to-br from-purple-50 to-pink-50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⏰</span>
                    <h3 className="text-sm font-bold text-gray-900">
                      Countdown timer
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    Añade urgencia con un reloj regresivo. Ideal para ofertas
                    por tiempo limitado.
                  </p>

                  {/* Botones rápidos */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCountdownIn(1)}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      +1 hora
                    </button>
                    <button
                      type="button"
                      onClick={() => setCountdownIn(24)}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      +24 horas
                    </button>
                    <button
                      type="button"
                      onClick={() => setCountdownIn(24 * 3)}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      +3 días
                    </button>
                    <button
                      type="button"
                      onClick={() => setCountdownIn(24 * 7)}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      +7 días
                    </button>
                    {promoCountdownDate && (
                      <button
                        type="button"
                        onClick={clearCountdown}
                        className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200"
                      >
                        ✕ Quitar countdown
                      </button>
                    )}
                  </div>

                  {/* Fecha custom */}
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-gray-700">
                      O elige fecha y hora exactas:
                    </label>
                    <input
                      type="datetime-local"
                      value={promoCountdownDate}
                      onChange={(e) => {
                        setPromoCountdownDate(e.target.value);
                        markChanged();
                      }}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>

                  {countdownRemaining && (
                    <div className="mt-3 rounded-lg bg-white/70 p-2.5 text-center text-xs font-bold text-purple-800">
                      {countdownRemaining}
                    </div>
                  )}

                  {/* Toggle: ocultar al expirar */}
                  {promoCountdownDate && (
                    <label className="mt-3 flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={promoHideOnExpire}
                        onChange={(e) => {
                          setPromoHideOnExpire(e.target.checked);
                          markChanged();
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-xs text-gray-700">
                        Ocultar banner automáticamente cuando el countdown
                        llegue a 0
                      </span>
                    </label>
                  )}
                </div>

                {/* ========== OPCIONES EXTRA ========== */}
                <div className="rounded-2xl bg-gray-50 p-4 space-y-3">
                  <h3 className="text-sm font-bold text-gray-900">
                    ⚙️ Opciones adicionales
                  </h3>

                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-800">
                        Permitir cerrar el banner
                      </div>
                      <div className="text-xs text-gray-500">
                        Los usuarios podrán cerrarlo con el botón ✕ (no vuelve
                        a aparecer por 24h)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPromoDismissible(!promoDismissible);
                        markChanged();
                      }}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                        promoDismissible ? "bg-emerald-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                          promoDismissible ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </label>

                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-800">
                        Mostrar ícono animado
                      </div>
                      <div className="text-xs text-gray-500">
                        Ícono de reloj ⏰ o fuego 🔥 (si el countdown está por
                        vencer)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPromoShowIcon(!promoShowIcon);
                        markChanged();
                      }}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                        promoShowIcon ? "bg-emerald-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                          promoShowIcon ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Efecto estacional */}
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              ✨ Efecto animado
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Añade un efecto sutil de partículas cayendo en toda la plataforma.
            </p>

            <div className="mt-5 grid grid-cols-5 gap-3">
              {EFFECT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSeasonalEffect(opt.value);
                    markChanged();
                  }}
                  className={`rounded-2xl border-2 p-3 text-center transition ${
                    seasonalEffect === opt.value
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl">{opt.emoji}</div>
                  <div className="mt-1 text-[11px] font-semibold text-gray-700">
                    {opt.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Colores custom */}
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              🎨 Ajuste fino de colores
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Modifica los colores del tema aplicado.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Color primario
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => {
                      setPrimaryColor(e.target.value);
                      markChanged();
                    }}
                    className="h-10 w-16 cursor-pointer rounded-lg border border-gray-200"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => {
                      setPrimaryColor(e.target.value);
                      markChanged();
                    }}
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 font-mono text-sm outline-none focus:border-gray-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Color secundario
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => {
                      setSecondaryColor(e.target.value);
                      markChanged();
                    }}
                    className="h-10 w-16 cursor-pointer rounded-lg border border-gray-200"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => {
                      setSecondaryColor(e.target.value);
                      markChanged();
                    }}
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 font-mono text-sm outline-none focus:border-gray-900 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-700">
                Tipografía
              </label>
              <div className="mt-3 grid gap-2 sm:grid-cols-5">
                {FONT_OPTIONS.map((font) => (
                  <button
                    key={font.value}
                    onClick={() => {
                      setFontFamily(font.value);
                      markChanged();
                    }}
                    className={`rounded-xl border-2 p-3 text-sm font-bold transition ${
                      fontFamily === font.value
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-100 hover:border-gray-300"
                    }`}
                    style={{ fontFamily: font.value }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha: preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900">
                👁️ Vista previa
              </h2>

              <div
                className="mt-4 overflow-hidden rounded-2xl border border-gray-100"
                style={{ fontFamily }}
              >
                {/* Banner preview con countdown */}
                {bannerEnabled && bannerText && (
                  <div
                    className="relative px-3 py-2 text-white"
                    style={{
                      background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
                    }}
                  >
                    <div className="text-center text-[10px] font-bold leading-tight">
                      {promoShowIcon && promoCountdownDate && "⏰ "}
                      {bannerText}
                    </div>
                    {promoCountdownDate && (
                      <div className="mt-1 flex justify-center gap-0.5 font-mono text-[9px] font-black">
                        <span className="rounded bg-black/25 px-1">00</span>:
                        <span className="rounded bg-black/25 px-1">23</span>:
                        <span className="rounded bg-black/25 px-1">59</span>:
                        <span className="rounded bg-black/25 px-1">59</span>
                      </div>
                    )}
                    {promoDismissible && (
                      <span className="absolute right-1 top-1 text-xs opacity-70">
                        ✕
                      </span>
                    )}
                  </div>
                )}

                {/* Header */}
                <div className="border-b border-gray-100 bg-white p-4">
                  <div className="flex items-center gap-2">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={platformName}
                        className="h-7 w-7 rounded-lg object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {platformName.charAt(0)}
                      </div>
                    )}
                    <div className="text-sm font-bold text-gray-900">
                      {platformName}
                    </div>
                  </div>
                </div>

                {/* Hero */}
                <div
                  className="p-5 text-center text-white"
                  style={{ backgroundColor: secondaryColor }}
                >
                  <div className="text-base font-bold">
                    Tu tienda online en un link
                  </div>
                  <button
                    className="mt-3 rounded-full px-4 py-1.5 text-xs font-bold text-white shadow"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Empezar
                  </button>
                </div>

                {/* Card */}
                <div className="bg-gray-50 p-4">
                  <div className="rounded-xl bg-white p-3 shadow-sm">
                    <div className="text-xs font-semibold text-gray-500">
                      Producto
                    </div>
                    <div className="mt-1 text-sm font-bold text-gray-900">
                      Ejemplo
                    </div>
                    <div
                      className="mt-2 text-xs font-bold"
                      style={{ color: primaryColor }}
                    >
                      S/ 49.90
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`w-full rounded-2xl py-4 text-sm font-bold shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${
                hasChanges
                  ? "bg-gray-900 text-white hover:bg-gray-800"
                  : "bg-gray-300 text-gray-500"
              }`}
            >
              {saving
                ? "Guardando..."
                : hasChanges
                ? "💾 Guardar cambios"
                : "✓ Sin cambios pendientes"}
            </button>

            <div className="rounded-2xl bg-amber-50 p-4 text-xs text-amber-800">
              <strong>💡 Tip:</strong> Cambia el tema según fechas comerciales
              importantes para aumentar el engagement de tus vendedores y
              clientes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}