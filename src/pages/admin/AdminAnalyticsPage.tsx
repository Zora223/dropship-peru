// src/pages/admin/AdminAnalyticsPage.tsx
// 📊 v22.2 - Dashboard de Diagnóstico de Salud y KPIs para Admin (Sin warnings)

import { useEffect, useState } from "react";
import {
  fetchAdminKpiDiagnosis,
  type KpiDiagnosisData,
  type TimePeriod,
  type VendorHealthProfile,
} from "../../lib/admin-analytics";

const HEALTH_STATUS_CONFIG: Record<
  VendorHealthProfile["health_status"],
  { label: string; bg: string; text: string; emoji: string; desc: string }
> = {
  active_star: {
    label: "Estrella Activa",
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    emoji: "🌟",
    desc: "Vende y usa IA regularmente",
  },
  marketer_no_sales: {
    label: "Usa IA sin ventas",
    bg: "bg-blue-100",
    text: "text-blue-800",
    emoji: "📢",
    desc: "Crea publicidad pero aún no convierte",
  },
  no_marketing: {
    label: "Con stock sin Mkt",
    bg: "bg-amber-100",
    text: "text-amber-800",
    emoji: "📦",
    desc: "Tiene productos pero NUNCA usó la IA",
  },
  empty_store: {
    label: "Tienda Vacía",
    bg: "bg-orange-100",
    text: "text-orange-800",
    emoji: "🚨",
    desc: "Creó la tienda pero 0 productos importados",
  },
  zombie: {
    label: "Inactivo / Zombi",
    bg: "bg-gray-100",
    text: "text-gray-600",
    emoji: "💤",
    desc: "Registrado sin actividad",
  },
};

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<TimePeriod>("30d");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<KpiDiagnosisData | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminKpiDiagnosis(period);
      setData(res);
    } catch (err) {
      console.error("Error cargando analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  if (loading || !data) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-purple-600" />
      </div>
    );
  }

  const { funnel, bottlenecks, metrics, vendors } = data;

  const filteredVendors = vendors.filter((v) => {
    const matchesStatus = statusFilter === "all" || v.health_status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      v.email.toLowerCase().includes(q) ||
      (v.store_name?.toLowerCase().includes(q) ?? false);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">📊 Diagnóstico de Salud & KPIs</h1>
          <p className="text-xs text-gray-500">
            Descubre por qué las ventas no suben y detecta qué vendedores necesitan un impulso
          </p>
        </div>

        {/* Filtro de tiempo */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          {[
            { id: "7d" as const, label: "7 días" },
            { id: "30d" as const, label: "30 días" },
            { id: "all" as const, label: "Histórico" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                period === p.id
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 🤖 MOTOR DE DIAGNÓSTICO AUTOMÁTICO */}
      <div className="rounded-3xl bg-linear-to-br from-gray-900 via-purple-950 to-slate-900 p-6 text-white shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🤖</span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
              Motor de Diagnóstico
            </div>
            <h2 className="text-lg font-black">Causas Principales de Fricción</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/10 p-4 border border-white/10 backdrop-blur">
            <div className="flex items-center justify-between text-xs font-bold text-orange-300 mb-1">
              <span>🚨 Tiendas Vacías</span>
              <span>{bottlenecks.empty_stores_pct}%</span>
            </div>
            <p className="text-[11px] text-gray-200 leading-snug">
              Del total de vendedores, el <strong>{bottlenecks.empty_stores_pct}%</strong> creó tienda pero NO ha importado ningún producto del catálogo.
            </p>
            <div className="mt-2 text-[10px] text-amber-200 font-semibold">
              💡 Solución: Manda un tutorial de "Importa en 1 Clic".
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 p-4 border border-white/10 backdrop-blur">
            <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-1">
              <span>📢 Falta de Publicidad</span>
              <span>{bottlenecks.no_marketing_pct}%</span>
            </div>
            <p className="text-[11px] text-gray-200 leading-snug">
              El <strong>{bottlenecks.no_marketing_pct}%</strong> tiene productos pero NUNCA ha usado los Kits de IA para publicar en redes.
            </p>
            <div className="mt-2 text-[10px] text-amber-200 font-semibold">
              💡 Solución: Recuérdales publicar en sus estados de WhatsApp.
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 p-4 border border-white/10 backdrop-blur">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-300 mb-1">
              <span>⏳ Dinero en Riesgo</span>
              <span>S/ {bottlenecks.pending_orders_revenue.toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-gray-200 leading-snug">
              Hay <strong>S/ {bottlenecks.pending_orders_revenue.toFixed(2)}</strong> en pedidos pendientes por confirmar o pagar.
            </p>
            <div className="mt-2 text-[10px] text-emerald-200 font-semibold">
              💡 Solución: Notifica a los vendedores para que cierren por WhatsApp.
            </div>
          </div>
        </div>
      </div>

      {/* 🌪️ EMBUDO DE CONVERSIÓN */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-base font-black text-gray-900">
          🌪️ Embudo de Conversión de Vendedores
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
          <div className="rounded-2xl bg-gray-50 p-3 border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase">1. Registrados</span>
            <div className="text-xl font-black text-gray-900 mt-1">{funnel.registered_users}</div>
            <span className="text-[9px] text-gray-400 block mt-1">Usuarios Totales</span>
          </div>

          <div className="rounded-2xl bg-blue-50 p-3 border border-blue-100">
            <span className="text-[10px] font-bold text-blue-600 uppercase">2. Tienda Creada</span>
            <div className="text-xl font-black text-blue-900 mt-1">{funnel.stores_created}</div>
            <span className="text-[9px] text-blue-600 block mt-1">
              {Math.round((funnel.stores_created / (funnel.registered_users || 1)) * 100)}% conversión
            </span>
          </div>

          <div className="rounded-2xl bg-purple-50 p-3 border border-purple-100">
            <span className="text-[10px] font-bold text-purple-600 uppercase">3. Con Productos</span>
            <div className="text-xl font-black text-purple-900 mt-1">{funnel.stores_with_products}</div>
            <span className="text-[9px] text-purple-600 block mt-1">
              {Math.round((funnel.stores_with_products / (funnel.stores_created || 1)) * 100)}% con stock
            </span>
          </div>

          <div className="rounded-2xl bg-pink-50 p-3 border border-pink-100">
            <span className="text-[10px] font-bold text-pink-600 uppercase">4. Usan IA</span>
            <div className="text-xl font-black text-pink-900 mt-1">{funnel.stores_using_ai}</div>
            <span className="text-[9px] text-pink-600 block mt-1">
              {metrics.total_kits_created} Kits creados
            </span>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-3 border border-emerald-100">
            <span className="text-[10px] font-bold text-emerald-600 uppercase">5. Tienen Ventas</span>
            <div className="text-xl font-black text-emerald-900 mt-1">{funnel.stores_with_sales}</div>
            <span className="text-[9px] text-emerald-600 block mt-1">
              {Math.round((funnel.stores_with_sales / (funnel.stores_created || 1)) * 100)}% activas
            </span>
          </div>

          <div className="rounded-2xl bg-amber-50 p-3 border border-amber-200">
            <span className="text-[10px] font-bold text-amber-700 uppercase">6. Membresía $0</span>
            <div className="text-xl font-black text-amber-900 mt-1">{funnel.stores_in_bronce}</div>
            <span className="text-[9px] text-amber-700 block mt-1">30+ Ventas catálogo</span>
          </div>
        </div>
      </div>

      {/* 🏥 MATRIZ DE SALUD Y ACTIVIDAD POR VENDEDOR */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-gray-900">
              🩺 Matriz de Salud de Vendedores
            </h3>
            <p className="text-xs text-gray-500">
              Identifica a quién empujar por WhatsApp para activar sus ventas
            </p>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Todos ({vendors.length})
            </button>
            <button
              onClick={() => setStatusFilter("empty_store")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === "empty_store"
                  ? "bg-orange-500 text-white"
                  : "bg-orange-50 text-orange-700 hover:bg-orange-100"
              }`}
            >
              🚨 Tienda Vacía
            </button>
            <button
              onClick={() => setStatusFilter("no_marketing")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === "no_marketing"
                  ? "bg-amber-500 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              📦 Sin Mkt
            </button>
            <button
              onClick={() => setStatusFilter("active_star")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === "active_star"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              🌟 Estrellas
            </button>
          </div>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Buscar vendedor por correo o tienda..."
          className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs outline-none focus:border-purple-600"
        />

        {/* MÓVIL */}
        <div className="grid gap-3 sm:hidden">
          {filteredVendors.map((v) => {
            const status = HEALTH_STATUS_CONFIG[v.health_status];
            return (
              <div
                key={v.vendor_id}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-sm text-gray-900">
                      {v.full_name || "Sin nombre"}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-45">{v.email}</div>
                    {v.store_name && (
                      <div className="text-xs font-bold text-purple-600 mt-0.5">
                        🏪 {v.store_name}
                      </div>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-black ${status.bg} ${status.text}`}
                  >
                    {status.emoji} {status.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-xl text-center text-xs">
                  <div>
                    <span className="text-[9px] text-gray-400 block font-bold">Prods.</span>
                    <span className="font-black text-gray-800">{v.total_products}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block font-bold">Kits IA</span>
                    <span className="font-black text-purple-600">{v.kits_generated}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block font-bold">Ventas</span>
                    <span className="font-black text-emerald-600">S/ {v.total_revenue.toFixed(2)}</span>
                  </div>
                </div>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `¡Hola ${v.full_name || "emprendedor"}! 👋 Vimos que tienes tu tienda en Dropship Perú. ¿Te ayudamos a publicar tu primer producto con IA para lanzar tus ventas hoy mismo?`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full rounded-xl bg-emerald-500 py-2 text-center text-xs font-bold text-white shadow-sm"
                >
                  💬 Impulsar por WhatsApp
                </a>
              </div>
            );
          })}
        </div>

        {/* ESCRITORIO */}
        <div className="hidden sm:block overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
              <tr>
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3">Estado Salud</th>
                <th className="px-4 py-3">Prods. Tienda</th>
                <th className="px-4 py-3">Publicidad IA</th>
                <th className="px-4 py-3">Pedidos</th>
                <th className="px-4 py-3">Ventas Totales</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVendors.map((v) => {
                const status = HEALTH_STATUS_CONFIG[v.health_status];
                return (
                  <tr key={v.vendor_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{v.full_name || "Sin nombre"}</div>
                      <div className="text-gray-500">{v.email}</div>
                      {v.store_name && (
                        <div className="text-purple-600 font-bold">🏪 {v.store_name}</div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 font-bold ${status.bg} ${status.text}`}
                        title={status.desc}
                      >
                        {status.emoji} {status.label}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-bold text-gray-800">
                      {v.total_products}
                      <span className="text-[10px] text-gray-400 block font-normal">
                        ({v.catalog_products_count} cat. / {v.own_products_count} prop.)
                      </span>
                    </td>

                    <td className="px-4 py-3 font-bold text-purple-600">
                      🎨 {v.kits_generated} kits
                    </td>

                    <td className="px-4 py-3 font-bold text-gray-800">
                      {v.total_orders} pedidos
                    </td>

                    <td className="px-4 py-3 font-black text-emerald-600">
                      S/ {v.total_revenue.toFixed(2)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `¡Hola ${v.full_name || "emprendedor"}! 👋 Vimos que tienes tu tienda en Dropship Perú. ¿Te ayudamos a publicar tus productos con Inteligencia Artificial para activar tus ventas hoy mismo?`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-600 shadow-xs"
                      >
                        💬 Impulsar
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}