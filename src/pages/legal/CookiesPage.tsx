// src/pages/legal/CookiesPage.tsx
import MainLayout from "../../layouts/MainLayout";
import { Cookie } from "lucide-react";

export default function CookiesPage() {
  return (
    <MainLayout>
      <div className="bg-linear-to-br from-slate-50 to-white py-12 md:py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-amber-100 p-3">
              <Cookie className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-slate-900 md:text-4xl">
              Política de Cookies
            </h1>
            <p className="text-slate-500">Última actualización: Enero 2026</p>
          </div>

          <div className="prose prose-slate max-w-none rounded-2xl bg-white p-6 shadow-sm md:p-10">
            <section className="mb-8">
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                ¿Qué son las Cookies?
              </h2>
              <p className="text-slate-700">
                Las cookies son pequeños archivos que se almacenan en tu dispositivo
                cuando visitas un sitio web. Nos ayudan a mejorar tu experiencia,
                recordar tus preferencias y analizar el uso de la plataforma.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                Tipos de Cookies que Usamos
              </h2>

              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-slate-200 p-4">
                  <h3 className="mb-2 text-lg font-semibold text-slate-800">
                    🔧 Cookies Esenciales
                  </h3>
                  <p className="text-slate-700">
                    Necesarias para el funcionamiento del sitio. Incluyen sesión de
                    usuario, carrito de compras y seguridad.{" "}
                    <strong>No pueden desactivarse.</strong>
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <h3 className="mb-2 text-lg font-semibold text-slate-800">
                    📊 Cookies de Análisis
                  </h3>
                  <p className="text-slate-700">
                    Nos ayudan a entender cómo usas el sitio para mejorarlo.
                    Recolectamos datos anónimos como páginas visitadas y tiempo de uso.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <h3 className="mb-2 text-lg font-semibold text-slate-800">
                    🎯 Cookies de Preferencias
                  </h3>
                  <p className="text-slate-700">
                    Recuerdan tus configuraciones (tema, idioma, tienda favorita) para
                    personalizar tu experiencia.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <h3 className="mb-2 text-lg font-semibold text-slate-800">
                    📣 Cookies de Marketing (opcional)
                  </h3>
                  <p className="text-slate-700">
                    Solo con tu consentimiento. Se usan para mostrarte ofertas
                    relevantes y medir campañas.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                ¿Cómo controlar las Cookies?
              </h2>
              <p className="text-slate-700">
                Puedes gestionar las cookies desde la configuración de tu navegador:
              </p>
              <ul className="ml-6 mt-2 list-disc space-y-1 text-slate-700">
                <li>
                  <strong>Chrome:</strong> Configuración → Privacidad y seguridad →
                  Cookies
                </li>
                <li>
                  <strong>Firefox:</strong> Opciones → Privacidad y seguridad
                </li>
                <li>
                  <strong>Safari:</strong> Preferencias → Privacidad
                </li>
                <li>
                  <strong>Edge:</strong> Configuración → Cookies y permisos del sitio
                </li>
              </ul>
              <p className="mt-3 text-slate-700">
                <strong>Nota:</strong> Desactivar cookies esenciales puede afectar el
                funcionamiento del sitio.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                Cookies de Terceros
              </h2>
              <p className="text-slate-700">
                Algunos servicios que usamos también instalan cookies:
              </p>
              <ul className="ml-6 mt-2 list-disc space-y-1 text-slate-700">
                <li>
                  <strong>Supabase:</strong> autenticación y sesión de usuario
                </li>
                <li>
                  <strong>Google Analytics:</strong> análisis de tráfico (anónimo)
                </li>
                <li>
                  <strong>Netlify:</strong> hosting y CDN
                </li>
              </ul>
            </section>

            <div className="mt-10 rounded-xl bg-amber-50 p-6 text-center">
              <p className="text-slate-700">
                ¿Dudas sobre cookies? Escríbenos a{" "}
                <a
                  href="mailto:soportedropshipperu@gmail.com"
                  className="font-semibold text-amber-700 hover:underline"
                >
                  soportedropshipperu@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}