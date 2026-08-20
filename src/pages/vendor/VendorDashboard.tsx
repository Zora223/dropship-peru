// src/pages/vendor/VendorDashboard.tsx
// 🎨 v22.27 - Escalera de Éxito con Herramientas IA Ilimitadas por Membresía

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductForm from "../../components/vendor/ProductForm";
import TrialBanner from "../../components/vendor/TrialBanner";
import StatCard from "../../components/StatCard";
import MiniChart from "../../components/MiniChart";
import { useMyStore } from "../../hooks/useMyStore";
import { fetchVendorOrders } from "../../lib/vendor-orders";
import PickupOrdersSection from "../../components/vendor/PickupOrdersSection";
import { supabase } from "../../lib/supabase";
import {
  fetchVendorStatsSummary,
  fetchVendorSalesLastDays,
  fetchVendorTopProducts,
  type VendorStatsSummary,
  type DailySales,
  type TopSellingProduct,
} from "../../lib/vendor-stats";
import type {
  DbOrder,
  OrderStatus,
  PaymentMethodType,
} from "../../types/database";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pendiente",
  confirmed: "Confirmado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_CONFIG: Record<
  OrderStatus,
  { bg: string; text: string; emoji: string }
> = {
  pending_payment: { bg: "bg-amber-50", text: "text-amber-700", emoji: "⏳" },
  confirmed: { bg: "bg-blue-50", text: "text-blue-700", emoji: "✅" },
  shipped: { bg: "bg-purple-50", text: "text-purple-700", emoji: "🚚" },
  delivered: { bg: "bg-emerald-50", text: "text-emerald-700", emoji: "🎉" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", emoji: "❌" },
};

const PAYMENT_LABELS: Record<PaymentMethodType, string> = {
  yape: "Yape",
  plin: "Plin",
  card: "Tarjeta",
  transfer: "Transferencia",
  cash_on_delivery: "Pago contra entrega",
};

function formatCurrency(value: number) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function formatCurrencyShort(value: number) {
  if (value >= 1000) {
    return `S/ ${(value / 1000).toFixed(1)}k`;
  }
  return `S/ ${Number(value || 0).toFixed(0)}`;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

interface AiSubscriptionInfo {
  credits_remaining: number;
  credits_total: number;
  plan: string;
}

// 🏆 HELPER PARA LA ESCALERA DE ÉXITO SEGÚN VENTAS
function getTierInfo(monthlySales: number) {
  if (monthlySales >= 150) {
    return {
      name: "💎 DIAMANTE IMPERIO",
      nextTierName: "¡Nivel Máximo!",
      target: 150,
      nextTarget: 150,
      color: "from-blue-600 via-indigo-600 to-purple-800",
      textColor: "text-cyan-300",
      progressPct: 100,
      perks: [
        "Membresía de Tienda 100% GRATIS",
        "Kits de Publicidad IA Ilimitados",
        "Cargas Auto-Fill IA Ilimitadas",
        "Soporte VIP 1 a 1 por WhatsApp",
        "Destacado Prioritario en la Portada",
      ],
      remainingForNext: 0,
      nextRewardMsg: "👑 ¡Eres un Vendedor Diamante Líder!",
    };
  }

  if (monthlySales >= 60) {
    return {
      name: "🏆 PLATINO",
      nextTierName: "💎 DIAMANTE IMPERIO",
      target: 60,
      nextTarget: 150,
      color: "from-purple-900 via-fuchsia-900 to-gray-900",
      textColor: "text-fuchsia-300",
      progressPct: Math.min(100, Math.round(((monthlySales - 60) / 90) * 100)),
      perks: [
        "Membresía de Tienda 100% GRATIS",
        "Kits de Publicidad IA Ilimitados",
        "Cargas Auto-Fill IA Ilimitadas",
        "Productos Destacados en el Marketplace",
      ],
      remainingForNext: 150 - monthlySales,
      nextRewardMsg: `Te faltan ${150 - monthlySales} ventas para desbloquear Asesoría VIP 1 a 1`,
    };
  }

  if (monthlySales >= 50) {
    return {
      name: "🥇 ORO",
      nextTierName: "🏆 PLATINO",
      target: 50,
      nextTarget: 60,
      color: "from-amber-800 via-yellow-900 to-gray-900",
      textColor: "text-amber-300",
      progressPct: Math.min(100, Math.round(((monthlySales - 50) / 10) * 100)),
      perks: [
        "Membresía de Tienda 100% GRATIS",
        "Kits de Publicidad IA Ilimitados",
        "Cargas Auto-Fill IA Ilimitadas",
        "Plantillas de Marketing VIP Desbloqueadas",
      ],
      remainingForNext: 60 - monthlySales,
      nextRewardMsg: `Te faltan ${60 - monthlySales} ventas para subir a PLATINO (Portada destacada)`,
    };
  }

  if (monthlySales >= 40) {
    return {
      name: "🥈 PLATA",
      nextTierName: "🥇 ORO",
      target: 40,
      nextTarget: 50,
      color: "from-slate-800 via-gray-800 to-gray-900",
      textColor: "text-slate-300",
      progressPct: Math.min(100, Math.round(((monthlySales - 40) / 10) * 100)),
      perks: [
        "Membresía de Tienda 100% GRATIS",
        "Kits de Publicidad IA Ilimitados",
        "Cargas Auto-Fill IA Ilimitadas",
      ],
      remainingForNext: 50 - monthlySales,
      nextRewardMsg: `Te faltan ${50 - monthlySales} ventas para subir a ORO (Plantillas VIP)`,
    };
  }

  if (monthlySales >= 30) {
    return {
      name: "🥉 BRONCE",
      nextTierName: "🥈 PLATA",
      target: 30,
      nextTarget: 40,
      color: "from-amber-900 via-orange-950 to-gray-900",
      textColor: "text-orange-300",
      progressPct: Math.min(100, Math.round(((monthlySales - 30) / 10) * 100)),
      perks: [
        "Membresía de Tienda 100% GRATIS (S/ 15 ➔ S/ 0)",
        "Kits de Publicidad IA Ilimitados",
        "Cargas Auto-Fill IA Ilimitadas",
      ],
      remainingForNext: 40 - monthlySales,
      nextRewardMsg: `Te faltan ${40 - monthlySales} ventas para subir a PLATA`,
    };
  }

  // Nivel Inicial (0 - 29 ventas)
  return {
    name: "🚀 INICIO Y PRUEBA",
    nextTierName: "🥉 BRONCE (Membresía GRATIS)",
    target: 0,
    nextTarget: 30,
    color: "from-emerald-900 via-teal-950 to-gray-900",
    textColor: "text-emerald-300",
    progressPct: Math.min(100, Math.round((monthlySales / 30) * 100)),
    perks: [
      "Kits de Publicidad IA Ilimitados",
      "Cargas Auto-Fill IA Ilimitadas",
      "Reuso Ilimitado de tus Kits Guardados",
    ],
    remainingForNext: 30 - monthlySales,
    nextRewardMsg: `Te faltan ${30 - monthlySales} ventas para que tu Membresía te salga S/ 0.00 GRATIS`,
  };
}

export default function VendorDashboard() {
  const { store, loading: storeLoading, error: storeError } = useMyStore();

  const [stats, setStats] = useState<VendorStatsSummary | null>(null);
  const [salesChart, setSalesChart] = useState<DailySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopSellingProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<DbOrder[]>([]);
  const [aiSub, setAiSub] = useState<AiSubscriptionInfo | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [productCreated, setProductCreated] = useState(false);

  async function loadDashboard() {
    if (!store?.id) return;

    try {
      setLoading(true);
      setError(null);

      const [statsData, chartData, topData, ordersData] = await Promise.all([
        fetchVendorStatsSummary(store.id),
        fetchVendorSalesLastDays(store.id, 7),
        fetchVendorTopProducts(store.id, 5),
        fetchVendorOrders(store.id),
      ]);

      setStats(statsData);
      setSalesChart(chartData);
      setTopProducts(topData);
      setRecentOrders((ordersData ?? []).slice(0, 5));

      if (store.owner_id) {
        const { data: subData } = await supabase
          .from("ai_subscriptions")
          .select("credits_remaining, credits_total, plan")
          .eq("vendor_id", store.owner_id)
          .maybeSingle();

        if (subData) {
          setAiSub({
            credits_remaining: subData.credits_remaining,
            credits_total: subData.credits_total,
            plan: subData.plan,
          });
        }
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al cargar dashboard"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (store?.id) {
      loadDashboard();
    }
    if (!storeLoading && !store) {
      setLoading(false);
    }
  }, [store?.id, storeLoading]);

  const handleProductSaved = async () => {
    setShowForm(false);
    setProductCreated(true);
    await loadDashboard();
    setTimeout(() => setProductCreated(false), 3000);
  };

  if (storeLoading || loading) {
    return (
      <div className="space-y-8 py-8">
        <div>
          <div className="h-9 w-56 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-gray-100" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-96 animate-pulse rounded-2xl bg-gray-100 lg:col-span-2" />
          <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (storeError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
        {storeError}
      </div>
    );
  }

  if (!store) {
    return (
      <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
        <div className="text-6xl">🏪</div>
        <h2 className="mt-4 text-xl font-bold text-gray-900">
          Aún no tienes tienda
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Primero crea tu tienda para poder vender productos y recibir pedidos.
        </p>
        <Link
          to="/crear-tienda"
          className="mt-6 inline-block rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-gray-800"
        >
          Crear mi tienda
        </Link>
      </div>
    );
  }

  if (!stats) return null;

  const totalWeekChart = salesChart.reduce((sum, d) => sum + d.total, 0);

  // 🏆 LÓGICA DE GAMIFICACIÓN REAL SEGÚN LAS VENTAS DEL MES
  const currentMonthSales = stats.this_month.orders || 0;
  const tier = getTierInfo(currentMonthSales);

  return (
    <div className="space-y-6 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Mi Tienda 👋
          </h1>
          <p className="mt-1 text-gray-500">
            Resumen de{" "}
            <span className="font-semibold text-gray-700">{store.name}</span>
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Banner de trial */}
      <TrialBanner store={store} />

      {/* 🏆 TARJETA DE GAMIFICACIÓN: ESCALERA DE ÉXITO Y MEMBRESÍA GRATIS */}
      <div className={`overflow-hidden rounded-3xl border-2 border-emerald-400/40 bg-linear-to-br ${tier.color} p-6 text-white shadow-xl relative`}>
        <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl font-black select-none">
          🏆
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-bold text-white uppercase tracking-wider backdrop-blur">
                <span>🎯 Nivel Actual de tu Tienda</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black mt-2 flex items-center gap-2">
                <span>{tier.name}</span>
              </h2>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs text-gray-300 block uppercase font-semibold">
                Costo de Membresía
              </span>
              <span className={`text-base sm:text-lg font-black ${tier.textColor}`}>
                {currentMonthSales >= 30
                  ? "🎉 ¡100% GRATIS (EXONERADA)!"
                  : "S/ 15.00 / mes"}
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-gray-200 leading-relaxed max-w-2xl">
            <strong>Mientras más vendes, más ahorras.</strong> A partir de 30 ventas al mes, tu tienda te sale totalmente gratis. Las herramientas IA vienen activas de forma ilimitada en cualquier nivel.
          </p>

          {/* Barra de progreso hacia el siguiente nivel */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-bold">
              <span>Progreso este mes: {currentMonthSales} ventas completadas</span>
              <span className={tier.textColor}>{tier.progressPct}% del nivel</span>
            </div>
            <div className="h-3.5 w-full bg-black/50 rounded-full overflow-hidden p-0.5 border border-white/20">
              <div
                className="h-full bg-linear-to-r from-emerald-400 via-teal-300 to-amber-300 rounded-full transition-all duration-700 shadow-sm"
                style={{ width: `${tier.progressPct}%` }}
              />
            </div>
            <p className="text-xs font-semibold text-amber-200 mt-1">
              🔥 {tier.nextRewardMsg}
            </p>
          </div>

          {/* Beneficios desbloqueados */}
          <div className="pt-4 border-t border-white/10">
            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block mb-2">
              🎁 Beneficios Desbloqueados en tu Nivel:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {tier.perks.map((perk, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 backdrop-blur">
                  <span className="text-emerald-300 font-bold">✓</span>
                  <span className="font-medium text-gray-100">{perk}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Estado de herramientas disponibles: SIEMPRE ILIMITADAS */}
          <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur border border-white/10">
              <span className="text-gray-300 text-[10px] uppercase font-bold block">
                🚀 Kits de Publicidad IA
              </span>
              <span className="text-base font-extrabold text-white">
                ♾️ ILIMITADO (ACTIVO)
              </span>
              <span className="text-[10px] text-emerald-300 block mt-0.5">
                TikTok, Instagram, FB & WhatsApp
              </span>
            </div>

            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur border border-white/10">
              <span className="text-gray-300 text-[10px] uppercase font-bold block">
                🪄 Cargas Auto-Fill IA
              </span>
              <span className="text-base font-extrabold text-white">
                ♾️ ILIMITADO (ACTIVO)
              </span>
              <span className="text-[10px] text-emerald-300 block mt-0.5">
                Publica en 1 click
              </span>
            </div>

            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur border border-white/10">
              <span className="text-gray-300 text-[10px] uppercase font-bold block">
                ♻️ Reuso de Kits
              </span>
              <span className="text-base font-extrabold text-amber-300">
                100% GRATIS
              </span>
              <span className="text-[10px] text-gray-300 block mt-0.5">
                Reutiliza los kits guardados
              </span>
            </div>
          </div>

          {aiSub && aiSub.plan !== "starter" && (
            <div className="pt-2 text-[10px] text-emerald-200 opacity-70">
              Plan actual: <strong className="uppercase">{aiSub.plan}</strong>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Pedidos pickup */}
      <PickupOrdersSection storeId={store.id} />

      {productCreated && (
        <div className="rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <div className="font-bold text-emerald-900">
                ¡Producto guardado!
              </div>
              <div className="text-sm text-emerald-700">
                Ya está disponible en tu tienda.{" "}
                <Link
                  to="/vendor/products"
                  className="font-semibold underline"
                >
                  Ver mis productos →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPIs principales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ventas del mes"
          value={formatCurrency(stats.this_month.revenue)}
          icon="💰"
          color="success"
          trend={{
            value: stats.this_month.growth_pct,
            label: "vs mes pasado",
          }}
          subtitle={`${stats.this_month.orders} pedidos completados`}
        />

        <StatCard
          label="Esta semana"
          value={formatCurrency(stats.this_week.revenue)}
          icon="📈"
          color="info"
          trend={{
            value: stats.this_week.growth_pct,
            label: "vs semana pasada",
          }}
          subtitle={`${stats.this_week.orders} pedidos`}
        />

        <StatCard
          label="Pendientes"
          value={stats.pending.orders}
          icon="⏳"
          color="warning"
          subtitle={`${formatCurrency(stats.pending.revenue)} por cobrar`}
        />

        <StatCard
          label="Ticket promedio"
          value={formatCurrency(stats.totals.avg_ticket)}
          icon="🎯"
          color="dark"
          subtitle={`Sobre ${stats.totals.all_orders} pedidos totales`}
        />
      </div>

      {/* Alertas de stock */}
      {(stats.totals.low_stock > 0 || stats.totals.out_of_stock > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {stats.totals.low_stock > 0 && (
            <div className="rounded-2xl border-l-4 border-orange-500 bg-orange-50 p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <div className="font-bold text-orange-900">
                    Productos con stock bajo
                  </div>
                  <p className="mt-1 text-sm text-orange-800">
                    {stats.totals.low_stock} producto
                    {stats.totals.low_stock === 1 ? "" : "s"} con 5 unidades o
                    menos.
                  </p>
                  <Link
                    to="/vendor/products"
                    className="mt-2 inline-block text-sm font-semibold text-orange-700 underline"
                  >
                    Revisar productos →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {stats.totals.out_of_stock > 0 && (
            <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">❌</span>
                <div className="flex-1">
                  <div className="font-bold text-red-900">
                    Productos agotados
                  </div>
                  <p className="mt-1 text-sm text-red-800">
                    {stats.totals.out_of_stock} producto
                    {stats.totals.out_of_stock === 1 ? "" : "s"} sin stock.
                  </p>
                  <Link
                    to="/vendor/products"
                    className="mt-2 inline-block text-sm font-semibold text-red-700 underline"
                  >
                    Gestionar stock →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid principal: gráfico + panel lateral */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* Gráfico de ventas */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  📊 Ventas últimos 7 días
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Total:{" "}
                  <span className="font-bold text-gray-900">
                    {formatCurrency(totalWeekChart)}
                  </span>
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  stats.this_week.growth_pct >= 0
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {stats.this_week.growth_pct >= 0 ? "↑" : "↓"}{" "}
                {Math.abs(stats.this_week.growth_pct)}%
              </span>
            </div>

            <div className="mt-6">
              <MiniChart
                data={salesChart.map((d) => ({
                  label: d.label,
                  value: d.total,
                }))}
                color="#e11d48"
                height={160}
                formatValue={(v) => formatCurrencyShort(v)}
              />
            </div>
          </div>

          {/* Últimos pedidos */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  🧾 Últimos pedidos
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Pedidos más recientes de tu tienda.
                </p>
              </div>
              <Link
                to="/vendor/orders"
                className="text-sm font-semibold text-rose-600 hover:text-rose-700"
              >
                Ver todos →
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-gray-50 p-8 text-center">
                <div className="text-4xl">📭</div>
                <h3 className="mt-3 font-bold text-gray-900">
                  Aún no tienes pedidos
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Cuando tus clientes compren, aparecerán aquí.
                </p>
              </div>
            ) : (
              <>
                {/* 🖥️ Desktop: tabla */}
                <div className="mt-6 hidden overflow-hidden rounded-2xl border border-gray-100 md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Pedido</th>
                        <th className="px-4 py-3 font-medium">Cliente</th>
                        <th className="px-4 py-3 font-medium">Total</th>
                        <th className="px-4 py-3 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-mono text-xs font-bold text-gray-900">
                              {order.order_number}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {formatShortDate(order.created_at)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {order.customer_name}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {PAYMENT_LABELS[order.payment_method] ??
                                order.payment_method}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900">
                            {formatCurrency(order.total)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                STATUS_CONFIG[order.status].bg
                              } ${STATUS_CONFIG[order.status].text}`}
                            >
                              {STATUS_CONFIG[order.status].emoji}{" "}
                              {STATUS_LABELS[order.status]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 📱 Mobile: cards */}
                <div className="mt-6 space-y-3 md:hidden">
                  {recentOrders.map((order) => {
                    const status = STATUS_CONFIG[order.status];
                    return (
                      <div
                        key={order.id}
                        className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-xs font-bold text-gray-900">
                              {order.order_number}
                            </div>
                            <div className="truncate text-sm font-medium text-gray-900">
                              {order.customer_name}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {formatShortDate(order.created_at)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-black text-gray-900">
                              {formatCurrency(order.total)}
                            </div>
                            <span
                              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.bg} ${status.text}`}
                            >
                              {status.emoji} {STATUS_LABELS[order.status]}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Estado de tienda */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              🏪 Estado de la tienda
            </h2>

            <div className="mt-4 flex items-center gap-3">
              <span
                className={`h-3 w-3 animate-pulse rounded-full ${
                  store.is_active ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm font-medium text-gray-700">
                {store.is_active
                  ? "Tienda activa y visible"
                  : "Tienda inactiva"}
              </span>
            </div>

            <p className="mt-2 text-xs text-gray-400">
              {store.is_active
                ? "Tus productos aparecen en tu tienda pública."
                : "Activa tu tienda para que los clientes compren."}
            </p>

            <div className="mt-4 rounded-xl bg-gray-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                URL de tu tienda
              </div>
              <a
                href={`/tienda/${store.slug}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate text-sm font-mono font-semibold text-rose-600 hover:underline"
              >
                /tienda/{store.slug}
              </a>
            </div>

            <div className="mt-4 space-y-2">
              <Link
                to="/vendor/settings"
                className="block rounded-xl bg-gray-900 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                ⚙️ Configurar tienda
              </Link>
              <a
                href={`/tienda/${store.slug}`}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-gray-200 py-2.5 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                👁 Ver mi tienda
              </a>
            </div>
          </div>

          {/* Top productos vendidos */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              🏆 Top productos
            </h2>
            <p className="mt-1 text-xs text-gray-500">Los más vendidos</p>

            {topProducts.length === 0 ? (
              <div className="mt-4 rounded-xl bg-gray-50 p-4 text-center text-xs text-gray-500">
                Aún no hay productos vendidos.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {topProducts.map((product, index) => (
                  <div
                    key={product.product_id}
                    className="flex items-center gap-3 rounded-xl bg-gray-50 p-2.5"
                  >
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        index === 0
                          ? "bg-amber-400 text-white"
                          : index === 1
                          ? "bg-gray-300 text-gray-800"
                          : index === 2
                          ? "bg-orange-400 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.product_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>📦</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-gray-900">
                        {product.product_name}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {product.quantity_sold} vendidos ·{" "}
                        {formatCurrency(product.total_revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Link
              to="/vendor/products"
              className="mt-4 block rounded-xl border border-gray-200 py-2 text-center text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Ver todos los productos →
            </Link>
          </div>

          {/* Acción rápida */}
          <div className="rounded-2xl bg-linear-to-br from-gray-900 to-gray-800 p-6 text-white shadow-lg">
            <h2 className="text-lg font-bold">⚡ Acción rápida</h2>
            <p className="mt-1 text-xs text-white/70">
              Amplía tu catálogo en segundos.
            </p>

            <button
              onClick={() => setShowForm(true)}
              className="mt-4 w-full rounded-xl bg-rose-500 py-3 text-sm font-bold text-white shadow transition hover:bg-rose-600 active:scale-95"
            >
              + Crear producto propio
            </button>

            <Link
              to="/vendor/catalog"
              className="mt-2 block w-full rounded-xl border border-white/20 py-2.5 text-center text-xs font-semibold text-white/80 transition hover:bg-white/10"
            >
              📚 Importar del catálogo
            </Link>

            <Link
              to="/vendor/orders"
              className="mt-2 block w-full rounded-xl border border-white/20 py-2.5 text-center text-xs font-semibold text-white/80 transition hover:bg-white/10"
            >
              🧾 Gestionar pedidos
            </Link>
          </div>
        </div>
      </div>

      {showForm && (
        <ProductForm
          storeId={store.id}
          onClose={() => setShowForm(false)}
          onSaved={handleProductSaved}
          initial={null}
        />
      )}
    </div>
  );
}