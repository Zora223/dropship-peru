import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMyStore } from "../../hooks/useMyStore";
import {
  updateStorePaymentMethods,
  uploadVendorQrImage,
  syncVendorPaymentQrs,
} from "../../lib/vendor-store";
import type {
  DbStorePaymentMethod,
  PaymentMethodType,
} from "../../types/database";

type PaymentConfigState = Record<PaymentMethodType, DbStorePaymentMethod>;

const PAYMENT_ORDER: PaymentMethodType[] = [
  "yape",
  "plin",
  "transfer",
  "card",
  "cash_on_delivery",
];

const PAYMENT_INFO: Record<
  PaymentMethodType,
  {
    title: string;
    description: string;
    icon: string;
    color: string;
  }
> = {
  yape: {
    title: "Yape",
    description: "Recibe pagos por Yape usando tu número o QR.",
    icon: "💜",
    color: "from-purple-500 to-fuchsia-500",
  },
  plin: {
    title: "Plin",
    description: "Permite pagos rápidos desde bancos compatibles con Plin.",
    icon: "💙",
    color: "from-blue-500 to-cyan-500",
  },
  transfer: {
    title: "Transferencia bancaria",
    description: "Configura banco, número de cuenta y CCI.",
    icon: "🏦",
    color: "from-emerald-500 to-teal-500",
  },
  card: {
    title: "Tarjeta",
    description: "Pago con tarjeta gestionado por la plataforma.",
    icon: "💳",
    color: "from-gray-800 to-gray-600",
  },
  cash_on_delivery: {
    title: "Pago contra entrega",
    description: "El cliente paga al recibir su pedido.",
    icon: "📦",
    color: "from-orange-500 to-amber-500",
  },
};

const DEFAULT_METHODS: PaymentConfigState = {
  yape: {
    id: "yape",
    enabled: false,
    config: {
      phone: "",
      holder_name: "",
      qr_url: "",
      instructions: "",
    },
  },
  plin: {
    id: "plin",
    enabled: false,
    config: {
      phone: "",
      holder_name: "",
      qr_url: "",
      instructions: "",
    },
  },
  transfer: {
    id: "transfer",
    enabled: false,
    config: {
      bank_name: "",
      account_holder: "",
      account_number: "",
      cci: "",
      document_number: "",
      qr_url: "",
      instructions: "",
    },
  },
  card: {
    id: "card",
    enabled: false,
    config: {
      instructions: "Pago con tarjeta gestionado por la plataforma.",
    },
  },
  cash_on_delivery: {
    id: "cash_on_delivery",
    enabled: false,
    config: {
      instructions: "",
    },
  },
};

function cloneDefaultMethods(): PaymentConfigState {
  return {
    yape: {
      ...DEFAULT_METHODS.yape,
      config: { ...DEFAULT_METHODS.yape.config },
    },
    plin: {
      ...DEFAULT_METHODS.plin,
      config: { ...DEFAULT_METHODS.plin.config },
    },
    transfer: {
      ...DEFAULT_METHODS.transfer,
      config: { ...DEFAULT_METHODS.transfer.config },
    },
    card: {
      ...DEFAULT_METHODS.card,
      config: { ...DEFAULT_METHODS.card.config },
    },
    cash_on_delivery: {
      ...DEFAULT_METHODS.cash_on_delivery,
      config: { ...DEFAULT_METHODS.cash_on_delivery.config },
    },
  };
}

function normalizePaymentMethods(existing: unknown): PaymentConfigState {
  const base = cloneDefaultMethods();

  if (!existing) return base;

  if (Array.isArray(existing)) {
    for (const method of existing) {
      if (!method || typeof method !== "object") continue;
      const m = method as DbStorePaymentMethod;
      if (!PAYMENT_ORDER.includes(m.id)) continue;

      base[m.id] = {
        id: m.id,
        enabled: Boolean(m.enabled),
        config: {
          ...base[m.id].config,
          ...(m.config ?? {}),
        },
      };
    }
    return base;
  }

  if (typeof existing === "object") {
    const obj = existing as Record<string, unknown>;

    for (const id of PAYMENT_ORDER) {
      const method = obj[id];
      if (!method || typeof method !== "object") continue;

      const m = method as {
        enabled?: boolean;
        config?: Record<string, unknown>;
        [k: string]: unknown;
      };

      base[id] = {
        id,
        enabled: Boolean(m.enabled),
        config: {
          ...base[id].config,
          phone: (m.number ?? m.phone ?? base[id].config.phone) as string,
          holder_name: (m.holder ??
            m.holder_name ??
            base[id].config.holder_name) as string,
          bank_name: (m.bank ??
            m.bank_name ??
            base[id].config.bank_name) as string,
          account_holder: (m.holder ??
            m.account_holder ??
            base[id].config.account_holder) as string,
          account_number: (m.account ??
            m.account_number ??
            base[id].config.account_number) as string,
          ...(m.config ?? {}),
        },
      };
    }
    return base;
  }

  return base;
}

export default function VendorPaymentsPage() {
  const { store, loading: storeLoading, error: storeError, setStore } =
    useMyStore();

  const [methods, setMethods] = useState<PaymentConfigState>(() =>
    cloneDefaultMethods()
  );
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🆕 v20 - Estados de subida de imagen QR
  const [uploadingQr, setUploadingQr] = useState<PaymentMethodType | null>(null);

  useEffect(() => {
    if (store) {
      setMethods(normalizePaymentMethods(store.payment_methods));
    }
  }, [store]);

  const enabledCount = useMemo(() => {
    return PAYMENT_ORDER.filter((id) => methods[id].enabled).length;
  }, [methods]);

  function toggleMethod(id: PaymentMethodType) {
    setMethods((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        enabled: !prev[id].enabled,
      },
    }));
  }

  function updateConfig(id: PaymentMethodType, key: string, value: string) {
    setMethods((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        config: {
          ...prev[id].config,
          [key]: value,
        },
      },
    }));
  }

  // 🆕 v20 - Subida de imagen QR
  async function handleQrImageUpload(
    id: PaymentMethodType,
    file: File
  ) {
    if (!store) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen debe ser menor a 2MB");
      return;
    }

    if (id !== "yape" && id !== "plin" && id !== "transfer") return;

    setUploadingQr(id);
    setError(null);

    try {
      const url = await uploadVendorQrImage(store.id, file, id);
      updateConfig(id, "qr_url", url);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Error al subir imagen del QR"
      );
    } finally {
      setUploadingQr(null);
    }
  }

  function validateMethods() {
    const enabled = PAYMENT_ORDER.filter((id) => methods[id].enabled);

    if (enabled.length === 0) {
      throw new Error("Activa al menos un método de cobro.");
    }

    if (methods.yape.enabled) {
      if (!methods.yape.config.phone?.trim()) {
        throw new Error("Ingresa el número de Yape.");
      }
    }

    if (methods.plin.enabled) {
      if (!methods.plin.config.phone?.trim()) {
        throw new Error("Ingresa el número de Plin.");
      }
    }

    if (methods.transfer.enabled) {
      if (!methods.transfer.config.bank_name?.trim()) {
        throw new Error("Ingresa el banco para transferencia.");
      }

      if (!methods.transfer.config.account_holder?.trim()) {
        throw new Error("Ingresa el titular de la cuenta bancaria.");
      }

      if (!methods.transfer.config.account_number?.trim()) {
        throw new Error("Ingresa el número de cuenta bancaria.");
      }
    }
  }

  async function handleSave() {
    if (!store) return;

    try {
      setSaving(true);
      setSuccess(false);
      setError(null);

      validateMethods();

      const payload: DbStorePaymentMethod[] = PAYMENT_ORDER.map((id) => ({
        id,
        enabled: methods[id].enabled,
        config: methods[id].config,
      }));

      // 1. Guardar en stores.payment_methods (sistema viejo)
      await updateStorePaymentMethods(store.id, payload);

      // 🆕 2. Sincronizar con payment_qrs (sistema nuevo v20)
      await syncVendorPaymentQrs(store.id, payload);

      setStore({
        ...store,
        payment_methods: payload,
      });

      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Error al guardar métodos de cobro"
      );
    } finally {
      setSaving(false);
    }
  }

  if (storeLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-100" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-2xl bg-gray-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (storeError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
        {storeError}
      </div>
    );
  }

  if (!store) {
    return (
      <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
        <div className="text-6xl">🏪</div>

        <h2 className="mt-4 text-xl font-bold text-gray-900">
          Aún no tienes tienda
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          Primero crea tu tienda para poder configurar tus métodos de cobro.
        </p>

        <Link
          to="/vendor/settings"
          className="mt-6 inline-block rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-gray-800"
        >
          Crear mi tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Métodos de cobro
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Configura cómo tus clientes podrán pagarte en{" "}
            <span className="font-semibold text-gray-700">{store.name}</span>.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {/* 🆕 v20 - Banner explicativo */}
      <div className="rounded-2xl bg-linear-to-br from-purple-50 to-fuchsia-50 border border-purple-200 p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div className="flex-1 text-sm text-purple-900">
            <div className="font-bold mb-1">¿Cuándo se usa tu QR?</div>
            <p className="text-purple-800">
              Los clientes verán <strong>tu QR</strong> cuando compren productos de <strong>tu inventario propio</strong>.
              Cuando compren del catálogo maestro, verán el QR de Dropship (el delivery se descuenta después de tus ganancias).
            </p>
          </div>
        </div>
      </div>

      {success && (
        <div className="rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-4">
          <div className="font-bold text-emerald-900">
            ✅ Métodos de cobro actualizados
          </div>
          <p className="mt-1 text-sm text-emerald-700">
            Los cambios ya están disponibles para tu tienda.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-4">
          <div className="font-bold text-red-900">Error</div>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Métodos activos
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-600">
            {enabledCount}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Tienda
          </div>
          <div className="mt-2 truncate text-lg font-bold text-gray-900">
            {store.name}
          </div>
          <div className="mt-1 text-xs text-gray-400">/{store.slug}</div>
        </div>

        <div className="rounded-2xl bg-linear-to-br from-rose-500 to-orange-500 p-5 text-white shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/80">
            Recomendado
          </div>
          <div className="mt-2 text-lg font-bold">Yape + Plin</div>
          <div className="mt-1 text-xs text-white/70">
            Ideales para ventas rápidas en Perú.
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {PAYMENT_ORDER.map((id) => {
          const method = methods[id];
          const info = PAYMENT_INFO[id];

          return (
            <div
              key={id}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                method.enabled
                  ? "border-gray-200"
                  : "border-gray-100 opacity-80"
              }`}
            >
              <div className={`bg-linear-to-br ${info.color} p-5 text-white`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl">
                      {info.icon}
                    </div>

                    <div>
                      <h2 className="text-lg font-bold">{info.title}</h2>
                      <p className="mt-1 text-xs text-white/80">
                        {info.description}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleMethod(id)}
                    className={`relative h-7 w-13 rounded-full transition ${
                      method.enabled ? "bg-white" : "bg-white/30"
                    }`}
                    aria-label={`Activar ${info.title}`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full transition ${
                        method.enabled
                          ? "left-7 bg-gray-900"
                          : "left-1 bg-white"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-5">
                {!method.enabled && (
                  <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                    Este método está desactivado. Actívalo para configurar sus
                    datos.
                  </div>
                )}

                {id === "yape" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700">
                        Número de Yape
                      </label>
                      <input
                        disabled={!method.enabled}
                        value={method.config.phone ?? ""}
                        onChange={(event) =>
                          updateConfig(id, "phone", event.target.value)
                        }
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="Ej: 987654321"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700">
                        Titular
                      </label>
                      <input
                        disabled={!method.enabled}
                        value={method.config.holder_name ?? ""}
                        onChange={(event) =>
                          updateConfig(id, "holder_name", event.target.value)
                        }
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="Nombre del titular"
                      />
                    </div>

                    {/* 🆕 v20 - Subidor de imagen QR */}
                    <QrImageUploader
                      id="yape"
                      enabled={method.enabled}
                      qrUrl={method.config.qr_url as string | undefined}
                      uploading={uploadingQr === "yape"}
                      onUpload={handleQrImageUpload}
                      onRemove={() => updateConfig(id, "qr_url", "")}
                    />
                  </div>
                )}

                {id === "plin" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700">
                        Número de Plin
                      </label>
                      <input
                        disabled={!method.enabled}
                        value={method.config.phone ?? ""}
                        onChange={(event) =>
                          updateConfig(id, "phone", event.target.value)
                        }
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="Ej: 987654321"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700">
                        Titular
                      </label>
                      <input
                        disabled={!method.enabled}
                        value={method.config.holder_name ?? ""}
                        onChange={(event) =>
                          updateConfig(id, "holder_name", event.target.value)
                        }
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="Nombre del titular"
                      />
                    </div>

                    {/* 🆕 v20 - Subidor de imagen QR */}
                    <QrImageUploader
                      id="plin"
                      enabled={method.enabled}
                      qrUrl={method.config.qr_url as string | undefined}
                      uploading={uploadingQr === "plin"}
                      onUpload={handleQrImageUpload}
                      onRemove={() => updateConfig(id, "qr_url", "")}
                    />
                  </div>
                )}

                {id === "transfer" && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700">
                          Banco
                        </label>
                        <input
                          disabled={!method.enabled}
                          value={method.config.bank_name ?? ""}
                          onChange={(event) =>
                            updateConfig(id, "bank_name", event.target.value)
                          }
                          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                          placeholder="BCP, Interbank, BBVA..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700">
                          Titular
                        </label>
                        <input
                          disabled={!method.enabled}
                          value={method.config.account_holder ?? ""}
                          onChange={(event) =>
                            updateConfig(
                              id,
                              "account_holder",
                              event.target.value
                            )
                          }
                          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                          placeholder="Nombre del titular"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700">
                          Número de cuenta
                        </label>
                        <input
                          disabled={!method.enabled}
                          value={method.config.account_number ?? ""}
                          onChange={(event) =>
                            updateConfig(
                              id,
                              "account_number",
                              event.target.value
                            )
                          }
                          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                          placeholder="000-0000000000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700">
                          CCI
                        </label>
                        <input
                          disabled={!method.enabled}
                          value={method.config.cci ?? ""}
                          onChange={(event) =>
                            updateConfig(id, "cci", event.target.value)
                          }
                          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                          placeholder="CCI de la cuenta"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700">
                        DNI/RUC opcional
                      </label>
                      <input
                        disabled={!method.enabled}
                        value={method.config.document_number ?? ""}
                        onChange={(event) =>
                          updateConfig(
                            id,
                            "document_number",
                            event.target.value
                          )
                        }
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="Documento del titular"
                      />
                    </div>

                    {/* 🆕 v20 - QR opcional para transfer */}
                    <QrImageUploader
                      id="transfer"
                      enabled={method.enabled}
                      qrUrl={method.config.qr_url as string | undefined}
                      uploading={uploadingQr === "transfer"}
                      onUpload={handleQrImageUpload}
                      onRemove={() => updateConfig(id, "qr_url", "")}
                    />
                  </div>
                )}

                {id === "card" && (
                  <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                    El pago con tarjeta puede ser gestionado por la plataforma.
                    Activa este método si quieres mostrarlo como opción
                    disponible en tu tienda.
                  </div>
                )}

                {id === "cash_on_delivery" && (
                  <div className="rounded-xl bg-orange-50 p-4 text-sm text-orange-800">
                    Usa este método solo si puedes coordinar entrega directa o
                    courier con cobro al recibir.
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Instrucciones para el cliente
                  </label>

                  <textarea
                    disabled={!method.enabled}
                    value={method.config.instructions ?? ""}
                    onChange={(event) =>
                      updateConfig(id, "instructions", event.target.value)
                    }
                    rows={3}
                    className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="Ej: Envía la captura del pago por WhatsApp después de completar tu pedido."
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar métodos de cobro"}
        </button>
      </div>
    </div>
  );
}

// 🆕 v20 - Componente reutilizable para subir QR
function QrImageUploader({
  id,
  enabled,
  qrUrl,
  uploading,
  onUpload,
  onRemove,
}: {
  id: PaymentMethodType;
  enabled: boolean;
  qrUrl: string | undefined;
  uploading: boolean;
  onUpload: (id: PaymentMethodType, file: File) => void;
  onRemove: () => void;
}) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(id, file);
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Imagen del QR {id === "transfer" && "(opcional)"}
      </label>

      {qrUrl ? (
        <div className="flex items-start gap-4">
          <img
            src={qrUrl}
            alt="QR"
            className="h-32 w-32 rounded-2xl border-2 border-gray-100 object-contain bg-white p-2"
          />
          <div className="flex-1 space-y-2">
            <label
              className={`block cursor-pointer rounded-full bg-purple-100 px-4 py-2 text-center text-xs font-semibold text-purple-700 hover:bg-purple-200 ${
                !enabled ? "cursor-not-allowed opacity-60" : ""
              }`}
            >
              📸 Cambiar imagen
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                disabled={!enabled || uploading}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={onRemove}
              disabled={!enabled}
              className="w-full rounded-full bg-red-100 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
            >
              🗑️ Quitar imagen
            </button>
          </div>
        </div>
      ) : (
        <label
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 hover:border-purple-400 hover:bg-purple-50 ${
            !enabled ? "cursor-not-allowed opacity-60" : ""
          }`}
        >
          <div className="text-4xl">📸</div>
          <div className="mt-2 text-sm font-semibold text-gray-700">
            {uploading ? "Subiendo..." : "Sube tu QR aquí"}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            PNG, JPG (máx 2MB)
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={!enabled || uploading}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}