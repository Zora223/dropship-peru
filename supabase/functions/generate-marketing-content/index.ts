// supabase/functions/generate-marketing-content/index.ts
// 🤖 Dropship AI - Generador de contenido con Groq

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile"; // El mejor modelo gratuito

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================
// PROMPTS PROFESIONALES POR TIPO Y TONO
// ============================================

const TONE_STYLES = {
  professional:
    "profesional, formal, orientado a resultados y beneficios empresariales",
  friendly:
    "amigable, cercano, conversacional, usando 'tú', con emojis moderados",
  urgent:
    "urgente, con sensación de escasez, ofertas limitadas, llamados a la acción fuertes",
  storytelling:
    "narrativo, emocional, contando una historia que conecte con el lector",
};

const FOCUS_STRATEGIES = {
  sales:
    "enfocado 100% en generar la venta directa, precio destacado, CTA claro",
  benefits:
    "resaltando los beneficios clave del producto y cómo mejora la vida del cliente",
  story:
    "usando storytelling, generando conexión emocional antes de mencionar el producto",
};

const PLATFORM_RULES = {
  instagram: {
    maxLength: 2200,
    hashtags: 15,
    emojis: "moderados",
    style: "visual, aspiracional, con saltos de línea claros",
  },
  facebook: {
    maxLength: 3000,
    hashtags: 5,
    emojis: "pocos",
    style: "más informativo, párrafos más largos, orientado a comunidad",
  },
  whatsapp: {
    maxLength: 1000,
    hashtags: 0,
    emojis: "moderados",
    style: "directo, personal, con CTA claro para responder o comprar",
  },
  tiktok: {
    maxLength: 300,
    hashtags: 8,
    emojis: "muchos",
    style: "corto, viral, con hook fuerte al inicio",
  },
  email: {
    maxLength: 2000,
    hashtags: 0,
    emojis: "pocos",
    style: "asunto + cuerpo bien estructurado, con CTA al final",
  },
};

// ============================================
// PROMPT BUILDERS
// ============================================

function buildCaptionPrompt(data: {
  productName: string;
  productDescription: string;
  price: number;
  category: string;
  tone: string;
  focus: string;
  platform: string;
  city: string;
  storeName: string;
  storePhone?: string;
}): string {
  const platform = PLATFORM_RULES[data.platform as keyof typeof PLATFORM_RULES];
  const toneDesc = TONE_STYLES[data.tone as keyof typeof TONE_STYLES];
  const focusDesc = FOCUS_STRATEGIES[data.focus as keyof typeof FOCUS_STRATEGIES];

  return `Eres un experto en marketing digital peruano especializado en emprendedores de la Amazonía y Lima. Tu trabajo es crear captions VIRALES para redes sociales.

CONTEXTO:
- Tienda: ${data.storeName}
- Ubicación: ${data.city}, Perú
- Público: Peruanos, principalmente de ${data.city}
${data.storePhone ? `- WhatsApp de contacto: +51 ${data.storePhone}` : ""}

PRODUCTO A PROMOCIONAR:
- Nombre: ${data.productName}
- Descripción: ${data.productDescription || "Sin descripción disponible"}
- Precio: S/ ${data.price.toFixed(2)}
- Categoría: ${data.category || "General"}

ESTILO REQUERIDO:
- Plataforma: ${data.platform.toUpperCase()}
- Tono: ${toneDesc}
- Enfoque: ${focusDesc}
- Estilo de plataforma: ${platform.style}
- Longitud máxima: ${platform.maxLength} caracteres
- Emojis: ${platform.emojis}

REGLAS OBLIGATORIAS:
1. Usa jerga peruana natural (soles no dólares, cachaco no cool, etc.)
2. Menciona "${data.city}" o Perú de forma natural
3. Incluye llamado a la acción claro (CTA)
${data.storePhone ? `4. Incluye el WhatsApp: +51 ${data.storePhone}` : "4. Menciona 'Escríbenos por WhatsApp'"}
5. Precio: S/ ${data.price.toFixed(2)} de forma atractiva
6. NO uses hashtags al final (se generan aparte)
7. NO uses palabras como "en oferta" si el precio no está descontado
8. Sé auténtico, evita lenguaje robótico
9. Si es tono ${data.tone}, mantén ese estilo consistente

ESTRUCTURA IDEAL:
- Hook impactante (primera línea que enganche)
- Desarrollo (beneficios o historia)
- Precio (natural, sin ser agresivo)
- CTA claro (compra, WhatsApp, visita)

Genera 3 variaciones distintas y numéralas así:
--- VERSIÓN 1 ---
[caption 1]

--- VERSIÓN 2 ---
[caption 2]

--- VERSIÓN 3 ---
[caption 3]

IMPORTANTE: Solo devuelve las 3 versiones, nada más. No expliques ni comentes.`;
}

function buildHashtagsPrompt(data: {
  productName: string;
  category: string;
  city: string;
  platform: string;
}): string {
  const platform = PLATFORM_RULES[data.platform as keyof typeof PLATFORM_RULES];

  return `Genera ${platform.hashtags} hashtags optimizados para vender el producto "${data.productName}" (categoría: ${data.category}) en ${data.platform.toUpperCase()} en Perú, específicamente en ${data.city}.

REGLAS:
1. Mix de hashtags:
   - 3-4 hashtags MUY populares (millones de posts) → alcance
   - 4-5 hashtags MEDIOS (100k-1M posts) → engagement
   - 3-4 hashtags NICHO (menos de 100k) → conversión
   - 2-3 hashtags LOCALES de ${data.city}, Perú
2. Incluir hashtags de emprendedores peruanos
3. Incluir hashtags amazónicos si aplica (#Iquitos, #Amazonia, etc.)
4. Sin espacios, todos empezando con #
5. En español principalmente, algunos en inglés si son universales

Devuelve solo los hashtags separados por espacios en UNA SOLA LÍNEA. Sin explicaciones.`;
}

function buildWhatsAppPrompt(data: {
  productName: string;
  productDescription: string;
  price: number;
  storeName: string;
  storePhone?: string;
  tone: string;
}): string {
  return `Crea un mensaje de WhatsApp Broadcast para promocionar un producto. Este mensaje será enviado a clientes potenciales de ${data.storeName}.

PRODUCTO:
- Nombre: ${data.productName}
- Descripción: ${data.productDescription || "Sin descripción"}
- Precio: S/ ${data.price.toFixed(2)}

TONO: ${TONE_STYLES[data.tone as keyof typeof TONE_STYLES]}

REGLAS:
1. Máximo 800 caracteres (Whatsapp broadcast)
2. Formato: usar *negrita*, _cursiva_, ~tachado~ de WhatsApp
3. Emojis estratégicos (no saturar)
4. Estructura:
   - Saludo personalizado ("Hola! 👋" o similar)
   - Anuncio del producto con emoji
   - Beneficio principal (1-2 líneas)
   - Precio destacado
   - CTA: "Responde este mensaje" o "Escríbeme YA"
   - Cierre con nombre de la tienda
5. Debe sentirse personal, NO como spam
6. Que genere curiosidad y ganas de responder
${data.storePhone ? `7. WhatsApp: +51 ${data.storePhone}` : ""}

Genera 2 variaciones:
--- MENSAJE 1 (breve) ---
[mensaje corto y directo]

--- MENSAJE 2 (con historia) ---
[mensaje que cuenta más contexto]

Solo los mensajes. Sin explicaciones.`;
}

function buildEmailPrompt(data: {
  productName: string;
  productDescription: string;
  price: number;
  storeName: string;
  tone: string;
}): string {
  return `Crea un email marketing profesional para promocionar un producto.

TIENDA: ${data.storeName}
PRODUCTO: ${data.productName}
DESCRIPCIÓN: ${data.productDescription || "Sin descripción"}
PRECIO: S/ ${data.price.toFixed(2)}
TONO: ${TONE_STYLES[data.tone as keyof typeof TONE_STYLES]}

Genera un email completo con esta estructura EXACTA:

ASUNTO: [asunto atractivo, máximo 50 caracteres, que genere curiosidad]

PREVIEW: [texto de preview del email, máximo 90 caracteres]

CUERPO:
[Saludo personalizado]

[Hook / apertura impactante en 1-2 líneas]

[Desarrollo: 2-3 párrafos cortos sobre el producto y sus beneficios]

[Precio destacado con formato]

[CTA principal claro - "COMPRAR AHORA" o similar]

[Cierre profesional]

[Firma de la tienda]

---

REGLAS:
1. Español peruano natural
2. Párrafos cortos (máx 3 líneas cada uno)
3. Un solo CTA principal claro
4. Sin lenguaje spam
5. Auténtico y humano
6. Total: máximo 1500 palabras

Solo el email en el formato indicado. Sin explicaciones extras.`;
}

// ============================================
// GROQ API CALL
// ============================================

async function callGroq(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85, // Creatividad alta pero controlada
      max_tokens: 2048,
      top_p: 0.95,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verificar autenticación
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse body
    const body = await req.json();
    const {
      contentType,
      tone,
      focus,
      platform,
      productData,
      storeData,
    } = body;

    if (!contentType || !productData || !storeData) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Consumir crédito
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: creditResult, error: creditError } =
      await supabaseAdmin.rpc("consume_ai_credit", { p_vendor_id: user.id });

    if (creditError || !creditResult?.success) {
      return new Response(
        JSON.stringify({
          error: creditResult?.error || "credit_error",
          message: "Sin créditos disponibles. Upgrade tu plan para continuar.",
          plan: creditResult?.plan,
          reset_at: creditResult?.reset_at,
        }),
        {
          status: 402, // Payment required
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Obtener API Key de Groq
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Construir prompt según tipo
    let prompt = "";
    switch (contentType) {
      case "caption":
        prompt = buildCaptionPrompt({
          productName: productData.name,
          productDescription: productData.description,
          price: productData.price,
          category: productData.category,
          tone: tone || "friendly",
          focus: focus || "sales",
          platform: platform || "instagram",
          city: storeData.city || "Iquitos",
          storeName: storeData.name,
          storePhone: storeData.phone,
        });
        break;

      case "hashtags":
        prompt = buildHashtagsPrompt({
          productName: productData.name,
          category: productData.category,
          city: storeData.city || "Iquitos",
          platform: platform || "instagram",
        });
        break;

      case "whatsapp":
        prompt = buildWhatsAppPrompt({
          productName: productData.name,
          productDescription: productData.description,
          price: productData.price,
          storeName: storeData.name,
          storePhone: storeData.phone,
          tone: tone || "friendly",
        });
        break;

      case "email":
        prompt = buildEmailPrompt({
          productName: productData.name,
          productDescription: productData.description,
          price: productData.price,
          storeName: storeData.name,
          tone: tone || "professional",
        });
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown content type: ${contentType}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    // 6. Llamar a Groq
    const result = await callGroq(prompt, groqApiKey);

    if (!result || result.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "AI returned empty response" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 7. Guardar en historial
    const { data: generation } = await supabaseAdmin
      .from("ai_generations")
      .insert({
        vendor_id: user.id,
        product_id: productData.id || null,
        content_type: contentType,
        tone: tone || null,
        focus: focus || null,
        platform: platform || null,
        prompt_data: { productData, storeData, tone, focus, platform },
        result,
        tokens_used: Math.ceil(result.length / 4), // aprox
        model_used: GROQ_MODEL,
      })
      .select()
      .single();

    // 8. Respuesta
    return new Response(
      JSON.stringify({
        success: true,
        result,
        generation_id: generation?.id,
        credits_remaining: creditResult.credits_remaining,
        credits_total: creditResult.credits_total,
        plan: creditResult.plan,
        is_trial: creditResult.is_trial,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-marketing-content:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});