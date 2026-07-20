import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { DbPlatformSettings, DbStorePaymentMethod, PaymentMethodType } from "../../types/database";

interface GlobalPaymentMethod {
  id: PaymentMethodType;
  name: string;
  icon: string;
  description: string;
  notes: string;
}

const PAYMENT_METHODS: GlobalPaymentMethod[] = [
  {
    id: "yape",
    name: "Yape",
    icon: "📱",
    description: "Wallet del BCP. Muy usado en Perú.",
    notes: "Ideal para pagos rápidos.",
  },
  {
    id: "plin",
    name: "Plin",
    icon: "💸",
    description: "Wallet de bancos compatibles.",
    notes: "Ideal para clientes móviles.",
  },
  {
    id: "transfer",
    name: "Transferencia bancaria",
    icon: "🏦",
    description: "Depósito o transferencia a cuenta bancaria.",
    notes: "Requiere validación manual del vendedor.",
  },
  {
    id: "card",
    name: "Tarjeta",
    icon: "💳",
    description: "Pago con tarjeta gestionado por la plataforma.",
    notes: "Puede requerir integración con pasarela.",
  },
  {
    id: "cash_on_delivery",
    name: "Pago contra entrega",
    icon: "💵",
    description: "Pago al recibir el producto.",
    notes: "Úsalo con cuidado por riesgo de cancelaciones.",
  },
];

const DEFAULT_ENABLED: PaymentMethodType[] = [
  "yape",
  "plin",
  "transfer",
  "card",
];

// 🛡️ Helper defensivo: siempre devuelve un array válido de métodos
function normalizePaymentMethods(raw: unknown): DbStorePaymentMethod[] {
  // Caso 1: ya es un array (formato correcto)
  if (Array.isArray(raw)) {
    return raw as DbStorePaymentMethod[];
  }

  // Caso 2: es un string JSON (parsearlo)
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as DbStorePaymentMethod[];
    } catch {
      return [];
    }
  }

  // Caso 3: es un object formato viejo (convertirlo)
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, { enabled?: boolean; [key: string]: unknown }>;
    const methods: DbStorePaymentMethod[] = [];

    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (value && typeof value === "object") {
        methods.push({
          id: key as PaymentMethodType,
          enabled: Boolean(value.enabled),
          config: {},
        } as DbStorePaymentMethod);
      }
    }

    return methods;
  }

  // Caso 4: null, undefined o cualquier otro tipo
  return [];
}

export default function AdminPaymentMethodsPage() {
  const [settings, setSettings] = useState<DbPlatformSettings | null>(null);
  const [enabledMethods, setEnabledMethods] =
    useState<PaymentMethodType[]>(DEFAULT_ENABLED);
  const [vendorUsage, setVendorUsage] = useState<Record<PaymentMethodType, number>>({
    yape: 0,
    plin: 0,
    transfer: 0,
    card: 0,
    cash_on_delivery: 0,
  });

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<PaymentMethodType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function ensureSettings(): Promise<DbPlatformSettings> {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;

    if (data) return data as DbPlatformSettings;

    const { data: inserted, error: insertError } = await supabase
      .from("platform_settings")
      .insert({
        id: 1,
        platform_name: "Dropship Perú",
        primary_color: "#e11d48",
        secondary_color: "#fb923c",
        font_family: "Inter",
        enabled_payment_methods: DEFAULT_ENABLED,
      })
      .select("*")
      .single();

    if (insertError) throw insertError;

    return inserted as DbPlatformSettings;
  }

  async function loadPage() {
    try {
      setLoading(true);
      setError(null);

      const settingsData = await ensureSettings();

      setSettings(settingsData);
      setEnabledMethods(
        (settingsData.enabled_payment_methods?.length
          ? settingsData.enabled_payment_methods
          : DEFAULT_ENABLED) as PaymentMethodType[]
      );

      const { data: stores, error: storesError } = await supabase
        .from("stores")
        .select("payment_methods");

      if (storesError) throw storesError;

      const usage: Record<PaymentMethodType, number> = {
        yape: 0,
        plin: 0,
        transfer: 0,
        card: 0,
        cash_on_delivery: 0,
      };

      // 🛡️ Uso defensivo: normalizamos siempre antes de iterar
      (stores ?? []).forEach((store) => {
        const methods = normalizePaymentMethods(store.payment_methods);

        methods.forEach((method) => {
          if (method?.enabled && method?.id && method.id in usage) {
            usage[method.id] += 1;
          }
        });
      });

      setVendorUsage(usage);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al cargar métodos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  const enabledCount = useMemo(() => enabledMethods.length, [enabledMethods]);

  async function toggle(id: PaymentMethodType) {
    if (!settings) return;

    try {
      setSavingId(id);
      setError(null);
      setSuccess(null);

      const nextEnabled = enabledMethods.includes(id)
        ? enabledMethods.filter((method) => method !== id)
        : [...enabledMethods, id];

      const { data, error } = await supabase
        .from("platform_settings")
        .update({
          enabled_payment_methods: nextEnabled,
        })
        .eq("id", settings.id)
        .select("*")
        .single();

      if (error) throw error;

      setSettings(data as DbPlatformSettings);
      setEnabledMethods(nextEnabled);
      setSuccess("Métodos globales actualizados.");

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al guardar método");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-72 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-100" />
        </div>

        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-36 animate-pulse rounded-3xl bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Métodos de pago globales
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Controla qué métodos pueden usar los vendors en sus tiendas.
        </p>
      </div>

      {success && (
        <div className="rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-4 text-sm text-emerald-800">
          ✅ {success}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border-l-4 border-purple-500 bg-purple-50 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔒</span>

          <div className="text-sm text-purple-900">
            <strong>Política de plataforma:</strong> si desactivas un método
            aquí, ningún vendor debería poder usarlo aunque lo tenga configurado
            en su tienda. Métodos activos: <strong>{enabledCount}</strong>.
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {PAYMENT_METHODS.map((method) => {
          const enabled = enabledMethods.includes(method.id);

          return (
            <div
              key={method.id}
              className={`overflow-hidden rounded-3xl bg-white p-6 shadow-sm transition ${
                enabled ? "" : "opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ${
                      enabled ? "bg-purple-50" : "bg-gray-100"
                    }`}
                  >
                    {method.icon}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {method.name}
                      </h3>

                      {enabled ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          Habilitado
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700">
                          Deshabilitado
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      {method.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                        👥 {vendorUsage[method.id]} vendors activos
                      </span>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
                        💭 {method.notes}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toggle(method.id)}
                  disabled={savingId === method.id}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${
                    enabled ? "bg-purple-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                      enabled ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}