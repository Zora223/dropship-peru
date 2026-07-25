// src/pages/legal/AboutPage.tsx
import { Link } from "react-router-dom";
import { Rocket, Target, Heart, Users, TrendingUp, Zap, MapPin } from "lucide-react";

export default function AboutPage() {
  return (
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
            Nacimos en <strong>Iquitos 🌴</strong> para llevar el emprendimiento digital
            a toda la selva y el país, sin fronteras ni excusas.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-12 md:py-16">
        
        {/* 🆕 SECCIÓN NUESTRO ORIGEN */}
        <div className="mb-16 rounded-2xl bg-linear-to-br from-emerald-50 via-teal-50 to-cyan-50 p-8 md:p-12">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <MapPin className="h-3 w-3" />
                Orgullosamente iquiteños
              </div>
              <h2 className="mb-4 text-3xl font-bold text-slate-900">
                🌴 Desde Iquitos para el Perú
              </h2>
              <p className="mb-4 text-slate-700">
                Cansados de que <strong>todo se centralice en Lima</strong>, decidimos
                crear la primera plataforma de dropshipping <strong>hecha desde la
                Amazonía peruana</strong>.
              </p>
              <p className="text-slate-700">
                Sabemos que en Iquitos hay emprendedores con muchas ganas pero pocas
                herramientas. Por eso creamos Dropship Perú:
                <strong> primero para nuestra tierra</strong>, y ahora expandiéndonos
                a Lima Metropolitana y más ciudades del país.
              </p>
            </div>
            <div className="flex justify-center">
              <div className="text-center">
                <div className="text-8xl">🌴</div>
                <p className="mt-2 text-sm font-semibold text-emerald-800">
                  Iquitos, Loreto — Perú 🇵🇪
                </p>
              </div>
            </div>
          </div>
        </div>

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
              online <strong>sin necesidad de inversión inicial</strong>, sin importar
              dónde viva.
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
              Ser el marketplace #1 del interior del Perú, demostrando que la
              innovación no solo se hace en Lima. Meta al 2028:
              <strong> 10,000+ vendors</strong> en Iquitos, Lima y todo el país.
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
                Crecemos juntos, desde la selva hasta la costa.
              </p>
            </div>

            <div className="rounded-xl bg-linear-to-br from-purple-50 to-indigo-50 p-6">
              <Zap className="mb-3 h-8 w-8 text-purple-600" />
              <h3 className="mb-2 text-lg font-bold text-slate-900">
                Innovación Constante
              </h3>
              <p className="text-sm text-slate-700">
                Tecnología de punta con IA, OCR de pagos y WhatsApp automatizado
                para que vendas más fácil, estés donde estés.
              </p>
            </div>

            <div className="rounded-xl bg-linear-to-br from-emerald-50 to-teal-50 p-6">
              <TrendingUp className="mb-3 h-8 w-8 text-emerald-600" />
              <h3 className="mb-2 text-lg font-bold text-slate-900">
                Descentralización
              </h3>
              <p className="text-sm text-slate-700">
                Rompemos el mito de que el emprendimiento digital solo es de Lima.
                Hecho por y para el Perú entero.
              </p>
            </div>
          </div>
        </div>

        {/* Zonas de cobertura */}
        <div className="mb-16 rounded-2xl bg-white p-8 shadow-sm md:p-12">
          <h2 className="mb-6 text-center text-3xl font-bold text-slate-900">
            📍 Zonas de cobertura
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-3xl">🌴</span>
                <h3 className="text-xl font-bold text-slate-900">Iquitos</h3>
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">
                  PRINCIPAL
                </span>
              </div>
              <p className="text-sm text-slate-700">
                Nuestro mercado base. Delivery en toda la ciudad de Iquitos
                y distritos aledaños (Punchana, Belén, San Juan Bautista).
              </p>
            </div>

            <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-6">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-3xl">🏙️</span>
                <h3 className="text-xl font-bold text-slate-900">Lima Metropolitana</h3>
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                  EXPANSIÓN
                </span>
              </div>
              <p className="text-sm text-slate-700">
                Cobertura en toda Lima Metropolitana con delivery a domicilio
                en distritos principales.
              </p>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            🚀 Próximamente: Trujillo, Arequipa, Chiclayo, Piura y más ciudades
          </p>
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
            Únete a la comunidad de emprendedores del Perú profundo 🌴🇵🇪
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
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
  );
}