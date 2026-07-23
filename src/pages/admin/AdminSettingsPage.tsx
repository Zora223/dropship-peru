// src/pages/admin/AdminSettingsPage.tsx
// 🆕 v19 - Configuración global de la plataforma
import { useEffect, useState } from "react";
import {
  getPlatformConfig,
  updatePlatformConfig,
  clearConfigCache,
  type PlatformConfig,
} from "../../lib/platform-config";
import {
  calculateSuggestedPrice,
  analyzePrice,
} from "../../lib/pricing";
import { useToast } from "../../contexts/ToastContext";

export default function AdminSettingsPage() {
  const toast = useToast();
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testCost, setTestCost] = useState(50);

  async function load() {
    try {
      setLoading(true);
      clearConfigCache();
      const data = await getPlatformConfig(true);
      setConfig(data);
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    if (!config) return;

    try {
      setSaving(true);
      // Actualizar todos los campos
      await Promise.all([
        updatePlatformConfig("commission_pct", config.commission_pct),
        updatePlatformConfig("vendor_margin_pct", config.vendor_margin_pct),
        updatePlatformConfig("vendor_min_margin_pct", config.vendor_min_margin_pct),
        updatePlatformConfig("delivery_cost_default", config.delivery_cost_default),
        updatePlatformConfig("delivery_cost_province", config.delivery_cost_province),
        updatePlatformConfig("free_shipping_min", config.free_shipping_min),
        updatePlatformConfig("platform_yape_number", config.platform_yape_number),
      ]);
      toast.success("✅ Guardado", "Configuración actualizada");
      load();
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !config) {
    return <div className="p-8 text-center text-gray-500">Cargando...</div>;
  }

  // Preview: cálculos en vivo
  const suggested = calculateSuggestedPrice(testCost, {
    commission_pct: config.commission_pct,
    vendor_margin_pct: config.vendor_margin_pct,
    vendor_min_margin_pct: config.vendor_min_margin_pct,
    delivery_cost: config.delivery_cost_default,
  });

  const analysis = analyzePrice(suggested, testCost, {
    commission_pct: config.commission_pct,
    vendor_margin_pct: config.vendor_margin_pct,
    vendor_min_margin_pct: config.vendor_min_margin_pct,
    delivery_cost: config.delivery_cost_default,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Configuración global</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ajusta comisión, márgenes y costos de delivery de toda la plataforma
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CONFIGURACIÓN */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">💰 Márgenes y comisión</h2>

          <div className="space-y-4">
            <ConfigField
              label="Comisión Dropship (%)"
              hint="Se cobra sobre el precio total de venta"
              value={config.commission_pct}
              onChange={(v) => setConfig({ ...config, commission_pct: v })}
              suffix="%"
            />

            <ConfigField
              label="Margen sugerido vendor (%)"
              hint="Usado para calcular el precio sugerido automático"
              value={config.vendor_margin_pct}
              onChange={(v) => setConfig({ ...config, vendor_margin_pct: v })}
              suffix="%"
            />

            <ConfigField
              label="Margen mínimo vendor (%)"
              hint="Por debajo de esto, el sistema mostrará alerta"
              value={config.vendor_min_margin_pct}
              onChange={(v) => setConfig({ ...config, vendor_min_margin_pct: v })}
              suffix="%"
            />
          </div>

          <hr className="my-6" />

          <h2 className="text-lg font-bold text-gray-900 mb-4">🚚 Delivery</h2>

          <div className="space-y-4">
            <ConfigField
              label="Costo delivery Lima (S/)"
              hint="Incluido en el precio final (cliente no lo ve)"
              value={config.delivery_cost_default}
              onChange={(v) => setConfig({ ...config, delivery_cost_default: v })}
              prefix="S/"
            />

            <ConfigField
              label="Costo delivery provincia (S/)"
              hint="Para envíos fuera de Lima"
              value={config.delivery_cost_province}
              onChange={(v) => setConfig({ ...config, delivery_cost_province: v })}
              prefix="S/"
            />
          </div>

          <hr className="my-6" />

          <h2 className="text-lg font-bold text-gray-900 mb-4">💳 Cuenta Dropship</h2>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Número Yape Dropship (admin)
            </label>
            <input
              type="text"
              value={config.platform_yape_number}
              onChange={(e) =>
                setConfig({ ...config, platform_yape_number: e.target.value })
              }
              placeholder="999999999"
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Los clientes verán este número al pagar
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "💾 Guardar configuración"}
          </button>
        </div>

        {/* PREVIEW EN VIVO */}
        <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-purple-900 mb-4">
            🔬 Simulador de precio
          </h2>
          <p className="text-xs text-purple-700 mb-4">
            Prueba cómo se calcula el precio con tu configuración actual
          </p>

          <div className="rounded-xl bg-white p-4 border border-purple-200">
            <label className="block text-xs font-bold text-gray-700 mb-2">
              Costo mayorista (supplier) S/
            </label>
            <input
              type="number"
              value={testCost}
              onChange={(e) => setTestCost(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-lg font-bold text-center focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="mt-4 rounded-xl bg-white p-4 border border-purple-200">
            <div className="text-center">
              <div className="text-xs font-bold text-gray-500 uppercase">
                Precio sugerido al cliente
              </div>
              <div className="mt-1 text-4xl font-black text-purple-700">
                S/ {suggested}
              </div>
            </div>

            <hr className="my-4" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">📦 Supplier</span>
                <span className="font-bold text-gray-900">
                  S/ {analysis.supplier_cost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">🚚 Delivery</span>
                <span className="font-bold text-gray-900">
                  S/ {analysis.delivery_cost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">💼 Comisión ({config.commission_pct}%)</span>
                <span className="font-bold text-gray-900">
                  S/ {analysis.commission_amount.toFixed(2)}
                </span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                <span className="font-bold text-emerald-700">
                  💰 Vendor gana
                </span>
                <span className="font-black text-emerald-700">
                  S/ {analysis.vendor_earning.toFixed(2)} ({analysis.vendor_margin_pct}%)
                </span>
              </div>
            </div>

            {analysis.warning && (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-2 text-xs text-amber-700">
                {analysis.warning}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl bg-linear-to-br from-purple-600 to-fuchsia-600 p-4 text-white">
            <div className="text-xs font-bold uppercase opacity-90">
              💡 Tu ganancia por venta
            </div>
            <div className="mt-1 text-2xl font-black">
              S/ {analysis.commission_amount.toFixed(2)}
            </div>
            <div className="mt-0.5 text-xs opacity-90">
              Por cada producto de S/ {testCost} mayorista
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigField({
  label,
  hint,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 focus-within:border-purple-500">
        {prefix && <span className="text-sm text-gray-500">{prefix}</span>}
        <input
          type="number"
          step="0.5"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="flex-1 border-none bg-transparent text-sm font-bold focus:outline-none"
        />
        {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}