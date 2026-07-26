// src/components/Navbar.tsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function getDashboardPath(role: string) {
  if (role === "admin") return "/admin";
  if (role === "vendor") return "/vendor";
  if (role === "delivery") return "/delivery";
  if (role === "supplier") return "/supplier";
  return "/customer";
}

function getDashboardLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "vendor") return "Mi tienda";
  if (role === "delivery") return "Delivery";
  if (role === "supplier") return "Proveedor";
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

  const showCreateStore = !user || user.role === "customer";
  const createStoreLink = user ? "/crear-tienda" : "/register";

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 shrink-0">
          Dropship <span className="text-rose-500">Perú</span>
        </Link>

        {/* Acciones */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* "Crear tienda" — oculto en móvil muy pequeño */}
              {showCreateStore && (
                <Link
                  to={createStoreLink}
                  className="hidden sm:inline-block rounded-full bg-rose-500 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md transition hover:bg-rose-600"
                >
                  Crear mi tienda
                </Link>
              )}

              {/* Dashboard — siempre visible */}
              <Link
                to={getDashboardPath(user.role)}
                className="rounded-full bg-gray-900 px-3 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md transition hover:bg-gray-800"
              >
                {getDashboardLabel(user.role)}
              </Link>

              {/* Nombre — solo desktop */}
              <span className="hidden lg:inline max-w-40 truncate text-sm font-medium text-gray-600">
                {user.full_name ?? user.email}
              </span>

              {/* Salir */}
              <button
                onClick={handleSignOut}
                className="rounded-full border border-gray-200 px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Entrar
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-gray-900 px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium text-white shadow-md transition hover:bg-gray-800"
              >
                <span className="hidden sm:inline">Crear mi tienda</span>
                <span className="sm:hidden">Registrarse</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}