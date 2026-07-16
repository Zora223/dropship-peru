import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMyStore } from "../../hooks/useMyStore";
import { updateStoreTheme } from "../../lib/vendor-store";
import type { DbStoreTheme } from "../../types/database";

const DEFAULT_THEME: DbStoreTheme = {
  primary_color: "#e11d48",
  secondary_color: "#fb923c",
  font_family: "Inter",
  banner_text: "¡Bienvenido a nuestra tienda!",
  show_banner: true,
  store_motto: "Productos seleccionados para ti",
};

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter / Moderna" },
  { value: "Arial", label: "Arial / Clásica" },
  { value: "Poppins", label: "Poppins / Redondeada" },
  { value: "Montserrat", label: "Montserrat / Elegante" },
  { value: "system-ui", label: "Sistema / Rápida" },
];

const COLOR_PRESETS = [
  {
    name: "Rose",
    primary_color: "#e11d48",
    secondary_color: "#fb923c",
  },
  {
    name: "Purple",
    primary_color: "#7c3aed",
    secondary_color: "#d946ef",
  },
  {
    name: "Blue",
    primary_color: "#2563eb",
    secondary_color: "#06b6d4",
  },
  {
    name: "Green",
    primary_color: "#059669",
    secondary_color: "#14b8a6",
  },
  {
    name: "Dark",
    primary_color: "#111827",
    secondary_color: "#4b5563",
  },
  {
    name: "Gold",
    primary_color: "#ca8a04",
    secondary_color: "#f97316",
  },
];

function normalizeTheme(theme?: DbStoreTheme | null): DbStoreTheme {
  return {
    ...DEFAULT_THEME,
    ...(theme ?? {}),
  };
}

export default function VendorThemePage() {
  const { store, loading: storeLoading, error: storeError, setStore } = useMyStore();

  const [theme, setTheme] = useState<DbStoreTheme>(DEFAULT_THEME);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (store) {
      setTheme(normalizeTheme(store.theme));
    }
  }, [store]);

  const publicStoreUrl = useMemo(() => {
    if (!store?.slug) return "/";
    return `/tienda/${store.slug}`;
  }, [store?.slug]);

  function updateField<K extends keyof DbStoreTheme>(
    key: K,
    value: DbStoreTheme[K]
  ) {
    setTheme((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function applyPreset(preset: {
    primary_color: string;
    secondary_color: string;
  }) {
    setTheme((prev) => ({
      ...prev,
      primary_color: preset.primary_color,
      secondary_color: preset.secondary_color,
    }));
  }

  async function handleSave() {
    if (!store) return;

    try {
      setSaving(true);
      setSuccess(false);
      setError(null);

      if (!theme.primary_color.trim()) {
        throw new Error("El color principal es obligatorio.");
      }

      if (!theme.secondary_color.trim()) {
        throw new Error("El color secundario es obligatorio.");
      }

      await updateStoreTheme(store.id, theme);

      setStore({
        ...store,
        theme,
      });

      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Error al guardar la personalización"
      );
    } finally {
      setSaving(false);
    }
  }

  function resetTheme() {
    const confirmed = window.confirm(
      "¿Seguro que deseas restaurar el tema por defecto?"
    );

    if (!confirmed) return;

    setTheme(DEFAULT_THEME);
  }

  if (storeLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-72 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-100" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-150 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-150 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (storeError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
        {storeError}
      </div>
    );
  }

  if (!store) {
    return (
      <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
        <div className="text-6xl">🏪</div>

        <h2 className="mt-4 text-xl font-bold text-gray-900">
          Aún no tienes tienda
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          Primero crea tu tienda para poder personalizar su apariencia.
        </p>

        <Link
          to="/vendor/settings"
          className="mt-6 inline-block rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-gray-800"
        >
          Crear mi tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Personalizar tienda
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Ajusta colores, textos y apariencia pública de{" "}
            <span className="font-semibold text-gray-700">{store.name}</span>.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to={publicStoreUrl}
            target="_blank"
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            Ver tienda
          </Link>

          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {success && (
        <div className="rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-4">
          <div className="font-bold text-emerald-900">
            ✅ Personalización guardada
          </div>
          <p className="mt-1 text-sm text-emerald-700">
            Los cambios ya están aplicados a tu tienda.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-4">
          <div className="font-bold text-red-900">Error</div>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulario */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              Colores de marca
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Elige los colores principales de tu tienda pública.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Color principal
                </label>

                <div className="mt-1.5 flex gap-2">
                  <input
                    type="color"
                    value={theme.primary_color}
                    onChange={(event) =>
                      updateField("primary_color", event.target.value)
                    }
                    className="h-11 w-14 cursor-pointer rounded-xl border border-gray-200 bg-white p-1"
                  />

                  <input
                    value={theme.primary_color}
                    onChange={(event) =>
                      updateField("primary_color", event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
                    placeholder="#e11d48"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Color secundario
                </label>

                <div className="mt-1.5 flex gap-2">
                  <input
                    type="color"
                    value={theme.secondary_color}
                    onChange={(event) =>
                      updateField("secondary_color", event.target.value)
                    }
                    className="h-11 w-14 cursor-pointer rounded-xl border border-gray-200 bg-white p-1"
                  />

                  <input
                    value={theme.secondary_color}
                    onChange={(event) =>
                      updateField("secondary_color", event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
                    placeholder="#fb923c"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-gray-700">
                Paletas rápidas
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-2xl border border-gray-200 bg-white p-3 text-left transition hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-7 w-7 rounded-full"
                        style={{ backgroundColor: preset.primary_color }}
                      />
                      <span
                        className="h-7 w-7 rounded-full"
                        style={{ backgroundColor: preset.secondary_color }}
                      />
                    </div>

                    <div className="mt-2 text-xs font-bold text-gray-700">
                      {preset.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              Textos de tienda
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Personaliza los mensajes principales que verá el cliente.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Lema de la tienda
                </label>

                <input
                  value={theme.store_motto}
                  onChange={(event) =>
                    updateField("store_motto", event.target.value)
                  }
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
                  placeholder="Ej: Productos únicos para todos los días"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-4">
                  <label className="block text-sm font-semibold text-gray-700">
                    Banner superior
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      updateField("show_banner", !theme.show_banner)
                    }
                    className={`relative h-7 w-13 rounded-full transition ${
                      theme.show_banner ? "bg-gray-900" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                        theme.show_banner ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                <textarea
                  value={theme.banner_text}
                  disabled={!theme.show_banner}
                  onChange={(event) =>
                    updateField("banner_text", event.target.value)
                  }
                  rows={3}
                  className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="Ej: Envíos a todo el Perú"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Tipografía</h2>

            <p className="mt-1 text-sm text-gray-500">
              Elige el estilo de letra para tu tienda pública.
            </p>

            <div className="mt-5">
              <label className="block text-sm font-semibold text-gray-700">
                Fuente
              </label>

              <select
                value={theme.font_family}
                onChange={(event) =>
                  updateField("font_family", event.target.value)
                }
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              onClick={resetTheme}
              type="button"
              className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              Restaurar tema
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar personalización"}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="border-b border-gray-100 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Vista previa
              </div>

              <h2 className="mt-1 text-lg font-bold text-gray-900">
                Así se verá tu tienda
              </h2>
            </div>

            <div
              className="min-h-150 bg-gray-50"
              style={{ fontFamily: theme.font_family }}
            >
              {theme.show_banner && (
                <div
                  className="px-5 py-3 text-center text-sm font-semibold text-white"
                  style={{
                    background: `linear-gradient(90deg, ${theme.primary_color}, ${theme.secondary_color})`,
                  }}
                >
                  {theme.banner_text || "Banner de tu tienda"}
                </div>
              )}

              <div className="p-6">
                <div
                  className="rounded-3xl p-6 text-white shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})`,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/20 text-3xl">
                      {store.logo_url ? (
                        <img
                          src={store.logo_url}
                          alt={store.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        "🏪"
                      )}
                    </div>

                    <div>
                      <h3 className="text-2xl font-black">{store.name}</h3>

                      <p className="mt-1 text-sm text-white/80">
                        {theme.store_motto || "Lema de tu tienda"}
                      </p>
                    </div>
                  </div>

                  {store.description && (
                    <p className="mt-5 text-sm leading-relaxed text-white/85">
                      {store.description}
                    </p>
                  )}

                  <button
                    className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-bold shadow-sm"
                    style={{ color: theme.primary_color }}
                  >
                    Ver productos
                  </button>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-gray-900">
                      Productos destacados
                    </h4>

                    <span
                      className="rounded-full px-3 py-1 text-xs font-bold text-white"
                      style={{ backgroundColor: theme.primary_color }}
                    >
                      Nuevo
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((item) => (
                      <div
                        key={item}
                        className="overflow-hidden rounded-2xl bg-white shadow-sm"
                      >
                        <div className="flex h-28 items-center justify-center bg-gray-100 text-4xl">
                          📦
                        </div>

                        <div className="p-3">
                          <div className="h-3 w-24 rounded bg-gray-200" />
                          <div className="mt-2 h-3 w-16 rounded bg-gray-100" />

                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-sm font-black text-gray-900">
                              S/ 99.90
                            </span>

                            <button
                              className="flex h-8 w-8 items-center justify-center rounded-full text-white"
                              style={{
                                backgroundColor: theme.primary_color,
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
                  <div className="text-sm font-bold text-gray-900">Contacto</div>

                  <div className="mt-2 space-y-1 text-xs text-gray-500">
                    {store.contact_phone && <div>📞 {store.contact_phone}</div>}

                    {store.contact_email && <div>✉️ {store.contact_email}</div>}

                    {store.whatsapp && <div>💬 WhatsApp: {store.whatsapp}</div>}

                    {!store.contact_phone &&
                      !store.contact_email &&
                      !store.whatsapp && (
                        <div>Agrega datos de contacto desde configuración.</div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="font-bold text-blue-900">💡 Consejo</div>

            <p className="mt-1 text-sm text-blue-800">
              Usa colores con buen contraste para que los botones y textos sean
              fáciles de leer en celulares.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}