import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getBotStatus,
  sendWhatsappMessage,
  checkWhatsappNumber,
  reconnectBot,
  resetBotAuth,
  formatUptime,
  type BotStatus,
} from '../../lib/whatsapp-bot';
import { useToast } from '../../contexts/ToastContext';

const BOT_URL = import.meta.env.VITE_WHATSAPP_BOT_URL as string;
const REFRESH_INTERVAL = 3000;

function StatusBadge({ status }: { status: BotStatus['status'] }) {
  const config = {
    connected: {
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'Conectado',
    },
    qr_ready: {
      color: 'bg-amber-100 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
      label: 'Esperando QR',
    },
    connecting: {
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      dot: 'bg-blue-500',
      label: 'Conectando...',
    },
    disconnected: {
      color: 'bg-rose-100 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
      label: 'Desconectado',
    },
  }[status];

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
      <span className={`w-2 h-2 rounded-full animate-pulse ${config.dot}`} />
      {config.label}
    </span>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-1">
      <span className="text-2xl">{icon}</span>
      <span className="text-xl font-bold text-gray-900">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

export default function AdminWhatsappPage() {
  const toast = useToast();

  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [reconnecting, setReconnecting] = useState(false);
  const [resettingAuth, setResettingAuth] = useState(false);

  const [testPhone, setTestPhone] = useState('51');
  const [testMessage, setTestMessage] = useState('🚀 Mensaje de prueba desde Dropship Perú');
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const [checkPhone, setCheckPhone] = useState('51');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ exists: boolean; phone: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    const status = await getBotStatus();
    setBotStatus(status);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchStatus, REFRESH_INTERVAL);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchStatus]);

  const handleReconnect = async () => {
    setReconnecting(true);
    const result = await reconnectBot();
    if (result.success) {
      toast.success('Reconexión iniciada', result.message);
    } else {
      toast.error('Error al reconectar', result.message);
    }
    setReconnecting(false);
    setTimeout(fetchStatus, 2000);
  };

  const handleResetAuth = async () => {
    const confirmed = confirm(
      '⚠️ ¿Resetear la autenticación del bot?\n\n' +
      'Esto borrará la sesión actual del bot y tendrás que escanear ' +
      'el QR de nuevo con WhatsApp.\n\n' +
      'Úsalo SOLO si el bot está atascado con código 401 o no puede reconectar.'
    );
    if (!confirmed) return;

    setResettingAuth(true);
    const result = await resetBotAuth();

    if (result.success) {
      toast.success('🔥 Auth reseteada', result.message);
      let attempts = 0;
      const interval = setInterval(() => {
        fetchStatus();
        attempts++;
        if (attempts >= 10) clearInterval(interval);
      }, 3000);
    } else {
      toast.error('Error al resetear', result.error ?? 'No se pudo resetear');
    }

    setResettingAuth(false);
  };

  const handleSendTest = async () => {
    if (!testPhone || testPhone.length < 10) {
      toast.warning('Número inválido', 'Ingresa el número con código de país (ej: 51916146396)');
      return;
    }
    if (!testMessage.trim()) {
      toast.warning('Mensaje vacío', 'Escribe un mensaje para enviar');
      return;
    }

    setSending(true);
    setTestResult(null);

    const result = await sendWhatsappMessage(testPhone, testMessage);

    if (result.success) {
      setTestResult('✅ Mensaje enviado correctamente');
      toast.success('¡Enviado!', `Mensaje enviado a ${testPhone}`);
    } else {
      setTestResult(`❌ Error: ${result.error}`);
      toast.error('Error al enviar', result.error ?? 'Error desconocido');
    }

    setSending(false);
  };

  const handleCheckNumber = async () => {
    if (!checkPhone || checkPhone.length < 10) {
      toast.warning('Número inválido', 'Ingresa el número con código de país');
      return;
    }

    setChecking(true);
    setCheckResult(null);

    const result = await checkWhatsappNumber(checkPhone);

    if (result.error) {
      toast.error('Error', result.error);
    } else {
      setCheckResult({ exists: result.exists, phone: result.phone });
    }

    setChecking(false);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(BOT_URL);
    toast.success('¡Copiado!', 'URL del bot copiada al portapapeles');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🤖 Panel WhatsApp Bot</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión del bot de WhatsApp en producción (Railway)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {lastRefresh ? `Actualizado: ${lastRefresh.toLocaleTimeString('es-PE')}` : 'Cargando...'}
          </span>
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoRefresh ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                autoRefresh ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-gray-600">Auto-refresh</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-900">Estado del Bot</h2>
              {loading ? (
                <span className="text-sm text-gray-400 animate-pulse">Verificando...</span>
              ) : (
                botStatus && <StatusBadge status={botStatus.status} />
              )}
            </div>

            {botStatus && !loading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <MiniStat icon="⏱️" label="Uptime" value={formatUptime(botStatus.uptime_seconds)} />
                <MiniStat icon="📨" label="Mensajes hoy" value={String(botStatus.messages_sent_today)} />
                <MiniStat icon="📱" label="Teléfono" value={botStatus.phone ?? '—'} />
              </div>
            )}

            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2">
              <span className="text-xs text-gray-400 shrink-0">URL:</span>
              <span className="text-xs text-gray-700 font-mono truncate flex-1">{BOT_URL}</span>
              <button
                onClick={handleCopyUrl}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium shrink-0"
              >
                Copiar
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
            >
              🔄 Refrescar
            </button>

            <button
              onClick={handleReconnect}
              disabled={reconnecting || resettingAuth}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors disabled:opacity-50"
            >
              {reconnecting ? '⏳ Reconectando...' : '🔌 Reconectar'}
            </button>

            <button
              onClick={handleResetAuth}
              disabled={resettingAuth || reconnecting}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-colors disabled:opacity-50 font-semibold"
              title="Borra la sesión y fuerza QR nuevo"
            >
              {resettingAuth ? '⏳ Reseteando...' : '🔥 Reset Auth'}
            </button>

            <a
              href={`${BOT_URL}/status`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors text-center"
            >
              🌐 Ver API
            </a>
          </div>
        </div>
      </div>

      {botStatus && !botStatus.connected && !botStatus.hasQr && !loading && (
        <div className="bg-rose-50 border-l-4 border-rose-500 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚨</span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-rose-900">Bot atascado — Sesión expulsada</h3>
              <p className="mt-1 text-sm text-rose-700">
                El bot no puede generar QR porque tiene credenciales inválidas (código 401).
                Usa el botón <b>"🔥 Reset Auth"</b> arriba para borrar la sesión y generar un QR nuevo.
              </p>
              <p className="mt-2 text-xs text-rose-600">
                Después del reset, el QR aparecerá en 5-10 segundos.
              </p>
            </div>
          </div>
        </div>
      )}

      {botStatus && !botStatus.connected && (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📱</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Escanear QR</h2>
              <p className="text-sm text-gray-500">
                El bot está desconectado. Escanea el QR con WhatsApp para reconectar.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-sm text-amber-700 font-medium">⚠️ Pasos para reconectar:</p>
            <ol className="text-sm text-amber-600 mt-1 list-decimal list-inside space-y-1">
              <li>Si el QR no aparece, usa "🔥 Reset Auth" (botón rojo arriba)</li>
              <li>Abre WhatsApp en tu teléfono</li>
              <li>Ve a Dispositivos Vinculados → Vincular dispositivo</li>
              <li>Escanea el QR de abajo</li>
            </ol>
          </div>

          <div className="flex justify-center">
            <iframe
              src={`${BOT_URL}/qr`}
              title="WhatsApp QR Code"
              className="w-80 h-96 rounded-xl border border-gray-200"
              style={{ background: 'white' }}
            />
          </div>

          <p className="text-center text-xs text-gray-400 mt-3">
            El QR se actualiza automáticamente cada 30 segundos. Si expiró, usa "🔥 Reset Auth".
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🧪 Test Rápido — Enviar Mensaje</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de destino (con código de país)
            </label>
            <input
              type="text"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="51916146396"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <p className="text-xs text-gray-400 mt-1">
              Peru = 51 + número sin el 0 inicial. Ej: 51916146396
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              placeholder="Escribe tu mensaje de prueba..."
            />
          </div>

          {testResult && (
            <div
              className={`text-sm px-4 py-3 rounded-xl ${
                testResult.startsWith('✅')
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {testResult}
            </div>
          )}

          <button
            onClick={handleSendTest}
            disabled={sending || !botStatus?.connected}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <span className="animate-spin">⏳</span>
                Enviando...
              </>
            ) : (
              <>📤 Enviar Mensaje de Prueba</>
            )}
          </button>

          {!botStatus?.connected && (
            <p className="text-xs text-center text-rose-500">
              ⚠️ El bot debe estar conectado para enviar mensajes
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🔍 Verificar Número WhatsApp</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número a verificar</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={checkPhone}
                onChange={(e) => setCheckPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="51916146396"
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                onClick={handleCheckNumber}
                disabled={checking || !botStatus?.connected}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {checking ? '⏳' : '✅ Verificar'}
              </button>
            </div>
          </div>

          {checkResult && (
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                checkResult.exists
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-rose-50 border-rose-200'
              }`}
            >
              <span className="text-2xl">{checkResult.exists ? '✅' : '❌'}</span>
              <div>
                <p
                  className={`text-sm font-semibold ${
                    checkResult.exists ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {checkResult.exists
                    ? 'Número registrado en WhatsApp'
                    : 'Número NO tiene WhatsApp'}
                </p>
                <p className="text-xs text-gray-500">{checkResult.phone}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Info Técnica</h2>

        <div className="space-y-2 text-sm">
          {[
            { label: 'Stack', value: 'Node.js + Baileys + Express' },
            { label: 'Deploy', value: 'Railway (auto-deploy GitHub)' },
            { label: 'Endpoints', value: 'GET /status, GET /qr, POST /send, POST /check, POST /reconnect, POST /reset-auth' },
            { label: 'Límite mensajes', value: 'Máx 30/día (primeras 2 semanas)' },
            { label: 'Delay entre envíos', value: '2 segundos mínimo' },
          ].map(({ label, value }) => (
            <div key={label} className="flex gap-2 py-2 border-b border-gray-50 last:border-0">
              <span className="text-gray-500 shrink-0 w-36">{label}:</span>
              <span className="text-gray-900 font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}