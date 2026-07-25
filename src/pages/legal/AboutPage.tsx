// src/pages/legal/AboutPage.tsx
import MainLayout from "../../layouts/MainLayout";
import { Link } from "react-router-dom";
import { Rocket, Target, Heart, Users, TrendingUp, Zap } from "lucide-react";

export default function AboutPage() {
  return (
    <MainLayout>
      <div className="bg-linear-to-br from-slate-50 to-white">
        {/* Hero */}
        <div className="bg-linear-to-br from-rose-500 via-pink-500 to-orange-500 py-16 text-white md:py-24">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-white/20 p-3 backdrop-blur-sm">
              <Rocket className="h-10 w-10 text-white" />
            </div>
            <h1 className="mb-4 text-4xl font-bold md:text-5xl">
              Sobre Dropship Perú 🇵🇪
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-white/90 md:text-xl">
              El marketplace peruano que empodera a emprendedores para vender online
              <strong> sin stock</strong>, <strong>sin capital inicial</strong> y
              <strong> con delivery incluido</strong>.
            </p>
          </div>
        </div>

        <div className="container mx-auto max-w-5xl px-4 py-12 md:py-16">
          {/* Misión y Visión */}
          <div className="mb-16 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <div className="mb-4 inline-flex rounded-full bg-rose-100 p-3">
                <Target className="h-6 w-6 text-rose-600" />
              </div>
              <h2 className="mb-3 text-2xl font-bold text-slate-900">
                Nuestra Misión
              </h2>
              <p className="text-slate-700">
                Democratizar el emprendimiento en Perú brindando herramientas simples y
                accesibles para que cualquier persona pueda tener su propia tienda
                online <strong>sin necesidad de inversión inicial</strong>.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <div className="mb-4 inline-flex rounded-full bg-purple-100 p-3">
                <Heart className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="mb-3 text-2xl font-bold text-slate-900">
                Nuestra Visión
              </h2>
              <p className="text-slate-700">
                Ser el marketplace #1 de Perú para emprendedores digitales, conectando
                a <strong>10,000+ vendors</strong> con clientes de todo el país al 2028.
              </p>
            </div>
          </div>

          {/* Valores */}
          <div className="mb-16">
            <h2 className="mb-8 text-center text-3xl font-bold text-slate-900">
              🌟 Lo que nos mueve
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl bg-linear-to-br from-rose-50 to-pink-50 p-6">
                <Users className="mb-3 h-8 w-8 text-rose-600" />
                <h3 className="mb-2 text-lg font-bold text-slate-900">
                  Comunidad Primero
                </h3>
                <p className="text-sm text-slate-700">
                  Cada vendor, proveedor y cliente es parte de nuestra familia.
                  Crecemos juntos.
                </p>
              </div>

              <div className="rounded-xl bg-linear-to-br from-purple-50 to-indigo-50 p-6">
                <Zap className="mb-3 h-8 w-8 text-purple-600" />
                <h3 className="mb-2 text-lg font-bold text-slate-900">
                  Innovación Constante
                </h3>
                <p className="text-sm text-slate-700">
                  Tecnología de punta con IA, OCR de pagos y WhatsApp automatizado
                  para que vendas más fácil.
                </p>
              </div>

              <div className="rounded-xl bg-linear-to-br from-emerald-50 to-teal-50 p-6">
                <TrendingUp className="mb-3 h-8 w-8 text-emerald-600" />
                <h3 className="mb-2 text-lg font-bold text-slate-900">
                  Éxito Compartido
                </h3>
                <p className="text-sm text-slate-700">
                  Solo ganamos si tú ganas. Comisiones justas del 3% y liquidaciones
                  transparentes.
                </p>
              </div>
            </div>
          </div>

          {/* Cómo funciona */}
          <div className="mb-16 rounded-2xl bg-white p-8 shadow-sm md:p-12">
            <h2 className="mb-6 text-center text-3xl font-bold text-slate-900">
              🚀 ¿Cómo funciona?
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500 text-lg font-bold text-white">
                  1
                </div>
                <h3 className="mb-2 font-bold text-slate-900">Crea tu tienda</h3>
                <p className="text-sm text-slate-600">
                  Regístrate en 2 minutos. Sin costo inicial ni permanencia.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500 text-lg font-bold text-white">
                  2
                </div>
                <h3 className="mb-2 font-bold text-slate-900">Elige productos</h3>
                <p className="text-sm text-slate-600">
                  Del catálogo mayorista o sube los tuyos propios.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-white">
                  3
                </div>
                <h3 className="mb-2 font-bold text-slate-900">Cobra por Yape</h3>
                <p className="text-sm text-slate-600">
                  Nosotros gestionamos delivery y logística. Tú te enfocas en vender.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-2xl bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-center text-white md:p-12">
            <h2 className="mb-3 text-3xl font-bold">¿Listo para emprender?</h2>
            <p className="mb-6 text-slate-300">
              Únete a la comunidad de emprendedores más grande de Perú.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/crear-tienda"
                className="rounded-full bg-rose-500 px-8 py-3 font-semibold text-white transition hover:bg-rose-600"
              >
                Crear mi tienda ahora
              </Link>
              <Link
                to="/registro-proveedor"
                className="rounded-full border-2 border-white/30 px-8 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Soy proveedor
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}