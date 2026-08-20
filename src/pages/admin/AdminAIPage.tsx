// src/pages/admin/AdminAIPage.tsx
// 🍌 v22.8 - Panel Admin AI 100% Responsive Móvil + Gestión Automatizada de Planes

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../contexts/ToastContext";

type PlanType = "starter" | "creator" | "pro" | "business";

interface VendorAI {
  vendor_id: string;
  email: string;
  full_name: string | null;
  store_name: string | null;
  store_slug: string | null;
  plan: PlanType;
  status: string;
  credits_remaining: number;
  credits_total: number;
  total_used: number;
  is_trial: boolean;
  expires_at: string | null;
  kits_generated: number;
}

interface UpgradeRequest {
  id: string;
  vendor_id: string;
  vendor_email: string;
  vendor_name: string | null;
  plan_requested: string;
  amount: number;
  payment_method: string;
  reference_code: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const PLAN_CONFIG: Record<
  PlanType,
  { label: string; price: number; credits: number; color: string; emoji: string }
> = {
  starter: { label: "Starter (Prueba)", price: 0, credits: 75, color: "gray", emoji: "🚀" },
  creator: { label: "Creator", price: 19, credits: 300, color: "purple", emoji: "🎨" },
  pro: { label: "Pro", price: 49, credits: 800, color: "blue", emoji: "⚡" },
  business: { label: "Business (VIP)", price: 149, credits: -1, color: "amber", emoji: "💎" },
};

export default function AdminAIPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<VendorAI[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<VendorAI | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState<PlanType>("creator");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"vendors" | "requests">("vendors");
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: subsData, error: subsError } = await supabase
        .from("ai_subscriptions")
        .select("*")
        .order("updated_at", { ascending: false });

      if (subsError) throw subsError;

      const vendorIds = (subsData || []).map((s) => s.vendor_id);

      const [profilesRes, storesRes, kitsRes] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name").in("id", vendorIds),
        supabase.from("stores").select("owner_id, name, slug").in("owner_id", vendorIds),
        supabase.from("product_launch_kits").select("vendor_id").in("vendor_id", vendorIds),
      ]);

      const profilesMap = new Map(
        (profilesRes.data || []).map((p) => [p.id, p])
      );
      const storesMap = new Map(
        (storesRes.data || []).map((s) => [s.owner_id, s])
      );

      const kitsCount: Record<string, number> = {};
      (kitsRes.data || []).forEach((k: { vendor_id: string }) => {
        kitsCount[k.vendor_id] = (kitsCount[k.vendor_id] || 0) + 1;
      });

      const vendorsData: VendorAI[] = (subsData || []).map((sub: any) => {
        const profile = profilesMap.get(sub.vendor_id);
        const store = storesMap.get(sub.vendor_id);
        return {
          vendor_id: sub.vendor_id,
          email: profile?.email || "Sin email",
          full_name: profile?.full_name || null,
          store_name: store?.name || null,
          store_slug: store?.slug || null,
          plan: sub.plan as PlanType,
          status: sub.status,
          credits_remaining: sub.credits_remaining ?? 75,
          credits_total: sub.credits_total ?? 75,
          total_used: sub.total_used || 0,
          is_trial: sub.is_trial,
          expires_at: sub.expires_at,
          kits_generated: kitsCount[sub.vendor_id] || 0,
        };
      });

      setVendors(vendorsData);

      const { data: requestsData } = await supabase
        .from("ai_upgrade_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (requestsData) {
        const reqVendorIds = requestsData.map((r) => r.vendor_id);
        const { data: reqProfiles } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", reqVendorIds);

        const reqProfilesMap = new Map(
          (reqProfiles || []).map((p) => [p.id, p])
        );

        const requests: UpgradeRequest[] = requestsData.map((r: any) => ({
          id: r.id,
          vendor_id: r.vendor_id,
          vendor_email: reqProfilesMap.get(r.vendor_id)?.email || "Sin email",
          vendor_name: reqProfilesMap.get(r.vendor_id)?.full_name || null,
          plan_requested: r.plan_requested,
          amount: Number(r.amount),
          payment_method: r.payment_method,
          reference_code: r.reference_code,
          status: r.status,
          admin_notes: r.admin_notes,
          created_at: r.created_at,
        }));

        setUpgradeRequests(requests);
      }
    } catch (err) {
      console.error(err);
      toast.error(
        "Error cargando datos",
        err instanceof Error ? err.message : "Intenta recargar"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetPlan = async (vendor: VendorAI) => {
    if (!confirm(`¿Restablecer cuota mensual de herramientas IA para ${vendor.email}?`)) return;

    try {
      const config = PLAN_CONFIG[vendor.plan];
      const defaultQuota = config.credits === -1 ? 9999 : config.credits;

      const { error } = await supabase
        .from("ai_subscriptions")
        .update({
          credits_remaining: defaultQuota,
          credits_total: defaultQuota,
          total_used: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("vendor_id", vendor.vendor_id);

      if (error) throw error;

      toast.success("✅ Cuota Restablecida", `${vendor.email} reiniciado a su plan`);
      await loadData();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Intenta de nuevo");
    }
  };

  const handleChangePlan = async () => {
    if (!selectedVendor) return;
    setProcessing(true);
    try {
      const config = PLAN_CONFIG[newPlan];
      const newQuota = config.credits === -1 ? 9999 : config.credits;

      const { error } = await supabase
        .from("ai_subscriptions")
        .update({
          plan: newPlan,
          credits_remaining: newQuota,
          credits_total: newQuota,
          total_used: 0,
          is_trial: false,
          status: "active",
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("vendor_id", selectedVendor.vendor_id);

      if (error) throw error;

      toast.success(
        "✅ Plan Asignado",
        `${selectedVendor.email} → Plan ${config.label}`
      );

      setShowPlanModal(false);
      setSelectedVendor(null);
      await loadData();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Intenta de nuevo");
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveRequest = async (request: UpgradeRequest) => {
    if (!confirm(`¿Aprobar Yape y cambiar a ${request.vendor_email} al plan ${request.plan_requested}?`)) return;

    setProcessing(true);
    try {
      const plan = request.plan_requested as PlanType;
      const config = PLAN_CONFIG[plan];
      const newQuota = config.credits === -1 ? 9999 : config.credits;

      const { error: subError } = await supabase
        .from("ai_subscriptions")
        .update({
          plan: plan,
          credits_remaining: newQuota,
          credits_total: newQuota,
          total_used: 0,
          is_trial: false,
          status: "active",
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("vendor_id", request.vendor_id);

      if (subError) throw subError;

      const { data: { user } } = await supabase.auth.getUser();
      const { error: reqError } = await supabase
        .from("ai_upgrade_requests")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (reqError) throw reqError;

      toast.success("✅ Upgrade Aprobado", `${request.vendor_email} ahora es ${config.label}`);
      await loadData();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Intenta de nuevo");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectRequest = async (request: UpgradeRequest) => {
    const reason = prompt("Motivo del rechazo:");
    if (reason === null) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("ai_upgrade_requests")
        .update({
          status: "rejected",
          admin_notes: reason || "No verificado en Yape",
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) throw error;

      toast.info("Solicitud rechazada", request.vendor_email);
      await loadData();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Intenta de nuevo");
    } finally {
      setProcessing(false);
    }
  };

  const filteredVendors = vendors.filter((v) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      v.email.toLowerCase().includes(q) ||
      (v.full_name?.toLowerCase().includes(q) ?? false) ||
      (v.store_name?.toLowerCase().includes(q) ?? false)
    );
  });

  const pendingRequests = upgradeRequests.filter((r) => r.status === "pending");

  const stats = {
    totalVendors: vendors.length,
    activeSubscriptions: vendors.filter((v) => v.status === "active").length,
    totalKits: vendors.reduce((sum, v) => sum + v.kits_generated, 0),
    mrr: vendors.reduce((sum, v) => sum + (PLAN_CONFIG[v.plan]?.price || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">🎨 Control de Membresías IA</h1>
          <p className="text-xs text-gray-500">Gestión de acceso y límites para vendedores</p>
        </div>
        <button
          onClick={loadData}
          className="w-full sm:w-auto rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm active:scale-95 transition"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* KPI Cards (Responsive Grid 2x2 en móvil) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 border border-gray-100 shadow-sm">
          <div className="text-[10px] font-bold uppercase text-gray-400">Tiendas con IA</div>
          <div className="text-2xl font-black text-gray-900 mt-1">{stats.totalVendors}</div>
        </div>

        <div className="rounded-2xl bg-linear-to-br from-purple-600 to-pink-600 p-4 text-white shadow-md">
          <div className="text-[10px] font-bold uppercase opacity-80">MRR Proyectado</div>
          <div className="text-2xl font-black mt-1">S/ {stats.mrr}</div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-gray-100 shadow-sm">
          <div className="text-[10px] font-bold uppercase text-gray-400">Activos</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{stats.activeSubscriptions}</div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-gray-100 shadow-sm">
          <div className="text-[10px] font-bold uppercase text-gray-400">Kits Creados</div>
          <div className="text-2xl font-black text-purple-600 mt-1">{stats.totalKits}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("vendors")}
          className={`flex-1 sm:flex-none px-4 py-3 text-xs sm:text-sm font-bold text-center border-b-2 transition ${
            activeTab === "vendors"
              ? "border-purple-600 text-purple-600 bg-purple-50/30"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          🏪 Tiendas ({vendors.length})
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex-1 sm:flex-none px-4 py-3 text-xs sm:text-sm font-bold text-center border-b-2 transition relative ${
            activeTab === "requests"
              ? "border-purple-600 text-purple-600 bg-purple-50/30"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          💳 Solicitudes Yape
          {pendingRequests.length > 0 && (
            <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white font-black">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: LISTADO DE TIENDAS */}
      {activeTab === "vendors" && (
        <div className="space-y-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Buscar por email, nombre o tienda..."
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs outline-none focus:border-purple-500 shadow-sm"
          />

          {/* VISTA MÓVIL: TARJETAS APILADAS */}
          <div className="grid gap-3 sm:hidden">
            {filteredVendors.map((vendor) => {
              const config = PLAN_CONFIG[vendor.plan];
              const isUnlimited = vendor.plan === "business";
              const kitsLeft = isUnlimited
                ? "♾️ Ilimitado"
                : Math.max(0, Math.floor(vendor.credits_remaining / 15));

              return (
                <div
                  key={vendor.vendor_id}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-gray-900">
                        {vendor.full_name || "Sin nombre"}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-50">
                        {vendor.email}
                      </div>
                      {vendor.store_name && (
                        <div className="text-xs font-bold text-purple-600 mt-0.5">
                          🏪 {vendor.store_name}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-black text-purple-800">
                      {config.emoji} {config.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-xl text-center text-xs">
                    <div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Kits Disponibles</div>
                      <div className="font-black text-gray-800 mt-0.5">{kitsLeft}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Kits Generados</div>
                      <div className="font-black text-purple-600 mt-0.5">{vendor.kits_generated}</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedVendor(vendor);
                        setNewPlan(vendor.plan);
                        setShowPlanModal(true);
                      }}
                      className="flex-1 rounded-xl bg-purple-600 py-2 text-xs font-bold text-white shadow-sm active:scale-95"
                    >
                      ✏️ Cambiar Plan
                    </button>
                    <button
                      onClick={() => handleResetPlan(vendor)}
                      className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
                    >
                      🔄 Reset
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* VISTA ESCRITORIO: TABLA */}
          <div className="hidden sm:block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">Tienda / Vendor</th>
                  <th className="px-4 py-3">Plan Actual</th>
                  <th className="px-4 py-3">Kits Disponibles</th>
                  <th className="px-4 py-3">Kits Creados</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredVendors.map((vendor) => {
                  const config = PLAN_CONFIG[vendor.plan];
                  const isUnlimited = vendor.plan === "business";
                  const kitsLeft = isUnlimited
                    ? "♾️ Ilimitado"
                    : Math.max(0, Math.floor(vendor.credits_remaining / 15));

                  return (
                    <tr key={vendor.vendor_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900">{vendor.full_name || "Sin nombre"}</div>
                        <div className="text-gray-500">{vendor.email}</div>
                        {vendor.store_name && (
                          <div className="text-purple-600 font-bold">🏪 {vendor.store_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-purple-100 px-2.5 py-1 font-bold text-purple-800">
                          {config.emoji} {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800">{kitsLeft}</td>
                      <td className="px-4 py-3 font-bold text-purple-600">{vendor.kits_generated}</td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => {
                            setSelectedVendor(vendor);
                            setNewPlan(vendor.plan);
                            setShowPlanModal(true);
                          }}
                          className="rounded-lg bg-purple-600 px-2.5 py-1 font-bold text-white shadow-sm"
                        >
                          Cambiar Plan
                        </button>
                        <button
                          onClick={() => handleResetPlan(vendor)}
                          className="rounded-lg bg-gray-100 px-2.5 py-1 font-bold text-gray-700 hover:bg-gray-200"
                        >
                          Reset
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SOLICITUDES YAPE */}
      {activeTab === "requests" && (
        <div className="space-y-3">
          {upgradeRequests.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
              <div className="text-4xl">📭</div>
              <p className="text-xs text-gray-500 mt-2">No hay solicitudes registradas.</p>
            </div>
          ) : (
            upgradeRequests.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      {new Date(req.created_at).toLocaleDateString("es-PE")}
                    </span>
                    <h4 className="font-bold text-sm text-gray-900">{req.vendor_email}</h4>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      req.status === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : req.status === "approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Plan Solicitado</span>
                    <span className="font-bold text-purple-700 uppercase">{req.plan_requested}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Monto Yape</span>
                    <span className="font-black text-emerald-600">S/ {req.amount.toFixed(2)}</span>
                  </div>
                </div>

                {req.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveRequest(req)}
                      disabled={processing}
                      className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white shadow-sm"
                    >
                      ✅ Aprobar Yape
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req)}
                      disabled={processing}
                      className="flex-1 rounded-xl bg-red-100 py-2 text-xs font-bold text-red-700"
                    >
                      ❌ Rechazar
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL CAMBIAR PLAN (BOTTOM-SHEET EN MÓVIL) */}
      {showPlanModal && selectedVendor && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setShowPlanModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-base text-gray-900">Asignar Plan de Membresía IA</h3>
                <p className="text-xs text-gray-500 truncate max-w-62.5">{selectedVendor.email}</p>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                className="text-xl font-bold text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              {(Object.keys(PLAN_CONFIG) as PlanType[]).map((planKey) => {
                const config = PLAN_CONFIG[planKey];
                const isSelected = newPlan === planKey;
                return (
                  <button
                    key={planKey}
                    type="button"
                    onClick={() => setNewPlan(planKey)}
                    className={`w-full rounded-2xl border-2 p-3 text-left transition flex items-center justify-between ${
                      isSelected
                        ? "border-purple-600 bg-purple-50/50"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-gray-900">
                        {config.emoji} {config.label}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {config.credits === -1
                          ? "Kits y Cargas Ilimitadas"
                          : `Cuota de ${Math.floor(config.credits / 15)} Kits / mes`}
                      </div>
                    </div>
                    <span className="font-black text-xs text-purple-700">
                      {config.price === 0 ? "Gratis" : `S/ ${config.price}/m`}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-xs font-bold text-gray-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleChangePlan}
                disabled={processing}
                className="flex-1 rounded-xl bg-purple-600 py-3 text-xs font-black text-white shadow-md active:scale-95 transition"
              >
                {processing ? "Guardando..." : "Guardar Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}