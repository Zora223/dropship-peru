// src/layouts/VendorLayout.tsx
// 🆕 v22.35 - Realtime 360°: Pedidos 🧾 + Nuevo Catálogo 🏷️ + Visitas en Vivo 👀

import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useMyStore } from "../hooks/useMyStore";
import { supabase } from "../lib/supabase";

const navItems = [
  { to: "/vendor", label: "Resumen", icon: "📊", exact: true, badgeType: null },
  { to: "/vendor/catalog", label: "Catálogo maestro", icon: "🏷️", badgeType: "catalog" },
  { to: "/vendor/products", label: "Mis productos", icon: "📦", badgeType: null },
  { to: "/vendor/orders", label: "Pedidos", icon: "🧾", badgeType: "orders" },
  { to: "/vendor/reviews", label: "Reseñas", icon: "⭐", badgeType: null },
  { to: "/vendor/analytics", label: "Analytics", icon: "📈", badgeType: "visits" },
  { to: "/vendor/pickup-locations", label: "Puntos de recojo", icon: "📍", badgeType: null },
  { to: "/vendor/delivery-settings", label: "Horarios de entrega", icon: "🚚", badgeType: null },
  { to: "/vendor/payments", label: "Métodos de cobro", icon: "💳", badgeType: null },
  { to: "/vendor/theme", label: "Personalizar tienda", icon: "🎨", badgeType: null },
  { to: "/vendor/settings", label: "Configuración", icon: "⚙️", badgeType: null },
];

function isActivePath(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

// 💰 Sonido Sintetizado de Caja Registradora
function playOrderChimeSound() {
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

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime + 0.08);

    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn("Audio notification fail:", e);
  }
}

// 👀 Sonido Suave de Visita (Pop)
function playVisitPopSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.warn("Visit sound fail:", e);
  }
}

// 🔔 Disparar Notificación Nativa
function triggerNativeNotification(title: string, body: string, icon = "🔔") {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(`${icon} ${title}`, {
        body,
        icon: "/favicon.ico",
      });
    } catch (err) {
      console.warn("Error mostrando notificación emergente:", err);
    }
  }
}

export default function VendorLayout() {
  const location = useLocation();
  const { store } = useMyStore();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Estados de Badges Realtime
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [hasNewCatalogProducts, setHasNewCatalogProducts] = useState<boolean>(false);
  const [recentVisitsCount, setRecentVisitsCount] = useState<number>(0);

  const [notifPermission, setNotifPermission] = useState<string>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  // Si entra al catálogo -> apagar badge de catálogo nuevo
  useEffect(() => {
    if (location.pathname.startsWith("/vendor/catalog")) {
      setHasNewCatalogProducts(false);
    }
    if (location.pathname.startsWith("/vendor/analytics")) {
      setRecentVisitsCount(0);
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

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        setNotifPermission(permission);
      });
    }
  }, []);

  // 1️⃣ Cargar contador inicial de pedidos
  useEffect(() => {
    if (!store?.id) return;

    const fetchPendingCount = async () => {
      try {
        const { count, error } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("store_id", store.id)
          .eq("status", "pending_payment");

        if (!error && count !== null) {
          setPendingOrdersCount(count);
        }
      } catch (err) {
        console.warn("No se pudo obtener conteo de pedidos:", err);
      }
    };

    fetchPendingCount();
  }, [store?.id, location.pathname]);

  // 2️⃣ ESCUCHAS EN TIEMPO REAL (Supabase Realtime 360°)
  useEffect(() => {
    if (!store?.id) return;

    // A) Canal de Pedidos
    const ordersChannel = supabase
      .channel(`vendor-orders-${store.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${store.id}`,
        },
        (payload) => {
          const newOrder = payload.new as any;
          playOrderChimeSound();
          triggerNativeNotification(
            "¡Nuevo Pedido Recibido!",
            `Pedido #${newOrder.order_number} por S/ ${Number(newOrder.total || 0).toFixed(2)}. ¡Toca para ver!`,
            "🎉"
          );
          setPendingOrdersCount((prev) => prev + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${store.id}`,
        },
        (payload) => {
          const updatedOrder = payload.new as any;
          if (updatedOrder.status !== "pending_payment") {
            setPendingOrdersCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // B) Canal de Catálogo Maestro (Nuevos productos agregados por Admin/Supplier)
    const catalogChannel = supabase
      .channel("catalog-realtime-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "catalog_products",
        },
        (payload) => {
          const newProd = payload.new as any;
          setHasNewCatalogProducts(true);
          triggerNativeNotification(
            "¡Nuevo Producto en el Catálogo!",
            `"${newProd.name}" ya está disponible para importar a tu tienda.`,
            "🏷️"
          );
        }
      )
      .subscribe();

    // C) Canal de Visitas a la Tienda del Vendedor (Dopamina en Vivo)
    const visitsChannel = supabase
      .channel(`store-visits-${store.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "store_visits",
          filter: `store_id=eq.${store.id}`,
        },
        () => {
          playVisitPopSound();
          setRecentVisitsCount((prev) => prev + 1);
          triggerNativeNotification(
            "¡Cliente en tu Tienda!",
            "Alguien está mirando tus productos en este momento.",
            "👀"
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(catalogChannel);
      supabase.removeChannel(visitsChannel);
    };
  }, [store?.id]);

  const requestNotifPrompt = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission().then((p) => setNotifPermission(p));
    }
  };

  const SidebarContent = () => {
    return (
      <>
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400">
          <span>Mi tienda</span>
          {notifPermission === "default" && (
            <button
              type="button"
              onClick={requestNotifPrompt}
              className="text-[10px] text-rose-600 underline font-bold"
              title="Activar notificaciones en el celular"
            >
              🔔 Activar Alertas
            </button>
          )}
        </div>

        <nav className="mt-4 space-y-1">
          {navItems.map((item) => {
            const active = isActivePath(
              location.pathname,
              item.to,
              item.exact
            );

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-gray-700 hover:bg-rose-50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </div>

                {/* 🔴 BADGE PEDIDOS */}
                {item.badgeType === "orders" && pendingOrdersCount > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white animate-pulse shadow-sm">
                    {pendingOrdersCount}
                  </span>
                )}

                {/* 🏷️ BADGE CATÁLOGO NUEVO */}
                {item.badgeType === "catalog" && hasNewCatalogProducts && (
                  <span className="rounded-full bg-purple-500 px-2 py-0.5 text-[9px] font-black text-white animate-bounce shadow-sm">
                    NUEVO
                  </span>
                )}

                {/* 👀 BADGE VISITAS EN VIVO */}
                {item.badgeType === "visits" && recentVisitsCount > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-black text-white animate-pulse shadow-sm">
                    +{recentVisitsCount}
                  </span>
                )}
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

        <div className="mt-4 rounded-2xl bg-linear-to-br from-purple-500 via-pink-500 to-orange-500 p-4 text-white shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍌</span>
            <div className="text-xs font-black uppercase tracking-wider">
              Product Launch AI
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed opacity-95">
            Al crear un producto, la AI genera automáticamente imagen pro + captions + hashtags.
          </p>
          <Link
            to="/vendor/products"
            className="mt-3 block rounded-lg bg-white/20 backdrop-blur px-3 py-1.5 text-center text-xs font-bold text-white hover:bg-white/30 transition"
          >
            🚀 Probar ahora
          </Link>
        </div>
      </>
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-73px)]">
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="sticky top-18 p-6">
          <SidebarContent />
        </div>
      </aside>

      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

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

              {(pendingOrdersCount > 0 || hasNewCatalogProducts) && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-white animate-pulse" />
              )}
            </button>

            <span className="text-sm font-bold uppercase tracking-wider text-rose-600">
              Mi tienda
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 👀 Badge de Visitas en Vivo */}
            {recentVisitsCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-1 text-[10px] font-bold text-emerald-800 animate-pulse">
                <span>👀</span>
                <span>En vivo</span>
              </span>
            )}

            {/* 🔴 Acceso rápido a Pedidos */}
            {pendingOrdersCount > 0 && (
              <Link
                to="/vendor/orders"
                className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-xs font-black text-white shadow-sm animate-pulse"
              >
                <span>🔔</span>
                <span>{pendingOrdersCount} pedido{pendingOrdersCount !== 1 ? "s" : ""}</span>
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