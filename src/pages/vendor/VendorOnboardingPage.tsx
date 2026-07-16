import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  createStoreForCurrentUser,
  generateSlug,
  isSlugAvailable,
} from "../../lib/vendor-onboarding";

export default function VendorOnboardingPage() {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generar slug mientras el usuario escribe el nombre
  // (solo si el usuario no lo ha editado manualmente todavía)
  useEffect(() => {
    if (!slugTouched && name) {
      setSlug(generateSlug(name));
    }
  }, [name, slugTouched]);

  // Verificar disponibilidad del slug con debounce
  useEffect(() => {
    const normalized = generateSlug(slug);

    if (normalized.length < 3) {
      setSlugAvailable(null);
      return;
    }

    setCheckingSlug(true);
    const timer = setTimeout(async () => {
      try {
        const available = await isSlugAvailable(normalized);
        setSlugAvailable(available);
      } catch {
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug]);

  // Si no hay sesión, mandar a login
  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  // Si ya es vendor, mandar directo a su panel
  if (!authLoading && user?.role === "vendor") {
    return <Navigate to="/vendor" replace />;
  }

  // Si es admin, no aplica
  if (!authLoading && user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (slugAvailable === false) {
      setError("El enlace elegido ya está en uso.");
      return;
    }

    try {
      setSubmitting(true);

      await createStoreForCurrentUser({
        name,
        slug,
        description,
        whatsapp,
      });

      // Refrescar el profile para que useAuth vea el nuevo rol
      await refreshProfile();

      // Redirigir al panel del vendor
      navigate("/vendor", { replace: true });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error al crear la tienda."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-rose-500" />
      </div>
    );
  }

  const normalizedSlug = generateSlug(slug);
  const canSubmit =
    name.trim().length >= 3 &&
    normalizedSlug.length >= 3 &&
    slugAvailable === true &&
    !submitting;

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#f5f5f7] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 text-4xl">🚀</div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Crea tu tienda
          </h1>
          <p className="mt-3 text-base text-gray-600">
            Empieza a vender hoy mismo.{" "}
            <span className="font-semibold text-rose-600">
              30 días de prueba gratis
            </span>
            , luego solo S/15 al mes.
          </p>
        </div>

        {/* Card con formulario */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white p-6 shadow-sm sm:p-8"
        >
          {error && (
            <div className="mb-6 rounded-2xl border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-semibold text-gray-900"
            >
              Nombre de la tienda <span className="text-rose-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Moda Andina"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900/10"
              maxLength={60}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Este es el nombre que verán tus clientes.
            </p>
          </div>

          {/* Slug */}
          <div className="mt-5">
            <label
              htmlFor="slug"
              className="block text-sm font-semibold text-gray-900"
            >
              Enlace de tu tienda <span className="text-rose-500">*</span>
            </label>
            <div className="mt-2 flex items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 focus-within:border-gray-900 focus-within:bg-white focus-within:ring-2 focus-within:ring-gray-900/10">
              <span className="whitespace-nowrap pl-4 text-sm text-gray-400">
                dropship.pe/tienda/
              </span>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                placeholder="mi-tienda"
                className="flex-1 bg-transparent py-3 pl-0 pr-4 text-sm outline-none"
                maxLength={40}
                required
              />
            </div>

            {/* Estado del slug */}
            <div className="mt-1.5 min-h-5 text-xs">
              {normalizedSlug.length > 0 && normalizedSlug.length < 3 && (
                <span className="text-red-600">Mínimo 3 caracteres.</span>
              )}

              {normalizedSlug.length >= 3 && checkingSlug && (
                <span className="text-gray-500">Verificando...</span>
              )}

              {normalizedSlug.length >= 3 &&
                !checkingSlug &&
                slugAvailable === true && (
                  <span className="text-emerald-600">
                    ✓ Disponible: dropship.pe/tienda/
                    <strong>{normalizedSlug}</strong>
                  </span>
                )}

              {normalizedSlug.length >= 3 &&
                !checkingSlug &&
                slugAvailable === false && (
                  <span className="text-red-600">
                    ✗ Ese enlace ya está en uso.
                  </span>
                )}
            </div>
          </div>

          {/* Descripción */}
          <div className="mt-5">
            <label
              htmlFor="description"
              className="block text-sm font-semibold text-gray-900"
            >
              Descripción{" "}
              <span className="text-xs font-normal text-gray-400">
                (opcional)
              </span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cuéntanos qué vendes en pocas palabras..."
              rows={3}
              className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900/10"
              maxLength={200}
            />
          </div>

          {/* WhatsApp */}
          <div className="mt-5">
            <label
              htmlFor="whatsapp"
              className="block text-sm font-semibold text-gray-900"
            >
              WhatsApp de contacto{" "}
              <span className="text-xs font-normal text-gray-400">
                (opcional)
              </span>
            </label>
            <input
              id="whatsapp"
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+51 987 654 321"
              className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900/10"
            />
            <p className="mt-1 text-xs text-gray-500">
              Tus clientes podrán escribirte directo por WhatsApp.
            </p>
          </div>

          {/* Info de prueba */}
          <div className="mt-6 rounded-2xl bg-rose-50 p-4 text-xs text-rose-800">
            <div className="font-bold uppercase tracking-wider text-rose-700">
              🎁 Incluido en tu prueba
            </div>
            <ul className="mt-2 space-y-1">
              <li>✓ 30 días completamente gratis</li>
              <li>✓ Productos ilimitados</li>
              <li>✓ Tu propio enlace personalizado</li>
              <li>✓ Pagos con Yape, Plin y transferencia</li>
            </ul>
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-6 w-full rounded-full bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creando tu tienda..." : "Crear mi tienda"}
          </button>

          <p className="mt-3 text-center text-xs text-gray-400">
            Al crear tu tienda aceptas los términos del servicio.
          </p>
        </form>
      </div>
    </div>
  );
}