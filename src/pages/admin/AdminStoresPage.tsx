import { useEffect, useMemo, useState } from "react";
import {
  fetchAllStoresWithStats,
  toggleStoreActive,
  deleteStore,
} from "../../lib/stores";
import type { StoreWithStats } from "../../lib/stores";

type StatusFilter = "todas" | "activas" | "suspendidas" | "trial" | "expiradas";

const COLORS = [
  "from-rose-500 to-orange-500",
  "from-blue-500 to-cyan-500",
  "from-purple-500 to-pink-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-yellow-500",
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "activas", label: "Activas" },
  { value: "suspendidas", label: "Suspendidas" },
  { value: "trial", label: "En trial" },
  { value: "expiradas", label: "Expiradas" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(0)}`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

/**
 * Calcula el estado de suscripción de la tienda.
 */
function getSubscriptionInfo(store: StoreWithStats) {
  const status = (store as any).subscription_status ?? "trial";
  const trialEndsAt = (store as any).trial_ends_at as string | null;

  if (status === "cancelled") {
    return {
      label: "Cancelada",
      bg: "bg-gray-100",
      text: "text-gray-700",
      emoji: "🚫",
      daysLeft: 0,
    };
  }

  if (status === "expired") {
    return {
      label: "Expirada",
      bg: "bg-red-100",
      text: "text-red-700",
      emoji: "⛔",
      daysLeft: 0,
    };
  }

  if (status === "active") {
    return {
      label: "Activa",
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      emoji: "✅",
      daysLeft: 999,
    };
  }

  // status === "trial"
  const daysLeft = trialEndsAt
    ? Math.ceil(
        (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  if (daysLeft <= 0) {
    return {
      label: "Trial vencido",
      bg: "bg-red-100",
      text: "text-red-700",
      emoji: "⏰",
      daysLeft,
    };
  }

  return {
    label: `Trial · ${daysLeft}d`,
    bg: "bg-amber-100",
    text: "text-amber-700",
    emoji: "🎁",
    daysLeft,
  };
}

/**
 * Convierte teléfono a URL WhatsApp
 */
function getWhatsappUrl(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  const normalized = digits.startsWith("51")
    ? digits
    : digits.length === 9
    ? `51${digits}`
    : digits;
  return `https://wa.me/${normalized}`;
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas");

  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadStores() {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchAllStoresWithStats();
      setStores(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al cargar tiendas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStores();
  }, []);

  const filteredStores = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return stores.filter((store) => {
      const matchesSearch =
        !query ||
        store.name.toLowerCase().includes(query) ||
        (store.owner_name?.toLowerCase().includes(query) ?? false) ||
        (store.owner_email?.toLowerCase().includes(query) ?? false) ||
        store.slug.toLowerCase().includes(query);

      let matchesStatus = true;

      if (statusFilter === "activas") {
        matchesStatus = store.is_active;
      } else if (statusFilter === "suspendidas") {
        matchesStatus = !store.is_active;
      } else if (statusFilter === "trial") {
        matchesStatus =
          (store as any).subscription_status === "trial" &&
          getSubscriptionInfo(store).daysLeft > 0;
      } else if (statusFilter === "expiradas") {
        const info = getSubscriptionInfo(store);
        matchesStatus =
          info.label.includes("vencido") ||
          info.label.includes("Expirada");
      }

      return matchesSearch && matchesStatus;
    });
  }, [stores, searchQuery, statusFilter]);

  const totals = useMemo(() => {
    return {
      stores: stores.length,
      active: stores.filter((store) => store.is_active).length,
      suspended: stores.filter((store) => !store.is_active).length,
      trials: stores.filter(
        (s) =>
          (s as any).subscription_status === "trial" &&
          getSubscriptionInfo(s).daysLeft > 0
      ).length,
      products: stores.reduce(
        (sum, store) => sum + Number(store.products_count || 0),
        0
      ),
      sales: stores.reduce(
        (sum, store) => sum + Number(store.total_sales || 0),
        0
      ),
    };
  }, [stores]);

  async function handleToggle(store: StoreWithStats) {
    try {
      setActionLoadingId(store.id);
      setError(null);
      setSuccess(null);

      await toggleStoreActive(store.id, !store.is_active);

      setStores((prev) =>
        prev.map((item) =>
          item.id === store.id
            ? { ...item, is_active: !store.is_active }
            : item
        )
      );

      setSuccess(
        store.is_active
          ? "Tienda suspendida correctamente."
          : "Tienda reactivada correctamente."
      );

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelete(store: StoreWithStats) {
    const confirmed = window.confirm(
      `¿Eliminar la tienda "${store.name}"? Solo haz esto si no tiene pedidos importantes. En producción se recomienda suspenderla en lugar de eliminarla.`
    );

    if (!confirmed) return;

    try {
      setActionLoadingId(store.id);
      setError(null);
      setSuccess(null);

      await deleteStore(store.id);

      setStores((prev) => prev.filter((item) => item.id !== store.id));

      setSuccess("Tienda eliminada correctamente.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al eliminar tienda");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function copyLink(slug: string) {
    const url = `${window.location.origin}/tienda/${slug}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch (err) {
      console.error(err);
      setError("No se pudo copiar el enlace.");
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Tiendas
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Todas las tiendas registradas en la plataforma. Vista interna de
            administración.
          </p>
        </div>

        <button
          onClick={loadStores}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          🔄 Actualizar
        </button>
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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Tiendas totales
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {totals.stores}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            {totals.trials} en trial
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Activas
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-600">
            {totals.active}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            {totals.suspended} suspendidas
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Productos publicados
          </div>
          <div className="mt-2 text-3xl font-bold text-blue-600">
            {totals.products}
          </div>
        </div>

        <div className="rounded-2xl bg-linear-to-br from-rose-500 to-orange-500 p-5 text-white shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
            Ventas procesadas
          </div>
          <div className="mt-2 text-3xl font-bold">
            {formatCurrency(totals.sales)}
          </div>
        </div>
      </div>

      {/* Buscador + filtros */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="🔍 Buscar por nombre, dueño, correo o slug..."
          className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900/10"
        />

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                statusFilter === filter.value
                  ? "bg-gray-900 text-white shadow"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty states */}
      {stores.length === 0 ? (
        <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
          <div className="text-6xl">🏪</div>

          <h2 className="mt-4 text-xl font-bold text-gray-900">
            Aún no hay tiendas
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Cuando un vendor cree su tienda, aparecerá aquí.
          </p>
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
          <div className="text-5xl">🔍</div>

          <p className="mt-4 text-sm text-gray-500">
            No se encontraron tiendas con esos filtros.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredStores.map((store, index) => {
            const subInfo = getSubscriptionInfo(store);
            const isLoadingThis = actionLoadingId === store.id;
            const ownerPhone = (store as any).owner_phone as string | null;

            return (
              <div
                key={store.id}
                className={`group overflow-hidden rounded-3xl bg-white shadow-sm transition hover:shadow-lg ${
                  !store.is_active ? "opacity-60" : ""
                }`}
              >
                {/* Header con gradient */}
                <div
                  className={`relative h-24 bg-linear-to-br ${
                    COLORS[index % COLORS.length]
                  } p-5`}
                >
                  {/* Avatar de la tienda */}
                  <div className="absolute -bottom-6 left-5 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white text-base font-bold text-gray-900 shadow-lg ring-4 ring-white">
                    {store.logo_url ? (
                      <img
                        src={store.logo_url}
                        alt={store.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(store.name)
                    )}
                  </div>

                  {/* Badges */}
                  <div className="absolute right-5 top-5 flex flex-col items-end gap-1.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        store.is_active
                          ? "bg-white/20 text-white backdrop-blur"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {store.is_active ? "Activa" : "Suspendida"}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${subInfo.bg} ${subInfo.text}`}
                    >
                      <span>{subInfo.emoji}</span>
                      {subInfo.label}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 pt-10">
                  <h3 className="truncate text-lg font-bold text-gray-900">
                    {store.name}
                  </h3>

                  <div className="mt-3 text-xs text-gray-600">
                    <div className="truncate font-medium">
                      {store.owner_name ?? "Sin nombre"}
                    </div>

                    <div className="truncate text-gray-400">
                      {store.owner_email ?? "Sin correo"}
                    </div>

                    <div className="mt-1 text-[11px] text-gray-400">
                      📅 Creada: {formatDate(store.created_at)}
                    </div>
                  </div>

                  {/* Stats: 3 columnas */}
                  <div className="mt-4 grid grid-cols-3 gap-2 border-y border-gray-100 py-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {store.products_count}
                      </div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        Productos
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {store.orders_count}
                      </div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        Pedidos
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-600">
                        {formatCurrency(store.total_sales)}
                      </div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        Ventas
                      </div>
                    </div>
                  </div>

                  {/* Link copiable */}
                  <button
                    onClick={() => copyLink(store.slug)}
                    className="mt-4 flex w-full items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2 text-left text-xs transition hover:bg-gray-100"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Link de tienda
                      </div>
                      <div className="truncate font-mono text-gray-700">
                        /tienda/{store.slug}
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        copiedSlug === store.slug
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {copiedSlug === store.slug ? "✓ Copiado" : "Copiar"}
                    </span>
                  </button>

                  {/* Acciones — layout responsive */}
                  <div className="mt-4 space-y-2">
                    {/* Fila 1: Ver tienda + WhatsApp (si tiene) */}
                    <div className="flex gap-2">
                      <a
                        href={`/tienda/${store.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 rounded-xl bg-gray-900 py-2.5 text-center text-xs font-bold text-white transition hover:bg-gray-800"
                      >
                        👁 Ver tienda
                      </a>

                      {(store.whatsapp || ownerPhone) && (
                        <a
                          href={getWhatsappUrl(
                            (store.whatsapp || ownerPhone) as string
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-600"
                          title="Contactar por WhatsApp"
                        >
                          💬
                        </a>
                      )}
                    </div>

                    {/* Fila 2: Suspender + Eliminar */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggle(store)}
                        disabled={isLoadingThis}
                        className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          store.is_active
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {isLoadingThis
                          ? "..."
                          : store.is_active
                          ? "⏸ Suspender"
                          : "▶ Reactivar"}
                      </button>

                      <button
                        onClick={() => handleDelete(store)}
                        disabled={isLoadingThis}
                        className="rounded-xl border border-red-200 px-4 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Eliminar tienda"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}