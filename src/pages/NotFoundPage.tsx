import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center text-center">
      <div className="text-8xl font-extrabold tracking-tighter text-gray-200">404</div>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Página no encontrada</h1>
      <p className="mt-2 max-w-md text-gray-500">
        Lo sentimos, no pudimos encontrar lo que buscas. Tal vez quieras volver al inicio.
      </p>
      <Link
        to="/"
        className="mt-8 rounded-full bg-gray-900 px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-gray-800"
      >
        Volver al inicio
      </Link>
    </div>
  );
}