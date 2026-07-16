// src/pages/vendor/VendorPickupLocationsPage.tsx
// Gestión de puntos de recojo del vendor

import { useEffect, useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import {
  getMyPickupLocations,
  createPickupLocation,
  updatePickupLocation,
  deletePickupLocation,
  setDefaultPickupLocation,
  guessPickupEmoji,
  type PickupLocation,
  type PickupLocationInput,
} from "../../lib/pickup-locations";

// ============================================
// 📦 FORMULARIO INICIAL VACÍO
// ============================================

const emptyForm: PickupLocationInput = {
  name: "",
  street: "",
  district: "",
  city: "Lima",
  reference: "",
  contact_name: "",
  contact_phone: "",
  notes: "",
  is_default: false,
};

// ============================================
// 🎯 COMPONENTE PRINCIPAL
// ============================================

export default function VendorPickupLocationsPage() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<PickupLocation[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PickupLocationInput>(emptyForm);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  async function loadLocations() {
    try {
      setLoading(true);
      const data = await getMyPickupLocations();
      setLocations(data);
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // 📝 ABRIR MODAL
  // ============================================

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(loc: PickupLocation) {
    setEditingId(loc.id);
    setForm({
      name:          loc.name,
      street:        loc.street,
      district:      loc.district,
      city:          loc.city,
      reference:     loc.reference ?? "",
      contact_name:  loc.contact_name ?? "",
      contact_phone: loc.contact_phone ?? "",
      notes:         loc.notes ?? "",
      is_default:    loc.is_default,
    });
    setMenuOpenId(null);
    setShowModal(true);
  }

  // ============================================
  // 💾 GUARDAR
  // ============================================

  async function handleSave() {
    if (!form.name.trim()) {
      toast.warning("Falta nombre", "Ponle un nombre corto a este punto");
      return;
    }
    if (!form.street.trim() || !form.district.trim()) {
      toast.warning("Faltan datos", "La dirección y el distrito son obligatorios");
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await updatePickupLocation(editingId, form);
        toast.success("Actualizado", "Punto de recojo guardado");
      } else {
        await createPickupLocation(form);
        toast.success("Creado", "Nuevo punto de recojo listo para usar");
      }
      setShowModal(false);
      await loadLocations();
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setSaving(false);
    }
  }

  // ============================================
  // ⭐ MARCAR DEFAULT
  // ============================================

  async function handleSetDefault(id: string) {
    try {
      await setDefaultPickupLocation(id);
      toast.success("Default actualizado", "Este será tu punto por defecto");
      setMenuOpenId(null);
      await loadLocations();
    } catch (err: any) {
      toast.error("Error", err.message);
    }
  }

  // ============================================
  // 🗑️ ELIMINAR
  // ============================================

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"?\n\nSi ya usaste este punto en pedidos anteriores, los pedidos mantienen la dirección original.`)) {
      return;
    }
    try {
      await deletePickupLocation(id);
      toast.success("Eliminado", "Punto de recojo eliminado");
      setMenuOpenId(null);
      await loadLocations();
    } catch (err: any) {
      toast.error("Error", err.message);
    }
  }

  // ============================================
  // 🎨 RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            📍 Puntos de recojo
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona los lugares donde tu delivery recoge los pedidos
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
        >
          + Nuevo punto
        </button>
      </div>

      {/* Empty state */}
      {locations.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
          <div className="text-5xl">📍</div>
          <h3 className="mt-3 text-lg font-bold text-gray-900">
            Aún no tienes puntos de recojo
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Crea tus lugares frecuentes (tu casa, proveedores, almacenes) para
            asignarlos rápidamente al delivery.
          </p>
          <button
            onClick={openNew}
            className="mt-4 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            + Crear mi primer punto
          </button>
        </div>
      )}

      {/* Lista de puntos */}
      {locations.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="relative rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              {/* Badge default */}
              {loc.is_default && (
                <div className="absolute -top-2 left-4 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                  ⭐ Default
                </div>
              )}

              {/* Menú ⋮ */}
              <div className="absolute right-3 top-3">
                <button
                  onClick={() =>
                    setMenuOpenId(menuOpenId === loc.id ? null : loc.id)
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100"
                >
                  ⋮
                </button>
                {menuOpenId === loc.id && (
                  <div className="absolute right-0 top-10 z-10 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                    <button
                      onClick={() => openEdit(loc)}
                      className="block w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                    >
                      ✏️ Editar
                    </button>
                    {!loc.is_default && (
                      <button
                        onClick={() => handleSetDefault(loc.id)}
                        className="block w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                      >
                        ⭐ Marcar como default
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(loc.id, loc.name)}
                      className="block w-full border-t border-gray-100 px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                )}
              </div>

              {/* Contenido */}
              <div className="flex items-start gap-3 pr-8">
                <div className="text-3xl">{guessPickupEmoji(loc.name)}</div>
                <div className="min-w-0 grow">
                  <h3 className="truncate text-lg font-bold text-gray-900">
                    {loc.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {loc.street}
                  </p>
                  <p className="text-sm text-gray-600">
                    {loc.district}, {loc.city}
                  </p>

                  {loc.reference && (
                    <p className="mt-2 text-xs text-gray-500">
                      💡 {loc.reference}
                    </p>
                  )}

                  {(loc.contact_name || loc.contact_phone) && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {loc.contact_name && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                          👤 {loc.contact_name}
                        </span>
                      )}
                      {loc.contact_phone && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                          📞 {loc.contact_phone}
                        </span>
                      )}
                    </div>
                  )}

                  {loc.notes && (
                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      📝 {loc.notes}
                    </p>
                  )}

                  <p className="mt-3 text-xs text-gray-400">
                    📊 Usado en {loc.usage_count} pedido
                    {loc.usage_count === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL NUEVO / EDITAR */}
      {/* ============================================ */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !saving && setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <h3 className="text-xl font-bold text-gray-900">
                {editingId ? "✏️ Editar punto" : "📍 Nuevo punto de recojo"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[70vh] overflow-y-auto p-5">
              <div className="space-y-4">
                {/* Nombre */}
                <Field label="Nombre corto *">
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej: Mi casa, Proveedor Gamarra..."
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </Field>

                {/* Dirección */}
                <Field label="📍 Dirección *">
                  <input
                    type="text"
                    value={form.street}
                    onChange={(e) => setForm({ ...form, street: e.target.value })}
                    placeholder="Calle y número"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </Field>

                {/* Distrito + Ciudad */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Distrito *">
                    <input
                      type="text"
                      value={form.district}
                      onChange={(e) => setForm({ ...form, district: e.target.value })}
                      placeholder="Ej: San Miguel"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </Field>
                  <Field label="Ciudad">
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Lima"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </Field>
                </div>

                {/* Referencia */}
                <Field label="💡 Referencia (opcional)">
                  <input
                    type="text"
                    value={form.reference ?? ""}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    placeholder="Ej: Frente al banco BCP"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </Field>

                {/* Contacto */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="👤 Contacto">
                    <input
                      type="text"
                      value={form.contact_name ?? ""}
                      onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                      placeholder="Nombre"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </Field>
                  <Field label="📞 Teléfono">
                    <input
                      type="tel"
                      value={form.contact_phone ?? ""}
                      onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                      placeholder="999888777"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </Field>
                </div>

                {/* Notas */}
                <Field label="📝 Notas para el delivery (opcional)">
                  <textarea
                    value={form.notes ?? ""}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Ej: Horario 10am-6pm, preguntar por..."
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </Field>

                {/* Default */}
                <label className="flex items-center gap-2 rounded-xl bg-gray-50 p-3">
                  <input
                    type="checkbox"
                    checked={form.is_default}
                    onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    ⭐ Marcar como mi punto por defecto
                  </span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-gray-100 p-5">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? "Guardando..." : editingId ? "💾 Guardar cambios" : "✅ Crear punto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// 🧩 SUB-COMPONENTE — Campo con label
// ============================================

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </label>
      {children}
    </div>
  );
}