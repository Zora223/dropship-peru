import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero: Captación de vendedores */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-gray-900 via-gray-800 to-rose-900 text-white shadow-2xl">
        <div className="px-8 py-20 text-center md:px-16 md:py-28">
          <div className="mx-auto mb-6 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/80 backdrop-blur">
            Tiendas privadas por enlace
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
            Tu tienda online,
            <br />
            <span className="text-rose-400">en un solo link</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-300 md:text-xl">
            Crea tu catálogo, comparte tu link personalizado y recibe pedidos.
            Sin comisiones abusivas, sin competencia dentro de tu propia vitrina.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/register"
              className="rounded-full bg-rose-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-rose-600 hover:shadow-xl"
            >
              Crear mi tienda gratis
            </Link>

            <Link
              to="/login"
              className="rounded-full border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:border-white hover:bg-white/10"
            >
              Ya tengo una cuenta
            </Link>
          </div>

          <p className="mx-auto mt-6 max-w-lg text-xs leading-relaxed text-white/50">
            Los clientes acceden a cada tienda mediante el enlace directo que
            comparte el vendedor. No mostramos un directorio público de tiendas.
          </p>
        </div>
      </section>

      {/* Política de cartera protegida */}
      <section className="rounded-3xl bg-white p-8 shadow-sm md:p-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="text-sm font-bold uppercase tracking-wider text-rose-600">
              Cartera protegida
            </div>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-900 md:text-4xl">
              Tus clientes ven tu tienda, no un marketplace lleno de competencia.
            </h2>

            <p className="mt-4 text-gray-600">
              Dropship Perú está pensado para vendedores que quieren compartir
              su propio enlace y vender bajo su marca. El cliente puede comprar
              en la tienda cuyo link recibió, sin ser redirigido a vitrinas de
              otros vendedores.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="text-2xl">🔗</div>
              <h3 className="mt-2 font-bold text-gray-900">
                Acceso por link directo
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Cada tienda tiene su propio enlace para compartir en WhatsApp,
                Instagram, Facebook o campañas.
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="text-2xl">🛡️</div>
              <h3 className="mt-2 font-bold text-gray-900">
                Sin directorio público de tiendas
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                No mostramos una lista pública de tiendas para evitar que tus
                clientes terminen comparando con otros vendedores.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios para el vendedor */}
      <section className="grid gap-8 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-8 shadow-sm transition hover:shadow-md">
          <div className="mb-4 text-4xl">🔗</div>

          <h3 className="text-lg font-bold text-gray-900">Tu link propio</h3>

          <p className="mt-2 text-gray-600">
            Comparte tu tienda por redes sociales y recibe pedidos directamente
            desde tu catálogo.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm transition hover:shadow-md">
          <div className="mb-4 text-4xl">🛡️</div>

          <h3 className="text-lg font-bold text-gray-900">
            Tu cartera protegida
          </h3>

          <p className="mt-2 text-gray-600">
            Tus clientes ven tu catálogo, tus precios y tu marca. No los
            enviamos a explorar tiendas de otros vendedores.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm transition hover:shadow-md">
          <div className="mb-4 text-4xl">⚡</div>

          <h3 className="text-lg font-bold text-gray-900">
            Ventas sin fricción
          </h3>

          <p className="mt-2 text-gray-600">
            Recibe pedidos organizados, gestiona productos, configura pagos y
            personaliza tu tienda desde un solo panel.
          </p>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="rounded-3xl bg-white p-8 shadow-sm md:p-10">
        <div className="text-center">
          <h2 className="text-3xl font-black tracking-tight text-gray-900">
            ¿Cómo funciona?
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-gray-500">
            Un flujo simple para vender sin exponer a tus clientes a tiendas de
            terceros.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-gray-50 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-2xl">
              1
            </div>

            <h3 className="mt-4 font-bold text-gray-900">Crea tu tienda</h3>

            <p className="mt-2 text-sm text-gray-600">
              Configura nombre, logo, productos, colores y métodos de pago.
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
              2
            </div>

            <h3 className="mt-4 font-bold text-gray-900">Comparte tu enlace</h3>

            <p className="mt-2 text-sm text-gray-600">
              Envía tu link por WhatsApp, Instagram, Facebook o campañas.
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
              3
            </div>

            <h3 className="mt-4 font-bold text-gray-900">Recibe pedidos</h3>

            <p className="mt-2 text-sm text-gray-600">
              Gestiona pagos, estados, envíos y productos desde tu panel.
            </p>
          </div>
        </div>
      </section>

      {/* 🆕 SECCIÓN PROVEEDORES MAYORISTAS */}
      <section className="overflow-hidden rounded-3xl bg-linear-to-br from-amber-50 via-orange-50 to-amber-100 shadow-sm">
        <div className="grid gap-8 p-8 md:grid-cols-2 md:items-center md:gap-12 md:p-12">
          {/* Lado izquierdo: contenido */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700">
              <span>🏭</span>
              <span>Para proveedores mayoristas</span>
            </div>

            <h2 className="mt-4 text-3xl font-black tracking-tight text-gray-900 md:text-4xl">
              ¿Vendes al por mayor?
            </h2>

            <p className="mt-4 text-lg text-gray-700">
              Súbete a la plataforma. Nuestras tiendas venderán tus productos y
              tú recibes el pago <b>al instante por Yape</b> cuando confirmes cada
              pedido.
            </p>

            <ul className="mt-6 space-y-3">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                  ✓
                </span>
                <div>
                  <div className="font-semibold text-gray-900">
                    Cobros inmediatos por Yape
                  </div>
                  <div className="text-sm text-gray-600">
                    Al confirmar disponibilidad, te pagamos al toque
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                  ✓
                </span>
                <div>
                  <div className="font-semibold text-gray-900">
                    Cero riesgo, cero espera
                  </div>
                  <div className="text-sm text-gray-600">
                    No adelantas nada, no esperas al cliente
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                  ✓
                </span>
                <div>
                  <div className="font-semibold text-gray-900">
                    Panel súper simple
                  </div>
                  <div className="text-sm text-gray-600">
                    Recibes, confirmas, entregas al delivery. Listo.
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                  ✓
                </span>
                <div>
                  <div className="font-semibold text-gray-900">
                    Múltiples vendedores para tus productos
                  </div>
                  <div className="text-sm text-gray-600">
                    Amplía tu alcance sin invertir en publicidad
                  </div>
                </div>
              </li>
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/registro-proveedor"
                className="rounded-full bg-amber-500 px-8 py-3.5 text-center text-base font-semibold text-white shadow-lg transition hover:bg-amber-600 hover:shadow-xl"
              >
                🏭 Regístrate como proveedor
              </Link>
            </div>
          </div>

          {/* Lado derecho: mockup visual */}
          <div className="relative">
            <div className="rounded-3xl bg-white p-6 shadow-2xl">
              {/* Simulación de un dashboard proveedor */}
              <div className="mb-4">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Panel Proveedor
                </div>
                <div className="mt-1 text-lg font-bold text-gray-900">
                  Hola Kevin 👋
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="text-xl">🆕</div>
                  <div className="mt-1 text-lg font-bold text-gray-900">3</div>
                  <div className="text-[10px] font-semibold text-gray-600">
                    Por atender
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-xl">✅</div>
                  <div className="mt-1 text-lg font-bold text-gray-900">8</div>
                  <div className="text-[10px] font-semibold text-gray-600">
                    Confirmados
                  </div>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <div className="text-xl">💰</div>
                  <div className="mt-1 text-sm font-bold text-gray-900">
                    S/. 950
                  </div>
                  <div className="text-[10px] font-semibold text-gray-600">
                    Cobrado hoy
                  </div>
                </div>
              </div>

              {/* Mock pedido */}
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-gray-900">
                      🆕 Nuevo pedido
                    </div>
                    <div className="mt-0.5 text-[10px] text-gray-500">
                      Roberto (Trozo Moda)
                    </div>
                    <div className="mt-1 text-[10px] text-gray-600">
                      2x Zapatos Cat • S/. 160
                    </div>
                  </div>
                  <button className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white">
                    ✅ Tengo stock
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-2 text-[10px] text-emerald-800">
                <span>💚</span>
                <span className="font-semibold">
                  Al confirmar, te pagamos por Yape
                </span>
              </div>
            </div>

            {/* Decoración */}
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-400/30 blur-2xl" />
            <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-orange-400/30 blur-2xl" />
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="rounded-3xl bg-gray-900 px-8 py-16 text-center text-white">
        <h2 className="text-3xl font-bold md:text-4xl">
          Empieza a vender hoy
        </h2>

        <p className="mx-auto mt-4 max-w-lg text-gray-400">
          Crea una tienda privada por enlace y empieza a recibir pedidos sin
          mandar a tus clientes a vitrinas de la competencia.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/register"
            className="inline-block rounded-full bg-rose-500 px-10 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-rose-600 hover:shadow-xl"
          >
            Crear mi tienda ahora
          </Link>
          <Link
            to="/registro-proveedor"
            className="inline-block rounded-full border-2 border-amber-400/40 bg-amber-500/10 px-10 py-4 text-base font-semibold text-amber-300 backdrop-blur transition hover:border-amber-400 hover:bg-amber-500/20"
          >
            🏭 Soy proveedor
          </Link>
        </div>
      </section>
    </div>
  );
}