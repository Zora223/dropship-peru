import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast } from "../contexts/ToastContext";

interface PasswordStrength {
  score: number; // 0-5
  label: string;
  color: string;
  bgColor: string;
  checks: {
    length: boolean;
    lowercase: boolean;
    uppercase: boolean;
    number: boolean;
    special: boolean;
  };
}

function calculateStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  const configs = [
    { label: "Muy débil", color: "text-red-600", bgColor: "bg-red-500" },
    { label: "Débil", color: "text-orange-600", bgColor: "bg-orange-500" },
    { label: "Regular", color: "text-yellow-600", bgColor: "bg-yellow-500" },
    { label: "Buena", color: "text-lime-600", bgColor: "bg-lime-500" },
    { label: "Fuerte", color: "text-green-600", bgColor: "bg-green-500" },
    { label: "Excelente", color: "text-emerald-600", bgColor: "bg-emerald-500" },
  ];

  return {
    score,
    ...configs[score],
    checks,
  };
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  const strength = useMemo(() => calculateStrength(password), [password]);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  // Verificar que el enlace es válido al montar
  useEffect(() => {
    const checkSession = async () => {
      // Supabase auto-detecta el token del hash de la URL
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setValidSession(true);
      } else {
        // Escuchar evento de auth (Supabase procesa el token del hash)
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY" || session) {
            setValidSession(true);
          }
        });

        // Timeout de seguridad
        setTimeout(() => {
          setValidSession((prev) => (prev === null ? false : prev));
        }, 3000);

        return () => subscription.unsubscribe();
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.warning(
        "Contraseña muy corta",
        "Debe tener al menos 8 caracteres"
      );
      return;
    }

    if (strength.score < 3) {
      toast.warning(
        "Contraseña débil",
        "Añade mayúsculas, números y símbolos para más seguridad"
      );
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden", "Verifica que ambas sean iguales");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setDone(true);
      toast.success(
        "¡Contraseña actualizada!",
        "Ya puedes iniciar sesión con tu nueva contraseña"
      );

      // Cerrar sesión (Supabase abre una sesión temporal al hacer reset)
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/login");
      }, 3000);
    } catch (err) {
      console.error("Update password error:", err);
      toast.error(
        "No se pudo actualizar",
        err instanceof Error ? err.message : "Intenta de nuevo o solicita otro enlace"
      );
    } finally {
      setLoading(false);
    }
  };

  // ========== ENLACE INVÁLIDO ==========
  if (validSession === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-red-50 to-orange-50 p-4">
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-white p-8 shadow-xl text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <span className="text-4xl">⚠️</span>
            </div>

            <h1 className="mt-6 text-2xl font-black text-gray-900">
              Enlace inválido o expirado
            </h1>

            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              El enlace que usaste ya no es válido. Los enlaces de recuperación
              expiran después de <strong>1 hora</strong>.
            </p>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => navigate("/forgot-password")}
                className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white shadow transition hover:bg-gray-800"
              >
                Solicitar nuevo enlace
              </button>

              <button
                onClick={() => navigate("/login")}
                className="w-full rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Volver al login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== ÉXITO ==========
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-emerald-50 to-green-50 p-4">
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-white p-8 shadow-xl text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <span className="text-4xl">🎉</span>
            </div>

            <h1 className="mt-6 text-2xl font-black text-gray-900">
              ¡Listo!
            </h1>

            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              Tu contraseña fue actualizada correctamente.
              <br />
              Redirigiendo al inicio de sesión...
            </p>

            <div className="mt-6 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-500" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== LOADING (verificando sesión) ==========
  if (validSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-rose-50 to-orange-50 p-4">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" />
          <p className="mt-4 text-sm text-gray-600">Verificando enlace...</p>
        </div>
      </div>
    );
  }

  // ========== FORMULARIO ==========
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-rose-50 to-orange-50 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white p-8 shadow-xl">
          {/* Ícono */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100">
            <span className="text-3xl">🔒</span>
          </div>

          <h1 className="mt-4 text-2xl font-black text-gray-900">
            Nueva contraseña
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Crea una contraseña segura para tu cuenta.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Nueva contraseña */}
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Nueva contraseña
              </label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 pr-11 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                  minLength={8}
                  required
                  autoFocus
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>

              {/* Indicador de fortaleza */}
              {password && (
                <div className="mt-2 space-y-2">
                  {/* Barras */}
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          i < strength.score ? strength.bgColor : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Label */}
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold ${strength.color}`}>
                      Seguridad: {strength.label}
                    </span>
                    <span className="text-gray-400">{password.length} caract.</span>
                  </div>

                  {/* Checklist */}
                  <div className="rounded-lg bg-gray-50 p-2.5 text-xs space-y-1">
                    <CheckItem checked={strength.checks.length}>
                      Mínimo 8 caracteres
                    </CheckItem>
                    <CheckItem checked={strength.checks.uppercase}>
                      Al menos una MAYÚSCULA
                    </CheckItem>
                    <CheckItem checked={strength.checks.lowercase}>
                      Al menos una minúscula
                    </CheckItem>
                    <CheckItem checked={strength.checks.number}>
                      Al menos un número
                    </CheckItem>
                    <CheckItem checked={strength.checks.special}>
                      Al menos un símbolo (!@#$...)
                    </CheckItem>
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Confirmar contraseña
              </label>
              <div className="relative mt-1.5">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  className={`w-full rounded-xl border bg-gray-50 px-4 py-2.5 pr-11 text-sm outline-none transition focus:bg-white focus:ring-2 ${
                    confirmPassword && !passwordsMatch
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                      : "border-gray-200 focus:border-rose-500 focus:ring-rose-500/20"
                  }`}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? "🙈" : "👁"}
                </button>
              </div>

              {confirmPassword && (
                <p
                  className={`mt-1.5 text-xs font-medium ${
                    passwordsMatch ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {passwordsMatch
                    ? "✓ Las contraseñas coinciden"
                    : "✗ Las contraseñas no coinciden"}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                !password ||
                !confirmPassword ||
                !passwordsMatch ||
                strength.score < 3
              }
              className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white shadow transition hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Actualizando...
                </>
              ) : (
                <>
                  <span>🔒</span>
                  Cambiar contraseña
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ========== COMPONENTE AUXILIAR ==========
function CheckItem({
  checked,
  children,
}: {
  checked: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 ${
        checked ? "text-emerald-600" : "text-gray-500"
      }`}
    >
      <span className="text-xs">{checked ? "✓" : "○"}</span>
      <span>{children}</span>
    </div>
  );
}