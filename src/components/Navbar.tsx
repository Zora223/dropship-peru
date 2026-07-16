import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function getDashboardPath(role: string) {
  if (role === "admin") return "/admin";
  if (role === "vendor") return "/vendor";
  return "/customer";
}

function getDashboardLabel(role: string) {
  if (role === "admin") return "Panel admin";
  if (role === "vendor") return "Mi tienda";
  return "Mi cuenta";
}

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  // ¿Debe mostrarse el botón "Crear mi tienda"?
  // - Si no hay usuario: sí (invita a registrarse)
  // - Si es customer: sí (invita a convertirse en vendor)
  // - Si es vendor o admin: no
  const showCreateStore = !user || user.role === "customer";

  // ¿A dónde apunta el botón "Crear mi tienda"?
  const createStoreLink = user ? "/crear-tienda" : "/register";

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-xl font-bold tracking-tight text-gray-900">
          Dropship <span className="text-rose-500">Perú</span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Botón "Crear mi tienda" solo para customers logueados */}
              {showCreateStore && (
                <Link
                  to={createStoreLink}
                  className="hidden rounded-full bg-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-rose-600 sm:inline-block"
                >
                  Crear mi tienda
                </Link>
              )}

              <Link
                to={getDashboardPath(user.role)}
                className="rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-gray-800"
              >
                {getDashboardLabel(user.role)}
              </Link>

              <span className="hidden max-w-48 truncate text-sm font-medium text-gray-600 md:inline">
                {user.full_name ?? user.email}
              </span>

              <button
                onClick={handleSignOut}
                className="rounded-full border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Entrar
              </Link>

              <Link
                to="/register"
                className="rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white shadow-md transition hover:bg-gray-800"
              >
                Crear mi tienda
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}