import { useContext } from "react";
import { PlatformSettingsContext } from "../contexts/PlatformSettingsContext";

export function usePlatformSettings() {
  const ctx = useContext(PlatformSettingsContext);

  if (!ctx) {
    throw new Error(
      "usePlatformSettings debe usarse dentro de <PlatformSettingsProvider>"
    );
  }

  return ctx;
}