// src/pages/supplier/SupplierEarningsPage.tsx
// STUB - Se completa en FASE 3

export default function SupplierEarningsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          💰 Ganancias
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Historial de pagos recibidos
        </p>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-10 text-center">
        <div className="text-5xl">💸</div>
        <h3 className="mt-4 text-lg font-bold text-gray-900">
          Sin pagos aún
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Cuando confirmes tu primer pedido, te pagaremos por Yape
          inmediatamente. Todo el historial aparecerá aquí.
        </p>

        <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-left">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            💚 Cómo funcionan los pagos
          </p>
          <ul className="mt-2 space-y-1 text-xs text-emerald-900">
            <li>✓ Confirmas stock de un pedido</li>
            <li>✓ Te pagamos inmediatamente por Yape</li>
            <li>✓ Ves el pago aquí registrado</li>
            <li>✓ Cero riesgo, cero espera</li>
          </ul>
        </div>
      </div>
    </div>
  );
}