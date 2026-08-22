// src/layouts/DeliveryLayout.tsx
// 🆕 v22.37 - Delivery Realtime: Alerta Bip-Bip 🛵 + Push "¡Nueva entrega asignada!" + Badges 🔴

import { useState, useEffect, useContext } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { getMyDeliveryProfile, toggleAvailability } from "../lib/delivery";
import { useToast } from "../contexts/ToastContext";
import { supabase } from "../lib/supabase";

const navItems = [
  { to: "/delivery", label: "Resumen", icon: "📊", exact: true, badge: false },
  { to: "/delivery/orders", label: "Mis pedidos", icon: "📦", badge: true },
  { to: "/delivery/earnings", label: "Mis ganancias", icon: "💰", badge: false },
  { to: "/delivery/profile", label: "Mi perfil", icon: "👤", badge: false },
];

function isActivePath(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

// 🛵 Sonido Sintetizado Bip-Bip para Delivery (Web Audio API)
function playDeliveryAssignSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Doble Bip de moto/alerta
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    console.warn("Delivery sound fail:", e);
  }
}

// 🔔 Push Notification para Delivery
function triggerDeliveryPush(orderNumber: string) {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification("🛵 ¡Nueva Entrega Asignada!", {
        body: `Te han asignado el Pedido #${orderNumber}. Toca para ver la dirección y ruta de entrega.`,
        icon: "/favicon.ico",
        tag: orderNumber,
      });
    } catch (err) {
      console.warn("Error enviando push a delivery:", err);
    }
  }
}

export default function DeliveryLayout() {
  const location = useLocation();
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const toast = useToast();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deliveryProfileId, setDeliveryProfileId] = useState<string | null>(null);
  const [assignedOrdersCount, setAssignedOrdersCount] = useState<number>(0);

  const [notifPermission, setNotifPermission] = useState<string>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  // Limpiar badge cuando entra a "Mis pedidos"
  useEffect(() => {
    if (location.pathname.startsWith("/delivery/orders")) {
      setAssignedOrdersCount(0);
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

  // Cargar perfil e ID de Delivery
  useEffect(() => {
    if (!user?.id) return;
    loadProfile();
  }, [user?.id]);

  async function loadProfile() {
    if (!user?.id) return;
    try {
      const profile = await getMyDeliveryProfile(user.id);
      if (profile) {
        setAvailable(profile.available ?? false);
        setDeliveryProfileId(profile.id);
      }
    } catch (err) {
      console.error("Error cargando perfil delivery:", err);
    } finally {
      setLoading(false);
    }
  }

  // Realtime: Escuchar cuando le asignan un pedido al Delivery
  useEffect(() => {
    if (!deliveryProfileId) return;

    const channel = supabase
      .channel(`delivery-realtime-${deliveryProfileId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `delivery_id=eq.${deliveryProfileId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as any;
          // Si el pedido fue asignado a este delivery
          if (updatedOrder.delivery_status === "assigned" || updatedOrder.delivery_id === deliveryProfileId) {
            playDeliveryAssignSound();
            triggerDeliveryPush(updatedOrder.order_number);
            setAssignedOrdersCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deliveryProfileId]);

  async function handleToggleAvailable() {
    if (!user?.id) return;
    const newValue = !available;
    setAvailable(newValue);

    try {
      await toggleAvailability(user.id, newValue);
      toast.success(
        newValue ? "Disponible ✅" : "No disponible",
        newValue
          ? "Los vendedores ya pueden asignarte pedidos"
          : "No recibirás nuevas asignaciones"
      );
    } catch (err) {
      setAvailable(!newValue);
      toast.error("Error", "No se pudo actualizar tu disponibilidad");
      console.error(err);
    }
  }

  const requestNotifPrompt = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission().then((p) => setNotifPermission(p));
    }
  };

  const AvailabilityToggle = () => (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Mi estado
            </span>
            {notifPermission === "default" && (
              <button
                type="button"
                onClick={requestNotifPrompt}
                className="text-[10px] text-emerald-600 underline font-bold"
              >
                🔔 Alertas
              </button>
            )}
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
              className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-700 hover:bg-emerald-50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-base shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && assignedOrdersCount > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white animate-pulse shadow-sm">
                  {assignedOrdersCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-2xl bg-emerald-50 p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
          💡 Recuerda
        </div>
        <p className="mt-2 text-xs leading-relaxed text-emerald-800">
          Marca los pedidos como <b>recogidos</b> al salir y como <b>entregados</b> al llegar al cliente.
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
        <div className="mb-6 flex items-center gap-3 lg:hidden">
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

            {assignedOrdersCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-white animate-pulse" />
            )}
          </button>

          <span className="text-sm font-bold uppercase tracking-wider text-emerald-600">
            Panel Delivery
          </span>

          <div className="ml-auto flex items-center gap-2">
            {assignedOrdersCount > 0 && (
              <Link
                to="/delivery/orders"
                className="flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black text-white shadow-sm animate-pulse"
              >
                <span>🛵 {assignedOrdersCount} nueva{assignedOrdersCount !== 1 ? "s" : ""}</span>
              </Link>
            )}

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                available
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {available ? "✅ Activo" : "⏸ Pausa"}
            </span>
          </div>
        </div>

        <div className="mx-auto max-w-6xl w-full min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}