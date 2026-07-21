// src/pages/vendor/VendorDeliverySettingsPage.tsx
// 🆕 v16 FASE 3 - Configuración de entregas del vendor
import { useEffect, useState } from "react";
import {
  getMyDeliverySettings,
  updateMyDeliverySettings,
  DAYS_ORDER,
  DAYS_LABELS,
  PRESET_SLOTS,
} from "../../lib/vendor-delivery-settings";
import type { VendorDeliverySettings } from "../../lib/vendor-delivery-settings";
import { useToast } from "../../contexts/ToastContext";

export default function VendorDeliverySettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<VendorDeliverySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getMyDeliverySettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudo cargar la configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSlot = (day: string, slot: string) => {
    if (!settings) return;
    const current = settings.opening_hours[day] || [];
    const updated = current.includes(slot)
      ? current.filter((s) => s !== slot)
      : [...current, slot].sort();
    setSettings({
      ...settings,
      opening_hours: {
        ...settings.opening_hours,
        [day]: updated,
      },
    });
  };

  const handleToggleDay = (day: string, active: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      opening_hours: {
        ...settings.opening_hours,
        [day]: active ? [...PRESET_SLOTS] : [],
      },
    });
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      await updateMyDeliverySettings({
        accepts_same_day: settings.accepts_same_day,
        same_day_cutoff: settings.same_day_cutoff,
        days_ahead: settings.days_ahead,
        opening_hours: settings.opening_hours,
        delivery_cost: settings.delivery_cost,
        delivery_notes: settings.delivery_notes,
      });
      toast.success("Guardado", "Configuración de entregas actualizada");
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-rose-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          🚚 Configuración de entregas
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Define cuándo y cómo entregas tus pedidos.
        </p>
      </div>

      {/* Info general */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">⚙️ Configuración general</h2>

        <div className="mt-5 space-y-5">
          {/* Costo de delivery */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              💰 Costo del delivery (S/)
            </label>
            <input
              type="number"
              step="0.50"
              min="0"
              value={settings.delivery_cost}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  delivery_cost: parseFloat(e.target.value) || 0,
                })
              }
              className="mt-1.5 w-full max-w-xs rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
            />
            <p className="mt-1 text-xs text-gray-500">
              Este costo se cobra al cliente al hacer delivery a domicilio.
            </p>
          </div>

          {/* Días adelante */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              📅 Días adelante que puedes recibir pedidos
            </label>
            <select
              value={settings.days_ahead}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  days_ahead: parseInt(e.target.value),
                })
              }
              className="mt-1.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
            >
              {[3, 5, 7, 10, 14].map((n) => (
                <option key={n} value={n}>
                  {n} días
                </option>
              ))}
            </select>
          </div>

          {/* Same day */}
          <div className="rounded-2xl bg-gray-50 p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={settings.accepts_same_day}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    accepts_same_day: e.target.checked,
                  })
                }
                className="h-5 w-5 cursor-pointer rounded border-gray-300 text-rose-500 focus:ring-rose-500"
              />
              <div>
                <div className="font-semibold text-gray-900">
                  ⚡ Aceptar entregas el mismo día
                </div>
                <div className="text-xs text-gray-500">
                  Los clientes pueden recibir hoy si compran antes del corte.
                </div>
              </div>
            </label>

            {settings.accepts_same_day && (
              <div className="mt-3 pl-8">
                <label className="block text-xs font-medium text-gray-700">
                  Hora límite para pedidos del día
                </label>
                <input
                  type="time"
                  value={settings.same_day_cutoff}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      same_day_cutoff: e.target.value,
                    })
                  }
                  className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-rose-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Si un cliente compra después de esta hora, verá franjas desde mañana.
                </p>
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              📝 Notas para el cliente (opcional)
            </label>
            <textarea
              rows={2}
              value={settings.delivery_notes || ""}
              onChange={(e) =>
                setSettings({ ...settings, delivery_notes: e.target.value })
              }
              placeholder="Ej: Solo entregamos dentro de Lima Metropolitana."
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
        </div>
      </div>

      {/* Horarios por día */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">📆 Horarios de entrega</h2>
        <p className="mt-1 text-sm text-gray-500">
          Marca las franjas horarias en las que puedes entregar cada día.
        </p>

        <div className="mt-5 space-y-4">
          {DAYS_ORDER.map((day) => {
            const activeSlots = settings.opening_hours[day] || [];
            const isActive = activeSlots.length > 0;

            return (
              <div
                key={day}
                className={`rounded-2xl border-2 p-4 transition ${
                  isActive
                    ? "border-rose-200 bg-rose-50/30"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => handleToggleDay(day, e.target.checked)}
                      className="h-5 w-5 cursor-pointer rounded border-gray-300 text-rose-500 focus:ring-rose-500"
                    />
                    <div className="font-bold text-gray-900">
                      {DAYS_LABELS[day]}
                    </div>
                  </div>

                  {!isActive && (
                    <span className="text-xs font-medium text-gray-400">
                      Cerrado
                    </span>
                  )}
                </div>

                {isActive && (
                  <div className="mt-3 flex flex-wrap gap-2 pl-8">
                    {PRESET_SLOTS.map((slot) => {
                      const isSelected = activeSlots.includes(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => handleToggleSlot(day, slot)}
                          className={`rounded-full border-2 px-4 py-1.5 text-xs font-semibold transition ${
                            isSelected
                              ? "border-rose-500 bg-rose-500 text-white"
                              : "border-gray-200 bg-white text-gray-700 hover:border-rose-300"
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Botón guardar */}
      <div className="sticky bottom-4 z-10">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-full bg-gray-900 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "💾 Guardar configuración"}
        </button>
      </div>
    </div>
  );
}