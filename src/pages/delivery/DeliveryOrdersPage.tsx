// src/pages/delivery/DeliveryOrdersPage.tsx
import { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import {
  getMyOrders,
  getStatusLabel,
  getStatusColor,
  formatShippingAddress,
  getDistrict,
  type AssignmentStatus,
} from "../../lib/delivery";

type TabKey = "active" | "delivered" | "all";

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: "active", label: "Activos", icon: "🛵" },
  { key: "delivered", label: "Entregados", icon: "✅" },
  { key: "all", label: "Todos", icon: "📋" },
];

export default function DeliveryOrdersPage() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("active");

  useEffect(() => {
    if (!user?.id) return;
    loadOrders();
  }, [user?.id, activeTab]);

  async function loadOrders() {
    if (!user?.id) return;
    try {
      setLoading(true);

      let statusFilter: AssignmentStatus | AssignmentStatus[] | undefined;
      if (activeTab === "active") {
        statusFilter = ["assigned", "picked_up"];
      } else if (activeTab === "delivered") {
        statusFilter = "delivered";
      } else {
        statusFilter = undefined;
      }

      const data = await getMyOrders(user.id, statusFilter);
      setAssignments(data);
    } catch (err) {
      console.error("Error cargando pedidos:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          📦 Mis Pedidos
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Todos tus pedidos asignados
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-75 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-500" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
          <div className="text-5xl">📭</div>
          <h3 className="mt-4 text-lg font-bold text-gray-900">
            Sin pedidos
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            {activeTab === "active"
              ? "No tienes pedidos activos"
              : activeTab === "delivered"
              ? "Aún no has entregado pedidos"
              : "No tienes pedidos aún"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <OrderCard key={assignment.id} assignment={assignment} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ assignment }: { assignment: any }) {
  const order = assignment.order;
  if (!order) return null;

  return (
    <Link
      to={`/delivery/orders/${assignment.id}`}
      className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
            📦
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-gray-900">
                #{order.order_number}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusColor(
                  assignment.status
                )}`}
              >
                {getStatusLabel(assignment.status)}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {order.customer_name}
            </p>
            <p className="mt-0.5 text-xs text-gray-600">
              🏪 {order.store?.name ?? "Tienda"}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            S/. {Number(order.total).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1 border-t border-gray-100 pt-3">
        <p className="flex items-start gap-2 text-xs text-gray-600">
          <span>📍</span>
          <span>
            {getDistrict(order.shipping_address)} —{" "}
            {formatShippingAddress(order.shipping_address)}
          </span>
        </p>
        {order.customer_phone && (
          <p className="flex items-center gap-2 text-xs text-gray-600">
            <span>📞</span>
            <span>{order.customer_phone}</span>
          </p>
        )}
        <p className="flex items-center gap-2 text-xs text-gray-500">
          <span>🕐</span>
          <span>
            Asignado{" "}
            {new Date(assignment.assigned_at).toLocaleString("es-PE", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </p>
      </div>
    </Link>
  );
}