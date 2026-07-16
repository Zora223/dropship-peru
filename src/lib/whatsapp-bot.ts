// src/lib/whatsapp-bot.ts
// Funciones para comunicarse con el bot de WhatsApp en Railway

const BOT_URL = import.meta.env.VITE_WHATSAPP_BOT_URL as string;
const API_KEY = import.meta.env.VITE_WHATSAPP_BOT_API_KEY as string;

// Headers autenticados para endpoints protegidos
const authHeaders = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
};

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface BotStatus {
  status: 'connected' | 'disconnected' | 'connecting' | 'qr_ready';
  connected: boolean;
  qr_available: boolean;
  uptime_seconds: number;
  messages_sent_today: number;
  phone?: string;
  timestamp: string;
}

export interface SendMessageResult {
  success: boolean;
  message_id?: string;
  error?: string;
}

export interface CheckNumberResult {
  exists: boolean;
  phone: string;
  error?: string;
}

export interface ReconnectResult {
  success: boolean;
  message: string;
}

// ─── FUNCIONES ────────────────────────────────────────────────────────────────

/**
 * Obtiene el estado actual del bot
 * El bot devuelve: { connected, hasQr, uptime, attempts, phone?, messagesToday? }
 */
export async function getBotStatus(): Promise<BotStatus> {
  try {
    const res = await fetch(`${BOT_URL}/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // timeout 5s
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    // 🔧 Mapeo del formato real que devuelve el bot
    return {
      status: data.connected
        ? 'connected'
        : data.hasQr
          ? 'qr_ready'
          : 'disconnected',
      connected: data.connected ?? false,
      qr_available: data.hasQr ?? false,
      uptime_seconds: Math.floor(data.uptime ?? 0),
      messages_sent_today: data.messagesToday ?? 0,
      phone: data.phone,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    // Bot inaccesible
    return {
      status: 'disconnected',
      connected: false,
      qr_available: false,
      uptime_seconds: 0,
      messages_sent_today: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Envía un mensaje de WhatsApp a un número
 * @param phone — Número con código de país, ej: "51916146396"
 * @param message — Texto del mensaje
 */
export async function sendWhatsappMessage(
  phone: string,
  message: string
): Promise<SendMessageResult> {
  try {
    const res = await fetch(`${BOT_URL}/send`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ phone, message }),
      signal: AbortSignal.timeout(15000),
    });

    // Intentar parsear JSON (puede fallar si el bot devuelve texto plano)
    let data: any = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      return { success: false, error: data.error ?? `HTTP ${res.status}` };
    }

    return {
      success: data.success ?? true,
      message_id: data.messageId ?? data.message_id,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return { success: false, error: msg };
  }
}

/**
 * Verifica si un número tiene WhatsApp activo
 * @param phone — Número con código de país
 */
export async function checkWhatsappNumber(
  phone: string
): Promise<CheckNumberResult> {
  try {
    const res = await fetch(`${BOT_URL}/check`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ phone }),
      signal: AbortSignal.timeout(10000),
    });

    let data: any = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      return { exists: false, phone, error: data.error ?? `HTTP ${res.status}` };
    }

    return {
      exists: data.exists ?? false,
      phone: data.phone ?? phone,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return { exists: false, phone, error: msg };
  }
}

/**
 * Fuerza la reconexión del bot
 */
export async function reconnectBot(): Promise<ReconnectResult> {
  try {
    const res = await fetch(`${BOT_URL}/reconnect`, {
      method: 'POST',
      headers: authHeaders,
      signal: AbortSignal.timeout(10000),
    });

    // El bot puede devolver texto vacío o JSON según implementación
    let data: any = {};
    try {
      const text = await res.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (!res.ok) {
      return {
        success: false,
        message: data.error ?? `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      message: data.message ?? 'Reconexión iniciada',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return { success: false, message: msg };
  }
}

/**
 * Formatea segundos de uptime a string legible
 */
export function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}