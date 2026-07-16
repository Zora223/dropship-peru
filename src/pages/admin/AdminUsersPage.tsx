// src/pages/admin/AdminUsersPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  fetchAllUsers,
  updateUserRole,
  toggleUserActive,
  deleteUser,
} from "../../lib/users";
import type { DbProfile, UserRole } from "../../types/database";

const ROLE_CONFIG: Record<
  UserRole,
  { label: string; bg: string; text: string; gradient: string }
> = {
  admin: {
    label: "Admin",
    bg: "bg-purple-50",
    text: "text-purple-700",
    gradient: "from-purple-500 to-pink-500",
  },
  vendor: {
    label: "Vendor",
    bg: "bg-rose-50",
    text: "text-rose-700",
    gradient: "from-rose-500 to-orange-500",
  },
  customer: {
    label: "Cliente",
    bg: "bg-blue-50",
    text: "text-blue-700",
    gradient: "from-blue-500 to-cyan-500",
  },
  delivery: {
    label: "Delivery",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    gradient: "from-emerald-500 to-teal-500",
  },
  supplier: {
    label: "Proveedor",
    bg: "bg-amber-50",
    text: "text-amber-700",
    gradient: "from-amber-500 to-orange-500",
  }, // 🆕 v13
};

const ROLE_FILTERS: ("Todos" | UserRole)[] = [
  "Todos",
  "admin",
  "vendor",
  "customer",
  "delivery",
  "supplier", // 🆕 v13
];

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  return email.slice(0, 2).toUpperCase();
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Hace un momento";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} hora${hours > 1 ? "s" : ""}`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days} día${days > 1 ? "s" : ""}`;

  return date.toLocaleDateString("es-PE");
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"Todos" | UserRole>("Todos");
  const [selectedUser, setSelectedUser] = useState<DbProfile | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadUsers() {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchAllUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        (user.full_name?.toLowerCase().includes(query) ?? false) ||
        user.email.toLowerCase().includes(query);

      const matchesRole = roleFilter === "Todos" || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const counts = useMemo(() => {
    return {
      admin: users.filter((user) => user.role === "admin").length,
      vendor: users.filter((user) => user.role === "vendor").length,
      customer: users.filter((user) => user.role === "customer").length,
      delivery: users.filter((user) => user.role === "delivery").length,
      supplier: users.filter((user) => user.role === "supplier").length, // 🆕 v13
    };
  }, [users]);

  async function handleRoleChange(userId: string, newRole: UserRole) {
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);

      await updateUserRole(userId, newRole);

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );

      setSelectedUser((prev) =>
        prev?.id === userId ? { ...prev, role: newRole } : prev
      );

      setSuccess("Rol actualizado correctamente.");

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al cambiar rol");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleActive(userId: string, current: boolean) {
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);

      await toggleUserActive(userId, !current);

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, is_active: !current } : user
        )
      );

      setSelectedUser((prev) =>
        prev?.id === userId ? { ...prev, is_active: !current } : prev
      );

      setSuccess(
        current
          ? "Usuario suspendido correctamente."
          : "Usuario reactivado correctamente."
      );

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(userId: string, email: string) {
    if (userId === currentUser?.id) {
      setError("No puedes eliminar tu propia cuenta.");
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar al usuario "${email}"? En producción se recomienda suspender antes que eliminar.`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);

      await deleteUser(userId);

      setUsers((prev) => prev.filter((user) => user.id !== userId));
      setSelectedUser(null);

      setSuccess("Usuario eliminado correctamente.");

      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al eliminar usuario"
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-rose-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Usuarios
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Gestiona todas las cuentas internas de la plataforma.
        </p>
      </div>

      {/* Alertas */}
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

      {/* Contadores */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {(Object.keys(counts) as UserRole[]).map((role) => {
          const config = ROLE_CONFIG[role];

          return (
            <div key={role} className="rounded-2xl bg-white p-5 shadow-sm">
              <div
                className={`text-xs font-semibold uppercase tracking-wider ${config.text}`}
              >
                {config.label}s
              </div>

              <div className="mt-2 text-3xl font-bold text-gray-900">
                {counts[role]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar por nombre o correo..."
          className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900/10"
        />

        <div className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setRoleFilter(filter)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                roleFilter === filter
                  ? "bg-gray-900 text-white shadow"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter === "Todos" ? "Todos" : ROLE_CONFIG[filter].label}
            </button>
          ))}
        </div>
      </div>

      {/* 🖥️ VISTA DESKTOP: Tabla (oculta en <lg) */}
      <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Usuario</th>
                <th className="px-6 py-4 font-medium">Rol</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium">Registrado</th>
                <th className="px-6 py-4 font-medium"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => {
                const config = ROLE_CONFIG[user.role];
                const isMe = user.id === currentUser?.id;

                if (!config) {
                  return (
                    <tr key={user.id} className="bg-red-50">
                      <td colSpan={5} className="px-6 py-4 text-sm text-red-700">
                        ⚠️ Usuario con rol desconocido: <b>{user.role}</b> ({user.email})
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={user.id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br ${config.gradient} text-sm font-bold text-white shadow`}
                        >
                          {getInitials(user.full_name, user.email)}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 font-semibold text-gray-900">
                            {user.full_name ?? user.email}

                            {isMe && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                TÚ
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.bg} ${config.text}`}
                      >
                        {config.label}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          user.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {user.is_active ? "Activo" : "Suspendido"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs text-gray-400">
                      {timeAgo(user.created_at)}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="rounded-full bg-gray-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-800"
                        >
                          Gestionar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="text-4xl">👥</div>

                    <p className="mt-3 text-sm text-gray-500">
                      {users.length === 0
                        ? "Aún no hay usuarios registrados."
                        : "No se encontraron usuarios con esos filtros."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📱 VISTA MÓVIL: Cards (oculta en ≥lg) */}
      <div className="space-y-3 lg:hidden">
        {filteredUsers.map((user) => {
          const config = ROLE_CONFIG[user.role];
          const isMe = user.id === currentUser?.id;

          if (!config) {
            return (
              <div
                key={user.id}
                className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                ⚠️ Usuario con rol desconocido: <b>{user.role}</b>
                <br />
                {user.email}
              </div>
            );
          }

          return (
            <div
              key={user.id}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br ${config.gradient} text-sm font-bold text-white shadow`}
                >
                  {getInitials(user.full_name, user.email)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-gray-900">
                      {user.full_name ?? user.email}
                    </span>

                    {isMe && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        TÚ
                      </span>
                    )}
                  </div>

                  <div className="truncate text-xs text-gray-500">
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.bg} ${config.text}`}
                >
                  {config.label}
                </span>

                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    user.is_active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {user.is_active ? "Activo" : "Suspendido"}
                </span>

                <span className="text-xs text-gray-400">
                  {timeAgo(user.created_at)}
                </span>
              </div>

              <button
                onClick={() => setSelectedUser(user)}
                className="mt-4 w-full rounded-xl bg-gray-900 py-2.5 text-xs font-semibold text-white transition hover:bg-gray-800"
              >
                Gestionar
              </button>
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <div className="text-4xl">👥</div>

            <p className="mt-3 text-sm text-gray-500">
              {users.length === 0
                ? "Aún no hay usuarios registrados."
                : "No se encontraron usuarios con esos filtros."}
            </p>
          </div>
        )}
      </div>

      {/* Modal de gestión */}
      {selectedUser && ROLE_CONFIG[selectedUser.role] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br ${ROLE_CONFIG[selectedUser.role].gradient} text-lg font-bold text-white shadow-lg sm:h-16 sm:w-16 sm:text-xl`}
                >
                  {getInitials(selectedUser.full_name, selectedUser.email)}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-gray-900 sm:text-xl">
                    {selectedUser.full_name ?? selectedUser.email}
                  </h2>

                  <p className="truncate text-sm text-gray-500">
                    {selectedUser.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="shrink-0 text-2xl text-gray-400 hover:text-gray-600"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Cambiar rol
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {(Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => {
                    const config = ROLE_CONFIG[role];
                    const active = selectedUser.role === role;

                    return (
                      <button
                        key={role}
                        onClick={() =>
                          handleRoleChange(selectedUser.id, role)
                        }
                        disabled={actionLoading}
                        className={`rounded-xl border-2 p-3 text-sm font-semibold transition disabled:opacity-60 ${
                          active
                            ? `border-current ${config.bg} ${config.text}`
                            : "border-gray-100 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Acciones
                </div>

                <button
                  onClick={() =>
                    handleToggleActive(
                      selectedUser.id,
                      selectedUser.is_active
                    )
                  }
                  disabled={actionLoading}
                  className={`mt-3 w-full rounded-xl py-3 text-sm font-bold transition disabled:opacity-60 ${
                    selectedUser.is_active
                      ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {selectedUser.is_active
                    ? "Suspender cuenta"
                    : "Reactivar cuenta"}
                </button>

                {selectedUser.id !== currentUser?.id && (
                  <button
                    onClick={() =>
                      handleDelete(selectedUser.id, selectedUser.email)
                    }
                    disabled={actionLoading}
                    className="mt-2 w-full rounded-xl bg-red-50 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                  >
                    🗑 Eliminar usuario
                  </button>
                )}
              </div>

              <div className="rounded-2xl bg-gray-50 p-4 text-xs text-gray-500">
                <div>
                  ID:{" "}
                  <span className="font-mono">
                    {selectedUser.id.slice(0, 8)}...
                  </span>
                </div>

                <div className="mt-1">
                  Registrado:{" "}
                  {new Date(selectedUser.created_at).toLocaleDateString(
                    "es-PE",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedUser(null)}
              className="mt-6 w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}