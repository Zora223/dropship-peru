// src/components/PublicFooter.tsx
import { Link } from "react-router-dom";
import {
  MessageCircle,
  Mail,
  MapPin,
  Heart,
  ExternalLink,
} from "lucide-react";

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();
  const whatsappNumber = "51930415718";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    "Hola! Me interesa conocer más sobre Dropship Perú"
  )}`;

  return (
    <footer className="bg-linear-to-br from-slate-900 via-slate-900 to-slate-800 text-slate-300">
      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* Grid principal */}
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          
          {/* Columna 1: Brand */}
          <div className="lg:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">🇵🇪</span>
              <h3 className="text-xl font-bold text-white">Dropship Perú</h3>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-slate-400">
              El marketplace peruano hecho para emprendedores. Vende sin stock, 
              cobra por Yape y crece con nosotros. 🚀
            </p>
            
            {/* Redes sociales */}
            <div className="flex gap-3">
              {/* Instagram */}
              <a
                href="#"
                aria-label="Instagram"
                className="rounded-full bg-slate-800 p-2.5 text-slate-400 transition hover:bg-pink-500 hover:text-white"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>

              {/* Facebook */}
              <a
                href="#"
                aria-label="Facebook"
                className="rounded-full bg-slate-800 p-2.5 text-slate-400 transition hover:bg-blue-600 hover:text-white"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>

              {/* TikTok */}
              <a
                href="#"
                aria-label="TikTok"
                className="rounded-full bg-slate-800 p-2.5 text-slate-400 transition hover:bg-black hover:text-white"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.84-.1z" />
                </svg>
              </a>

              {/* WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="rounded-full bg-slate-800 p-2.5 text-slate-400 transition hover:bg-green-500 hover:text-white"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Columna 2: Contacto */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
              📞 Contacto
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2 text-slate-400 transition hover:text-emerald-400"
                >
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <div>
                    <div className="text-xs text-slate-500 group-hover:text-slate-400">
                      WhatsApp
                    </div>
                    <div className="font-medium">+51 930 415 718</div>
                  </div>
                </a>
              </li>
              <li>
                <a
                  href="mailto:soportedropshipperu@gmail.com"
                  className="group flex items-start gap-2 text-slate-400 transition hover:text-rose-400"
                >
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  <div>
                    <div className="text-xs text-slate-500 group-hover:text-slate-400">
                      Email
                    </div>
                    <div className="break-all font-medium">
                      soportedropshipperu@gmail.com
                    </div>
                  </div>
                </a>
              </li>
              <li className="flex items-start gap-2 text-slate-400">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <div className="text-xs text-slate-500">Ubicación</div>
                  <div className="font-medium">Lima, Perú 🇵🇪</div>
                </div>
              </li>
            </ul>
          </div>

          {/* Columna 3: Empresa */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
              🏢 Empresa
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  to="/nosotros"
                  className="text-slate-400 transition hover:text-white"
                >
                  Sobre Nosotros
                </Link>
              </li>
              <li>
                <Link
                  to="/registro-proveedor"
                  className="text-slate-400 transition hover:text-white"
                >
                  Ser Proveedor
                </Link>
              </li>
              <li>
                <Link
                  to="/crear-tienda"
                  className="text-slate-400 transition hover:text-white"
                >
                  Crear mi Tienda
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="text-slate-400 transition hover:text-white"
                >
                  Registrarme
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 4: Legal */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
              📄 Legal
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  to="/terminos"
                  className="text-slate-400 transition hover:text-white"
                >
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link
                  to="/privacidad"
                  className="text-slate-400 transition hover:text-white"
                >
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link
                  to="/cookies"
                  className="text-slate-400 transition hover:text-white"
                >
                  Política de Cookies
                </Link>
              </li>
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-slate-400 transition hover:text-white"
                >
                  Soporte <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="my-8 h-px bg-linear-to-r from-transparent via-slate-700 to-transparent" />

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-slate-500 md:flex-row">
          <p>
            © {currentYear} <span className="font-semibold text-white">Dropship Perú</span>.
            Todos los derechos reservados.
          </p>
          <p className="flex items-center gap-1.5">
            Hecho con <Heart className="h-4 w-4 fill-rose-500 text-rose-500" /> en Lima, Perú 🇵🇪
          </p>
        </div>
      </div>
    </footer>
  );
}