// src/pages/admin/AdminSuppliersPage.tsx
// v22.6 — Gestión de proveedores (supplier_profiles)
// Sin código legacy — Solo trabaja con proveedores usuarios

import { useEffect, useMemo, useState } from "react";
import {
  getAllSupplierProfiles,
  approveSupplier,
  revokeSupplier,
  updateSupplierNotes,
  getSupplierStatusLabel,
  getSupplierStatusColor,
  formatSupplierAddress,
  getCategoryLabel,
  type SupplierWithProfile,
} from "../../lib/suppliers";
import { useToast } from "../../contexts/ToastContext";
import SupplierDetailModal from "../../components/admin/SupplierDetailModal";

type FilterStatus = "all" | "pending" | "active" | "revoked";

export default function AdminSuppliersPage() {
  const toast = useToast();

  const [suppliers, setSuppliers] = useState<SupplierWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SupplierWithProfile | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const data = await getAllSupplierProfiles();
      setSuppliers(data);
    } catch (err) {
      console.error(err);
      toast.error(
        "Error",
        err instanceof Error ? err.message : "No se pudieron cargar los proveedores"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      // Filtro por estado
      if (filter === "pending" && s.is_active) return false;
      if (filter === "active" && (!s.is_active || !s.is_verified)) return false;
      if (filter === "revoked" && (s.is_active || s.is_verified)) return false;

      // Búsqueda
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const match =
          s.business_name.toLowerCase().includes(q) ||
          (s.ruc ?? "").toLowerCase().includes(q) ||
          (s.profiles?.email ?? "").toLowerCase().includes(q) ||
          (s.profiles?.full_name ?? "").toLowerCase().includes(q) ||
          (s.phone ?? "").toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [suppliers, filter, search]);

  const stats = useMemo(() => {
    return {
      total: suppliers.length,
      pending: suppliers.filter((s) => !s.is_active).length,
      active: suppliers.filter((s) => s.is_active && s.is_verified).length,
      revoked: suppliers.filter((s) => !s.is_active && s.is_verified).length,
    };
  }, [suppliers]);

  async function handleApprove(supplier: SupplierWithProfile) {
    if (
      !confirm(
        `¿Aprobar a "${supplier.business_name}"?\n\nPodrá crear productos y recibir pedidos.`
      )
    )
      return;

    try {
      setActionLoadingId(supplier.id);
      await approveSupplier(supplier.id);
      toast.success("Proveedor aprobado", `${supplier.business_name} ya puede vender.`);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error("Error", err instanceof Error ? err.message : "No se pudo aprobar");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleRevoke(supplier: SupplierWithProfile) {
    const reason = prompt(
      `Razón para revocar a "${supplier.business_name}":\n\n(Se guardará en notas del admin)`
    );
    if (!reason || reason.trim().length < 5) {
      if (reason !== null) toast.warning("Razón requerida", "Mínimo 5 caracteres");
      return;
    }

    try {
      setActionLoadingId(supplier.id);
      await revokeSupplier(supplier.id, reason.trim());
      toast.success("Proveedor revocado", `${supplier.business_name} fue desactivado.`);
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error("Error", err instanceof Error ? err.message : "No se pudo revocar");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleSaveNotes(supplierId: string, notes: string) {
    try {
      await updateSupplierNotes(supplierId, notes);
      toast.success("Notas guardadas");
      await loadData();
      // Actualizar el modal con datos frescos
      const updated = suppliers.find((s) => s.id === supplierId);
      if (updated) setSelected({ ...updated, admin_notes: notes });
    } catch (err) {
      console.error(err);
      toast.error("Error", "No se pudieron guardar las notas");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          🏭 Proveedores
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona los proveedores registrados en la plataforma
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            📊 Total
          </div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            ⏳ Pendientes
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{stats.pending}</div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            ✅ Activos
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{stats.active}</div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-red-600">
            🚫 Revocados
          </div>
          <div className="mt-1 text-2xl font-bold text-red-600">{stats.revoked}</div>
        </div>
      </div>

      {/* Filtros + búsqueda */}
      <div className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="min-w-60 flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Buscar por nombre, RUC, email o teléfono..."
            className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "all", label: "Todos", color: "bg-gray-100 text-gray-700" },
              {
                value: "pending",
                label: `Pendientes (${stats.pending})`,
                color: "bg-amber-100 text-amber-700",
              },
              {
                value: "active",
                label: `Activos (${stats.active})`,
                color: "bg-emerald-100 text-emerald-700",
              },
              {
                value: "revoked",
                label: `Revocados (${stats.revoked})`,
                color: "bg-red-100 text-red-700",
              },
            ] as const
          ).map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                filter === btn.value
                  ? "bg-gray-900 text-white shadow-md"
                  : `${btn.color} hover:opacity-80`
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de proveedores */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="text-6xl">🏭</div>
          <h3 className="mt-4 text-lg font-bold text-gray-900">
            {suppliers.length === 0
              ? "Aún no hay proveedores registrados"
              : "Sin resultados"}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {suppliers.length === 0
              ? "Los proveedores pueden registrarse en /registro-proveedor"
              : "Prueba con otro filtro o término de búsqueda"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((supplier) => {
            const statusLabel = getSupplierStatusLabel(supplier);
            const statusColor = getSupplierStatusColor(supplier);
            const isLoading = actionLoadingId === supplier.id;

            return (
              <div
                key={supplier.id}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-wrap items-start gap-4">
                  {/* Logo */}
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
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

                  {/* Info principal */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {supplier.business_name}
                      </h3>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                      {supplier.is_verified && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          ✓ Verificado
                        </span>
                      )}
                    </div>

                    <div className="mt-2 grid gap-1 text-sm text-gray-600 sm:grid-cols-2">
                      {supplier.profiles?.email && (
                        <div className="flex items-center gap-1.5">
                          <span>📧</span>
                          <span className="truncate">{supplier.profiles.email}</span>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center gap-1.5">
                          <span>📱</span>
                          <span>{supplier.phone}</span>
                        </div>
                      )}
                      {supplier.ruc && (
                        <div className="flex items-center gap-1.5">
                          <span>🏢</span>
                          <span>RUC: {supplier.ruc}</span>
                        </div>
                      )}
                      {supplier.category && (
                        <div className="flex items-center gap-1.5">
                          <span>🏷️</span>
                          <span>{getCategoryLabel(supplier.category)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 sm:col-span-2">
                        <span>📍</span>
                        <span className="truncate">{formatSupplierAddress(supplier)}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                        📦 {supplier.total_products ?? 0} productos
                      </span>
                      <span className="rounded-full bg-purple-50 px-2.5 py-1 text-purple-700">
                        🛒 {supplier.total_orders ?? 0} pedidos
                      </span>
                      {supplier.rating > 0 && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                          ⭐ {Number(supplier.rating).toFixed(1)}
                        </span>
                      )}
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
                        📅 {new Date(supplier.created_at).toLocaleDateString("es-PE")}
                      </span>
                    </div>

                    {supplier.admin_notes && (
                      <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                        <div className="font-bold uppercase tracking-wider text-amber-700 mb-1">
                          📝 Nota admin
                        </div>
                        <div>{supplier.admin_notes}</div>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSelected(supplier)}
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                    >
                      👁️ Ver detalle
                    </button>

                    {!supplier.is_active ? (
                      <button
                        onClick={() => handleApprove(supplier)}
                        disabled={isLoading}
                        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {isLoading ? "..." : "✅ Aprobar"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRevoke(supplier)}
                        disabled={isLoading}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        {isLoading ? "..." : "🚫 Revocar"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal detalle */}
      {selected && (
        <SupplierDetailModal
          supplier={selected}
          onClose={() => setSelected(null)}
          onSaveNotes={(notes: string) => handleSaveNotes(selected.id, notes)}
        />
      )}
    </div>
  );
}