// src/layouts/SupplierLayout.tsx
// 🆕 v22.36 - Layout Proveedor con Realtime: Alertas de Despacho 📦 + Sonido 💰

import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

const navItems = [
  { to: "/supplier", label: "Inicio", icon: "🏠", exact: true, badge: false },
  { to: "/supplier/orders", label: "Pedidos", icon: "📦", badge: true },
  { to: "/supplier/products", label: "Mis productos", icon: "🛒", badge: false },
  { to: "/supplier/earnings", label: "Ganancias", icon: "💰", badge: false },
  { to: "/supplier/profile", label: "Mi negocio", icon: "⚙️", badge: false },
];

function isActivePath(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

// 💰 Sonido Sintetizado para Proveedor
function playSupplierOrderSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.warn("Supplier sound fail:", e);
  }
}

// 🔔 Disparar Push Proveedor
function triggerSupplierPush(title: string, body: string) {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(`📦 ${title}`, {
        body,
        icon: "/favicon.ico",
      });
    } catch (err) {
      console.warn("Error mostrando push proveedor:", err);
    }
  }
}

export default function SupplierLayout() {
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [pendingSupplierOrdersCount, setPendingSupplierOrdersCount] = useState(0);

  const [notifPermission, setNotifPermission] = useState<string>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith("/supplier/orders")) {
      setPendingSupplierOrdersCount(0);
    }
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

  // Cargar ID de Proveedor
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setSupplierId(user.id);
    };
    fetchUser();
  }, []);

  // Cargar pedidos pendientes del proveedor
  useEffect(() => {
    if (!supplierId) return;

    const fetchPendingOrders = async () => {
      try {
        const { count, error } = await supabase
          .from("supplier_orders")
          .select("id", { count: "exact", head: true })
          .eq("supplier_id", supplierId)
          .eq("status", "pending");

        if (!error && count !== null) {
          setPendingSupplierOrdersCount(count);
        }
      } catch (err) {
        console.warn("Error buscando pedidos de proveedor:", err);
      }
    };

    fetchPendingOrders();
  }, [supplierId, location.pathname]);

  // Escuchar Realtime en supplier_orders
  useEffect(() => {
    if (!supplierId) return;

    const channel = supabase
      .channel(`supplier-orders-${supplierId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "supplier_orders",
          filter: `supplier_id=eq.${supplierId}`,
        },
        (payload) => {
          const newSO = payload.new as any;
          playSupplierOrderSound();
          triggerSupplierPush(
            "¡Nueva Orden de Despacho!",
            `Producto: ${newSO.product_name || "Catálogo"}. ¡Prepara el paquete!`
          );
          setPendingSupplierOrdersCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supplierId]);

  const requestNotifPrompt = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission().then((p) => setNotifPermission(p));
    }
  };

  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400">
        <span>Panel Proveedor</span>
        {notifPermission === "default" && (
          <button
            type="button"
            onClick={requestNotifPrompt}
            className="text-[10px] text-amber-600 underline font-bold"
          >
            🔔 Alertas
          </button>
        )}
      </div>

      <nav className="mt-4 space-y-1">
        {navItems.map((item) => {
          const active = isActivePath(location.pathname, item.to, item.exact);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-gray-700 hover:bg-amber-50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-base shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && pendingSupplierOrdersCount > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white animate-pulse">
                  {pendingSupplierOrdersCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-2xl bg-amber-50 p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
          💚 Cobros seguros
        </div>
        <p className="mt-2 text-xs leading-relaxed text-amber-800">
          Te pagamos por Yape al confirmar cada pedido. Cero riesgo, cero espera.
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
            Dropship <span className="text-amber-500">Perú</span>
          </span>
          <button
            type="button"
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
      <main className="grow bg-[#f5f5f7] p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
        {/* Header móvil */}
        <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm transition hover:bg-gray-100"
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

              {pendingSupplierOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-white animate-pulse" />
              )}
            </button>

            <span className="text-sm font-bold uppercase tracking-wider text-amber-600">
              Panel Proveedor
            </span>
          </div>

          {pendingSupplierOrdersCount > 0 && (
            <Link
              to="/supplier/orders"
              className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-xs font-black text-white shadow-sm animate-pulse"
            >
              <span>📦</span>
              <span>{pendingSupplierOrdersCount} pedido{pendingSupplierOrdersCount !== 1 ? "s" : ""}</span>
            </Link>
          )}
        </div>

        <div className="mx-auto max-w-6xl w-full min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}