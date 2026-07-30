import { useState, useEffect } from "react";

interface Props {
  isOpen: boolean;
  productName: string;
  currentPrice: number;
  basePrice: number;
  suggestedPrice: number;
  onClose: () => void;
  onSave: (newPrice: number) => Promise<void>;
}

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

export default function EditPriceModal({
  isOpen,
  productName,
  currentPrice,
  basePrice,
  suggestedPrice,
  onClose,
  onSave,
}: Props) {
  const [price, setPrice] = useState(currentPrice.toFixed(2));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPrice(currentPrice.toFixed(2));
    }
  }, [isOpen, currentPrice]);

  if (!isOpen) return null;

  const parsedPrice = parseFloat(price);
  const isValid = !isNaN(parsedPrice) && parsedPrice > basePrice;
  const margin = isValid ? parsedPrice - basePrice : 0;
  const marginPct = isValid ? ((margin / basePrice) * 100).toFixed(0) : "0";

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    try {
      await onSave(parsedPrice);
      onClose();
    } catch (err) {
      alert("Error al guardar: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
              💰 Editar precio
            </div>
            <h2 className="mt-1 text-xl font-bold text-gray-900">{productName}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Info de referencia */}
        <div className="mt-5 space-y-2 rounded-2xl bg-gray-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">💰 Costo (proveedor):</span>
            <span className="font-bold text-gray-900">{formatCurrency(basePrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">📊 Precio sugerido:</span>
            <span className="font-bold text-emerald-700">{formatCurrency(suggestedPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">🏷️ Precio actual:</span>
            <span className="font-bold text-blue-700">{formatCurrency(currentPrice)}</span>
          </div>
        </div>

        {/* Input nuevo precio */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-700">
            💵 Nuevo precio de venta (S/)
          </label>
          <input
            type="number"
            step="0.01"
            min={basePrice + 0.01}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-lg font-bold outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
            autoFocus
          />

          {isValid && (
            <div className="mt-3 rounded-xl bg-emerald-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800">
                  💚 Ganancia por unidad
                </span>
                <div className="text-right">
                  <div className="text-lg font-black text-emerald-700">
                    {formatCurrency(margin)}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-600">
                    +{marginPct}% margen
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isValid && parsedPrice <= basePrice && (
            <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">
              ⚠️ El precio debe ser mayor a {formatCurrency(basePrice)} (costo del proveedor).
            </div>
          )}
        </div>

        {/* Quick actions - precios sugeridos */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setPrice(suggestedPrice.toFixed(2))}
            className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-200"
          >
            📊 Sugerido {formatCurrency(suggestedPrice)}
          </button>
          <button
            onClick={() => setPrice((basePrice * 1.5).toFixed(2))}
            className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-200"
          >
            +50%
          </button>
          <button
            onClick={() => setPrice((basePrice * 2).toFixed(2))}
            className="rounded-full bg-purple-100 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-200"
          >
            2x
          </button>
        </div>

        {/* Botones */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || saving || parsedPrice === currentPrice}
            className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-bold text-white shadow transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Guardando..." : "✓ Guardar precio"}
          </button>
        </div>
      </div>
    </div>
  );
}