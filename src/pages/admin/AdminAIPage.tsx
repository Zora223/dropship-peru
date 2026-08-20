// src/pages/admin/AdminAIPage.tsx
// 🍌 v22.7 - Panel Admin de Gestión de Membresías e IA (Sin variables en desuso)

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

const PLAN_CONFIG: Record<PlanType, { label: string; price: number; credits: number; color: string; emoji: string }> = {
  starter: { label: "Starter", price: 0, credits: 99999, color: "gray", emoji: "🆓" },
  creator: { label: "Creator", price: 19, credits: 99999, color: "purple", emoji: "🎨" },
  pro: { label: "Pro", price: 49, credits: 99999, color: "blue", emoji: "🚀" },
  business: { label: "Business", price: 149, credits: -1, color: "amber", emoji: "💎" },
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
          email: profile?.email || "sin email",
          full_name: profile?.full_name || null,
          store_name: store?.name || null,
          store_slug: store?.slug || null,
          plan: sub.plan as PlanType,
          status: sub.status,
          credits_remaining: sub.credits_remaining ?? 99999,
          credits_total: sub.credits_total ?? 99999,
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
          vendor_email: reqProfilesMap.get(r.vendor_id)?.email || "sin email",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResetCredits = async (vendor: VendorAI) => {
    if (!confirm(`¿Restablecer plan de herramientas IA para ${vendor.email}?`)) return;

    try {
      const { error } = await supabase
        .from("ai_subscriptions")
        .update({
          credits_remaining: 99999,
          credits_total: 99999,
          total_used: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("vendor_id", vendor.vendor_id);

      if (error) throw error;

      toast.success("✅ Acceso IA Restablecido", `${vendor.email} → Herramientas Ilimitadas`);
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

      const { error } = await supabase
        .from("ai_subscriptions")
        .update({
          plan: newPlan,
          credits_remaining: 99999,
          credits_total: 99999,
          total_used: 0,
          is_trial: false,
          status: "active",
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("vendor_id", selectedVendor.vendor_id);

      if (error) throw error;

      toast.success(
        "✅ Plan de Membresía Actualizado",
        `${selectedVendor.email} → Plan ${config.label} (Herramientas Ilimitadas)`
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
    if (!confirm(`¿Aprobar upgrade de ${request.vendor_email} a plan ${request.plan_requested}?`)) return;

    setProcessing(true);
    try {
      const plan = request.plan_requested as PlanType;
      const config = PLAN_CONFIG[plan];

      const { error: subError } = await supabase
        .from("ai_subscriptions")
        .update({
          plan: plan,
          credits_remaining: 99999,
          credits_total: 99999,
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

      toast.success(
        "✅ Upgrade aprobado",
        `${request.vendor_email} ahora cuenta con ${config.label}`
      );
      await loadData();
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Intenta de nuevo");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectRequest = async (request: UpgradeRequest) => {
    const reason = prompt("Motivo del rechazo (opcional):");
    if (reason === null) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("ai_upgrade_requests")
        .update({
          status: "rejected",
          admin_notes: reason || "Rechazado sin motivo",
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
    byPlan: {
      starter: vendors.filter((v) => v.plan === "starter").length,
      creator: vendors.filter((v) => v.plan === "creator").length,
      pro: vendors.filter((v) => v.plan === "pro").length,
      business: vendors.filter((v) => v.plan === "business").length,
    },
  };

  if (loading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            🎨 Gestión de Membresías e IA
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Administra los planes de Inteligencia Artificial y solicitudes de los vendedores
          </p>
        </div>

        <button
          onClick={loadData}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase text-gray-500">Vendors Activos</div>
          <div className="mt-1 text-2xl font-black text-gray-900">{stats.totalVendors}</div>
          <div className="text-[10px] text-gray-500 mt-1">
            {stats.byPlan.creator} creator · {stats.byPlan.pro} pro · {stats.byPlan.business} biz
          </div>
        </div>

        <div className="rounded-2xl bg-linear-to-br from-emerald-500 to-teal-500 p-4 text-white shadow-lg">
          <div className="text-xs font-bold uppercase opacity-90">MRR Estimado IA</div>
          <div className="mt-1 text-2xl font-black">S/ {stats.mrr}</div>
          <div className="text-[10px] opacity-75 mt-1">Ingreso mensual estimado</div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase text-gray-500">Membresías Activas</div>
          <div className="mt-1 text-2xl font-black text-purple-600">
            {stats.activeSubscriptions}
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">Acceso Ilimitado ✅</div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase text-gray-500">Kits generados</div>
          <div className="mt-1 text-2xl font-black text-pink-600">{stats.totalKits}</div>
          <div className="text-[10px] text-gray-500 mt-1">Generaciones totales de vendedores</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("vendors")}
          className={`relative px-4 py-3 text-sm font-semibold transition ${
            activeTab === "vendors" ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Vendors con IA
          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
            activeTab === "vendors" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
          }`}>
            {vendors.length}
          </span>
          {activeTab === "vendors" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />}
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          className={`relative px-4 py-3 text-sm font-semibold transition ${
            activeTab === "requests" ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Solicitudes de Upgrade
          {pendingRequests.length > 0 && (
            <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
              {pendingRequests.length}
            </span>
          )}
          {activeTab === "requests" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />}
        </button>
      </div>

      {/* Contenido */}
      {activeTab === "vendors" && (
        <>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Buscar por email, nombre o tienda..."
              className="w-full rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Vendor</th>
                    <th className="px-4 py-3 font-medium">Plan IA</th>
                    <th className="px-4 py-3 font-medium">Herramientas</th>
                    <th className="px-4 py-3 font-medium">Kits Creados</th>
                    <th className="px-4 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredVendors.map((vendor) => {
                    const config = PLAN_CONFIG[vendor.plan];

                    return (
                      <tr key={vendor.vendor_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">
                            {vendor.full_name || "Sin nombre"}
                          </div>
                          <div className="text-xs text-gray-500">{vendor.email}</div>
                          {vendor.store_name && (
                            <div className="text-[10px] text-purple-600 font-medium mt-0.5">
                              🏪 {vendor.store_name}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                              config.color === "gray" ? "bg-gray-100 text-gray-700" :
                              config.color === "purple" ? "bg-purple-100 text-purple-700" :
                              config.color === "blue" ? "bg-blue-100 text-blue-700" :
                              "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {config.emoji} {config.label}
                          </span>
                          {vendor.is_trial && (
                            <div className="text-[10px] text-amber-600 font-bold mt-0.5">
                              🎁 PRUEBA
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                            ⚡ Ilimitado
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-sm font-bold text-pink-600">
                            {vendor.kits_generated}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            <button
                              onClick={() => {
                                setSelectedVendor(vendor);
                                setNewPlan(vendor.plan);
                                setShowPlanModal(true);
                              }}
                              className="rounded-lg bg-purple-100 px-2.5 py-1 text-[11px] font-bold text-purple-800 hover:bg-purple-200"
                              title="Cambiar plan"
                            >
                              📊 Editar Plan
                            </button>

                            <button
                              onClick={() => handleResetCredits(vendor)}
                              className="rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-200"
                              title="Restablecer plan"
                            >
                              🔄 Restablecer
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredVendors.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                {searchQuery ? "Sin resultados" : "Sin vendors registrados"}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "requests" && (
        <div className="space-y-4">
          {upgradeRequests.length === 0 ? (
            <div className="rounded-2xl bg-white p-16 text-center shadow-sm">
              <div className="text-6xl">📭</div>
              <h3 className="mt-4 text-lg font-bold text-gray-900">Sin solicitudes pendientes</h3>
              <p className="mt-1 text-sm text-gray-500">
                Las solicitudes de pago de Membresías IA aparecerán aquí
              </p>
            </div>
          ) : (
            upgradeRequests.map((req) => {
              const config = PLAN_CONFIG[req.plan_requested as PlanType];
              const isPending = req.status === "pending";
              const isApproved = req.status === "approved";
              const isRejected = req.status === "rejected";

              return (
                <div
                  key={req.id}
                  className={`rounded-2xl border-2 p-5 shadow-sm ${
                    isPending ? "bg-amber-50 border-amber-200" :
                    isApproved ? "bg-emerald-50 border-emerald-200" :
                    "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {isPending && (
                          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                            ⏳ PENDIENTE
                          </span>
                        )}
                        {isApproved && (
                          <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">
                            ✅ APROBADO
                          </span>
                        )}
                        {isRejected && (
                          <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                            ❌ RECHAZADO
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(req.created_at).toLocaleString("es-PE")}
                        </span>
                      </div>

                      <div className="font-bold text-gray-900">
                        {req.vendor_name || "Sin nombre"}
                      </div>
                      <div className="text-sm text-gray-600">{req.vendor_email}</div>

                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-gray-500">Plan solicitado</div>
                          <div className="font-bold text-gray-900">
                            {config?.emoji} {config?.label}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Monto</div>
                          <div className="font-bold text-emerald-600">
                            S/ {req.amount.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Método</div>
                          <div className="font-semibold text-gray-900">
                            {req.payment_method}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Referencia</div>
                          <div className="font-mono text-xs text-gray-900">
                            {req.reference_code}
                          </div>
                        </div>
                      </div>

                      {req.admin_notes && (
                        <div className="mt-3 rounded-lg bg-white/60 p-2 text-xs">
                          <strong>Nota:</strong> {req.admin_notes}
                        </div>
                      )}
                    </div>

                    {isPending && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleApproveRequest(req)}
                          disabled={processing}
                          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-600 disabled:opacity-50"
                        >
                          ✅ Aprobar
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req)}
                          disabled={processing}
                          className="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-red-600 disabled:opacity-50"
                        >
                          ❌ Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal: Cambiar plan */}
      {showPlanModal && selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
            <div className="bg-linear-to-br from-purple-500 to-pink-500 rounded-t-3xl p-5 text-white">
              <h3 className="text-lg font-black">📊 Cambiar Membresía IA</h3>
              <p className="text-xs opacity-90 mt-1">{selectedVendor.email}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-gray-50 p-3 text-center">
                <div className="text-xs text-gray-500">Plan actual</div>
                <div className="text-lg font-black text-gray-900">
                  {PLAN_CONFIG[selectedVendor.plan].emoji} {PLAN_CONFIG[selectedVendor.plan].label}
                </div>
              </div>

              <div className="space-y-2">
                {(Object.keys(PLAN_CONFIG) as PlanType[]).map((planKey) => {
                  const config = PLAN_CONFIG[planKey];
                  const isSelected = newPlan === planKey;
                  return (
                    <button
                      key={planKey}
                      onClick={() => setNewPlan(planKey)}
                      className={`w-full rounded-xl border-2 p-3 text-left transition ${
                        isSelected
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-gray-900">
                            {config.emoji} {config.label}
                          </div>
                          <div className="text-xs text-emerald-600 font-bold mt-0.5">
                            ⚡ Herramientas Ilimitadas
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-black text-purple-600">
                            {config.price === 0 ? "Gratis" : `S/${config.price}`}
                          </div>
                          <div className="text-[10px] text-gray-400">/mes</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowPlanModal(false);
                    setSelectedVendor(null);
                  }}
                  className="flex-1 rounded-xl border-2 border-gray-200 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleChangePlan}
                  disabled={processing || newPlan === selectedVendor.plan}
                  className="flex-1 rounded-xl bg-purple-500 py-3 text-sm font-bold text-white shadow hover:bg-purple-600 disabled:opacity-50"
                >
                  {processing ? "⏳..." : "✅ Cambiar plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}