// src/components/admin/MarkPaidModal.tsx
// Modal reutilizable para confirmar marcado de pago
import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => Promise<void>;
  title: string;
  description: string;
  amount: number;
  confirmLabel?: string;
  colorScheme?: "emerald" | "rose";
}

export default function MarkPaidModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  amount,
  confirmLabel = "Confirmar pago",
  colorScheme = "emerald",
}: Props) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(notes.trim());
      setNotes("");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const colorBtn =
    colorScheme === "emerald"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : "bg-rose-600 hover:bg-rose-700";

  const colorBg =
    colorScheme === "emerald" ? "bg-emerald-50" : "bg-rose-50";
  const colorText =
    colorScheme === "emerald" ? "text-emerald-700" : "text-rose-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Monto destacado */}
          <div className={`rounded-xl ${colorBg} p-4 text-center`}>
            <p className="text-xs uppercase tracking-wide text-gray-600">
              Monto
            </p>
            <p className={`mt-1 text-3xl font-bold ${colorText}`}>
              S/. {amount.toFixed(2)}
            </p>
          </div>

          {/* Notas opcionales */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Yape recibido a las 3:45pm, código operación XYZ..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            />
          </div>

          {/* Advertencia */}
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
            ⚠️ Esta acción quedará registrada con fecha y hora actual. Solo
            confirma si el pago fue realmente recibido.
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-100 p-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`rounded-lg ${colorBtn} px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50`}
          >
            {loading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}