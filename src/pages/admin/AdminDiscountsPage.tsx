// src/pages/admin/AdminDiscountsPage.tsx
// 🆕 v19 - CRUD reglas de descuento gamificadas
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { clearDiscountCache, type DiscountRule } from "../../lib/discounts";
import { useToast } from "../../contexts/ToastContext";

export default function AdminDiscountsPage() {
  const toast = useToast();
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("discount_rules")
      .select("*")
      .order("sort_order");
    if (!error) setRules((data ?? []) as DiscountRule[]);
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

  function updateRule(id: string, patch: Partial<DiscountRule>) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🎁 Reglas de descuento</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configura los niveles gamificados que ven los clientes al comprar
        </p>
      </div>

      <div className="rounded-2xl border-2 border-purple-200 bg-linear-to-br from-purple-50 to-fuchsia-50 p-4 mb-6">
        <p className="text-sm text-purple-900">
          💡 <b>Estrategia CEO:</b> Los descuentos gamificados aumentan el ticket promedio 60-80%. 
          El cliente compra más para "subir de nivel".
        </p>
      </div>

      {loading ? (
        <div className="p-10 text-center text-gray-500">Cargando...</div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="text-5xl">{rule.tier_emoji}</div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-black text-gray-900">
                      NIVEL {rule.tier_label}
                    </h3>
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
                        onChange={(e) => updateRule(rule.id, { tier_tagline: e.target.value })}
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
                          updateRule(rule.id, { min_items: Number(e.target.value) || 0 })
                        }
                        className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-center text-sm font-bold focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                        Descuento S/
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={rule.discount_amount}
                        onChange={(e) =>
                          updateRule(rule.id, { discount_amount: Number(e.target.value) || 0 })
                        }
                        className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-center text-sm font-bold focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>
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
          ))}
        </div>
      )}
    </div>
  );
}