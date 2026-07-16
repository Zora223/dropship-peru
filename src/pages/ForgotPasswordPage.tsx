import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast } from "../contexts/ToastContext";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      toast.warning("Campo requerido", "Ingresa tu correo electrónico");
      return;
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.warning("Email inválido", "Ingresa un correo válido");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      toast.success(
        "Correo enviado",
        "Revisa tu bandeja de entrada (y spam por si acaso)"
      );
    } catch (err) {
      console.error("Reset password error:", err);
      // Por seguridad, mostramos éxito incluso si el email no existe
      // (para no revelar qué emails están registrados)
      setSent(true);
      toast.info(
        "Correo enviado",
        "Si la cuenta existe, recibirás un enlace en tu correo"
      );
    } finally {
      setLoading(false);
    }
  };

  // ========== VISTA DE ÉXITO ==========
  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-rose-50 to-orange-50 p-4">
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-white p-8 shadow-xl">
            {/* Ícono animado */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <span className="text-4xl">📬</span>
            </div>

            <h1 className="mt-6 text-center text-2xl font-black text-gray-900">
              ¡Correo enviado!
            </h1>

            <p className="mt-3 text-center text-sm text-gray-600 leading-relaxed">
              Si existe una cuenta asociada a <br />
              <span className="font-semibold text-gray-900">{email}</span>
              <br />
              recibirás un enlace para restablecer tu contraseña.
            </p>

            <div className="mt-6 rounded-2xl bg-blue-50 border border-blue-200 p-4">
              <div className="flex gap-2">
                <span className="text-lg">💡</span>
                <div className="text-xs text-blue-800 leading-relaxed">
                  <strong>No olvides revisar tu spam.</strong>
                  <br />
                  El enlace expira en 1 hora.
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="w-full rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Enviar a otro correo
              </button>

              <button
                onClick={() => navigate("/login")}
                className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white shadow transition hover:bg-gray-800"
              >
                Volver al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== FORMULARIO ==========
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-rose-50 to-orange-50 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white p-8 shadow-xl">
          {/* Botón volver */}
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition"
          >
            <span>←</span>
            <span>Volver al login</span>
          </Link>

          {/* Ícono */}
          <div className="mt-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100">
            <span className="text-3xl">🔐</span>
          </div>

          <h1 className="mt-4 text-2xl font-black text-gray-900">
            ¿Olvidaste tu contraseña?
          </h1>

          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            No te preocupes. Ingresa tu correo y te enviaremos un enlace para
            crear una nueva contraseña.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                autoFocus
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white shadow transition hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Enviando...
                </>
              ) : (
                <>
                  <span>📧</span>
                  Enviar enlace de recuperación
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            ¿Recordaste tu contraseña?{" "}
            <Link
              to="/login"
              className="font-semibold text-rose-600 hover:text-rose-800"
            >
              Inicia sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}