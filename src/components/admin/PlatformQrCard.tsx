import { useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import {
  upsertPaymentQr,
  deletePaymentQr,
  uploadQrImage,
  type PaymentQr,
  type PaymentQrMethod,
} from "../../lib/payment-qrs";

interface Props {
  paymentMethod: PaymentQrMethod;
  existingQr: PaymentQr | null;
  onSaved: () => void;
}

const METHOD_INFO: Record<
  PaymentQrMethod,
  { name: string; icon: string; color: string }
> = {
  yape: { name: "Yape", icon: "💜", color: "purple" },
  plin: { name: "Plin", icon: "💙", color: "blue" },
  transfer: { name: "Transferencia", icon: "🏦", color: "gray" },
};

export default function PlatformQrCard({
  paymentMethod,
  existingQr,
  onSaved,
}: Props) {
  const toast = useToast();
  const info = METHOD_INFO[paymentMethod];

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    holder_name: existingQr?.holder_name ?? "",
    phone: existingQr?.phone ?? "",
    account_number: existingQr?.account_number ?? "",
    cci: existingQr?.cci ?? "",
    bank_name: existingQr?.bank_name ?? "",
    notes: existingQr?.notes ?? "",
    is_active: existingQr?.is_active ?? true,
  });
  const [qrImageUrl, setQrImageUrl] = useState(existingQr?.qr_image_url ?? "");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Error", "La imagen debe ser menor a 2MB");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadQrImage(file, "platform", null, paymentMethod);
      setQrImageUrl(url);
      toast.success("✅ Imagen subida", "QR guardado correctamente");
    } catch (err: any) {
      toast.error("Error", err.message ?? "Error al subir imagen");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.holder_name.trim()) {
      toast.error("Falta dato", "Ingresa el nombre del titular");
      return;
    }

    if (
      (paymentMethod === "yape" || paymentMethod === "plin") &&
      !form.phone.trim()
    ) {
      toast.error("Falta dato", `Ingresa el número de ${info.name}`);
      return;
    }

    setSaving(true);
    try {
      await upsertPaymentQr(
        {
          owner_type: "platform",
          owner_id: null,
          payment_method: paymentMethod,
          holder_name: form.holder_name.trim(),
          phone: form.phone.trim() || null,
          account_number: form.account_number.trim() || null,
          cci: form.cci.trim() || null,
          bank_name: form.bank_name.trim() || null,
          qr_image_url: qrImageUrl || null,
          notes: form.notes.trim() || null,
          is_active: form.is_active,
        },
        existingQr?.id
      );
      toast.success("✅ Guardado", `QR de ${info.name} configurado`);
      onSaved();
    } catch (err: any) {
      toast.error("Error", err.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingQr) return;
    if (!confirm(`¿Eliminar el QR de ${info.name}?`)) return;

    try {
      await deletePaymentQr(existingQr.id);
      toast.success("Eliminado", "QR eliminado correctamente");
      onSaved();
    } catch (err: any) {
      toast.error("Error", err.message ?? "Error al eliminar");
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{info.icon}</div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{info.name}</h3>
            <p className="text-xs text-gray-500">
              {existingQr ? "QR configurado" : "Aún no configurado"}
            </p>
          </div>
        </div>
        {existingQr && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              form.is_active
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {form.is_active ? "✅ Activo" : "⏸️ Inactivo"}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Titular *
          </label>
          <input
            type="text"
            value={form.holder_name}
            onChange={(e) =>
              setForm({ ...form, holder_name: e.target.value })
            }
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-purple-500 focus:bg-white"
            placeholder="Antony Panduro"
          />
        </div>

        {(paymentMethod === "yape" || paymentMethod === "plin") && (
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Número de celular *
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-purple-500 focus:bg-white"
              placeholder="930415718"
            />
          </div>
        )}

        {paymentMethod === "transfer" && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Banco
              </label>
              <input
                type="text"
                value={form.bank_name}
                onChange={(e) =>
                  setForm({ ...form, bank_name: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-purple-500 focus:bg-white"
                placeholder="BCP, Interbank, BBVA..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nº Cuenta
              </label>
              <input
                type="text"
                value={form.account_number}
                onChange={(e) =>
                  setForm({ ...form, account_number: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-purple-500 focus:bg-white"
                placeholder="194-XXXXXX-X-XX"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                CCI (Interbancaria)
              </label>
              <input
                type="text"
                value={form.cci}
                onChange={(e) => setForm({ ...form, cci: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-purple-500 focus:bg-white"
                placeholder="00219400XXXXXXXXXXX"
              />
            </div>
          </>
        )}

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Notas / Instrucciones (opcional)
          </label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-purple-500 focus:bg-white"
            placeholder="Ej: Incluir número de pedido en el yapeo"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            Imagen del QR
          </label>

          {qrImageUrl ? (
            <div className="flex items-start gap-4">
              <img
                src={qrImageUrl}
                alt="QR"
                className="h-40 w-40 rounded-2xl border-2 border-gray-100 object-contain bg-white p-2"
              />
              <div className="flex-1 space-y-2">
                <label className="block cursor-pointer rounded-full bg-purple-100 px-4 py-2 text-center text-xs font-semibold text-purple-700 hover:bg-purple-200">
                  📸 Cambiar imagen
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => setQrImageUrl("")}
                  className="w-full rounded-full bg-red-100 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-200"
                >
                  🗑️ Quitar imagen
                </button>
              </div>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 hover:border-purple-400 hover:bg-purple-50">
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
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm font-semibold text-gray-700">
              Activo (visible para clientes)
            </span>
          </label>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-full bg-purple-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-purple-700 disabled:opacity-60"
        >
          {saving ? "Guardando..." : existingQr ? "💾 Actualizar" : "💾 Guardar"}
        </button>
        {existingQr && (
          <button
            onClick={handleDelete}
            className="rounded-full bg-red-100 px-6 py-3 text-sm font-bold text-red-700 hover:bg-red-200"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}