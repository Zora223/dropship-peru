// src/lib/whatsapp-bot.ts
// Cliente para conectar con el bot de WhatsApp (Railway)

const BOT_URL = import.meta.env.VITE_WHATSAPP_BOT_URL as string;
const BOT_API_KEY = import.meta.env.VITE_WHATSAPP_BOT_API_KEY as string;

// ─── TIPOS ─────────────────────────────────────────────────────────────────────
export interface BotStatus {
  connected: boolean;
  status: 'connected' | 'qr_ready' | 'connecting' | 'disconnected';
  hasQr: boolean;
  phone: string | null;
  uptime_seconds: number;
  messages_sent_today: number;
}

// ─── OBTENER ESTADO DEL BOT ───────────────────────────────────────────────────
export async function getBotStatus(): Promise<BotStatus | null> {
  try {
    const res = await fetch(`${BOT_URL}/status`);
    if (!res.ok) return null;

    const data = await res.json();

    // Normalizar respuesta (el bot puede devolver campos en español o inglés)
    const connected = data.connected ?? data.conectado ?? false;
    const hasQr = data.hasQr ?? data.tieneQr ?? false;
    const uptime = data.uptime_seconds ?? data.uptime ?? data['tiempo de actividad'] ?? 0;

    let status: BotStatus['status'] = 'disconnected';
    if (connected) status = 'connected';
    else if (hasQr) status = 'qr_ready';
    else status = 'connecting';

    return {
      connected,
      status,
      hasQr,
      phone: data.phone ?? null,
      uptime_seconds: uptime,
      messages_sent_today: data.messages_sent_today ?? 0,
    };
  } catch (err) {
    console.error('[getBotStatus] Error:', err);
    return null;
  }
}

// ─── ENVIAR MENSAJE ────────────────────────────────────────────────────────────
export async function sendWhatsappMessage(
  phone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`${BOT_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BOT_API_KEY,
      },
      body: JSON.stringify({ phone, message }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error ?? `Error ${res.status}`,
      };
    }

    return {
      success: true,
      messageId: data.messageId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message ?? 'Error de conexión',
    };
  }
}

// ─── VERIFICAR SI UN NÚMERO TIENE WHATSAPP ────────────────────────────────────
export async function checkWhatsappNumber(
  phone: string
): Promise<{ exists: boolean; phone: string; error?: string }> {
  try {
    const res = await fetch(`${BOT_URL}/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BOT_API_KEY,
      },
      body: JSON.stringify({ phone }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        exists: false,
        phone,
        error: data.error ?? `Error ${res.status}`,
      };
    }

    return {
      exists: data.exists ?? false,
      phone: data.phone ?? phone,
    };
  } catch (err: any) {
    return {
      exists: false,
      phone,
      error: err.message ?? 'Error de conexión',
    };
  }
}

// ─── RECONECTAR BOT ────────────────────────────────────────────────────────────
export async function reconnectBot(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const res = await fetch(`${BOT_URL}/reconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BOT_API_KEY,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        message: data.error ?? `Error ${res.status}`,
      };
    }

    return {
      success: true,
      message: data.message ?? 'Reconexión iniciada',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message ?? 'Error de conexión con el bot',
    };
  }
}

// ─── 🆕 RESET AUTH (borra sesión y fuerza QR nuevo) ───────────────────────────
export async function resetBotAuth(): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${BOT_URL}/reset-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BOT_API_KEY,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        message: '',
        error: data.error ?? `Error ${res.status}`,
      };
    }

    return {
      success: true,
      message: data.message ?? 'Auth reseteada correctamente',
    };
  } catch (err: any) {
    return {
      success: false,
      message: '',
      error: err.message ?? 'Error de conexión con el bot',
    };
  }
}

// ─── FORMATEAR UPTIME ─────────────────────────────────────────────────────────
export function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;

  if (hours < 24) return `${hours}h ${remainingMin}m`;

  const days = Math.floor(hours / 24);
  const remainingHrs = hours % 24;

  return `${days}d ${remainingHrs}h`;
}