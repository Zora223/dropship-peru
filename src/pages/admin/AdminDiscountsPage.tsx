// src/pages/admin/AdminDiscountsPage.tsx
// 🆕 v19.3 - CRUD reglas descuento porcentual + simulador
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { clearDiscountCache, type DiscountRule } from "../../lib/discounts";
import { getPlatformConfig, updatePlatformConfig } from "../../lib/platform-config";
import { useToast } from "../../contexts/ToastContext";

export default function AdminDiscountsPage() {
  const toast = useToast();
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [maxDiscount, setMaxDiscount] = useState(70);
  const [savingMax, setSavingMax] = useState(false);
  const [simulateTicket, setSimulateTicket] = useState(500);

  async function load() {
    setLoading(true);
    const [rulesRes, config] = await Promise.all([
      supabase.from("discount_rules").select("*").order("sort_order"),
      getPlatformConfig(true),
    ]);
    if (!rulesRes.error) setRules((rulesRes.data ?? []) as DiscountRule[]);
    setMaxDiscount(config.discount_max_per_order ?? 70);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveRule(rule: DiscountRule) {
    try {
      setSaving(rule.id);
      const { error } = await supabase
        .from("discount_rules")
        .update({
          min_items: rule.min_items,
          discount_amount: rule.discount_amount,
          discount_pct: rule.discount_pct,
          tier_tagline: rule.tier_tagline,
          active: rule.active,
        })
        .eq("id", rule.id);
      if (error) throw error;
      clearDiscountCache();
      toast.success("✅ Guardado", `${rule.tier_label} actualizado`);
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setSaving(null);
    }
  }

  async function saveMaxDiscount() {
    try {
      setSavingMax(true);
      await updatePlatformConfig("discount_max_per_order", maxDiscount);
      toast.success("✅ Guardado", `Tope máximo actualizado a S/ ${maxDiscount}`);
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setSavingMax(false);
    }
  }

  function updateRule(id: string, patch: Partial<DiscountRule>) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  // Calcular ejemplo con ticket simulado
  function simulate(rule: DiscountRule): { pct: number; amount: number; capped: boolean } {
    const raw = (simulateTicket * rule.discount_pct) / 100;
    const capped = raw > maxDiscount;
    const final = Math.min(raw, maxDiscount);
    return {
      pct: rule.discount_pct,
      amount: Number(final.toFixed(2)),
      capped,
    };
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🎁 Reglas de descuento</h1>
        <p className="mt-1 text-sm text-gray-500">
          Sistema porcentual con tope máximo - costeado con ahorro de delivery consolidado
        </p>
      </div>

      {/* Info estrategia CEO */}
      <div className="rounded-2xl border-2 border-purple-200 bg-linear-to-br from-purple-50 to-fuchsia-50 p-4 mb-6">
        <p className="text-sm text-purple-900">
          💡 <b>Estrategia CEO:</b> Los descuentos por % son más atractivos psicológicamente. 
          El tope máximo protege tus márgenes en tickets grandes. Todo se costea con el ahorro 
          real de delivery consolidado.
        </p>
      </div>

      {loading ? (
        <div className="p-10 text-center text-gray-500">Cargando...</div>
      ) : (
        <>
          {/* TOPE MÁXIMO GLOBAL */}
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 mb-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🛡️</div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-amber-900">
                  Tope máximo de descuento por pedido
                </h3>
                <p className="text-xs text-amber-700 mt-1">
                  Protección contra descuentos abusivos en tickets grandes
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-white px-4 py-2">
                    <span className="text-sm text-gray-500">S/</span>
                    <input
                      type="number"
                      step="5"
                      value={maxDiscount}
                      onChange={(e) => setMaxDiscount(Number(e.target.value) || 0)}
                      className="w-24 border-none bg-transparent text-lg font-black text-amber-900 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={saveMaxDiscount}
                    disabled={savingMax}
                    className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {savingMax ? "..." : "💾 Guardar tope"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SIMULADOR */}
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🔬</span>
              <div>
                <h3 className="text-lg font-black text-blue-900">
                  Simulador en tiempo real
                </h3>
                <p className="text-xs text-blue-700">
                  Prueba cómo se ven los descuentos según el monto del pedido
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm font-bold text-blue-900">
                Ticket cliente:
              </label>
              <div className="flex items-center gap-2 rounded-xl border-2 border-blue-300 bg-white px-3 py-1.5">
                <span className="text-sm text-gray-500">S/</span>
                <input
                  type="number"
                  step="50"
                  value={simulateTicket}
                  onChange={(e) => setSimulateTicket(Number(e.target.value) || 0)}
                  className="w-28 border-none bg-transparent text-base font-black text-blue-900 focus:outline-none"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {[100, 300, 500, 1000, 2000, 5000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setSimulateTicket(v)}
                    className="rounded-lg bg-white border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    S/{v}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {rules.map((rule) => {
                const sim = simulate(rule);
                return (
                  <div
                    key={rule.id}
                    className={`rounded-xl border-2 p-3 ${
                      sim.capped
                        ? "border-amber-300 bg-amber-100"
                        : "border-blue-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-lg">{rule.tier_emoji}</span>
                      <span className="text-[10px] font-bold text-gray-700">
                        {rule.tier_label}
                      </span>
                    </div>
                    <div className="text-2xl font-black text-emerald-700">
                      -S/ {sim.amount}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      -{sim.pct}% del ticket
                    </div>
                    {sim.capped && (
                      <div className="mt-1 text-[10px] font-bold text-amber-700">
                        🛡️ Tope aplicado
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* REGLAS EDITABLES */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-2">
              Configura los niveles gamificados
            </h3>

            {rules.map((rule) => {
              const sim = simulate(rule);
              return (
                <div
                  key={rule.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-5xl">{rule.tier_emoji}</div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-xl font-black text-gray-900">
                          NIVEL {rule.tier_label}
                        </h3>
                        <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-bold">
                          -{rule.discount_pct}%
                        </span>
                        <button
                          onClick={() => {
                            updateRule(rule.id, { active: !rule.active });
                            saveRule({ ...rule, active: !rule.active });
                          }}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            rule.active
                              ? "bg-emerald-500 text-white"
                              : "bg-gray-300 text-gray-700"
                          }`}
                        >
                          {rule.active ? "ACTIVO" : "INACTIVO"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                            Tagline
                          </label>
                          <input
                            type="text"
                            value={rule.tier_tagline ?? ""}
                            onChange={(e) =>
                              updateRule(rule.id, { tier_tagline: e.target.value })
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-xs focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                            Mínimo items
                          </label>
                          <input
                            type="number"
                            value={rule.min_items}
                            onChange={(e) =>
                              updateRule(rule.id, {
                                min_items: Number(e.target.value) || 0,
                              })
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-center text-sm font-bold focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                            Descuento %
                          </label>
                          <div className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 focus-within:border-purple-500">
                            <input
                              type="number"
                              step="0.5"
                              value={rule.discount_pct}
                              onChange={(e) =>
                                updateRule(rule.id, {
                                  discount_pct: Number(e.target.value) || 0,
                                })
                              }
                              className="flex-1 border-none bg-transparent text-center text-sm font-bold focus:outline-none"
                            />
                            <span className="text-sm font-bold text-gray-500">%</span>
                          </div>
                        </div>
                      </div>

                      {/* Simulación en vivo por tier */}
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                        <span>💡</span>
                        <span>
                          En ticket de <b>S/{simulateTicket}</b> = descuento de{" "}
                          <b className="text-emerald-700">S/ {sim.amount}</b>
                        </span>
                        {sim.capped && (
                          <span className="ml-auto text-amber-700 font-bold">
                            🛡️ Tope activo
                          </span>
                        )}
                      </div>

                      {/* Alerta si el % es muy alto */}
                      {rule.discount_pct > 8 && (
                        <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                          ⚠️ <b>Advertencia:</b> {rule.discount_pct}% es un descuento alto.
                          Podría afectar tu margen si el ahorro de delivery no lo cubre.
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => saveRule(rule)}
                      disabled={saving === rule.id}
                      className="shrink-0 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      {saving === rule.id ? "..." : "💾 Guardar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info del modelo actual */}
          <div className="mt-6 rounded-2xl bg-gray-50 border border-gray-200 p-4">
            <h4 className="text-sm font-bold text-gray-700 mb-2">
              📊 Modelo actual (Balanceado CEO):
            </h4>
            <ul className="space-y-1 text-xs text-gray-600">
              <li>✅ Descuentos porcentuales (más atractivos que valores fijos)</li>
              <li>✅ Tope máximo S/ {maxDiscount} por pedido (protege márgenes)</li>
              <li>✅ Costeado con ahorro de delivery consolidado</li>
              <li>✅ Gamificación con tiers (SMART/PRO/EXPERT/LEGEND)</li>
              <li>✅ Visible en carrito con celebración al desbloquear nivel</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}