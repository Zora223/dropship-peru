import { useEffect, useState } from "react";
import { getPaymentQrForOrder, type PaymentQr } from "../lib/payment-qrs";

interface Props {
  paymentReceiver: "platform" | "vendor";
  vendorId: string | null;
  paymentMethod: "yape" | "plin" | "transfer";
  total: number;
  storeName?: string;
}

const METHOD_INFO = {
  yape: {
    name: "Yape",
    icon: "💜",
    color: "from-purple-600 to-fuchsia-600",
    lightBg: "from-purple-50 to-fuchsia-50",
    border: "border-purple-200",
    text: "text-purple-900",
    accent: "bg-purple-600",
  },
  plin: {
    name: "Plin",
    icon: "💙",
    color: "from-blue-600 to-cyan-600",
    lightBg: "from-blue-50 to-cyan-50",
    border: "border-blue-200",
    text: "text-blue-900",
    accent: "bg-blue-600",
  },
  transfer: {
    name: "Transferencia bancaria",
    icon: "🏦",
    color: "from-emerald-600 to-teal-600",
    lightBg: "from-emerald-50 to-teal-50",
    border: "border-emerald-200",
    text: "text-emerald-900",
    accent: "bg-emerald-600",
  },
};

export default function PaymentQrDisplay({
  paymentReceiver,
  vendorId,
  paymentMethod,
  total,
  storeName,
}: Props) {
  const [qr, setQr] = useState<PaymentQr | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const info = METHOD_INFO[paymentMethod];

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getPaymentQrForOrder(
          paymentReceiver,
          vendorId,
          paymentMethod
        );

        if (!data) {
          setError(
            paymentReceiver === "platform"
              ? "Dropship aún no ha configurado su QR de pago"
              : `${storeName ?? "El vendedor"} aún no ha configurado su QR de pago`
          );
          return;
        }

        setQr(data);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Error al cargar QR de pago"
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [paymentReceiver, vendorId, paymentMethod, storeName]);

  const handleCopyPhone = () => {
    if (!qr?.phone) return;
    navigator.clipboard.writeText(qr.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-gray-100 p-8 text-center animate-pulse">
        <div className="mx-auto h-32 w-32 rounded-2xl bg-gray-200" />
        <div className="mt-4 h-4 w-40 mx-auto rounded bg-gray-200" />
      </div>
    );
  }

  if (error || !qr) {
    return (
      <div className="rounded-2xl bg-red-50 border-2 border-red-200 p-6 text-center">
        <div className="text-4xl">⚠️</div>
        <div className="mt-2 font-bold text-red-900">
          QR no disponible
        </div>
        <p className="mt-1 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-3xl border-2 ${info.border} bg-white shadow-xl`}>
      {/* Header colorido */}
      <div className={`bg-linear-to-br ${info.color} px-6 py-5 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{info.icon}</div>
            <div>
              <div className="text-lg font-black">{info.name}</div>
              <div className="text-xs opacity-90">
                {paymentReceiver === "platform"
                  ? "Pago seguro a Dropship Perú"
                  : `Pago directo a ${storeName ?? "vendedor"}`}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold opacity-90">TOTAL</div>
            <div className="text-2xl font-black tabular-nums">
              S/ {total.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* QR Image */}
        {qr.qr_image_url ? (
          <div className={`rounded-2xl bg-linear-to-br ${info.lightBg} p-6`}>
            <div className="text-center">
              <img
                src={qr.qr_image_url}
                alt={`QR ${info.name}`}
                className="mx-auto max-h-64 rounded-2xl bg-white p-3 shadow-lg"
              />
              <div className="mt-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Escanea con tu app {info.name}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 p-8 text-center">
            <div className="text-4xl opacity-50">📱</div>
            <div className="mt-2 text-sm font-semibold text-gray-500">
              QR no disponible
            </div>
            <div className="mt-1 text-xs text-gray-400">
              Usa los datos de abajo para pagar
            </div>
          </div>
        )}

        {/* Datos del receptor */}
        <div className="mt-4 space-y-2">
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-xs font-bold text-gray-500 uppercase mb-1">
              Titular
            </div>
            <div className="text-base font-bold text-gray-900">
              {qr.holder_name}
            </div>
          </div>

          {qr.phone && (
            <button
              onClick={handleCopyPhone}
              className={`w-full rounded-xl border-2 ${info.border} bg-white p-4 text-left transition hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">
                    Número {info.name}
                  </div>
                  <div className="text-lg font-black tracking-wider text-gray-900">
                    {qr.phone}
                  </div>
                </div>
                <div className={`rounded-full ${info.accent} px-4 py-2 text-xs font-bold text-white`}>
                  {copied ? "✅ Copiado" : "📋 Copiar"}
                </div>
              </div>
            </button>
          )}

          {paymentMethod === "transfer" && (
            <>
              {qr.bank_name && (
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">
                    Banco
                  </div>
                  <div className="text-base font-bold text-gray-900">
                    {qr.bank_name}
                  </div>
                </div>
              )}
              {qr.account_number && (
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">
                    Nº Cuenta
                  </div>
                  <div className="text-base font-mono font-bold text-gray-900">
                    {qr.account_number}
                  </div>
                </div>
              )}
              {qr.cci && (
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">
                    CCI
                  </div>
                  <div className="text-sm font-mono font-bold text-gray-900 break-all">
                    {qr.cci}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {qr.notes && (
          <div className="mt-4 rounded-xl border-l-4 border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-bold text-xs uppercase tracking-wider">
              💡 Instrucciones
            </div>
            <div className="mt-1">{qr.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}