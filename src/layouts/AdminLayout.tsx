// src/layouts/AdminLayout.tsx
// 🆕 v22.37 - Admin Realtime 360° + Pestaña "Salud & Analytics" 📊 agregada al menú

import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

const navItems = [
  { to: "/admin", label: "Resumen", icon: "📊", exact: true, badgeKey: null },
  { to: "/admin/analytics", label: "Salud & Analytics", icon: "📈", badgeKey: null }, // 👈 AHORA SÍ INCLUIDO
  { to: "/admin/settings", label: "Configuración", icon: "⚙️", badgeKey: null },
  { to: "/admin/discounts", label: "Descuentos", icon: "🎁", badgeKey: null },
  { to: "/admin/catalog", label: "Catálogo", icon: "📦", badgeKey: null },
  { to: "/admin/suppliers", label: "Proveedores", icon: "🏭", badgeKey: null },
  { to: "/admin/users", label: "Usuarios", icon: "👥", badgeKey: "users" },
  { to: "/admin/deliveries", label: "Deliveries", icon: "🛵", badgeKey: null },
  { to: "/admin/delivery-payments", label: "Liq. Deliveries", icon: "💰", badgeKey: null },
  { to: "/admin/supplier-payouts", label: "Pagos a Proveedores", icon: "💵", badgeKey: null },
  { to: "/admin/stores", label: "Tiendas", icon: "🏪", badgeKey: null },
  { to: "/admin/orders", label: "Pedidos", icon: "🧾", badgeKey: "orders" },
  { to: "/admin/payments", label: "Métodos de pago", icon: "💳", badgeKey: null },
  { to: "/admin/payment-validations", label: "Validaciones OCR", icon: "🤖", badgeKey: null },
  { to: "/admin/theme", label: "Temas y branding", icon: "🎨", badgeKey: null },
  { to: "/admin/whatsapp", label: "WhatsApp Bot", icon: "💬", badgeKey: null },
  { to: "/admin/whatsapp-templates", label: "WA Templates", icon: "📝", badgeKey: null },
  { to: "/admin/whatsapp-logs", label: "WA Logs", icon: "📋", badgeKey: null },
  { to: "/admin/ai", label: "AI & Créditos", icon: "🍌", badgeKey: "ai" },
];

function isActivePath(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

// 💰 Sonido Sintetizado de Caja Registradora
function playAdminOrderChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

    osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime + 0.08);

    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn("Audio fail:", e);
  }
}

// 🔔 Disparar Notificación Nativa Admin
function triggerAdminPushNotification(title: string, body: string, icon = "👑") {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(`${icon} ${title}`, {
        body,
        icon: "/favicon.ico",
      });
    } catch (err) {
      console.warn("Error mostrando push:", err);
    }
  }
}

export default function AdminLayout() {
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Badges Admin
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [pendingUpgradesCount, setPendingUpgradesCount] = useState(0);
  const [newUsersCount, setNewUsersCount] = useState(0);

  const [notifPermission, setNotifPermission] = useState<string>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  // Limpiar badges al entrar a la sección
  useEffect(() => {
    if (location.pathname.startsWith("/admin/orders")) setPendingOrdersCount(0);
    if (location.pathname.startsWith("/admin/ai")) setPendingUpgradesCount(0);
    if (location.pathname.startsWith("/admin/users")) setNewUsersCount(0);
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

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        setNotifPermission(permission);
      });
    }
  }, []);

  // Cargar conteos iniciales
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [ordersRes, upgradesRes] = await Promise.all([
          supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending_payment"),
          supabase.from("ai_upgrade_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ]);

        if (ordersRes.count !== null) setPendingOrdersCount(ordersRes.count);
        if (upgradesRes.count !== null) setPendingUpgradesCount(upgradesRes.count);
      } catch (err) {
        console.warn("Error cargando conteos admin:", err);
      }
    };
    fetchCounts();
  }, [location.pathname]);

  // Realtime Subscriptions Admin
  useEffect(() => {
    // 1️⃣ Pedidos globales
    const ordersChannel = supabase
      .channel("admin-global-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new as any;
          playAdminOrderChime();
          triggerAdminPushNotification(
            "¡Nuevo Pedido en la Plataforma!",
            `Pedido #${newOrder.order_number} por S/ ${Number(newOrder.total || 0).toFixed(2)}`,
            "🧾"
          );
          setPendingOrdersCount((prev) => prev + 1);
        }
      )
      .subscribe();

    // 2️⃣ Solicitudes Upgrade IA Yape
    const upgradesChannel = supabase
      .channel("admin-ai-upgrades")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ai_upgrade_requests" },
        (payload) => {
          const req = payload.new as any;
          triggerAdminPushNotification(
            "¡Solicitud de Upgrade IA!",
            `Monto: S/ ${Number(req.amount || 0).toFixed(2)} (${req.payment_method})`,
            "💳"
          );
          setPendingUpgradesCount((prev) => prev + 1);
        }
      )
      .subscribe();

    // 3️⃣ Nuevos Registros de Usuarios / Vendedores
    const usersChannel = supabase
      .channel("admin-new-users")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        (payload) => {
          const profile = payload.new as any;
          triggerAdminPushNotification(
            "¡Nuevo Usuario Registrado!",
            `${profile.full_name || profile.email || "Nuevo usuario"} se unió a Dropship Perú.`,
            "👥"
          );
          setNewUsersCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(upgradesChannel);
      supabase.removeChannel(usersChannel);
    };
  }, []);

  const requestNotifPrompt = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission().then((p) => setNotifPermission(p));
    }
  };

  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400">
        <span>Administración</span>
        {notifPermission === "default" && (
          <button
            type="button"
            onClick={requestNotifPrompt}
            className="text-[10px] text-purple-600 underline font-bold"
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
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-base shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </div>

              {item.badgeKey === "orders" && pendingOrdersCount > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white animate-pulse">
                  {pendingOrdersCount}
                </span>
              )}

              {item.badgeKey === "ai" && pendingUpgradesCount > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-black text-white animate-bounce">
                  {pendingUpgradesCount}
                </span>
              )}

              {item.badgeKey === "users" && newUsersCount > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-purple-500 px-1.5 text-[10px] font-black text-white animate-pulse">
                  +{newUsersCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-2xl bg-gray-50 p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Política
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          Las tiendas son privadas por enlace. No existe un directorio público para clientes.
        </p>
      </div>
    </>
  );

  return (
    <div className="flex min-h-[calc(100vh-73px)]">
      {/* Sidebar Desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="sticky top-18.25 p-6">
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

              {(pendingOrdersCount > 0 || pendingUpgradesCount > 0) && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-white animate-pulse" />
              )}
            </button>

            <span className="text-sm font-bold uppercase tracking-wider text-gray-500">
              Administración
            </span>
          </div>

          <div className="flex items-center gap-2">
            {pendingUpgradesCount > 0 && (
              <Link
                to="/admin/ai"
                className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-black text-white shadow-sm animate-pulse"
              >
                <span>💳 Upgrade</span>
              </Link>
            )}
            {pendingOrdersCount > 0 && (
              <Link
                to="/admin/orders"
                className="flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black text-white shadow-sm animate-pulse"
              >
                <span>🧾 {pendingOrdersCount}</span>
              </Link>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-6xl w-full min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}