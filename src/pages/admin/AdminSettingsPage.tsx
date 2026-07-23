// src/pages/admin/AdminSettingsPage.tsx
// 🆕 v19 - Configuración global de la plataforma
// 🆕 v20 - QRs de pago Dropship
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
import PlatformQrCard from "../../components/admin/PlatformQrCard";
import {
  getPlatformQrs,
  type PaymentQr,
  type PaymentQrMethod,
} from "../../lib/payment-qrs";

export default function AdminSettingsPage() {
  const toast = useToast();
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testCost, setTestCost] = useState(50);

  // 🆕 v20 - Estado QRs
  const [platformQrs, setPlatformQrs] = useState<PaymentQr[]>([]);

  async function load() {
    try {
      setLoading(true);
      clearConfigCache();
      const [configData, qrsData] = await Promise.all([
        getPlatformConfig(true),
        getPlatformQrs(),
      ]);
      setConfig(configData);
      setPlatformQrs(qrsData);
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

  // 🆕 v20 - Helper para obtener QR por método
  function getQrByMethod(method: PaymentQrMethod): PaymentQr | null {
    return platformQrs.find((q) => q.payment_method === method) ?? null;
  }

  if (loading || !config) {
    return <div className="p-8 text-center text-gray-500">Cargando...</div>;
  }

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
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Configuración global</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ajusta comisión, márgenes, delivery y QRs de pago de Dropship
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

          <h2 className="text-lg font-bold text-gray-900 mb-4">💳 Cuenta Dropship (legacy)</h2>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Número Yape Dropship (referencia rápida)
            </label>
            <input
              type="text"
              value={config.platform_yape_number}
              onChange={(e) =>
                setConfig({ ...config, platform_yape_number: e.target.value })
              }
              placeholder="930415718"
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              ℹ️ Ahora usa los QRs de abajo para configuración completa
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

      {/* 🆕 v20 - SECCIÓN QRs DE PAGO DROPSHIP */}
      <div className="mt-10">
        <div className="mb-6 rounded-3xl bg-linear-to-br from-purple-600 via-fuchsia-600 to-pink-600 p-6 text-white shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-black">💳 QRs de Cobro Dropship</h2>
              <p className="mt-1 text-sm opacity-90">
                Configura los QRs de pago que verán los clientes al comprar productos del catálogo maestro
              </p>
            </div>
            <div className="hidden sm:block text-6xl opacity-30">📱</div>
          </div>

          <div className="mt-4 rounded-xl bg-white/10 backdrop-blur px-4 py-3 text-xs">
            <div className="font-bold mb-1">ℹ️ ¿Cuándo se muestra cada QR?</div>
            <ul className="space-y-1 opacity-90">
              <li>• Cliente compra <strong>producto de catálogo</strong> → Ve este QR (pago va a Dropship)</li>
              <li>• Cliente compra <strong>producto propio del vendor</strong> → Ve QR del vendor</li>
              <li>• Cliente compra <strong>carrito mixto</strong> → Ve este QR (Dropship redistribuye)</li>
            </ul>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <PlatformQrCard
            paymentMethod="yape"
            existingQr={getQrByMethod("yape")}
            onSaved={load}
          />
          <PlatformQrCard
            paymentMethod="plin"
            existingQr={getQrByMethod("plin")}
            onSaved={load}
          />
          <PlatformQrCard
            paymentMethod="transfer"
            existingQr={getQrByMethod("transfer")}
            onSaved={load}
          />
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