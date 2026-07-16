// src/layouts/DeliveryLayout.tsx
import { useState, useEffect, useContext } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { getMyDeliveryProfile, toggleAvailability } from "../lib/delivery";
import { useToast } from "../contexts/ToastContext";

const navItems = [
  { to: "/delivery", label: "Resumen", icon: "📊", exact: true },
  { to: "/delivery/orders", label: "Mis pedidos", icon: "📦" },
  { to: "/delivery/earnings", label: "Mis ganancias", icon: "💰" },
  { to: "/delivery/profile", label: "Mi perfil", icon: "👤" },
];

function isActivePath(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function DeliveryLayout() {
  const location = useLocation();
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const toast = useToast();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  // Cargar estado de disponibilidad
  useEffect(() => {
    if (!user?.id) return;
    loadProfile();
  }, [user?.id]);

  async function loadProfile() {
    if (!user?.id) return;
    try {
      const profile = await getMyDeliveryProfile(user.id);
      setAvailable(profile?.available ?? false);
    } catch (err) {
      console.error("Error cargando perfil:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAvailable() {
    if (!user?.id) return;
    const newValue = !available;
    setAvailable(newValue); // optimista

    try {
      await toggleAvailability(user.id, newValue);
      toast.success(
        newValue ? "Disponible ✅" : "No disponible",
        newValue
          ? "Los vendors ya pueden asignarte pedidos"
          : "No recibirás nuevas asignaciones"
      );
    } catch (err) {
      setAvailable(!newValue); // revertir
      toast.error("Error", "No se pudo actualizar tu disponibilidad");
      console.error(err);
    }
  }

  const AvailabilityToggle = () => (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Mi estado
          </div>
          <div
            className={`mt-1 text-sm font-bold ${
              available ? "text-emerald-600" : "text-gray-400"
            }`}
          >
            {loading
              ? "Cargando..."
              : available
              ? "✅ Disponible"
              : "❌ No disponible"}
          </div>
        </div>

        <button
          onClick={handleToggleAvailable}
          disabled={loading}
          className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            available ? "bg-emerald-500" : "bg-gray-300"
          } ${loading ? "opacity-50" : ""}`}
          aria-label="Toggle disponibilidad"
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              available ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );

  const SidebarContent = () => (
    <>
      <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
        Panel Delivery
      </div>

      <div className="mt-4">
        <AvailabilityToggle />
      </div>

      <nav className="mt-4 space-y-1">
        {navItems.map((item) => {
          const active = isActivePath(location.pathname, item.to, item.exact);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-700 hover:bg-emerald-50"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-2xl bg-emerald-50 p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
          💡 Recuerda
        </div>

        <p className="mt-2 text-xs leading-relaxed text-emerald-800">
          Marca los pedidos como <b>recogidos</b> al salir y como{" "}
          <b>entregados</b> al llegar al cliente.
        </p>
      </div>
    </>
  );

  return (
    <div className="flex min-h-[calc(100vh-73px)]">
      {/* Sidebar Desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="sticky top-18 p-6">
          <SidebarContent />
        </div>
      </aside>

      {/* Overlay móvil */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer móvil */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] transform overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <span className="text-lg font-bold text-gray-900">
            Dropship <span className="text-emerald-500">Delivery</span>
          </span>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-gray-500 transition hover:bg-gray-100"
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <SidebarContent />
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="grow bg-[#f5f5f7] p-4 sm:p-6 lg:p-8">
        {/* Header móvil con hamburguesa */}
        <div className="mb-6 flex items-center gap-3 lg:hidden">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm transition hover:bg-gray-100"
            aria-label="Abrir menú"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <span className="text-sm font-bold uppercase tracking-wider text-emerald-600">
            Panel Delivery
          </span>

          {/* Indicador rápido de disponibilidad en mobile header */}
          <span
            className={`ml-auto rounded-full px-3 py-1 text-xs font-bold ${
              available
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {available ? "✅ Activo" : "⏸ Pausa"}
          </span>
        </div>

        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}