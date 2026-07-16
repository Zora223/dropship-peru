// ═══════════════════════════════════════════════════════════════════════════
// EDGE FUNCTION: send-whatsapp-event
// Envía mensajes WhatsApp automáticos según eventos del sistema
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── HEADERS CORS ─────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── TIPOS ────────────────────────────────────────────────────────────────
interface EventPayload {
  event_key: string;
  order_id?: string;
  // Variables custom para reemplazar (opcional, si no se pasan se buscan en la BD)
  variables?: Record<string, string>;
}

// ─── FUNCIONES AUXILIARES ─────────────────────────────────────────────────

/**
 * Reemplaza {{variable}} en el template con los valores del objeto
 */
function replaceVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(regex, value ?? '');
  }
  // Limpiar variables no reemplazadas
  result = result.replace(/\{\{[^}]+\}\}/g, '—');
  return result;
}

/**
 * Formatea el número de teléfono para WhatsApp
 * Perú: 9 dígitos → agregar 51
 */
function formatPhone(phone: string): string {
  if (!phone) return '';
  // Quitar todo lo que no sea número
  const clean = phone.replace(/\D/g, '');
  // Si tiene 9 dígitos, agregar código Perú
  if (clean.length === 9) return `51${clean}`;
  return clean;
}

/**
 * Formatea número decimal como precio
 */
function formatPrice(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  return num.toFixed(2);
}

/**
 * Formatea el resumen de items del pedido
 */
function formatItemsSummary(items: any[]): string {
  if (!items || !Array.isArray(items) || items.length === 0) return '—';
  return items
    .map((item) => `• ${item.quantity ?? 1}x ${item.name ?? 'Producto'}`)
    .join('\n');
}

/**
 * Formatea la dirección de envío
 */
function formatShippingAddress(addr: any): string {
  if (!addr) return '—';
  const parts = [
    addr.address,
    addr.district,
    addr.city,
    addr.reference && `Ref: ${addr.reference}`,
  ].filter(Boolean);
  return parts.join(', ');
}

// ─── HANDLER PRINCIPAL ────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Setup ─────────────────────────────────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const botUrl = Deno.env.get('WHATSAPP_BOT_URL')!;
    const botApiKey = Deno.env.get('WHATSAPP_BOT_API_KEY')!;

    if (!botUrl || !botApiKey) {
      throw new Error('WHATSAPP_BOT_URL o WHATSAPP_BOT_API_KEY no configurados');
    }

    // Cliente con service role (bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Parsear body ──────────────────────────────────────────────────────
    const payload: EventPayload = await req.json();
    const { event_key, order_id, variables: customVars } = payload;

    if (!event_key) {
      return new Response(
        JSON.stringify({ error: 'event_key es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📨 Evento recibido: ${event_key}, order: ${order_id}`);

    // ── Buscar el template ────────────────────────────────────────────────
    const { data: template, error: templateError } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('event_key', event_key)
      .eq('active', true)
      .single();

    if (templateError || !template) {
      console.warn(`⚠️ Template no encontrado o inactivo: ${event_key}`);
      return new Response(
        JSON.stringify({
          skipped: true,
          reason: 'Template no encontrado o inactivo',
          event_key,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Buscar datos del pedido si viene order_id ─────────────────────────
    let order: any = null;
    let deliveryProfile: any = null;
    let deliveryUser: any = null;
    let store: any = null;
    let storeOwner: any = null;

    if (order_id) {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order_id)
        .single();

      if (orderError || !orderData) {
        throw new Error(`Pedido no encontrado: ${order_id}`);
      }
      order = orderData;

      // Datos del delivery si aplica
      if (order.delivery_id) {
        const { data: dp } = await supabase
          .from('delivery_profiles')
          .select('*')
          .eq('id', order.delivery_id)
          .single();
        deliveryProfile = dp;

        const { data: du } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', order.delivery_id)
          .single();
        deliveryUser = du;
      }

      // Datos de la tienda
      if (order.store_id) {
        const { data: s } = await supabase
          .from('stores')
          .select('*')
          .eq('id', order.store_id)
          .single();
        store = s;

        if (s?.owner_id) {
          const { data: o } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', s.owner_id)
            .single();
          storeOwner = o;
        }
      }
    }

    // ── Construir variables ───────────────────────────────────────────────
    const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'https://dropshipperu.com';

    const variables: Record<string, string> = {
      // Cliente
      customer_name: order?.customer_name ?? '—',
      customer_phone: order?.customer_phone ?? '—',
      customer_email: order?.customer_email ?? '—',

      // Pedido
      order_number: order?.order_number ?? '—',
      total: formatPrice(order?.total),
      subtotal: formatPrice(order?.subtotal),
      payment_method: order?.payment_method ?? '—',
      items_summary: formatItemsSummary(order?.items),
      shipping_address: formatShippingAddress(order?.shipping_address),

      // Delivery
      delivery_name: deliveryUser?.full_name ?? '—',
      delivery_phone: deliveryProfile?.phone ?? '—',
      delivery_vehicle: deliveryProfile?.vehicle_type ?? '—',
      delivery_cost: formatPrice(order?.delivery_cost),

      // Tienda
      store_name: store?.name ?? '—',
      store_whatsapp: store?.whatsapp ?? '—',
      vendor_name: storeOwner?.full_name ?? '—',

      // Fees (aproximados, la Edge Function los calcula)
      platform_fee: formatPrice(order?.delivery_cost), // TODO: calcular con RPC

      // URLs
      tracking_url: `${frontendUrl}/pedido/${order?.order_number ?? ''}`,
      delivery_panel_url: `${frontendUrl}/delivery/orders`,
      vendor_payments_url: `${frontendUrl}/vendor/payments`,

      // Variables custom (sobreescriben si vienen del trigger)
      ...(customVars ?? {}),
    };

    // ── Determinar el número destino ──────────────────────────────────────
    let recipientPhone = '';
    let recipientName = '';

    switch (template.recipient) {
      case 'customer':
        recipientPhone = formatPhone(order?.customer_phone ?? '');
        recipientName = order?.customer_name ?? '';
        break;
      case 'delivery':
        recipientPhone = formatPhone(deliveryProfile?.phone ?? '');
        recipientName = deliveryUser?.full_name ?? '';
        break;
      case 'vendor':
        recipientPhone = formatPhone(store?.whatsapp ?? '');
        recipientName = storeOwner?.full_name ?? '';
        break;
    }

    if (!recipientPhone || recipientPhone.length < 10) {
      console.warn(`⚠️ Número inválido para ${template.recipient}: ${recipientPhone}`);
      
      // Guardar log de error
      await supabase.from('whatsapp_logs').insert({
        event_key,
        order_id: order_id ?? null,
        recipient_type: template.recipient,
        recipient_phone: recipientPhone,
        recipient_name: recipientName,
        message_sent: '',
        status: 'failed',
        error_message: 'Número inválido o vacío',
      });

      return new Response(
        JSON.stringify({ skipped: true, reason: 'Número inválido', recipientPhone }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Construir mensaje final ───────────────────────────────────────────
    const finalMessage = replaceVariables(template.message_template, variables);

    console.log(`📤 Enviando a ${recipientPhone}: ${finalMessage.substring(0, 80)}...`);

    // ── Llamar al bot ─────────────────────────────────────────────────────
    let botResult: any = { success: false };
    let sendError = '';

    try {
      const botResponse = await fetch(`${botUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': botApiKey,
        },
        body: JSON.stringify({
          phone: recipientPhone,
          message: finalMessage,
        }),
      });

      botResult = await botResponse.json().catch(() => ({}));
      
      if (!botResponse.ok) {
        sendError = botResult.error ?? `Bot HTTP ${botResponse.status}`;
      }
    } catch (err) {
      sendError = err instanceof Error ? err.message : 'Error desconocido';
    }

    // ── Guardar log ───────────────────────────────────────────────────────
    const logStatus = botResult.success ? 'sent' : 'failed';

    await supabase.from('whatsapp_logs').insert({
      event_key,
      order_id: order_id ?? null,
      recipient_type: template.recipient,
      recipient_phone: recipientPhone,
      recipient_name: recipientName,
      message_sent: finalMessage,
      status: logStatus,
      error_message: sendError || null,
      bot_message_id: botResult.messageId ?? botResult.message_id ?? null,
      sent_at: logStatus === 'sent' ? new Date().toISOString() : null,
    });

    // ── Respuesta ─────────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: botResult.success ?? false,
        event_key,
        recipient: template.recipient,
        recipient_phone: recipientPhone,
        message_preview: finalMessage.substring(0, 100),
        error: sendError || null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('❌ Error:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});