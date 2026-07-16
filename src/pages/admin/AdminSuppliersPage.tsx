import { useEffect, useMemo, useState } from "react";
import SupplierForm from "../../components/admin/SupplierForm";
import {
  deleteSupplier,
  fetchSuppliers,
  toggleSupplierActive,
  getAllSupplierProfiles,
  approveSupplier,
  revokeSupplier,
  getSupplierStatusLabel,
  getSupplierStatusColor,
  getCategoryLabel,
  formatSupplierAddress,
  type SupplierWithProfile,
} from "../../lib/suppliers";
import type { DbSupplier } from "../../types/database";
import { useToast } from "../../contexts/ToastContext";

type Filter = "all" | "active" | "inactive";
type Tab = "legacy" | "users";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default function AdminSuppliersPage() {
  const toast = useToast();

  // Tabs
  const [tab, setTab] = useState<Tab>("users");

  // ─── Sistema LEGACY (tabla suppliers) ─────────────────────
  const [suppliers, setSuppliers] = useState<DbSupplier[]>([]);
  const [loadingLegacy, setLoadingLegacy] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DbSupplier | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  // ─── Sistema NUEVO (supplier_profiles - usuarios) ─────────
  const [supplierProfiles, setSupplierProfiles] = useState<
    SupplierWithProfile[]
  >([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [userFilter, setUserFilter] = useState<Filter>("all");
  const [userSearch, setUserSearch] = useState("");

  // ─── Estado general ────────────────────────────────────────
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([loadSuppliersLegacy(), loadSupplierProfiles()]);
  }

  // ═══════════════════════════════════════════════════════════
  // 🏭 SISTEMA LEGACY
  // ═══════════════════════════════════════════════════════════

  async function loadSuppliersLegacy() {
    try {
      setLoadingLegacy(true);
      const data = await fetchSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al cargar proveedores"
      );
    } finally {
      setLoadingLegacy(false);
    }
  }

  const legacyStats = useMemo(() => {
    return {
      total: suppliers.length,
      active: suppliers.filter((s) => s.is_active).length,
      inactive: suppliers.filter((s) => !s.is_active).length,
    };
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchesFilter =
        activeFilter === "all"
          ? true
          : activeFilter === "active"
          ? supplier.is_active
          : !supplier.is_active;

      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        supplier.name.toLowerCase().includes(query) ||
        supplier.contact_email.toLowerCase().includes(query) ||
        (supplier.contact_phone ?? "").toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [suppliers, activeFilter, search]);

  function openNew() {
    setEditing(null);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }

  function openEdit(supplier: DbSupplier) {
    setEditing(supplier);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function handleSaved() {
    await loadSuppliersLegacy();
    setSuccess(editing ? "Proveedor actualizado." : "Proveedor creado.");
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleToggle(supplier: DbSupplier) {
    try {
      setActionLoadingId(supplier.id);
      setError(null);
      setSuccess(null);
      const updated = await toggleSupplierActive(
        supplier.id,
        !supplier.is_active
      );
      setSuppliers((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setSuccess(
        updated.is_active
          ? "Proveedor activado correctamente."
          : "Proveedor desactivado correctamente."
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelete(supplier: DbSupplier) {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar el proveedor "${supplier.name}"?`
    );
    if (!confirmed) return;

    try {
      setActionLoadingId(supplier.id);
      setError(null);
      setSuccess(null);
      await deleteSupplier(supplier.id);
      setSuppliers((prev) => prev.filter((item) => item.id !== supplier.id));
      setSuccess("Proveedor eliminado correctamente.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al eliminar proveedor"
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 👤 SISTEMA DE USUARIOS PROVEEDORES
  // ═══════════════════════════════════════════════════════════

  async function loadSupplierProfiles() {
    try {
      setLoadingProfiles(true);
      const data = await getAllSupplierProfiles();
      setSupplierProfiles(data);
    } catch (err) {
      console.error(err);
      toast.error(
        "Error",
        err instanceof Error ? err.message : "Error al cargar usuarios"
      );
    } finally {
      setLoadingProfiles(false);
    }
  }

  const usersStats = useMemo(() => {
    return {
      total: supplierProfiles.length,
      active: supplierProfiles.filter((s) => s.is_active).length,
      pending: supplierProfiles.filter((s) => !s.is_active).length,
    };
  }, [supplierProfiles]);

  const filteredProfiles = useMemo(() => {
    return supplierProfiles.filter((s) => {
      const matchesFilter =
        userFilter === "all"
          ? true
          : userFilter === "active"
          ? s.is_active
          : !s.is_active;

      const query = userSearch.trim().toLowerCase();
      const matchesSearch =
        !query ||
        s.business_name?.toLowerCase().includes(query) ||
        s.profiles?.email?.toLowerCase().includes(query) ||
        s.profiles?.full_name?.toLowerCase().includes(query) ||
        s.whatsapp?.includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [supplierProfiles, userFilter, userSearch]);

  async function handleApprove(supplierId: string, name: string) {
    if (!confirm(`¿Aprobar a "${name}" como proveedor activo?`)) return;
    try {
      setActionLoadingId(supplierId);
      await approveSupplier(supplierId);
      toast.success("✅ Aprobado", `${name} ahora está activo`);
      await loadSupplierProfiles();
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleRevoke(supplierId: string, name: string) {
    const reason = prompt(`¿Motivo para revocar a "${name}"? (opcional)`);
    if (reason === null) return;
    try {
      setActionLoadingId(supplierId);
      await revokeSupplier(supplierId, reason || undefined);
      toast.success("Revocado", `${name} ya no está activo`);
      await loadSupplierProfiles();
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🎨 RENDER
  // ═══════════════════════════════════════════════════════════

  const loading = loadingLegacy || loadingProfiles;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-56 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Proveedores
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona proveedores clásicos y usuarios registrados en la plataforma.
        </p>
      </div>

      {/* Alertas globales */}
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

      {/* TABS */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab("users")}
          className={`relative px-4 py-2.5 text-sm font-bold transition ${
            tab === "users"
              ? "text-amber-700"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          👤 Usuarios proveedores
          {usersStats.pending > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
              {usersStats.pending}
            </span>
          )}
          {tab === "users" && (
            <div className="absolute -bottom-px left-0 right-0 h-0.5 bg-amber-500" />
          )}
        </button>

        <button
          onClick={() => setTab("legacy")}
          className={`relative px-4 py-2.5 text-sm font-bold transition ${
            tab === "legacy"
              ? "text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🏭 Proveedores clásicos
          {tab === "legacy" && (
            <div className="absolute -bottom-px left-0 right-0 h-0.5 bg-gray-900" />
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB USUARIOS PROVEEDORES */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === "users" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total registrados
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {usersStats.total}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Activos
              </div>
              <div className="mt-2 text-3xl font-bold text-emerald-600">
                {usersStats.active}
              </div>
            </div>

            <div
              className={`rounded-2xl border p-5 shadow-sm ${
                usersStats.pending > 0
                  ? "border-amber-300 bg-amber-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                ⏳ Pendientes
              </div>
              <div className="mt-2 text-3xl font-bold text-amber-600">
                {usersStats.pending}
              </div>
              {usersStats.pending > 0 && (
                <div className="mt-1 text-xs font-semibold text-amber-700">
                  Requieren aprobación
                </div>
              )}
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all" as const, label: "Todos" },
                { id: "inactive" as const, label: `⏳ Pendientes (${usersStats.pending})` },
                { id: "active" as const, label: `✅ Activos (${usersStats.active})` },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setUserFilter(f.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    userFilter === f.id
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:bg-white sm:max-w-xs"
              placeholder="Buscar por nombre, email..."
            />
          </div>

          {/* Lista */}
          {filteredProfiles.length === 0 ? (
            <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
              <div className="text-6xl">👥</div>
              <h2 className="mt-4 text-xl font-bold text-gray-900">
                {supplierProfiles.length === 0
                  ? "Sin usuarios proveedores"
                  : "No hay resultados"}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {supplierProfiles.length === 0
                  ? "Los proveedores pueden registrarse en /registro-proveedor"
                  : "Prueba ajustando los filtros"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredProfiles.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {s.business_name}
                        </h3>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${getSupplierStatusColor(
                            s
                          )}`}
                        >
                          {getSupplierStatusLabel(s)}
                        </span>
                      </div>

                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            👤 Contacto
                          </p>
                          <p className="mt-1 text-sm text-gray-900">
                            {s.profiles?.full_name ?? "Sin nombre"}
                          </p>
                          <p className="text-xs text-gray-600">
                            📧 {s.profiles?.email ?? "Sin email"}
                          </p>
                          {s.whatsapp && (
                            <p className="text-xs text-gray-600">
                              📱 {s.whatsapp}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            🏭 Negocio
                          </p>
                          {s.category && (
                            <p className="mt-1 text-sm text-gray-900">
                              {getCategoryLabel(s.category)}
                            </p>
                          )}
                          <p className="text-xs text-gray-600">
                            📍 {formatSupplierAddress(s)}
                          </p>
                          {s.yape_number && (
                            <p className="text-xs text-gray-600">
                              💰 Yape: {s.yape_number}
                            </p>
                          )}
                        </div>
                      </div>

                      {s.bio && (
                        <p className="mt-3 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                          "{s.bio}"
                        </p>
                      )}

                      <p className="mt-3 text-xs text-gray-400">
                        Registrado el {formatDate(s.created_at)}
                        {s.approved_at &&
                          ` • Aprobado el ${formatDate(s.approved_at)}`}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {!s.is_active ? (
                        <button
                          onClick={() =>
                            handleApprove(s.id, s.business_name)
                          }
                          disabled={actionLoadingId === s.id}
                          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50"
                        >
                          {actionLoadingId === s.id ? "..." : "✅ Aprobar"}
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            handleRevoke(s.id, s.business_name)
                          }
                          disabled={actionLoadingId === s.id}
                          className="rounded-xl bg-rose-100 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-200 disabled:opacity-50"
                        >
                          {actionLoadingId === s.id ? "..." : "❌ Revocar"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB PROVEEDORES CLÁSICOS (sistema legacy) */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === "legacy" && (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm text-gray-500">
              Proveedores creados manualmente por el admin, usados en el
              catálogo maestro.
            </div>
            <button
              onClick={openNew}
              className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-gray-800"
            >
              + Nuevo proveedor
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {legacyStats.total}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Activos
              </div>
              <div className="mt-2 text-3xl font-bold text-emerald-600">
                {legacyStats.active}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Inactivos
              </div>
              <div className="mt-2 text-3xl font-bold text-red-600">
                {legacyStats.inactive}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all" as const, label: "Todos" },
                { id: "active" as const, label: "Activos" },
                { id: "inactive" as const, label: "Inactivos" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeFilter === filter.id
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:bg-white sm:max-w-xs"
              placeholder="Buscar proveedor..."
            />
          </div>

          {filteredSuppliers.length === 0 ? (
            <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
              <div className="text-6xl">🏭</div>
              <h2 className="mt-4 text-xl font-bold text-gray-900">
                No hay proveedores
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Crea proveedores para asociarlos a productos del catálogo
                maestro.
              </p>
              <button
                onClick={openNew}
                className="mt-6 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Crear proveedor
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-200 text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">Proveedor</th>
                      <th className="px-6 py-4 font-medium">Contacto</th>
                      <th className="px-6 py-4 font-medium">Estado</th>
                      <th className="px-6 py-4 font-medium">Creado</th>
                      <th className="px-6 py-4 font-medium"></th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredSuppliers.map((supplier) => (
                      <tr
                        key={supplier.id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">
                            {supplier.name}
                          </div>
                          {supplier.notes && (
                            <div className="mt-1 line-clamp-1 text-xs text-gray-500">
                              {supplier.notes}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {supplier.contact_email}
                          </div>
                          <div className="text-xs text-gray-500">
                            {supplier.contact_phone ?? "Sin teléfono"}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggle(supplier)}
                            disabled={actionLoadingId === supplier.id}
                            className={`rounded-full px-3 py-1 text-xs font-bold transition disabled:opacity-60 ${
                              supplier.is_active
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-red-50 text-red-700 hover:bg-red-100"
                            }`}
                          >
                            {supplier.is_active ? "Activo" : "Inactivo"}
                          </button>
                        </td>

                        <td className="px-6 py-4 text-xs text-gray-500">
                          {formatDate(supplier.created_at)}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEdit(supplier)}
                              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(supplier)}
                              disabled={actionLoadingId === supplier.id}
                              className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                            >
                              {actionLoadingId === supplier.id
                                ? "..."
                                : "Eliminar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showForm && (
            <SupplierForm
              initial={editing}
              onClose={closeForm}
              onSaved={handleSaved}
            />
          )}
        </div>
      )}
    </div>
  );
}