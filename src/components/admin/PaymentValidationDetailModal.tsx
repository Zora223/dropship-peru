// ============================================================
// COMPONENTE: PaymentValidationDetailModal
// Modal para ver detalle y actuar sobre una validación OCR
// ============================================================

import { useState } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  ShoppingBag,
  DollarSign,
  Hash,
  Calendar,
  Store,
  FileText,
} from "lucide-react";
import type { PaymentValidation } from "../../lib/payment-validations-admin";
import {
  approveValidationManually,
  rejectValidationManually,
} from "../../lib/payment-validations-admin";
import { useToast } from "../../contexts/ToastContext";

interface Props {
  validation: PaymentValidation;
  onClose: () => void;
  onActionComplete: () => void;
}

export function PaymentValidationDetailModal({
  validation,
  onClose,
  onActionComplete,
}: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  // Aprobar manualmente
  const handleApprove = async () => {
    if (!confirm("¿Aprobar este pago y confirmar el pedido?")) return;

    try {
      setLoading(true);
      await approveValidationManually(validation.id, adminNotes);
      toast.success(
        "Pago aprobado",
        "El pedido ha sido confirmado exitosamente"
      );
      onActionComplete();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudo aprobar el pago");
    } finally {
      setLoading(false);
    }
  };

  // Rechazar manualmente
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.warning("Falta razón", "Debes indicar la razón del rechazo");
      return;
    }

    try {
      setLoading(true);
      await rejectValidationManually(validation.id, rejectReason, adminNotes);
      toast.success("Pago rechazado", "La validación fue marcada como rechazada");
      onActionComplete();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudo rechazar el pago");
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    manual_review: "bg-amber-100 text-amber-700 border-amber-200",
  };

  const statusLabels = {
    approved: "Aprobado",
    rejected: "Rechazado",
    manual_review: "Requiere revisión manual",
  };

  const statusIcons = {
    approved: CheckCircle2,
    rejected: XCircle,
    manual_review: AlertTriangle,
  };

  const StatusIcon = statusIcons[validation.status];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-linear-to-r from-purple-600 to-fuchsia-600 text-white p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Validación de Pago</h2>
              <p className="text-purple-100 text-sm">
                {validation.order?.order_number || "Sin número"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Badge de estado */}
          <div
            className={`flex items-center gap-3 p-4 rounded-2xl border ${
              statusColors[validation.status]
            }`}
          >
            <StatusIcon className="w-6 h-6 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">{statusLabels[validation.status]}</p>
              {validation.rejection_reason && (
                <p className="text-sm mt-1 opacity-90">
                  {validation.rejection_reason}
                </p>
              )}
              <p className="text-xs mt-1 opacity-70">
                Confianza: {validation.confidence_score}%
              </p>
            </div>
          </div>

          {/* Grid principal */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Imagen del comprobante */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Comprobante
              </h3>
              {validation.receipt_image_url &&
              validation.receipt_image_url !== "no-uploaded" ? (
                <a
                  href={validation.receipt_image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl overflow-hidden border border-gray-200 hover:shadow-lg transition"
                >
                  <img
                    src={validation.receipt_image_url}
                    alt="Comprobante"
                    className="w-full h-auto"
                  />
                </a>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Imagen no disponible</p>
                </div>
              )}
            </div>

            {/* Datos detectados */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">
                Datos detectados (OCR)
              </h3>

              <div className="space-y-2">
                <InfoRow
                  icon={DollarSign}
                  label="Monto detectado"
                  value={
                    validation.ocr_detected_amount !== null
                      ? `S/. ${validation.ocr_detected_amount.toFixed(2)}`
                      : "No detectado"
                  }
                  status={validation.amount_matches ? "ok" : "error"}
                />
                <InfoRow
                  icon={DollarSign}
                  label="Monto esperado"
                  value={`S/. ${validation.expected_amount.toFixed(2)}`}
                />
                <InfoRow
                  icon={User}
                  label="Destinatario"
                  value={validation.ocr_detected_recipient || "No detectado"}
                />
                <InfoRow
                  icon={Hash}
                  label="Código operación"
                  value={validation.ocr_detected_code || "No detectado"}
                  status={validation.code_is_unique ? "ok" : "error"}
                />
                <InfoRow
                  icon={Calendar}
                  label="Fecha"
                  value={
                    validation.ocr_detected_date
                      ? new Date(validation.ocr_detected_date).toLocaleDateString(
                          "es-PE"
                        )
                      : "No detectada"
                  }
                  status={validation.date_is_recent ? "ok" : "error"}
                />
                <InfoRow
                  icon={FileText}
                  label="Método"
                  value={
                    validation.ocr_detected_method?.toUpperCase() ||
                    "No detectado"
                  }
                />
              </div>
            </div>
          </div>

          {/* Info del pedido y cliente */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <ShoppingBag className="w-4 h-4" />
                Pedido
              </h3>
              <InfoRow
                label="Número"
                value={validation.order?.order_number || "—"}
              />
              <InfoRow
                icon={Store}
                label="Tienda"
                value={validation.order?.store?.name || "—"}
              />
              <InfoRow
                label="Estado actual"
                value={validation.order?.status || "—"}
              />
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <User className="w-4 h-4" />
                Cliente
              </h3>
              <InfoRow
                label="Nombre"
                value={validation.customer?.full_name || "—"}
              />
              <InfoRow
                label="Email"
                value={validation.customer?.email || "—"}
              />
            </div>
          </div>

          {/* Texto OCR crudo (colapsable) */}
          {validation.ocr_raw_text && (
            <details className="bg-gray-50 rounded-2xl p-4">
              <summary className="cursor-pointer font-semibold text-gray-900 select-none">
                Ver texto OCR crudo
              </summary>
              <pre className="mt-3 text-xs bg-white p-3 rounded-xl overflow-x-auto whitespace-pre-wrap text-gray-700">
                {validation.ocr_raw_text}
              </pre>
            </details>
          )}

          {/* Notas admin (si ya fue revisado) */}
          {validation.admin_notes && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <h4 className="font-semibold text-blue-900 mb-1">
                Notas del admin
              </h4>
              <p className="text-sm text-blue-800">{validation.admin_notes}</p>
              {validation.reviewed_at && (
                <p className="text-xs text-blue-600 mt-2">
                  Revisado:{" "}
                  {new Date(validation.reviewed_at).toLocaleString("es-PE")}
                </p>
              )}
            </div>
          )}

          {/* Formulario de rechazo */}
          {showRejectForm && validation.status === "manual_review" && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
              <h4 className="font-semibold text-red-900">Rechazar pago</h4>
              <div>
                <label className="block text-sm font-medium text-red-900 mb-1">
                  Razón del rechazo *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ej: El comprobante no muestra el destinatario correcto"
                  className="w-full border border-red-300 rounded-xl px-3 py-2 text-sm min-h-24 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-red-900 mb-1">
                  Notas internas (opcional)
                </label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Notas para tu registro"
                  className="w-full border border-red-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        {validation.status === "manual_review" && (
          <div className="border-t border-gray-200 p-4 flex flex-col sm:flex-row gap-2 shrink-0 bg-gray-50">
            {!showRejectForm ? (
              <>
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={loading}
                  className="flex-1 bg-white border border-red-300 text-red-700 hover:bg-red-50 font-semibold py-3 rounded-xl transition disabled:opacity-50"
                >
                  Rechazar
                </button>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
                >
                  {loading ? "Procesando..." : "Aprobar y confirmar pedido"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowRejectForm(false)}
                  disabled={loading}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 rounded-xl transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading || !rejectReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
                >
                  {loading ? "Rechazando..." : "Confirmar rechazo"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-componente: fila de info ─────────────────────────
function InfoRow({
  icon: Icon,
  label,
  value,
  status,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  status?: "ok" | "error";
}) {
  const statusColor =
    status === "ok"
      ? "text-emerald-600"
      : status === "error"
      ? "text-red-600"
      : "text-gray-900";

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex items-center gap-2 text-sm text-gray-600 shrink-0">
        {Icon && <Icon className="w-4 h-4" />}
        <span>{label}</span>
      </div>
      <span className={`text-sm font-medium ${statusColor} text-right`}>
        {value}
      </span>
    </div>
  );
}