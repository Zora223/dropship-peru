// src/pages/legal/PrivacyPage.tsx
import MainLayout from "../../layouts/MainLayout";
import { Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <MainLayout>
      <div className="bg-linear-to-br from-slate-50 to-white py-12 md:py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-blue-100 p-3">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-slate-900 md:text-4xl">
              Política de Privacidad
            </h1>
            <p className="text-slate-500">Última actualización: Enero 2026</p>
          </div>

          <div className="prose prose-slate max-w-none rounded-2xl bg-white p-6 shadow-sm md:p-10">
            <section className="mb-8">
              <p className="text-slate-700">
                En <strong>Dropship Perú</strong> respetamos tu privacidad y protegemos
                tus datos personales conforme a la <strong>Ley N° 29733 - Ley de
                Protección de Datos Personales del Perú</strong> y su reglamento.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                1. Datos que Recolectamos
              </h2>

              <h3 className="mb-2 mt-4 text-lg font-semibold text-slate-800">
                Datos personales:
              </h3>
              <ul className="ml-6 list-disc space-y-1 text-slate-700">
                <li>Nombre completo</li>
                <li>Email</li>
                <li>Número de WhatsApp / teléfono</li>
                <li>Dirección de entrega</li>
                <li>DNI (solo para vendors y proveedores)</li>
              </ul>

              <h3 className="mb-2 mt-4 text-lg font-semibold text-slate-800">
                Datos de uso:
              </h3>
              <ul className="ml-6 list-disc space-y-1 text-slate-700">
                <li>Historial de compras y pedidos</li>
                <li>Preferencias de productos</li>
                <li>Dirección IP y tipo de dispositivo</li>
                <li>Cookies (ver Política de Cookies)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                2. ¿Para qué usamos tus datos?
              </h2>
              <ul className="ml-6 list-disc space-y-1 text-slate-700">
                <li>Procesar y entregar tus pedidos</li>
                <li>Enviar notificaciones por WhatsApp sobre tu compra</li>
                <li>Validar pagos y comprobantes</li>
                <li>Mejorar nuestros servicios</li>
                <li>Prevenir fraudes</li>
                <li>Enviar promociones (solo con tu consentimiento)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                3. ¿Con quién compartimos tus datos?
              </h2>
              <p className="text-slate-700">Compartimos datos necesarios con:</p>
              <ul className="ml-6 mt-2 list-disc space-y-1 text-slate-700">
                <li>
                  <strong>Vendors:</strong> reciben tu nombre y contacto para atender tu pedido
                </li>
                <li>
                  <strong>Delivery:</strong> recibe tu dirección y teléfono para la entrega
                </li>
                <li>
                  <strong>Proveedores externos:</strong> Supabase (base de datos), Netlify
                  (hosting), Google Cloud (OCR de comprobantes)
                </li>
              </ul>
              <p className="mt-3 text-slate-700">
                <strong>Nunca vendemos tus datos a terceros.</strong>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                4. Tus Derechos (ARCO)
              </h2>
              <p className="text-slate-700">
                Como titular de tus datos, tienes derecho a:
              </p>
              <ul className="ml-6 mt-2 list-disc space-y-1 text-slate-700">
                <li><strong>Acceso:</strong> saber qué datos tuyos tenemos</li>
                <li><strong>Rectificación:</strong> corregir datos incorrectos</li>
                <li><strong>Cancelación:</strong> eliminar tus datos</li>
                <li><strong>Oposición:</strong> limitar el uso de tus datos</li>
              </ul>
              <p className="mt-3 text-slate-700">
                Para ejercer estos derechos escríbenos a{" "}
                <a
                  href="mailto:soportedropshipperu@gmail.com"
                  className="font-semibold text-rose-600 hover:underline"
                >
                  soportedropshipperu@gmail.com
                </a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-3 text-xl font-bold text-slate-900">5. Seguridad</h2>
              <p className="text-slate-700">
                Implementamos medidas técnicas y organizativas para proteger tus datos:
              </p>
              <ul className="ml-6 mt-2 list-disc space-y-1 text-slate-700">
                <li>Cifrado HTTPS/SSL en todas las conexiones</li>
                <li>Contraseñas cifradas con algoritmos seguros</li>
                <li>Acceso limitado solo a personal autorizado</li>
                <li>Backups automáticos y regulares</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                6. Retención de Datos
              </h2>
              <p className="text-slate-700">
                Conservamos tus datos mientras tu cuenta esté activa o mientras sea
                necesario para brindarte el servicio. Puedes solicitar su eliminación
                en cualquier momento.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                7. Menores de Edad
              </h2>
              <p className="text-slate-700">
                Nuestro servicio está dirigido a mayores de 18 años. No recolectamos
                intencionalmente datos de menores.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                8. Cambios a esta Política
              </h2>
              <p className="text-slate-700">
                Podemos actualizar esta política ocasionalmente. Notificaremos cambios
                importantes por email o dentro de la plataforma.
              </p>
            </section>

            <div className="mt-10 rounded-xl bg-blue-50 p-6 text-center">
              <p className="text-slate-700">
                ¿Preguntas sobre privacidad? Escríbenos a{" "}
                <a
                  href="mailto:soportedropshipperu@gmail.com"
                  className="font-semibold text-blue-600 hover:underline"
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