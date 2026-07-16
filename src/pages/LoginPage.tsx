// src/pages/LoginPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../contexts/ToastContext";
import type { DbProfile } from "../types/database";

function getRoleRedirect(user: DbProfile) {
  if (user.role === "admin") return "/admin";
  if (user.role === "vendor") return "/vendor";
  if (user.role === "delivery") return "/delivery";
  if (user.role === "supplier") return "/supplier"; // 🆕 v13
  return "/customer";
}

function getSafeRedirect(value: string | null) {
  if (!value) return null;

  try {
    const decoded = decodeURIComponent(value);

    if (!decoded.startsWith("/")) return null;
    if (decoded.startsWith("//")) return null;
    if (decoded.startsWith("/login")) return null;
    if (decoded.startsWith("/register")) return null;

    return decoded;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirect = useMemo(
    () => getSafeRedirect(searchParams.get("redirect")),
    [searchParams]
  );

  const registerUrl = redirect
    ? `/register?redirect=${encodeURIComponent(redirect)}`
    : "/register";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (!loading && user) {
      navigate(redirect ?? getRoleRedirect(user), { replace: true });
    }
  }, [loading, user, redirect, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      toast.warning("Campos requeridos", "Ingresa tu correo y contraseña");
      return;
    }

    setLoadingSubmit(true);

    try {
      const profile = await signIn(trimmedEmail, password);

      toast.success(
        `¡Bienvenido${profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!`,
        "Has iniciado sesión correctamente"
      );

      navigate(redirect ?? getRoleRedirect(profile), { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesión";

      let friendlyTitle = "No se pudo iniciar sesión";
      let friendlyMessage = message;

      if (message.toLowerCase().includes("invalid login credentials")) {
        friendlyTitle = "Credenciales incorrectas";
        friendlyMessage = "Verifica tu correo y contraseña";
      } else if (message.toLowerCase().includes("email not confirmed")) {
        friendlyTitle = "Correo no confirmado";
        friendlyMessage = "Revisa tu bandeja de entrada para confirmar tu cuenta";
      } else if (message.toLowerCase().includes("too many requests")) {
        friendlyTitle = "Demasiados intentos";
        friendlyMessage = "Espera unos minutos antes de intentar de nuevo";
      }

      toast.error(friendlyTitle, friendlyMessage);
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Bienvenido de vuelta
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Ingresa a tu cuenta para continuar
            </p>

            {redirect && (
              <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-xs font-medium text-rose-700">
                Después de iniciar sesión volverás a la página que estabas
                visitando.
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Correo electrónico
              </label>

              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                placeholder="tu@email.com"
                autoComplete="email"
                disabled={loadingSubmit}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Contraseña
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <div className="relative mt-2">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-11 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loadingSubmit}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingSubmit}
              className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingSubmit ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Entrando...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            ¿No tienes cuenta?{" "}
            <Link
              to={registerUrl}
              className="font-semibold text-rose-600 hover:text-rose-700"
            >
              Regístrate gratis
            </Link>
          </p>

          {/* 🆕 Link para proveedores */}
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-xs font-semibold text-amber-800">
              🏭 ¿Eres proveedor mayorista?
            </p>
            <Link
              to="/registro-proveedor"
              className="mt-1 inline-block text-sm font-bold text-amber-700 hover:text-amber-900"
            >
              Regístrate aquí →
            </Link>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-6 text-center">
            <Link
              to="/"
              className="text-xs font-semibold text-gray-400 hover:text-gray-600"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}