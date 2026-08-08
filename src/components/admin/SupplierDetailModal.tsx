// src/components/admin/SupplierDetailModal.tsx
// Modal de detalle de proveedor con edición de notas admin

import { useState } from "react";
import {
  formatSupplierAddress,
  getCategoryLabel,
  getSupplierStatusLabel,
  getSupplierStatusColor,
  type SupplierWithProfile,
} from "../../lib/suppliers";

interface Props {
  supplier: SupplierWithProfile;
  onClose: () => void;
  onSaveNotes: (notes: string) => void | Promise<void>;
}

export default function SupplierDetailModal({
  supplier,
  onClose,
  onSaveNotes,
}: Props) {
  const [notes, setNotes] = useState(supplier.admin_notes ?? "");
  const [saving, setSaving] = useState(false);
  const notesChanged = notes !== (supplier.admin_notes ?? "");

  async function handleSaveNotes() {
    if (!notesChanged) return;
    setSaving(true);
    try {
      await onSaveNotes(notes);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-linear-to-br from-rose-500 to-pink-600 p-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xl hover:bg-white/30"
          >
            ×
          </button>

          <div className="flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white/20">
              {supplier.logo_url ? (
                <img
                  src={supplier.logo_url}
                  alt={supplier.business_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl">
                  🏭
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black truncate">
                {supplier.business_name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase text-white ${getSupplierStatusColor(supplier)}`}
                >
                  {getSupplierStatusLabel(supplier)}
                </span>
                {supplier.is_verified && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                    ✓ Verificado
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">
          {/* Contacto */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              📞 Contacto
            </h3>
            <div className="rounded-2xl bg-gray-50 p-4 space-y-2 text-sm">
              <Field label="Responsable" value={supplier.profiles?.full_name} />
              <Field label="Email" value={supplier.profiles?.email} />
              <Field label="Teléfono" value={supplier.phone} />
              <Field label="WhatsApp" value={supplier.whatsapp} />
            </div>
          </section>

          {/* Negocio */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              🏢 Negocio
            </h3>
            <div className="rounded-2xl bg-gray-50 p-4 space-y-2 text-sm">
              <Field label="RUC" value={supplier.ruc} />
              <Field label="Categoría" value={getCategoryLabel(supplier.category)} />
              <Field label="Dirección" value={formatSupplierAddress(supplier)} />
              <Field label="Referencia" value={supplier.reference} />
              {supplier.bio && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">
                    Biografía
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {supplier.bio}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Pagos */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              💰 Datos de pago
            </h3>
            <div className="rounded-2xl bg-gray-50 p-4 space-y-2 text-sm">
              <Field label="Yape" value={supplier.yape_number} />
              <Field label="Banco" value={supplier.bank_name} />
              <Field label="Cuenta bancaria" value={supplier.bank_account} />
            </div>
          </section>

          {/* Estadísticas */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              📊 Estadísticas
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-center">
                <div className="text-2xl font-black text-blue-700">
                  {supplier.total_products ?? 0}
                </div>
                <div className="text-[10px] font-bold uppercase text-blue-600">
                  Productos
                </div>
              </div>
              <div className="rounded-2xl bg-purple-50 p-3 text-center">
                <div className="text-2xl font-black text-purple-700">
                  {supplier.total_orders ?? 0}
                </div>
                <div className="text-[10px] font-bold uppercase text-purple-600">
                  Pedidos
                </div>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3 text-center">
                <div className="text-2xl font-black text-amber-700">
                  {supplier.rating > 0 ? Number(supplier.rating).toFixed(1) : "—"}
                </div>
                <div className="text-[10px] font-bold uppercase text-amber-600">
                  Rating
                </div>
              </div>
            </div>
          </section>

          {/* Fechas */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              📅 Historial
            </h3>
            <div className="rounded-2xl bg-gray-50 p-4 space-y-2 text-sm">
              <Field
                label="Registrado"
                value={new Date(supplier.created_at).toLocaleString("es-PE")}
              />
              {supplier.approved_at && (
                <Field
                  label="Aprobado"
                  value={new Date(supplier.approved_at).toLocaleString("es-PE")}
                />
              )}
              <Field
                label="Actualizado"
                value={new Date(supplier.updated_at).toLocaleString("es-PE")}
              />
            </div>
          </section>

          {/* Notas admin */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              📝 Notas del admin (privadas)
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Anotaciones privadas sobre este proveedor..."
              className="w-full rounded-2xl border border-gray-200 bg-amber-50/50 p-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">{notes.length}/500</span>
              <button
                onClick={handleSaveNotes}
                disabled={!notesChanged || saving}
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Guardando..." : "💾 Guardar notas"}
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 shrink-0">
          <button
            onClick={onClose}
            className="w-full rounded-xl border-2 border-gray-200 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helper component ───────────────────────────────
function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-bold uppercase text-gray-500 shrink-0">
        {label}
      </span>
      <span className="text-sm text-gray-800 text-right truncate">
        {value || <span className="text-gray-400 italic">Sin datos</span>}
      </span>
    </div>
  );
}