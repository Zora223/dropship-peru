import { createContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import {
  fetchPlatformSettings,
  updatePlatformSettings,
  DEFAULT_PLATFORM_SETTINGS,
} from "../lib/platform-settings";
import type { DbPlatformSettings } from "../types/database";

interface PlatformSettingsContextType {
  settings: DbPlatformSettings;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateSettings: (
    updates: Partial<Omit<DbPlatformSettings, "id">>
  ) => Promise<void>;
}

// Valor por defecto (se usa mientras carga)
const DEFAULT_STATE: DbPlatformSettings = {
  id: 1,
  ...DEFAULT_PLATFORM_SETTINGS,
};

export const PlatformSettingsContext = createContext<
  PlatformSettingsContextType | undefined
>(undefined);

/**
 * Aplica los valores del tema como CSS variables al <html>
 * para que estén disponibles globalmente.
 */
function applyThemeToDocument(settings: DbPlatformSettings) {
  const root = document.documentElement;

  root.style.setProperty("--color-primary", settings.primary_color);
  root.style.setProperty("--color-secondary", settings.secondary_color);
  root.style.setProperty("--font-family", settings.font_family);

  // También cambia el título del documento
  document.title = settings.platform_name;
}

export function PlatformSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<DbPlatformSettings>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchPlatformSettings();
      setSettings(data);
      applyThemeToDocument(data);
    } catch (err) {
      console.error("PlatformSettings load error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar configuración global"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const updateSettings = useCallback(
    async (updates: Partial<Omit<DbPlatformSettings, "id">>) => {
      const updated = await updatePlatformSettings(updates);
      setSettings(updated);
      applyThemeToDocument(updated);
    },
    []
  );

  return (
    <PlatformSettingsContext.Provider
      value={{
        settings,
        loading,
        error,
        refresh,
        updateSettings,
      }}
    >
      {children}
    </PlatformSettingsContext.Provider>
  );
}