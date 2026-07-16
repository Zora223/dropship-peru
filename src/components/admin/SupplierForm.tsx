import { useEffect, useState } from "react";
import {
  createSupplier,
  updateSupplier,
  type LegacySupplierInput,
} from "../../lib/suppliers";
import type { DbSupplier } from "../../types/database";

interface SupplierFormProps {
  initial?: DbSupplier | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY_FORM: LegacySupplierInput = {
  name: "",
  contact_email: "",
  contact_phone: null,
  notes: null,
  is_active: true,
};

export default function SupplierForm({
  initial,
  onClose,
  onSaved,
}: SupplierFormProps) {
  const [form, setForm] = useState<LegacySupplierInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(initial);

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        contact_email: initial.contact_email,
        contact_phone: initial.contact_phone,
        notes: initial.notes,
        is_active: initial.is_active,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [initial]);

  function updateField<K extends keyof LegacySupplierInput>(
    key: K,
    value: LegacySupplierInput[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function validateForm() {
    if (!form.name.trim()) {
      throw new Error("Ingresa el nombre del proveedor.");
    }

    if (!form.contact_email.trim()) {
      throw new Error("Ingresa el correo del proveedor.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(form.contact_email.trim())) {
      throw new Error("Ingresa un correo válido.");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);

      validateForm();

      const payload: LegacySupplierInput = {
        name: form.name.trim(),
        contact_email: form.contact_email.trim(),
        contact_phone: form.contact_phone?.trim() || null,
        notes: form.notes?.trim() || null,
        is_active: form.is_active,
      };

      if (initial) {
        await updateSupplier(initial.id, payload);
      } else {
        await createSupplier(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al guardar proveedor"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-100 p-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Proveedor
            </div>

            <h2 className="text-2xl font-bold text-gray-900">
              {isEditing ? "Editar proveedor" : "Nuevo proveedor"}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Nombre del proveedor
            </label>

            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
              placeholder="Ej: Importadora Lima SAC"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Correo de contacto
            </label>

            <input
              type="email"
              value={form.contact_email}
              onChange={(event) =>
                updateField("contact_email", event.target.value)
              }
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
              placeholder="proveedor@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Teléfono opcional
            </label>

            <input
              value={form.contact_phone ?? ""}
              onChange={(event) =>
                updateField("contact_phone", event.target.value)
              }
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
              placeholder="987654321"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Notas opcionales
            </label>

            <textarea
              value={form.notes ?? ""}
              onChange={(event) => updateField("notes", event.target.value)}
              rows={3}
              className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
              placeholder="Condiciones, horarios, observaciones..."
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-gray-50 p-4">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                updateField("is_active", event.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
            />

            <div>
              <div className="text-sm font-bold text-gray-900">
                Proveedor activo
              </div>
              <div className="text-xs text-gray-500">
                Los productos de proveedores activos pueden usarse en el catálogo.
              </div>
            </div>
          </label>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Guardando..."
                : isEditing
                ? "Guardar cambios"
                : "Crear proveedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}