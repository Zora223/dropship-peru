// src/pages/delivery/DeliveryDashboard.tsx
import { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import {
  getMyOrders,
  getEarningsSummary,
  getMyDeliveryProfile,
  getStatusLabel,
  getStatusColor,
  getDistrict,
} from "../../lib/delivery";

interface DashboardStats {
  activeOrders: number;
  deliveredToday: number;
  pendingAmount: number;
  totalDeliveries: number;
}

export default function DeliveryDashboard() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;

  const [loading, setLoading] = useState(true);
  const [profileExists, setProfileExists] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    activeOrders: 0,
    deliveredToday: 0,
    pendingAmount: 0,
    totalDeliveries: 0,
  });
  const [activeOrders, setActiveOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    loadDashboard();
  }, [user?.id]);

  async function loadDashboard() {
    if (!user?.id) return;
    try {
      setLoading(true);

      const profile = await getMyDeliveryProfile(user.id);
      setProfileExists(!!profile);

      const active = await getMyOrders(user.id, ["assigned", "picked_up"]);
      setActiveOrders(active);

      const today = new Date().toISOString().split("T")[0];
      const delivered = await getMyOrders(user.id, "delivered");
      const deliveredToday = delivered.filter((a) =>
        a.delivered_at?.startsWith(today)
      ).length;

      const earnings = await getEarningsSummary(user.id);

      setStats({
        activeOrders: active.length,
        deliveredToday,
        pendingAmount: earnings.pending,
        totalDeliveries: profile?.total_deliveries ?? 0,
      });
    } catch (err) {
      console.error("Error cargando dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-500" />
      </div>
    );
  }

  if (!profileExists) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            👋 Bienvenido
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Completa tu perfil para empezar a recibir pedidos
          </p>
        </div>

        <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-8 text-center">
          <div className="text-6xl">📝</div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">
            Completa tu perfil
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-700">
            Necesitamos tu número de Yape, vehículo y tarifa base para que los
            vendors puedan asignarte pedidos.
          </p>
          <Link
            to="/delivery/profile"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            👤 Completar perfil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          📊 Resumen
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Hola {user?.full_name || "delivery"} 👋
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon="🛵"
          label="Pedidos activos"
          value={stats.activeOrders}
          color="blue"
        />
        <StatCard
          icon="✅"
          label="Entregados hoy"
          value={stats.deliveredToday}
          color="emerald"
        />
        <StatCard
          icon="💰"
          label="Por cobrar"
          value={`S/. ${stats.pendingAmount.toFixed(2)}`}
          color="amber"
        />
        <StatCard
          icon="📦"
          label="Total entregas"
          value={stats.totalDeliveries}
          color="rose"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900">
            🛵 Pedidos activos
          </h2>
          <Link
            to="/delivery/orders"
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Ver todos →
          </Link>
        </div>

        {activeOrders.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl">📭</div>
            <p className="mt-3 text-sm text-gray-600">
              No tienes pedidos activos
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Cuando un vendor te asigne un pedido, aparecerá aquí
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeOrders.slice(0, 5).map((assignment) => (
              <Link
                key={assignment.id}
                to={`/delivery/orders/${assignment.id}`}
                className="flex items-center gap-3 p-4 transition hover:bg-gray-50 sm:p-6"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
                  📦
                </div>

                <div className="min-w-0 grow">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      #{assignment.order?.order_number ?? "—"}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusColor(
                        assignment.status
                      )}`}
                    >
                      {getStatusLabel(assignment.status)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-gray-600">
                    {assignment.order?.customer_name ?? "Cliente"} —{" "}
                    {getDistrict(assignment.order?.shipping_address)}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">
                    S/. {Number(assignment.order?.total ?? 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">→</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: string;
  label: string;
  value: number | string;
  color: "emerald" | "blue" | "amber" | "rose";
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl ${colors[color]}`}
      >
        {icon}
      </div>
      <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}