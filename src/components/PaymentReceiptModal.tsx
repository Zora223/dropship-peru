// ============================================================
// PAYMENT RECEIPT MODAL — Subir comprobante con validación IA
// ============================================================
// Modal donde el cliente:
// 1. Sube su captura de Yape/Plin
// 2. Ve el análisis en tiempo real
// 3. Recibe confirmación automática o pide revisión manual
// ============================================================

import { useState } from "react";
import { validatePaymentReceipt, type ValidationResponse } from "../lib/payment-validation";

interface PaymentReceiptModalProps {
  orderId: string;
  orderNumber: string;
  expectedAmount: number;
  isOpen: boolean;
  onClose: () => void;
  onValidated: (result: ValidationResponse) => void;
}

export default function PaymentReceiptModal({
  orderId,
  orderNumber,
  expectedAmount,
  isOpen,
  onClose,
  onValidated,
}: PaymentReceiptModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileSelect(selectedFile: File) {
    setError(null);
    setResult(null);

    if (!selectedFile.type.startsWith("image/")) {
      setError("Debes subir una imagen (JPG, PNG)");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("La imagen no puede pesar más de 5MB");
      return;
    }

    setFile(selectedFile);

    // Preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(selectedFile);
  }

  async function handleValidate() {
    if (!file) return;

    setValidating(true);
    setError(null);

    try {
      const response = await validatePaymentReceipt(orderId, file);
      setResult(response);

      // Si fue aprobado, notificar al padre
      if (response.status === "approved") {
        setTimeout(() => {
          onValidated(response);
        }, 2500); // Delay para que vea el mensaje de éxito
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error validando el pago");
    } finally {
      setValidating(false);
    }
  }

  function handleReset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  }

  function handleClose() {
    if (validating) return; // No cerrar mientras procesa
    handleReset();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              💳 Subir comprobante
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Pedido: {orderNumber}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={validating}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          {/* Info del monto */}
          <div className="mb-4 rounded-2xl bg-blue-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Monto a pagar
            </div>
            <div className="mt-1 text-2xl font-bold text-blue-900">
              S/. {expectedAmount.toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-blue-700">
              💡 Tu comprobante debe mostrar exactamente este monto.
            </p>
          </div>

          {/* Estado: Sin archivo */}
          {!file && !result && (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center hover:border-amber-400 hover:bg-amber-50">
              <div className="text-5xl">📷</div>
              <div className="mt-3 text-base font-bold text-gray-900">
                Sube tu comprobante
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Captura de Yape, Plin o transferencia
              </div>
              <div className="mt-3 text-xs text-gray-400">
                JPG o PNG · máx 5MB
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
                className="hidden"
              />
            </label>
          )}

          {/* Estado: Archivo cargado, esperando validar */}
          {file && !result && !validating && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-gray-200">
                {preview && (
                  <img
                    src={preview}
                    alt="Comprobante"
                    className="max-h-80 w-full object-contain bg-gray-50"
                  />
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cambiar
                </button>
                <button
                  onClick={handleValidate}
                  className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600"
                >
                  🤖 Validar con IA
                </button>
              </div>
            </div>
          )}

          {/* Estado: Procesando */}
          {validating && (
            <div className="py-10 text-center">
              <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
              <div className="mt-4 text-base font-bold text-gray-900">
                🧠 Procesando con IA...
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Extrayendo monto, código y fecha
              </p>
              <div className="mt-4 space-y-1 text-xs text-gray-400">
                <div>✓ Leyendo imagen</div>
                <div>✓ Detectando texto</div>
                <div>✓ Validando datos</div>
              </div>
            </div>
          )}

          {/* Estado: Resultado */}
          {result && (
            <div className="space-y-4">
              {/* Card de estado */}
              <div
                className={`rounded-2xl p-4 ${
                  result.status === "approved"
                    ? "bg-emerald-50 border-l-4 border-emerald-500"
                    : result.status === "rejected"
                    ? "bg-red-50 border-l-4 border-red-500"
                    : "bg-amber-50 border-l-4 border-amber-500"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {result.status === "approved"
                      ? "✅"
                      : result.status === "rejected"
                      ? "❌"
                      : "⚠️"}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      result.status === "approved"
                        ? "text-emerald-900"
                        : result.status === "rejected"
                        ? "text-red-900"
                        : "text-amber-900"
                    }`}
                  >
                    {result.status === "approved"
                      ? "¡Pago validado!"
                      : result.status === "rejected"
                      ? "Pago rechazado"
                      : "Requiere revisión"}
                  </span>
                </div>
                <p
                  className={`mt-2 text-xs ${
                    result.status === "approved"
                      ? "text-emerald-700"
                      : result.status === "rejected"
                      ? "text-red-700"
                      : "text-amber-700"
                  }`}
                >
                  {result.reason}
                </p>
              </div>

              {/* Detalles OCR */}
              <div className="space-y-2 rounded-2xl bg-gray-50 p-4 text-xs">
                <div className="font-bold text-gray-700">📋 Datos detectados:</div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded bg-white p-2">
                    <div className="text-gray-500">Monto</div>
                    <div className="font-bold text-gray-900">
                      {result.ocr.amount
                        ? `S/. ${result.ocr.amount.toFixed(2)}`
                        : "No detectado"}
                    </div>
                  </div>

                  <div className="rounded bg-white p-2">
                    <div className="text-gray-500">Método</div>
                    <div className="font-bold uppercase text-gray-900">
                      {result.ocr.method === "unknown"
                        ? "No detectado"
                        : result.ocr.method}
                    </div>
                  </div>

                  <div className="rounded bg-white p-2">
                    <div className="text-gray-500">Código</div>
                    <div className="truncate font-mono text-[10px] text-gray-900">
                      {result.ocr.code || "No detectado"}
                    </div>
                  </div>

                  <div className="rounded bg-white p-2">
                    <div className="text-gray-500">Confianza</div>
                    <div className="font-bold text-gray-900">
                      {result.confidence}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3">
                {result.status === "approved" ? (
                  <button
                    onClick={() => onValidated(result)}
                    className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-600"
                  >
                    Continuar →
                  </button>
                ) : result.status === "rejected" ? (
                  <button
                    onClick={handleReset}
                    className="w-full rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
                  >
                    Intentar con otra imagen
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleReset}
                      className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Reintentar
                    </button>
                    <button
                      onClick={() => onValidated(result)}
                      className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
                    >
                      Continuar (revisión manual)
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-xl border-l-4 border-red-500 bg-red-50 p-3 text-xs text-red-800">
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}