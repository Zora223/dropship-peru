// src/pages/admin/AdminWhatsappLogsPage.tsx
// Panel de admin: logs de mensajes WhatsApp con filtros y reintento

import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import {
  getWhatsappLogs,
  getWhatsappLogsSummary,
  retryWhatsappLog,
  getStatusLabel,
  getStatusColor,
  getRecipientLabel,
  getRecipientColor,
  getEventLabel,
  timeAgo,
  formatDateTime,
  type WhatsappLog,
  type WhatsappLogsFilters,
  type WhatsappLogsSummary,
  type WhatsappLogStatus,
  type WhatsappRecipient,
} from "../../lib/whatsapp-logs";

// ============================================
// 🎯 COMPONENTE PRINCIPAL
// ============================================

export default function AdminWhatsappLogsPage() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<WhatsappLog[]>([]);
  const [summary, setSummary] = useState<WhatsappLogsSummary>({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    today: 0,
  });
  const [selectedLog, setSelectedLog] = useState<WhatsappLog | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Filtros
  const [filterStatus, setFilterStatus] = useState<WhatsappLogStatus | "">("");
  const [filterRecipient, setFilterRecipient] = useState<WhatsappRecipient | "">("");
  const [filterEvent, setFilterEvent] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterRecipient, filterEvent, search]);

  async function loadAll() {
    try {
      setLoading(true);
      const filters: WhatsappLogsFilters = {
        status:         filterStatus || null,
        recipient_type: filterRecipient || null,
        event_key:      filterEvent || null,
        search:         search || null,
        limit:          200,
      };
      const [logsData, summaryData] = await Promise.all([
        getWhatsappLogs(filters),
        getWhatsappLogsSummary(),
      ]);
      setLogs(logsData);
      setSummary(summaryData);
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry(log: WhatsappLog) {
    if (!confirm(`¿Reintentar envío al ${log.recipient_phone}?`)) return;
    try {
      setRetryingId(log.id);
      const result = await retryWhatsappLog(log.id);
      if (result.success) {
        toast.success("✅ Reenviado", "Mensaje enviado correctamente");
        await loadAll();
      } else {
        toast.error("Error al reintentar", result.error ?? "Falló el reenvío");
      }
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setRetryingId(null);
    }
  }

  // Lista única de event_keys para el filtro
  const uniqueEvents = useMemo(() => {
    const set = new Set(logs.map((l) => l.event_key));
    return Array.from(set).sort();
  }, [logs]);

  const hasActiveFilters =
    !!filterStatus || !!filterRecipient || !!filterEvent || !!search;

  function clearFilters() {
    setFilterStatus("");
    setFilterRecipient("");
    setFilterEvent("");
    setSearch("");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          📋 Logs de WhatsApp
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Historial de mensajes automáticos enviados por el sistema
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total" value={summary.total} color="gray" />
        <StatCard label="Hoy" value={summary.today} color="blue" />
        <StatCard label="✅ Enviados" value={summary.sent} color="emerald" />
        <StatCard label="❌ Fallidos" value={summary.failed} color="rose" />
        <StatCard label="⏳ Pendientes" value={summary.pending} color="amber" />
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Búsqueda */}
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              🔍 Buscar
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Teléfono, nombre o evento..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          {/* Estado */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Estado
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as WhatsappLogStatus | "")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              <option value="">Todos</option>
              <option value="sent">✅ Enviados</option>
              <option value="failed">❌ Fallidos</option>
              <option value="pending">⏳ Pendientes</option>
            </select>
          </div>

          {/* Destinatario */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Destinatario
            </label>
            <select
              value={filterRecipient}
              onChange={(e) => setFilterRecipient(e.target.value as WhatsappRecipient | "")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              <option value="">Todos</option>
              <option value="customer">👤 Cliente</option>
              <option value="vendor">🏪 Vendedor</option>
              <option value="delivery">🛵 Delivery</option>
            </select>
          </div>

          {/* Evento */}
          <div className="lg:col-span-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Tipo de evento
            </label>
            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              <option value="">Todos los eventos</option>
              {uniqueEvents.map((ev) => (
                <option key={ev} value={ev}>
                  {getEventLabel(ev)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-xs text-gray-500">
              Mostrando {logs.length} resultado{logs.length === 1 ? "" : "s"}
            </span>
            <button
              onClick={clearFilters}
              className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
            >
              ✕ Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Lista de logs */}
      {loading ? (
        <div className="flex min-h-60 items-center justify-center rounded-2xl border border-gray-200 bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-500" />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-10 text-center">
          <div className="text-5xl">📭</div>
          <h3 className="mt-3 text-lg font-bold text-gray-900">
            No hay logs para mostrar
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {hasActiveFilters
              ? "Prueba ajustando los filtros"
              : "Aún no se han enviado mensajes"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Desktop: tabla */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <Th>Estado</Th>
                  <Th>Evento</Th>
                  <Th>Destinatario</Th>
                  <Th>Teléfono</Th>
                  <Th>Enviado</Th>
                  <Th className="text-right">Acciones</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${getStatusColor(
                          log.status
                        )}`}
                      >
                        {getStatusLabel(log.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900">
                        {getEventLabel(log.event_key)}
                      </div>
                      <div className="text-xs text-gray-500">{log.event_key}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${getRecipientColor(
                          log.recipient_type
                        )}`}
                      >
                        {getRecipientLabel(log.recipient_type)}
                      </span>
                      {log.recipient_name && (
                        <div className="mt-1 text-xs text-gray-600">
                          {log.recipient_name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-gray-700">
                        {log.recipient_phone}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700">
                        {timeAgo(log.created_at)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateTime(log.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                        >
                          👁️ Ver
                        </button>
                        {log.status === "failed" && (
                          <button
                            onClick={() => handleRetry(log)}
                            disabled={retryingId === log.id}
                            className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                          >
                            {retryingId === log.id ? "..." : "🔁 Reintentar"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil: cards */}
          <div className="divide-y divide-gray-100 lg:hidden">
            {logs.map((log) => (
              <div key={log.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${getStatusColor(
                      log.status
                    )}`}
                  >
                    {getStatusLabel(log.status)}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${getRecipientColor(
                      log.recipient_type
                    )}`}
                  >
                    {getRecipientLabel(log.recipient_type)}
                  </span>
                </div>

                <h4 className="mt-2 text-sm font-bold text-gray-900">
                  {getEventLabel(log.event_key)}
                </h4>

                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  {log.recipient_name && <p>👤 {log.recipient_name}</p>}
                  <p className="font-mono">📞 {log.recipient_phone}</p>
                  <p>🕐 {timeAgo(log.created_at)}</p>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="flex-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                  >
                    👁️ Ver mensaje
                  </button>
                  {log.status === "failed" && (
                    <button
                      onClick={() => handleRetry(log)}
                      disabled={retryingId === log.id}
                      className="flex-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {retryingId === log.id ? "..." : "🔁 Reintentar"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL DE DETALLE */}
      {/* ============================================ */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Detalle del mensaje
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  {formatDateTime(selectedLog.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
              {/* Info general */}
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoBox label="Estado">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${getStatusColor(
                      selectedLog.status
                    )}`}
                  >
                    {getStatusLabel(selectedLog.status)}
                  </span>
                </InfoBox>

                <InfoBox label="Destinatario">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${getRecipientColor(
                      selectedLog.recipient_type
                    )}`}
                  >
                    {getRecipientLabel(selectedLog.recipient_type)}
                  </span>
                </InfoBox>

                <InfoBox label="Evento">
                  <p className="text-sm font-semibold text-gray-900">
                    {getEventLabel(selectedLog.event_key)}
                  </p>
                  <p className="text-xs text-gray-500">{selectedLog.event_key}</p>
                </InfoBox>

                <InfoBox label="Teléfono">
                  <p className="font-mono text-sm text-gray-900">
                    {selectedLog.recipient_phone}
                  </p>
                  {selectedLog.recipient_name && (
                    <p className="text-xs text-gray-600">
                      {selectedLog.recipient_name}
                    </p>
                  )}
                </InfoBox>
              </div>

              {/* Order ID */}
              {selectedLog.order_id && (
                <InfoBox label="Pedido ID">
                  <p className="font-mono text-xs text-gray-700">
                    {selectedLog.order_id}
                  </p>
                </InfoBox>
              )}

              {/* Error */}
              {selectedLog.error_message && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                    ❌ Error
                  </p>
                  <p className="mt-1 text-sm text-rose-900">
                    {selectedLog.error_message}
                  </p>
                </div>
              )}

              {/* Mensaje enviado */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  📱 Mensaje
                </p>
                <div className="rounded-xl bg-emerald-50 p-4">
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm text-gray-900">
                    {selectedLog.message_sent}
                  </pre>
                </div>
              </div>

              {/* Bot message ID */}
              {selectedLog.bot_message_id && (
                <InfoBox label="ID del bot">
                  <p className="font-mono text-xs text-gray-700">
                    {selectedLog.bot_message_id}
                  </p>
                </InfoBox>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-gray-100 p-5">
              {selectedLog.status === "failed" && (
                <button
                  onClick={() => {
                    handleRetry(selectedLog);
                    setSelectedLog(null);
                  }}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  🔁 Reintentar envío
                </button>
              )}
              <button
                onClick={() => setSelectedLog(null)}
                className="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// 🧩 SUB-COMPONENTES
// ============================================

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "gray" | "blue" | "emerald" | "rose" | "amber";
}) {
  const colors: Record<typeof color, string> = {
    gray:    "border-gray-200 bg-white",
    blue:    "border-blue-200 bg-blue-50",
    emerald: "border-emerald-200 bg-emerald-50",
    rose:    "border-rose-200 bg-rose-50",
    amber:   "border-amber-200 bg-amber-50",
  };

  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 ${className}`}
    >
      {children}
    </th>
  );
}

function InfoBox({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}