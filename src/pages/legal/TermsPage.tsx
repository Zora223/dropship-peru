// src/pages/legal/TermsPage.tsx
import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="bg-linear-to-br from-slate-50 to-white py-12 md:py-16">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-rose-100 p-3">
            <FileText className="h-8 w-8 text-rose-600" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-slate-900 md:text-4xl">
            Términos y Condiciones
          </h1>
          <p className="text-slate-500">Última actualización: Enero 2026</p>
        </div>

        <div className="prose prose-slate max-w-none rounded-2xl bg-white p-6 shadow-sm md:p-10">
          <section className="mb-8">
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              1. Aceptación de los Términos
            </h2>
            <p className="text-slate-700">
              Al acceder y usar <strong>Dropship Perú</strong> (dropshipperu.com),
              aceptas cumplir estos Términos y Condiciones. Si no estás de acuerdo con
              alguno de ellos, por favor no uses nuestro servicio.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              2. Descripción del Servicio
            </h2>
            <p className="text-slate-700">
              Dropship Perú es un marketplace peruano <strong>nacido en Iquitos 🌴</strong> que
              conecta:
            </p>
            <ul className="ml-6 mt-2 list-disc space-y-1 text-slate-700">
              <li><strong>Proveedores mayoristas</strong> con stock de productos</li>
              <li><strong>Vendedores (Vendors)</strong> que crean sus propias tiendas online</li>
              <li><strong>Clientes finales</strong> que compran productos</li>
              <li><strong>Deliveries</strong> que entregan los pedidos</li>
            </ul>
            <p className="mt-2 text-slate-700">
              Actuamos como intermediarios facilitando transacciones, logística y pagos
              con cobertura principal en <strong>Iquitos (Loreto)</strong> y expansión
              activa en <strong>Lima Metropolitana</strong>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              3. Cuentas de Usuario
            </h2>
            <p className="text-slate-700">
              Para usar ciertas funciones debes crear una cuenta. Eres responsable de:
            </p>
            <ul className="ml-6 mt-2 list-disc space-y-1 text-slate-700">
              <li>Proporcionar información veraz y actualizada</li>
              <li>Mantener la confidencialidad de tu contraseña</li>
              <li>Todas las actividades realizadas desde tu cuenta</li>
              <li>Notificarnos inmediatamente cualquier uso no autorizado</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              4. Comisiones y Pagos
            </h2>
            <ul className="ml-6 list-disc space-y-2 text-slate-700">
              <li>
                <strong>Comisión Dropship:</strong> 3% sobre el precio de venta al público.
              </li>
              <li>
                <strong>Costo de delivery:</strong> S/ 7 por pedido dentro de Iquitos
                y Lima Metropolitana (incluido en el precio final visible al cliente).
                Otras ciudades a cotizar.
              </li>
              <li>
                <strong>Liquidaciones a Vendors y Proveedores:</strong> Se realizan por
                Yape/Plin o transferencia bancaria según acuerdo.
              </li>
              <li>
                <strong>Descuentos gamificados:</strong> Los clientes obtienen descuentos
                automáticos según cantidad de items (SMART 2.5%, PRO 3.5%, EXPERT 4%,
                LEGEND 5% — tope S/ 70).
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              5. Responsabilidades
            </h2>

            <h3 className="mb-2 mt-4 text-lg font-semibold text-slate-800">
              Proveedores:
            </h3>
            <ul className="ml-6 list-disc space-y-1 text-slate-700">
              <li>Garantizar la calidad y stock real de los productos</li>
              <li>Preparar pedidos en máximo 24 horas</li>
              <li>Entregar productos según descripción publicada</li>
            </ul>

            <h3 className="mb-2 mt-4 text-lg font-semibold text-slate-800">
              Vendors:
            </h3>
            <ul className="ml-6 list-disc space-y-1 text-slate-700">
              <li>Atender consultas de clientes en tiempo razonable</li>
              <li>Manejar reclamos y devoluciones según política</li>
              <li>Publicar precios con margen mínimo del 20%</li>
            </ul>

            <h3 className="mb-2 mt-4 text-lg font-semibold text-slate-800">
              Clientes:
            </h3>
            <ul className="ml-6 list-disc space-y-1 text-slate-700">
              <li>Realizar pagos según método acordado</li>
              <li>Estar disponibles para recibir el pedido</li>
              <li>Reportar problemas en máximo 48 horas post-entrega</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              6. Cambios y Devoluciones
            </h2>
            <p className="text-slate-700">
              Los cambios y devoluciones se manejan directamente entre el cliente y el
              vendor/proveedor. Dropship Perú actúa como mediador en caso de disputa.
              Plazo máximo para reportar problemas: <strong>48 horas</strong> desde la
              entrega.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              7. Propiedad Intelectual
            </h2>
            <p className="text-slate-700">
              El nombre, logo, diseño y contenido de Dropship Perú son propiedad
              exclusiva. Los vendors son responsables de contar con los derechos sobre
              las imágenes y descripciones de sus productos.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              8. Limitación de Responsabilidad
            </h2>
            <p className="text-slate-700">
              Dropship Perú no se hace responsable por:
            </p>
            <ul className="ml-6 mt-2 list-disc space-y-1 text-slate-700">
              <li>Calidad, garantía o defectos de productos vendidos por terceros</li>
              <li>Retrasos causados por proveedores externos o servicios de mensajería</li>
              <li>Uso indebido de la plataforma por parte de los usuarios</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              9. Modificaciones
            </h2>
            <p className="text-slate-700">
              Nos reservamos el derecho de modificar estos términos en cualquier momento.
              Los cambios entran en vigencia al publicarse. El uso continuo del servicio
              implica aceptación de los cambios.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-bold text-slate-900">
              10. Ley Aplicable
            </h2>
            <p className="text-slate-700">
              Estos términos se rigen por las leyes de la República del Perú. Cualquier
              disputa será resuelta en los tribunales de <strong>Iquitos, Loreto — Perú</strong>.
            </p>
          </section>

          <div className="mt-10 rounded-xl bg-rose-50 p-6 text-center">
            <p className="text-slate-700">
              ¿Tienes dudas? Escríbenos a{" "}
              <a
                href="mailto:soportedropshipperu@gmail.com"
                className="font-semibold text-rose-600 hover:underline"
              >
                soportedropshipperu@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}