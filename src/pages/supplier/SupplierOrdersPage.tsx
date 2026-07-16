// src/pages/supplier/SupplierOrdersPage.tsx
// STUB - Se completa en FASE 3

export default function SupplierOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          📦 Pedidos
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Pedidos que necesitan tu atención
        </p>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-10 text-center">
        <div className="text-5xl">📬</div>
        <h3 className="mt-4 text-lg font-bold text-gray-900">
          Sin pedidos aún
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Cuando los vendors vendan tus productos, los pedidos aparecerán
          aquí. Te avisaremos por WhatsApp cuando llegue uno nuevo.
        </p>
      </div>
    </div>
  );
}