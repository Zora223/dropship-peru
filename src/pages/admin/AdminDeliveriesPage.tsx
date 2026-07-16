// src/pages/admin/AdminDeliveriesPage.tsx
// Panel del admin para gestionar deliveries (FASE 3.5)

import { useEffect, useMemo, useState } from "react";
import {
  fetchAllDeliveries,
  toggleDeliveryActive,
  updateAdminNotes,
  type AdminDeliveryRow,
} from "../../lib/admin-deliveries";
import { getVehicleLabel } from "../../lib/delivery";
import { useToast } from "../../contexts/ToastContext";

type ActiveFilter = "all" | "active" | "pending" | "inactive";

const FILTERS: { value: ActiveFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "pending", label: "Pendientes" },
  { value: "inactive", label: "Inactivos" },
];

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Hace un momento";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days} d`;

  return date.toLocaleDateString("es-PE");
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

/**
 * Construye link de WhatsApp para contactar al delivery
 */
function getDeliveryWhatsappUrl(row: AdminDeliveryRow): string {
  const digits = row.phone.replace(/[^0-9]/g, "");
  const normalized = digits.startsWith("51")
    ? digits
    : digits.length === 9
    ? `51${digits}`
    : digits;

  const message = `Hola ${row.full_name ?? ""} 👋, te escribo desde Dropship Perú.`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export default function AdminDeliveriesPage() {
  const toast = useToast();

  const [rows, setRows] = useState<AdminDeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<ActiveFilter>("all");

  // Modal de gestión
  const [selected, setSelected] = useState<AdminDeliveryRow | null>(null);
  const [notesInput, setNotesInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  async function loadRows() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAllDeliveries();
      setRows(data);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al cargar deliveries";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, []);

  // KPIs
  const stats = useMemo(() => {
    return {
      total: rows.length,
      activos: rows.filter((r) => r.is_active).length,
      disponibles: rows.filter((r) => r.is_active && r.available).length,
      entregas: rows.reduce((sum, r) => sum + r.total_deliveries, 0),
    };
  }, [rows]);

  // Filtrado
  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return rows.filter((row) => {
      // Filtro por estado
      let matchesFilter = true;
      if (filter === "active") matchesFilter = row.is_active;
      if (filter === "pending") matchesFilter = !row.is_active;
      if (filter === "inactive") matchesFilter = !row.is_active;

      // Búsqueda (nombre, email, teléfono)
      const matchesSearch =
        !query ||
        (row.full_name?.toLowerCase().includes(query) ?? false) ||
        row.email.toLowerCase().includes(query) ||
        row.phone.includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [rows, filter, searchQuery]);

  // Abrir modal
  function openManage(row: AdminDeliveryRow) {
    setSelected(row);
    setNotesInput(row.admin_notes ?? "");
  }

  // Toggle activo
  async function handleToggleActive(row: AdminDeliveryRow) {
    try {
      setActionLoading(true);
      await toggleDeliveryActive(row.id, !row.is_active);

      const newActive = !row.is_active;

      // Actualizar estado local
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, is_active: newActive } : r
        )
      );

      if (selected?.id === row.id) {
        setSelected({ ...selected, is_active: newActive });
      }

      toast.success(
        newActive ? "✅ Delivery activado" : "⏸️ Delivery desactivado",
        newActive
          ? `${row.full_name ?? row.email} ya puede recibir pedidos`
          : `${row.full_name ?? row.email} no aparecerá al asignar`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al actualizar";
      toast.error("Error", msg);
    } finally {
      setActionLoading(false);
    }
  }

  // Guardar notas
  async function handleSaveNotes() {
    if (!selected) return;

    try {
      setActionLoading(true);
      await updateAdminNotes(selected.id, notesInput);

      setRows((prev) =>
        prev.map((r) =>
          r.id === selected.id ? { ...r, admin_notes: notesInput } : r
        )
      );
      setSelected({ ...selected, admin_notes: notesInput });

      toast.success("📝 Notas guardadas", "Los cambios se aplicaron");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      toast.error("Error", msg);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          🛵 Deliveries
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona las cuentas de delivery y sus permisos.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Total
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {stats.total}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Activos
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-600">
            {stats.activos}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Disponibles ahora
          </div>
          <div className="mt-2 text-3xl font-bold text-blue-600">
            {stats.disponibles}
          </div>
        </div>

        <div className="rounded-2xl bg-linear-to-br from-emerald-500 to-teal-500 p-5 text-white shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
            Entregas totales
          </div>
          <div className="mt-2 text-3xl font-bold">{stats.entregas}</div>
        </div>
      </div>

      {/* Buscador + filtros */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Buscar por nombre, email o teléfono..."
          className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900/10"
        />

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                filter === f.value
                  ? "bg-gray-900 text-white shadow"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 🖥️ Tabla desktop */}
      <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Delivery</th>
                <th className="px-6 py-4 font-medium">Vehículo</th>
                <th className="px-6 py-4 font-medium">Tarifa</th>
                <th className="px-6 py-4 font-medium">Entregas</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((row) => (
                <tr key={row.id} className="transition hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {row.photo_url || row.avatar_url ? (
                        <img
                          src={row.photo_url ?? row.avatar_url ?? ""}
                          alt={row.full_name ?? "Delivery"}
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-teal-500 text-sm font-bold text-white">
                          {getInitials(row.full_name, row.email)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="truncate font-semibold text-gray-900">
                          {row.full_name ?? "Sin nombre"}
                        </div>
                        <div className="truncate text-xs text-gray-500">
                          📞 {row.phone}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-gray-700">
                    {getVehicleLabel(row.vehicle_type)}
                    {row.vehicle_plate && (
                      <span className="ml-1 font-mono text-xs text-gray-400">
                        {row.vehicle_plate}
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 font-bold text-gray-900">
                    {formatCurrency(row.base_rate)}
                  </td>

                  <td className="px-6 py-4 text-gray-700">
                    <div>{row.total_deliveries}</div>
                    {row.rating > 0 && (
                      <div className="text-xs text-amber-500">
                        ⭐ {row.rating.toFixed(1)}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          row.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {row.is_active ? "✅ Activo" : "⏳ Pendiente"}
                      </span>

                      {row.is_active && (
                        <span
                          className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                            row.available
                              ? "bg-blue-50 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {row.available ? "🟢 Disponible" : "⚪ Offline"}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openManage(row)}
                      className="rounded-full bg-gray-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-800"
                    >
                      Gestionar
                    </button>
                  </td>
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="text-4xl">🛵</div>
                    <p className="mt-3 text-sm text-gray-500">
                      {rows.length === 0
                        ? "Aún no hay deliveries registrados."
                        : "No hay resultados con esos filtros."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📱 Cards móvil */}
      <div className="space-y-3 lg:hidden">
        {filteredRows.map((row) => (
          <div
            key={row.id}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              {row.photo_url || row.avatar_url ? (
                <img
                  src={row.photo_url ?? row.avatar_url ?? ""}
                  alt={row.full_name ?? "Delivery"}
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-teal-500 text-sm font-bold text-white">
                  {getInitials(row.full_name, row.email)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-gray-900">
                  {row.full_name ?? "Sin nombre"}
                </div>
                <div className="truncate text-xs text-gray-500">
                  📞 {row.phone}
                </div>
                <div className="truncate text-xs text-gray-400">
                  {row.email}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                {getVehicleLabel(row.vehicle_type)}
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                {formatCurrency(row.base_rate)}
              </span>
              <span className="text-gray-500">
                🎯 {row.total_deliveries} entregas
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  row.is_active
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {row.is_active ? "✅ Activo" : "⏳ Pendiente"}
              </span>

              {row.is_active && (
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    row.available
                      ? "bg-blue-50 text-blue-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {row.available ? "🟢 Disponible" : "⚪ Offline"}
                </span>
              )}
            </div>

            <button
              onClick={() => openManage(row)}
              className="mt-4 w-full rounded-xl bg-gray-900 py-2.5 text-xs font-semibold text-white transition hover:bg-gray-800"
            >
              Gestionar
            </button>
          </div>
        ))}

        {filteredRows.length === 0 && (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <div className="text-4xl">🛵</div>
            <p className="mt-3 text-sm text-gray-500">
              {rows.length === 0
                ? "Aún no hay deliveries registrados."
                : "No hay resultados con esos filtros."}
            </p>
          </div>
        )}
      </div>

      {/* Modal de gestión */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white p-6">
              <div className="flex min-w-0 items-center gap-3">
                {selected.photo_url || selected.avatar_url ? (
                  <img
                    src={selected.photo_url ?? selected.avatar_url ?? ""}
                    alt={selected.full_name ?? "Delivery"}
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-teal-500 text-lg font-bold text-white">
                    {getInitials(selected.full_name, selected.email)}
                  </div>
                )}

                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-gray-900">
                    {selected.full_name ?? "Sin nombre"}
                  </h2>
                  <p className="truncate text-xs text-gray-500">
                    {selected.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="shrink-0 text-2xl text-gray-400 hover:text-gray-600"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* Toggle activación */}
              <button
                onClick={() => handleToggleActive(selected)}
                disabled={actionLoading}
                className={`w-full rounded-xl py-3 text-sm font-bold transition disabled:opacity-60 ${
                  selected.is_active
                    ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "bg-emerald-500 text-white hover:bg-emerald-600"
                }`}
              >
                {selected.is_active
                  ? "⏸️ Desactivar cuenta"
                  : "✅ Activar cuenta"}
              </button>

              {/* Info principal */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Vehículo
                  </div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">
                    {getVehicleLabel(selected.vehicle_type)}
                  </div>
                  {selected.vehicle_plate && (
                    <div className="mt-0.5 font-mono text-xs text-gray-500">
                      {selected.vehicle_plate}
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Tarifa
                  </div>
                  <div className="mt-1 text-sm font-bold text-emerald-700">
                    {formatCurrency(selected.base_rate)}
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Yape
                  </div>
                  <div className="mt-1 font-mono text-sm text-gray-900">
                    {selected.yape_number}
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Entregas
                  </div>
                  <div className="mt-1 text-sm font-bold text-gray-900">
                    {selected.total_deliveries}
                  </div>
                  {selected.rating > 0 && (
                    <div className="text-xs text-amber-500">
                      ⭐ {selected.rating.toFixed(1)}
                    </div>
                  )}
                </div>
              </div>

              {/* Zona */}
              {selected.zone_description && (
                <div className="rounded-xl bg-blue-50 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                    📍 Zona de cobertura
                  </div>
                  <div className="mt-1 text-sm text-blue-900">
                    {selected.zone_description}
                  </div>
                </div>
              )}

              {/* Notas del admin */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  📝 Notas internas (solo visible para admin)
                </label>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  rows={3}
                  placeholder="Ej: Delivery muy responsable, verificado con DNI..."
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={
                    actionLoading || notesInput === (selected.admin_notes ?? "")
                  }
                  className="mt-2 w-full rounded-xl bg-emerald-500 py-2 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  💾 Guardar notas
                </button>
              </div>

              {/* Meta */}
              <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
                <div>
                  ID:{" "}
                  <span className="font-mono">{selected.id.slice(0, 8)}...</span>
                </div>
                <div className="mt-1">
                  Registrado: {timeAgo(selected.created_at)}
                </div>
              </div>

              {/* WhatsApp */}
              <a
                href={getDeliveryWhatsappUrl(selected)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
              >
                💬 Contactar por WhatsApp
              </a>
            </div>

            <div className="border-t border-gray-100 p-6">
              <button
                onClick={() => setSelected(null)}
                className="w-full rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}