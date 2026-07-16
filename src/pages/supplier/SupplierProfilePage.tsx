// src/pages/supplier/SupplierProfilePage.tsx
// Página para editar datos del negocio

import { useEffect, useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import {
  getMySupplierProfile,
  upsertMySupplierProfile,
  SUPPLIER_CATEGORIES,
  type SupplierProfile,
} from "../../lib/suppliers";

export default function SupplierProfilePage() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<SupplierProfile | null>(null);

  const [form, setForm] = useState({
    business_name: "",
    ruc: "",
    phone: "",
    whatsapp: "",
    address: "",
    district: "",
    city: "Lima",
    reference: "",
    bio: "",
    category: "",
    yape_number: "",
    bank_account: "",
    bank_name: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const data = await getMySupplierProfile();
      if (data) {
        setProfile(data);
        setForm({
          business_name: data.business_name ?? "",
          ruc: data.ruc ?? "",
          phone: data.phone ?? "",
          whatsapp: data.whatsapp ?? "",
          address: data.address ?? "",
          district: data.district ?? "",
          city: data.city ?? "Lima",
          reference: data.reference ?? "",
          bio: data.bio ?? "",
          category: data.category ?? "",
          yape_number: data.yape_number ?? "",
          bank_account: data.bank_account ?? "",
          bank_name: data.bank_name ?? "",
        });
      }
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!form.business_name.trim()) {
      toast.warning("Falta nombre", "El nombre del negocio es obligatorio");
      return;
    }
    if (!form.whatsapp.trim()) {
      toast.warning("Falta WhatsApp", "Es obligatorio para recibir pedidos");
      return;
    }
    if (!form.yape_number.trim()) {
      toast.warning("Falta Yape", "Es obligatorio para recibir pagos");
      return;
    }

    try {
      setSaving(true);
      await upsertMySupplierProfile({
        ...form,
        whatsapp: form.whatsapp.replace(/\D/g, ""),
        yape_number: form.yape_number.replace(/\D/g, ""),
      });
      toast.success("✅ Guardado", "Datos actualizados correctamente");
      await loadProfile();
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          ⚙️ Mi negocio
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Actualiza los datos de tu negocio
        </p>
      </div>

      {/* Estado de cuenta */}
      {profile && (
        <div
          className={`rounded-2xl border p-4 ${
            profile.is_active
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <p className="text-sm font-bold">
            {profile.is_active ? (
              <span className="text-emerald-700">
                ✅ Cuenta activa
                {profile.is_verified && " y verificada"}
              </span>
            ) : (
              <span className="text-amber-700">
                ⏳ Pendiente de aprobación
              </span>
            )}
          </p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Negocio */}
        <Card title="🏭 Negocio">
          <div className="space-y-4">
            <Field label="Nombre del negocio *">
              <input
                type="text"
                value={form.business_name}
                onChange={(e) =>
                  setForm({ ...form, business_name: e.target.value })
                }
                className={inputClass}
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="RUC">
                <input
                  type="text"
                  value={form.ruc}
                  onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Categoría">
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className={inputClass}
                >
                  <option value="">Sin categoría</option>
                  {SUPPLIER_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Descripción">
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={2}
                className={inputClass}
              />
            </Field>
          </div>
        </Card>

        {/* Contacto */}
        <Card title="📱 Contacto">
          <div className="space-y-4">
            <Field label="WhatsApp * (9 dígitos)">
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                maxLength={9}
                className={inputClass}
                required
              />
            </Field>

            <Field label="Teléfono fijo">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
        </Card>

        {/* Dirección */}
        <Card title="📍 Dirección de recojo">
          <div className="space-y-4">
            <Field label="Dirección">
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={inputClass}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Distrito">
                <input
                  type="text"
                  value={form.district}
                  onChange={(e) =>
                    setForm({ ...form, district: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Ciudad">
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Referencia">
              <input
                type="text"
                value={form.reference}
                onChange={(e) =>
                  setForm({ ...form, reference: e.target.value })
                }
                className={inputClass}
              />
            </Field>
          </div>
        </Card>

        {/* Pagos */}
        <Card title="💰 Datos de pago">
          <div className="space-y-4">
            <Field label="Número de Yape * (para recibir pagos)">
              <input
                type="tel"
                value={form.yape_number}
                onChange={(e) =>
                  setForm({ ...form, yape_number: e.target.value })
                }
                maxLength={9}
                className={inputClass}
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Banco (opcional)">
                <input
                  type="text"
                  value={form.bank_name}
                  onChange={(e) =>
                    setForm({ ...form, bank_name: e.target.value })
                  }
                  placeholder="Ej: BCP"
                  className={inputClass}
                />
              </Field>
              <Field label="Cuenta bancaria (opcional)">
                <input
                  type="text"
                  value={form.bank_account}
                  onChange={(e) =>
                    setForm({ ...form, bank_account: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* Botón guardar */}
        <div className="sticky bottom-4 z-10">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-amber-500 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-amber-600 disabled:opacity-50"
          >
            {saving ? "⏳ Guardando..." : "💾 Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================
// 🧩 SUB-COMPONENTES
// ============================================

const inputClass =
  "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-700">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
        {label}
      </label>
      {children}
    </div>
  );
}