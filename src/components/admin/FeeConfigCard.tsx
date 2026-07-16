// src/components/admin/FeeConfigCard.tsx
// Card colapsable de configuración de fees globales
import { useEffect, useState } from "react";
import {
  getFeeConfig,
  updateFeeConfig,
  previewFee,
  type FeeConfig,
} from "../../lib/admin-fee-config";
import { useToast } from "../../contexts/ToastContext";

interface Props {
  onUpdated?: () => void;
}

export default function FeeConfigCard({ onUpdated }: Props) {
  const toast = useToast();
  const [config, setConfig] = useState<FeeConfig | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form
  const [percent, setPercent] = useState("0");
  const [min, setMin] = useState("3.00");

  // Cargar config actual
  useEffect(() => {
    (async () => {
      try {
        const cfg = await getFeeConfig();
        if (cfg) {
          setConfig(cfg);
          setPercent(String(cfg.fee_percent));
          setMin(String(cfg.fee_min));
        }
      } catch (err) {
        console.error(err);
        toast.error("Error", "No se pudo cargar la configuración");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    const pNum = parseFloat(percent);
    const mNum = parseFloat(min);

    // Validaciones
    if (isNaN(pNum) || pNum < 0 || pNum > 100) {
      toast.warning("Porcentaje inválido", "Debe estar entre 0 y 100");
      return;
    }
    if (isNaN(mNum) || mNum < 0) {
      toast.warning("Mínimo inválido", "Debe ser un número positivo");
      return;
    }

    setSaving(true);
    try {
      await updateFeeConfig(pNum, mNum);
      toast.success("✅ Configuración guardada", "Aplicará a pedidos nuevos");
      const cfg = await getFeeConfig();
      setConfig(cfg);
      onUpdated?.();
      setExpanded(false);
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  const pNum = parseFloat(percent) || 0;
  const mNum = parseFloat(min) || 0;

  // Previews en 3 escenarios comunes
  const scenarios = [
    { gross: 5, label: "S/. 5" },
    { gross: 10, label: "S/. 10" },
    { gross: 20, label: "S/. 20" },
  ].map((s) => ({
    ...s,
    ...previewFee(s.gross, pNum, mNum),
  }));

  return (
    <div className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm">
      {/* Header colapsable */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between p-4 text-left transition hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-500 text-white">
            ⚙️
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              Configuración de comisión
            </h3>
            <p className="text-xs text-gray-500">
              Actual: {config?.fee_percent ?? 0}% (mínimo S/.{" "}
              {Number(config?.fee_min ?? 3).toFixed(2)})
            </p>
          </div>
        </div>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Panel expandido */}
      {expanded && (
        <div className="space-y-4 border-t border-gray-100 p-4">
          {/* Explicación */}
          <div className="rounded-xl bg-indigo-50 p-3 text-xs text-indigo-900">
            💡 <strong>Fórmula:</strong> Comisión = MAX(porcentaje × costo,
            mínimo). Aplica solo a pedidos nuevos (los ya creados mantienen su
            comisión).
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Porcentaje (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  min="0"
                  max="100"
                  step="0.5"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  %
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Ej: 30 = 30% del costo del delivery
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Mínimo (S/.)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  S/.
                </span>
                <input
                  type="number"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                  min="0"
                  step="0.50"
                  className="w-full rounded-lg border border-gray-300 py-2 pl-11 pr-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Comisión mínima garantizada
              </p>
            </div>
          </div>

          {/* Preview */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-700">
              Vista previa (con estos valores):
            </p>
            <div className="grid grid-cols-3 gap-2">
              {scenarios.map((s) => (
                <div
                  key={s.gross}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-2.5"
                >
                  <p className="text-xs text-gray-500">Delivery cobra</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {s.label}
                  </p>
                  <div className="mt-1.5 border-t border-gray-200 pt-1.5">
                    <p className="text-xs text-gray-600">
                      Plataforma:{" "}
                      <span className="font-semibold text-indigo-600">
                        S/. {s.fee.toFixed(2)}
                      </span>
                    </p>
                    <p className="text-xs text-gray-600">
                      Delivery recibe:{" "}
                      <span className="font-semibold text-emerald-600">
                        S/. {s.net.toFixed(2)}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <button
              onClick={() => {
                setPercent(String(config?.fee_percent ?? 0));
                setMin(String(config?.fee_min ?? 3));
                setExpanded(false);
              }}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}