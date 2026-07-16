// src/pages/delivery/DeliveryProfilePage.tsx
import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import {
  getMyDeliveryProfile,
  upsertDeliveryProfile,
  type VehicleType,
} from "../../lib/delivery";
import { useToast } from "../../contexts/ToastContext";

const vehicleOptions: { value: VehicleType; label: string }[] = [
  { value: "moto", label: "🏍️ Moto" },
  { value: "bici", label: "🚴 Bicicleta" },
  { value: "auto", label: "🚗 Auto" },
  { value: "a_pie", label: "🚶 A pie" },
];

export default function DeliveryProfilePage() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    phone: "",
    yape_number: "",
    vehicle_type: "moto" as VehicleType,
    vehicle_plate: "",
    base_rate: 0,
    zone_description: "",
    photo_url: "",
  });

  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadProfile();
  }, [user?.id]);

  async function loadProfile() {
    if (!user?.id) return;
    try {
      setLoading(true);
      const profile = await getMyDeliveryProfile(user.id);
      if (profile) {
        setForm({
          phone: profile.phone || "",
          yape_number: profile.yape_number || "",
          vehicle_type: profile.vehicle_type || "moto",
          vehicle_plate: profile.vehicle_plate || "",
          base_rate: Number(profile.base_rate) || 0,
          zone_description: profile.zone_description || "",
          photo_url: profile.photo_url || "",
        });
        setIsActive(profile.is_active);
      }
    } catch (err) {
      console.error("Error cargando perfil:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!user?.id) return;

    // Validaciones
    if (!form.phone.trim()) {
      toast.error("Falta teléfono", "Ingresa tu número de celular");
      return;
    }
    if (!form.yape_number.trim()) {
      toast.error(
        "Falta Yape",
        "Ingresa tu número de Yape para recibir pagos"
      );
      return;
    }
    if (form.base_rate <= 0) {
      toast.error(
        "Tarifa inválida",
        "Define cuánto cobras por entrega (mayor a 0)"
      );
      return;
    }

    try {
      setSaving(true);
      await upsertDeliveryProfile(user.id, form);
      toast.success("Perfil guardado ✅", "Tus datos se actualizaron");
      await loadProfile();
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
     <div className="flex min-h-100 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          👤 Mi Perfil
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Configura tus datos, tarifa y número de Yape
        </p>
      </div>

      {/* Estado activación */}
      <div
        className={`rounded-2xl border-2 p-4 sm:p-6 ${
          isActive
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="text-3xl">{isActive ? "✅" : "⏳"}</div>
          <div>
            <h3
              className={`text-sm font-bold ${
                isActive ? "text-emerald-900" : "text-amber-900"
              }`}
            >
              {isActive ? "Cuenta activada" : "Cuenta pendiente de activación"}
            </h3>
            <p
              className={`mt-0.5 text-xs ${
                isActive ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {isActive
                ? "Los vendors ya pueden asignarte pedidos"
                : "El admin debe activar tu cuenta para que aparezcas en la lista"}
            </p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
          📝 Datos personales
        </h2>

        {/* Teléfono */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            📞 Teléfono / WhatsApp *
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="987654321"
            className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        {/* Yape */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            💰 Número de Yape *
          </label>
          <input
            type="tel"
            value={form.yape_number}
            onChange={(e) => setForm({ ...form, yape_number: e.target.value })}
            placeholder="987654321"
            className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Aquí te pagará el admin al confirmar tus entregas
          </p>
        </div>

        {/* Foto URL */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            📸 URL de tu foto (opcional)
          </label>
          <input
            type="url"
            value={form.photo_url}
            onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
            placeholder="https://..."
            className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
          🚗 Vehículo y tarifa
        </h2>

        {/* Vehículo */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Tipo de vehículo *
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {vehicleOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, vehicle_type: opt.value })}
                className={`rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
                  form.vehicle_type === opt.value
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Placa */}
        {(form.vehicle_type === "moto" || form.vehicle_type === "auto") && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Placa del vehículo
            </label>
            <input
              type="text"
              value={form.vehicle_plate}
              onChange={(e) =>
                setForm({ ...form, vehicle_plate: e.target.value.toUpperCase() })
              }
              placeholder="ABC-123"
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>
        )}

        {/* Tarifa */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            💵 Tarifa por entrega (S/.) *
          </label>
          <input
            type="number"
            step="0.50"
            min="0"
            value={form.base_rate}
            onChange={(e) =>
              setForm({ ...form, base_rate: Number(e.target.value) })
            }
            placeholder="10.00"
            className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            💡 De este monto la plataforma retiene <b>S/. 3.00</b> como fee.
            Ejemplo: cobras S/. 10 → recibes S/. 7
          </p>
        </div>

        {/* Zona */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            📍 Zona de cobertura
          </label>
          <textarea
            value={form.zone_description}
            onChange={(e) =>
              setForm({ ...form, zone_description: e.target.value })
            }
            placeholder="Ej: Miraflores, San Isidro, Surco..."
            rows={2}
            className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Guardar */}
      <div className="sticky bottom-4 z-10">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "💾 Guardar cambios"}
        </button>
      </div>
    </div>
  );
}