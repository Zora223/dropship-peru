import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

const navItems = [
  { to: "/vendor", label: "Resumen", icon: "📊", exact: true },
  { to: "/vendor/catalog", label: "Catálogo maestro", icon: "🏭" },
  { to: "/vendor/products", label: "Mis productos", icon: "📦" },
  { to: "/vendor/orders", label: "Pedidos", icon: "🧾" },
  { to: "/vendor/reviews", label: "Reseñas", icon: "⭐" },
  { to: "/vendor/analytics", label: "Analytics", icon: "📈" },
  { to: "/vendor/pickup-locations", label: "Puntos de recojo", icon: "📍" }, // 🆕 v13
  { to: "/vendor/delivery-settings", label: "Horarios de entrega", icon: "🚚" }, // 🆕 v16 FASE 3
  { to: "/vendor/payments", label: "Métodos de cobro", icon: "💳" },
  { to: "/vendor/theme", label: "Personalizar tienda", icon: "🎨" },
  { to: "/vendor/settings", label: "Configuración", icon: "⚙️" },
];

function isActivePath(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function VendorLayout() {
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  const SidebarContent = () => (
    <>
      <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
        Mi tienda
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
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-gray-700 hover:bg-rose-50"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-2xl bg-rose-50 p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-rose-700">
          Tu cartera protegida
        </div>

        <p className="mt-2 text-xs leading-relaxed text-rose-800">
          Tus clientes ingresan por tu enlace directo y ven solo tu tienda,
          marca y productos.
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
            Dropship <span className="text-rose-500">Perú</span>
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

          <span className="text-sm font-bold uppercase tracking-wider text-rose-600">
            Mi tienda
          </span>
        </div>

        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}