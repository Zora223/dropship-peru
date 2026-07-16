import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

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

export default function RegisterPage() {
  const [searchParams] = useSearchParams();

  const redirect = useMemo(
    () => getSafeRedirect(searchParams.get("redirect")),
    [searchParams]
  );

  const loginUrl = redirect
    ? `/login?redirect=${encodeURIComponent(redirect)}`
    : "/login";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signUp } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      await signUp(email.trim(), password, fullName.trim());
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[calc(100vh-140px)] items-center justify-center py-12">
        <div className="w-full max-w-sm">
          <div className="rounded-3xl bg-white p-8 text-center shadow-xl">
            <div className="mb-4 text-5xl">🎉</div>

            <h2 className="text-2xl font-bold text-gray-900">
              ¡Cuenta creada!
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Te enviamos un correo a <strong>{email}</strong> para confirmar
              tu cuenta. Revisa tu bandeja de entrada y también la carpeta de
              spam.
            </p>

            {redirect && (
              <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-xs font-medium text-rose-700">
                Cuando confirmes tu cuenta e inicies sesión, volverás a la
                página que estabas visitando.
              </div>
            )}

            <Link
              to={loginUrl}
              className="mt-6 inline-block rounded-xl bg-gray-900 px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-gray-800"
            >
              Ir a iniciar sesión
            </Link>

            <div className="mt-6">
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

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Crea tu cuenta
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Regístrate para comprar, guardar favoritos o crear tu tienda.
            </p>

            {redirect && (
              <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-xs font-medium text-rose-700">
                Después de registrarte e iniciar sesión podrás volver a la
                página que estabas visitando.
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700"
              >
                Nombre completo
              </label>

              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                placeholder="Juan Pérez"
              />
            </div>

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
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Contraseña
              </label>

              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirmar contraseña
              </label>

              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creando cuenta..." : "Crear cuenta gratis"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{" "}
            <Link
              to={loginUrl}
              className="font-semibold text-rose-600 hover:text-rose-700"
            >
              Inicia sesión
            </Link>
          </p>

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