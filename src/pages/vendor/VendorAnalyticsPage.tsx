// src/pages/vendor/VendorAnalyticsPage.tsx
import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { supabase } from "../../lib/supabase";
import {
  getStoreAnalyticsSummary,
  getStoreDailyViews,
  getStoreTopProducts,
  getStoreWABreakdown,
  getStoreReferrers,
  getStoreDevices,
  type AnalyticsSummary,
  type DailyView,
  type TopProduct,
  type WABreakdown,
  type Referrer,
  type DeviceBreakdown,
} from "../../lib/analytics";

type Period = 7 | 30 | 90;

export default function VendorAnalyticsPage() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const toast = useToast();

  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [period, setPeriod] = useState<Period>(30);
  const [loading, setLoading] = useState(true);

  // Data states
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [dailyViews, setDailyViews] = useState<DailyView[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [waBreakdown, setWaBreakdown] = useState<WABreakdown[]>([]);
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [devices, setDevices] = useState<DeviceBreakdown[]>([]);

  // ─── Obtener la tienda del vendor ────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const fetchStore = async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error cargando tienda:", error);
        toast.error("Error", "No se pudo cargar tu tienda");
        setLoading(false);
        return;
      }

      if (!data) {
        toast.warning("Sin tienda", "Aún no has creado tu tienda");
        setLoading(false);
        return;
      }

      setStoreId(data.id);
      setStoreName(data.name);
    };

    fetchStore();
  }, [user?.id]);

  // ─── Cargar analytics cuando cambia storeId o period ─────
  useEffect(() => {
    if (!storeId) return;

    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const [
          summaryData,
          dailyData,
          topData,
          waData,
          refData,
          devData,
        ] = await Promise.all([
          getStoreAnalyticsSummary(storeId, period),
          getStoreDailyViews(storeId, period),
          getStoreTopProducts(storeId, period, 5),
          getStoreWABreakdown(storeId, period),
          getStoreReferrers(storeId, period, 5),
          getStoreDevices(storeId, period),
        ]);

        setSummary(summaryData);
        setDailyViews(dailyData);
        setTopProducts(topData);
        setWaBreakdown(waData);
        setReferrers(refData);
        setDevices(devData);
      } catch (err) {
        console.error("Error cargando analytics:", err);
        toast.error("Error", "No se pudieron cargar las estadísticas");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [storeId, period]);

  // ─── Loading inicial ──────────────────────────────────────
  if (loading && !summary) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  // ─── Sin tienda ────────────────────────────────────────────
  if (!storeId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">🏪</p>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            No tienes una tienda aún
          </h2>
          <p className="text-gray-500">
            Crea tu tienda para ver estadísticas
          </p>
        </div>
      </div>
    );
  }

  // Calcular max para escalar gráfico
  const maxViews = Math.max(...dailyViews.map((d) => d.views), 1);
  const maxWaBreakdown = Math.max(...waBreakdown.map((w) => w.count), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* ═══ Header ═══════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            📈 Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Estadísticas de <span className="font-semibold">{storeName}</span>
          </p>
        </div>

        {/* Selector período */}
        <div className="flex gap-2 bg-white rounded-2xl p-1 shadow-sm">
          {([7, 30, 90] as Period[]).map((days) => (
            <button
              key={days}
              onClick={() => setPeriod(days)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                period === days
                  ? "bg-rose-500 text-white shadow"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {days} días
            </button>
          ))}
        </div>
      </div>

      {/* ═══ 4 KPIs ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon="👁️"
          label="Visitas totales"
          value={summary?.total_views ?? 0}
          color="from-blue-400 to-blue-600"
        />
        <KpiCard
          icon="👤"
          label="Visitantes únicos"
          value={summary?.unique_visitors ?? 0}
          color="from-purple-400 to-purple-600"
        />
        <KpiCard
          icon="💬"
          label="Clicks WhatsApp"
          value={summary?.total_wa_clicks ?? 0}
          color="from-green-400 to-green-600"
        />
        <KpiCard
          icon="🎯"
          label="Conversión"
          value={`${(summary?.conversion_rate ?? 0).toFixed(1)}%`}
          color="from-rose-400 to-rose-600"
        />
      </div>

      {/* ═══ Gráfico de visitas diarias ═══════════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          📊 Visitas por día
        </h2>
        {dailyViews.length === 0 ? (
          <p className="text-center text-gray-400 py-8">
            Aún no hay datos para este período
          </p>
        ) : (
          <div className="flex items-end gap-1 h-48 overflow-x-auto">
            {dailyViews.map((d) => {
              const height = (d.views / maxViews) * 100;
              const date = new Date(d.day);
              return (
                <div
                  key={d.day}
                  className="flex-1 min-w-8 flex flex-col items-center gap-1 group"
                >
                  <div className="text-xs text-gray-500 font-semibold">
                    {d.views > 0 ? d.views : ""}
                  </div>
                  <div
                    className="w-full bg-linear-to-t from-rose-400 to-pink-500 rounded-t-lg transition-all hover:from-rose-500 hover:to-pink-600 relative"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${d.day}: ${d.views} visitas, ${d.wa_clicks} clicks WA`}
                  />
                  <div className="text-[10px] text-gray-400 rotate-45 origin-left mt-1 whitespace-nowrap">
                    {date.getDate()}/{date.getMonth() + 1}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Grid: Top productos + WA breakdown ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top productos */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            🏆 Top 5 productos más vistos
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Sin datos aún</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, idx) => (
                <div
                  key={p.product_id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-rose-100 text-rose-600 font-bold rounded-lg flex items-center justify-center text-sm shrink-0">
                    {idx + 1}
                  </div>
                  {p.product_image ? (
                    <img
                      src={p.product_image}
                      alt={p.product_name}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-xl shrink-0">
                      📦
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate text-sm">
                      {p.product_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.views} vistas
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WhatsApp breakdown */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            💬 Clicks WhatsApp por origen
          </h2>
          {waBreakdown.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Sin datos aún</p>
          ) : (
            <div className="space-y-3">
              {waBreakdown.map((w) => {
                const pct = (w.count / maxWaBreakdown) * 100;
                return (
                  <div key={w.click_type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 capitalize">
                        {getClickTypeLabel(w.click_type)}
                      </span>
                      <span className="text-gray-500">{w.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-linear-to-r from-green-400 to-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Grid: Referrers + Devices ═════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referrers */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            🌐 Fuentes de tráfico
          </h2>
          {referrers.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Sin datos aún</p>
          ) : (
            <div className="space-y-2">
              {referrers.map((r) => (
                <div
                  key={r.referrer_domain}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-xl"
                >
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {r.referrer_domain || "Directo"}
                  </span>
                  <span className="text-sm text-gray-500 shrink-0 ml-2">
                    {r.visits} visitas
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Devices */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            📱 Dispositivos
          </h2>
          {devices.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Sin datos aún</p>
          ) : (
            <div className="space-y-3">
              {devices.map((d) => (
                <div key={d.device_type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 flex items-center gap-2">
                      {getDeviceIcon(d.device_type)} {getDeviceLabel(d.device_type)}
                    </span>
                    <span className="text-gray-500">
                      {d.count} ({d.percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-linear-to-r from-blue-400 to-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${d.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Componente auxiliar: KPI Card
// ═══════════════════════════════════════════════════════════════
function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5">
      <div
        className={`w-10 h-10 rounded-xl bg-linear-to-br ${color} flex items-center justify-center text-xl mb-3 shadow`}
      >
        {icon}
      </div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Helpers de labels
// ═══════════════════════════════════════════════════════════════
function getClickTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    floating: "🟢 Botón flotante",
    header: "📌 Header",
    product: "📦 Producto",
    payment: "💳 Pago",
    social: "🔗 Social",
    checkout: "🛒 Checkout",
    other: "❓ Otro",
  };
  return labels[type] ?? type;
}

function getDeviceIcon(type: string): string {
  const icons: Record<string, string> = {
    mobile: "📱",
    tablet: "📱",
    desktop: "💻",
  };
  return icons[type] ?? "❓";
}

function getDeviceLabel(type: string): string {
  const labels: Record<string, string> = {
    mobile: "Móvil",
    tablet: "Tablet",
    desktop: "Escritorio",
  };
  return labels[type] ?? type;
}