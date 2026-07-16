// src/pages/SupplierRegisterPage.tsx
// Registro directo de proveedores mayoristas
// Un solo formulario, todo en una pantalla

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast } from "../contexts/ToastContext";
import { SUPPLIER_CATEGORIES } from "../lib/suppliers";

// ============================================
// 📝 ESTADO INICIAL DEL FORMULARIO
// ============================================

const initialForm = {
  // Cuenta
  email: "",
  password: "",
  password_confirm: "",
  full_name: "",

  // Negocio
  business_name: "",
  ruc: "",
  category: "",
  bio: "",

  // Contacto
  phone: "",
  whatsapp: "",

  // Dirección de recojo
  address: "",
  district: "",
  city: "Lima",
  reference: "",

  // Pagos
  yape_number: "",

  // Términos
  accept_terms: false,
};

// ============================================
// 🎯 COMPONENTE PRINCIPAL
// ============================================

export default function SupplierRegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function setField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // ============================================
  // ✅ VALIDACIONES
  // ============================================

  function validate(): string | null {
    // Cuenta
    if (!form.email.trim()) return "Falta el email";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Email inválido";
    if (form.password.length < 6)
      return "La contraseña debe tener al menos 6 caracteres";
    if (form.password !== form.password_confirm)
      return "Las contraseñas no coinciden";
    if (!form.full_name.trim()) return "Falta tu nombre";

    // Negocio
    if (!form.business_name.trim()) return "Falta el nombre del negocio";
    if (!form.category) return "Selecciona una categoría";

    // Contacto
    if (!form.whatsapp.trim())
      return "El WhatsApp es obligatorio (ahí te avisaremos los pedidos)";
    if (!/^\d{9}$/.test(form.whatsapp.replace(/\D/g, "")))
      return "WhatsApp debe tener 9 dígitos";

    // Dirección
    if (!form.address.trim()) return "Falta la dirección de recojo";
    if (!form.district.trim()) return "Falta el distrito";

    // Pagos
    if (!form.yape_number.trim())
      return "El número de Yape es obligatorio para recibir pagos";
    if (!/^\d{9}$/.test(form.yape_number.replace(/\D/g, "")))
      return "Yape debe tener 9 dígitos";

    // Términos
    if (!form.accept_terms) return "Debes aceptar los términos";

    return null;
  }

  // ============================================
  // 🚀 REGISTRO
  // ============================================

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const error = validate();
    if (error) {
      toast.warning("Faltan datos", error);
      return;
    }

    try {
      setLoading(true);

      // 1. Crear cuenta en Supabase Auth
      const { data: authData, error: signUpError } =
        await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: {
              full_name: form.full_name.trim(),
              role: "supplier",
            },
          },
        });

      if (signUpError) {
        toast.error("Error al crear cuenta", signUpError.message);
        return;
      }

      if (!authData.user) {
        toast.error("Error", "No se pudo crear la cuenta");
        return;
      }

      const userId = authData.user.id;

      // 2. Actualizar profile con rol 'supplier' y nombre
      // (el trigger de Supabase probablemente ya creó el profile como 'customer')
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          role: "supplier",
          full_name: form.full_name.trim(),
        })
        .eq("id", userId);

      if (profileError) {
        console.error("Error actualizando profile:", profileError);
        // No detenemos el flujo, continuamos
      }

      // 3. Crear supplier_profile
      const { error: supplierError } = await supabase
        .from("supplier_profiles")
        .insert({
          id: userId,
          business_name: form.business_name.trim(),
          ruc: form.ruc.trim() || null,
          phone: form.phone.trim() || null,
          whatsapp: form.whatsapp.replace(/\D/g, ""),
          address: form.address.trim(),
          district: form.district.trim(),
          city: form.city.trim() || "Lima",
          reference: form.reference.trim() || null,
          bio: form.bio.trim() || null,
          category: form.category,
          yape_number: form.yape_number.replace(/\D/g, ""),
          is_active: false, // pendiente de aprobación
          is_verified: false,
        });

      if (supplierError) {
        toast.error("Error al guardar datos del negocio", supplierError.message);
        return;
      }

      // 4. Éxito
      setSuccess(true);
      toast.success(
        "¡Registro exitoso! 🎉",
        "Tu cuenta está en revisión (24-48h)"
      );

      // 5. Redirigir después de 5 segundos
      setTimeout(() => {
        navigate("/login");
      }, 5000);
    } catch (err: any) {
      toast.error("Error inesperado", err.message);
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // 🎉 PANTALLA DE ÉXITO
  // ============================================

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-amber-50 via-orange-50 to-rose-50 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-5xl">
            ✅
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            ¡Cuenta creada!
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Tu solicitud está siendo revisada por nuestro equipo. Te
            contactaremos por WhatsApp en las próximas <b>24-48 horas</b>.
          </p>

          <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
              📱 Próximos pasos
            </p>
            <ul className="mt-2 space-y-1 text-xs text-amber-900">
              <li>1. Verificaremos tus datos</li>
              <li>2. Te contactaremos por WhatsApp</li>
              <li>3. Empezarás a subir tus productos</li>
              <li>4. Los vendors los venderán</li>
            </ul>
          </div>

          <p className="mt-6 text-xs text-gray-500">
            Serás redirigido en 5 segundos...
          </p>

          <Link
            to="/login"
            className="mt-4 block w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
          >
            Ir al login
          </Link>
        </div>
      </div>
    );
  }

  // ============================================
  // 📝 FORMULARIO
  // ============================================

  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 via-orange-50 to-rose-50 py-8">
      <div className="mx-auto max-w-2xl px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-3xl text-white shadow-lg">
            🏭
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Regístrate como Proveedor
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Vende tus productos al por mayor en Dropship Perú
          </p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white p-6 shadow-xl sm:p-8"
        >
          {/* ═══════════════════════════════════════ */}
          {/* SECCIÓN 1: CUENTA */}
          {/* ═══════════════════════════════════════ */}
          <SectionTitle icon="👤" title="Tu cuenta" />

          <div className="space-y-4">
            <Field label="Tu nombre completo *">
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setField("full_name", e.target.value)}
                placeholder="Ej: Kevin Ramírez"
                className={inputClass}
                required
              />
            </Field>

            <Field label="Email *">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="tu@email.com"
                className={inputClass}
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contraseña *">
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="Confirmar contraseña *">
                <input
                  type="password"
                  value={form.password_confirm}
                  onChange={(e) => setField("password_confirm", e.target.value)}
                  placeholder="Repite la contraseña"
                  className={inputClass}
                  required
                />
              </Field>
            </div>
          </div>

          {/* ═══════════════════════════════════════ */}
          {/* SECCIÓN 2: NEGOCIO */}
          {/* ═══════════════════════════════════════ */}
          <SectionTitle icon="🏭" title="Sobre tu negocio" />

          <div className="space-y-4">
            <Field label="Nombre del negocio *">
              <input
                type="text"
                value={form.business_name}
                onChange={(e) => setField("business_name", e.target.value)}
                placeholder="Ej: Kevin Gamarra Import"
                className={inputClass}
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="RUC (opcional)">
                <input
                  type="text"
                  value={form.ruc}
                  onChange={(e) => setField("ruc", e.target.value)}
                  placeholder="20123456789"
                  className={inputClass}
                />
              </Field>
              <Field label="Categoría principal *">
                <select
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Selecciona...</option>
                  {SUPPLIER_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Descripción breve (opcional)">
              <textarea
                value={form.bio}
                onChange={(e) => setField("bio", e.target.value)}
                placeholder="Ej: Especialistas en calzado de damas y caballeros al por mayor"
                rows={2}
                className={inputClass}
              />
            </Field>
          </div>

          {/* ═══════════════════════════════════════ */}
          {/* SECCIÓN 3: CONTACTO */}
          {/* ═══════════════════════════════════════ */}
          <SectionTitle icon="📱" title="Contacto" />

          <div className="space-y-4">
            <Field
              label="WhatsApp * (te avisamos los pedidos aquí)"
              hint="Solo 9 dígitos, sin +51"
            >
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => setField("whatsapp", e.target.value)}
                placeholder="999888777"
                className={inputClass}
                maxLength={9}
                required
              />
            </Field>

            <Field label="Teléfono fijo (opcional)">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="014567890"
                className={inputClass}
              />
            </Field>
          </div>

          {/* ═══════════════════════════════════════ */}
          {/* SECCIÓN 4: DIRECCIÓN DE RECOJO */}
          {/* ═══════════════════════════════════════ */}
          <SectionTitle
            icon="📍"
            title="Dirección de recojo"
            subtitle="Donde el delivery irá a recoger los pedidos"
          />

          <div className="space-y-4">
            <Field label="Dirección *">
              <input
                type="text"
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                placeholder="Ej: Jr. Gamarra 456, Galería XYZ, Stand 123"
                className={inputClass}
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Distrito *">
                <input
                  type="text"
                  value={form.district}
                  onChange={(e) => setField("district", e.target.value)}
                  placeholder="La Victoria"
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="Ciudad">
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder="Lima"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Referencia (opcional)">
              <input
                type="text"
                value={form.reference}
                onChange={(e) => setField("reference", e.target.value)}
                placeholder="Ej: Frente al banco BCP"
                className={inputClass}
              />
            </Field>
          </div>

          {/* ═══════════════════════════════════════ */}
          {/* SECCIÓN 5: PAGOS */}
          {/* ═══════════════════════════════════════ */}
          <SectionTitle
            icon="💰"
            title="Cómo te pagamos"
            subtitle="Dropship te paga apenas confirmes stock de un pedido"
          />

          <div className="space-y-4">
            <Field
              label="Número de Yape *"
              hint="Ahí recibirás tus pagos inmediatos"
            >
              <input
                type="tel"
                value={form.yape_number}
                onChange={(e) => setField("yape_number", e.target.value)}
                placeholder="999888777"
                className={inputClass}
                maxLength={9}
                required
              />
            </Field>

            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                💚 Cómo funcionan los pagos
              </p>
              <ul className="mt-2 space-y-1 text-xs text-emerald-900">
                <li>• Cuando llega un pedido, te avisamos por WhatsApp</li>
                <li>• Tú confirmas si tienes stock</li>
                <li>• Al confirmar, te pagamos inmediatamente por Yape</li>
                <li>• Preparas el pedido, el delivery lo recoge</li>
                <li>• Cero riesgo para ti 🎯</li>
              </ul>
            </div>
          </div>

          {/* ═══════════════════════════════════════ */}
          {/* TÉRMINOS */}
          {/* ═══════════════════════════════════════ */}
          <div className="mt-8 border-t border-gray-100 pt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.accept_terms}
                onChange={(e) => setField("accept_terms", e.target.checked)}
                className="mt-1 h-4 w-4 accent-amber-600"
              />
              <span className="text-sm text-gray-700">
                Acepto los términos de proveedor de Dropship Perú y confirmo
                que la información proporcionada es verdadera
              </span>
            </label>
          </div>

          {/* ═══════════════════════════════════════ */}
          {/* SUBMIT */}
          {/* ═══════════════════════════════════════ */}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-amber-500 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? "⏳ Creando cuenta..." : "🏭 Registrarme como Proveedor"}
          </button>

          <p className="mt-4 text-center text-xs text-gray-500">
            Tu cuenta será revisada por nuestro equipo (24-48h)
          </p>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          ¿Ya tienes cuenta?{" "}
          <Link
            to="/login"
            className="font-bold text-amber-600 hover:text-amber-700"
          >
            Inicia sesión
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/"
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 🧩 SUB-COMPONENTES
// ============================================

const inputClass =
  "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 mt-6 first:mt-0">
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">
          {title}
        </h3>
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}