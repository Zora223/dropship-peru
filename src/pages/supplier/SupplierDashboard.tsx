// src/pages/supplier/SupplierDashboard.tsx
// Dashboard minimalista: 3 stats + 4 accesos rápidos

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { getMySupplierProfile, type SupplierProfile } from "../../lib/suppliers";

export default function SupplierDashboard() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SupplierProfile | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const data = await getMySupplierProfile();
      setProfile(data);
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-amber-500" />
      </div>
    );
  }

  // Si no está aprobado, mostrar pantalla especial
  if (profile && !profile.is_active) {
    return <PendingApprovalScreen />;
  }

  return (
    <div className="space-y-6">
      {/* Header con saludo */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Hola {profile?.business_name?.split(" ")[0] ?? "Proveedor"} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {profile?.business_name}
          {profile?.is_verified && (
            <span className="ml-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
              ✓ Verificado
            </span>
          )}
        </p>
      </div>

      {/* Stats de hoy */}
      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          📊 Hoy
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon="🆕"
            label="Por atender"
            value={0}
            hint="pedidos nuevos"
            color="amber"
          />
          <StatCard
            icon="✅"
            label="Confirmados"
            value={0}
            hint="hoy"
            color="emerald"
          />
          <StatCard
            icon="💰"
            label="Cobrado"
            value="S/. 0"
            hint="hoy"
            color="blue"
          />
        </div>
      </div>

      {/* Accesos rápidos */}
      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          ⚡ Acciones rápidas
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickAction
            to="/supplier/orders"
            icon="📦"
            title="Pedidos"
            description="Ver pedidos pendientes de atender"
            badge={0}
          />
          <QuickAction
            to="/supplier/products"
            icon="🛒"
            title="Mis productos"
            description="Gestiona tu catálogo"
          />
          <QuickAction
            to="/supplier/earnings"
            icon="💰"
            title="Ganancias"
            description="Historial de pagos"
          />
          <QuickAction
            to="/supplier/profile"
            icon="⚙️"
            title="Mi negocio"
            description="Actualiza tus datos"
          />
        </div>
      </div>

      {/* Tips iniciales */}
      {profile?.total_products === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 p-6">
          <h3 className="text-sm font-bold text-amber-900">
            🎯 ¡Empieza a vender!
          </h3>
          <p className="mt-2 text-sm text-amber-800">
            Sube tus primeros productos al catálogo para que los vendors los
            vean y empiecen a venderlos.
          </p>
          <Link
            to="/supplier/products"
            className="mt-4 inline-block rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600"
          >
            + Subir mi primer producto
          </Link>
        </div>
      )}
    </div>
  );
}

// ============================================
// 🧩 SUB-COMPONENTES
// ============================================

function StatCard({
  icon,
  label,
  value,
  hint,
  color,
}: {
  icon: string;
  label: string;
  value: number | string;
  hint: string;
  color: "amber" | "emerald" | "blue";
}) {
  const colors: Record<typeof color, string> = {
    amber: "border-amber-200 bg-amber-50",
    emerald: "border-emerald-200 bg-emerald-50",
    blue: "border-blue-200 bg-blue-50",
  };

  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs font-semibold text-gray-700">{label}</div>
      <div className="text-[10px] text-gray-500">{hint}</div>
    </div>
  );
}

function QuickAction({
  to,
  icon,
  title,
  description,
  badge,
}: {
  to: string;
  icon: string;
  title: string;
  description: string;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-2xl">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-gray-900">{title}</h3>
          {badge !== undefined && badge > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-500">{description}</p>
      </div>
      <div className="text-gray-400 transition group-hover:text-amber-500 group-hover:translate-x-1">
        →
      </div>
    </Link>
  );
}

// ============================================
// 🕐 PANTALLA DE PENDIENTE DE APROBACIÓN
// ============================================

function PendingApprovalScreen() {
  return (
    <div className="flex min-h-100 items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border-2 border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-5xl">
          ⏳
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Cuenta en revisión
        </h1>
        <p className="mt-3 text-sm text-gray-700">
          Nuestro equipo está revisando tu solicitud. Te contactaremos por
          WhatsApp en las próximas <b>24-48 horas</b> para confirmar tu
          activación.
        </p>

        <div className="mt-6 rounded-2xl bg-white p-4 text-left">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
            📱 ¿Qué sigue?
          </p>
          <ul className="mt-2 space-y-1 text-xs text-gray-600">
            <li>✓ Verificamos tus datos</li>
            <li>✓ Confirmamos por WhatsApp</li>
            <li>✓ Activamos tu cuenta</li>
            <li>✓ Empiezas a subir productos</li>
          </ul>
        </div>

        <p className="mt-6 text-xs text-gray-500">
          ¿Necesitas ayuda? Contáctanos por WhatsApp al{" "}
          <b>+51 916 146 396</b>
        </p>
      </div>
    </div>
  );
}