import { useEffect, useState } from "react";
import {
  createMyCustomerAddress,
  deleteMyCustomerAddress,
  fetchMyCustomerAddresses,
  setDefaultCustomerAddress,
  updateMyCustomerAddress,
  type CustomerAddressInput,
} from "../../lib/customer-addresses";
import type { DbCustomerAddress } from "../../types/database";

const EMPTY_FORM: CustomerAddressInput = {
  label: "",
  full_name: "",
  phone: "",
  street: "",
  district: "",
  city: "Lima",
  reference: null,
  is_default: false,
};

function formatAddress(address: DbCustomerAddress) {
  return [address.street, address.district, address.city]
    .filter(Boolean)
    .join(", ");
}

export default function CustomerAddressesPage() {
  const [addresses, setAddresses] = useState<DbCustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DbCustomerAddress | null>(null);
  const [form, setForm] = useState<CustomerAddressInput>(EMPTY_FORM);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadAddresses() {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchMyCustomerAddresses();
      setAddresses(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al cargar direcciones"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAddresses();
  }, []);

  function openNew() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      is_default: addresses.length === 0,
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }

  function openEdit(address: DbCustomerAddress) {
    setEditing(address);
    setForm({
      label: address.label,
      full_name: address.full_name,
      phone: address.phone,
      street: address.street,
      district: address.district,
      city: address.city,
      reference: address.reference,
      is_default: address.is_default,
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function updateField<K extends keyof CustomerAddressInput>(
    key: K,
    value: CustomerAddressInput[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function validateForm() {
    if (!form.label.trim()) {
      throw new Error("Ingresa una etiqueta para la dirección.");
    }

    if (!form.full_name.trim()) {
      throw new Error("Ingresa el nombre completo.");
    }

    if (!form.phone.trim()) {
      throw new Error("Ingresa un número de celular.");
    }

    if (!form.street.trim()) {
      throw new Error("Ingresa la dirección.");
    }

    if (!form.district.trim()) {
      throw new Error("Ingresa el distrito.");
    }

    if (!form.city.trim()) {
      throw new Error("Ingresa la ciudad.");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      validateForm();

      const payload: CustomerAddressInput = {
        ...form,
        label: form.label.trim(),
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        street: form.street.trim(),
        district: form.district.trim(),
        city: form.city.trim(),
        reference: form.reference?.trim() || null,
      };

      if (editing) {
        await updateMyCustomerAddress(editing.id, payload);
        setSuccess("Dirección actualizada correctamente.");
      } else {
        await createMyCustomerAddress(payload);
        setSuccess("Dirección creada correctamente.");
      }

      closeForm();
      await loadAddresses();

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al guardar dirección"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(address: DbCustomerAddress) {
    if (address.is_default) return;

    try {
      setError(null);
      setSuccess(null);

      await setDefaultCustomerAddress(address.id);
      await loadAddresses();

      setSuccess("Dirección principal actualizada.");

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Error al establecer dirección principal"
      );
    }
  }

  async function handleDelete(address: DbCustomerAddress) {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar la dirección "${address.label}"?`
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccess(null);

      await deleteMyCustomerAddress(address.id);
      await loadAddresses();

      setSuccess("Dirección eliminada correctamente.");

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al eliminar dirección"
      );
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-56 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-100" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-52 animate-pulse rounded-3xl bg-gray-100"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Mis direcciones
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Guarda tus direcciones para acelerar tus próximas compras.
          </p>
        </div>

        <button
          onClick={openNew}
          className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-gray-800"
        >
          + Agregar dirección
        </button>
      </div>

      {success && (
        <div className="rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-4 text-sm text-emerald-800">
          ✅ {success}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
          <div className="text-6xl">📍</div>

          <h2 className="mt-4 text-xl font-bold text-gray-900">
            Aún no tienes direcciones
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Agrega tu primera dirección para usarla en tus compras.
          </p>

          <button
            onClick={openNew}
            className="mt-6 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Agregar dirección
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`rounded-3xl bg-white p-6 shadow-sm transition hover:shadow-md ${
                address.is_default ? "ring-2 ring-rose-500/30" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">
                      {address.label}
                    </h2>

                    {address.is_default && (
                      <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                        Principal
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm font-medium text-gray-700">
                    {address.full_name}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    📞 {address.phone}
                  </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-2xl">
                  📍
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Dirección
                </div>

                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {formatAddress(address)}
                </p>

                {address.reference && (
                  <p className="mt-1 text-xs text-gray-500">
                    Referencia: {address.reference}
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {!address.is_default && (
                  <button
                    onClick={() => handleSetDefault(address)}
                    className="rounded-full bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                  >
                    Hacer principal
                  </button>
                )}

                <button
                  onClick={() => openEdit(address)}
                  className="rounded-full border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
                >
                  Editar
                </button>

                <button
                  onClick={() => handleDelete(address)}
                  className="rounded-full bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={closeForm}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white p-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Dirección
                </div>

                <h2 className="text-2xl font-bold text-gray-900">
                  {editing ? "Editar dirección" : "Nueva dirección"}
                </h2>
              </div>

              <button
                onClick={closeForm}
                className="text-2xl text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Etiqueta
                </label>

                <input
                  value={form.label}
                  onChange={(event) => updateField("label", event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
                  placeholder="Casa, Trabajo, Departamento..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Nombre completo
                  </label>

                  <input
                    value={form.full_name}
                    onChange={(event) =>
                      updateField("full_name", event.target.value)
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
                    placeholder="Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Celular
                  </label>

                  <input
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
                    placeholder="987654321"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Dirección
                </label>

                <input
                  value={form.street}
                  onChange={(event) => updateField("street", event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
                  placeholder="Av. Arequipa 1234"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Distrito
                  </label>

                  <input
                    value={form.district}
                    onChange={(event) =>
                      updateField("district", event.target.value)
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
                    placeholder="Miraflores"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Ciudad
                  </label>

                  <input
                    value={form.city}
                    onChange={(event) => updateField("city", event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
                    placeholder="Lima"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Referencia opcional
                </label>

                <textarea
                  value={form.reference ?? ""}
                  onChange={(event) =>
                    updateField("reference", event.target.value)
                  }
                  rows={3}
                  className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
                  placeholder="Edificio azul, frente al parque..."
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-gray-50 p-4">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(event) =>
                    updateField("is_default", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                />

                <div>
                  <div className="text-sm font-bold text-gray-900">
                    Usar como dirección principal
                  </div>
                  <div className="text-xs text-gray-500">
                    Se usará por defecto en futuras compras.
                  </div>
                </div>
              </label>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
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
                    : editing
                    ? "Guardar cambios"
                    : "Crear dirección"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}