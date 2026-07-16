// src/pages/supplier/SupplierProductsPage.tsx
// STUB - Se completa en FASE 2

export default function SupplierProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          🛒 Mis productos
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Gestiona tu catálogo de productos al por mayor
        </p>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-10 text-center">
        <div className="text-5xl">🚧</div>
        <h3 className="mt-4 text-lg font-bold text-gray-900">
          Próximamente
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Estamos preparando el panel para que puedas subir tus productos.
          Muy pronto podrás gestionar tu catálogo completo desde aquí.
        </p>
      </div>
    </div>
  );
}