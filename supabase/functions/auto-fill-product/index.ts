// supabase/functions/auto-fill-product/index.ts
// 🪄 Auto-Fill AI - Analiza imagen y rellena campos del producto

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ========================================
// 💰 CRÉDITOS POR TIPO DE OPERACIÓN
// ========================================
const CREDITS_COST: Record<string, number> = {
  all: 5,
  name: 1,
  description: 2,
  category: 1,
  price: 2,
};

// ========================================
// 📋 CATEGORÍAS PREDEFINIDAS (deben coincidir con product-quality.ts)
// ========================================
const CATEGORIES = [
  "Ropa",
  "Calzado",
  "Accesorios",
  "Electrónica",
  "Hogar",
  "Cocina",
  "Belleza",
  "Deportes",
  "Juguetes",
  "Mascotas",
  "Libros",
  "Bebés",
  "Alimentos",
  "Salud",
  "Herramientas",
  "Automóvil",
  "Oficina",
  "Otros",
];

// ========================================
// 🧠 PROMPT ENGINEERING PARA GEMINI VISION
// ========================================
function buildPrompt(field: string): string {
  const basePrompt = `Eres un experto en e-commerce peruano. Analiza la imagen del producto y genera contenido profesional.

CATEGORÍAS VÁLIDAS (elige SOLO una de esta lista):
${CATEGORIES.join(", ")}

CONTEXTO:
- Estás vendiendo en Perú
- Los precios son en Soles (S/)
- El público es peruano/latino
- Los productos son de dropshipping

`;

  if (field === "all") {
    return (
      basePrompt +
      `Genera TODA la información del producto en JSON válido:

{
  "name": "nombre profesional del producto (60-90 caracteres, específico con material/tipo/color)",
  "description": "descripción detallada de 200-400 caracteres. Incluye: material, medidas, usos, beneficios, cuidados",
  "category": "UNA categoría exacta de la lista",
  "brand_suggested": "marca visible en la imagen o 'Sin marca'",
  "colors_detected": ["color1", "color2"],
  "price_min": número (precio mínimo sugerido en soles para Perú),
  "price_max": número (precio máximo sugerido en soles),
  "price_suggested": número (precio óptimo recomendado)
}

REGLAS ESTRICTAS:
- name: MÍNIMO 60 caracteres, MÁXIMO 90
- description: MÍNIMO 200 caracteres, MÁXIMO 400
- category: DEBE ser EXACTAMENTE una de la lista
- precios: basados en mercado peruano actual, realistas
- Responde SOLO con JSON válido, sin markdown, sin explicaciones`
    );
  }

  if (field === "name") {
    return (
      basePrompt +
      `Genera SOLO el nombre profesional del producto en JSON:

{
  "name": "nombre profesional (60-90 chars, específico con material/tipo/color/talla si aplica)"
}

Responde SOLO JSON válido, sin markdown.`
    );
  }

  if (field === "description") {
    return (
      basePrompt +
      `Genera SOLO la descripción del producto en JSON:

{
  "description": "descripción de 200-400 chars con material, medidas, usos, beneficios, cuidados"
}

Responde SOLO JSON válido, sin markdown.`
    );
  }

  if (field === "category") {
    return (
      basePrompt +
      `Detecta SOLO la categoría del producto en JSON:

{
  "category": "UNA categoría EXACTA de la lista de arriba"
}

Responde SOLO JSON válido, sin markdown.`
    );
  }

  if (field === "price") {
    return (
      basePrompt +
      `Analiza el producto y sugiere precios para mercado peruano en JSON:

{
  "price_min": número (precio mínimo en soles),
  "price_max": número (precio máximo en soles),
  "price_suggested": número (precio óptimo recomendado)
}

Basado en:
- Tipo de producto y calidad aparente
- Mercado peruano actual
- Márgenes de dropshipping razonables

Responde SOLO JSON válido, sin markdown.`
    );
  }

  return basePrompt;
}

// ========================================
// 🧹 LIMPIAR RESPUESTA JSON DE GEMINI
// ========================================
function cleanJsonResponse(text: string): string {
  return text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
}

// ========================================
// 🎯 HANDLER PRINCIPAL
// ========================================
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY no configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cliente Supabase con service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar usuario
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuario no autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parsear body
    const { image_url, field = "all" } = await req.json();

    if (!image_url) {
      return new Response(
        JSON.stringify({ error: "image_url es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validFields = ["all", "name", "description", "category", "price"];
    if (!validFields.includes(field)) {
      return new Response(
        JSON.stringify({
          error: `field inválido. Debe ser: ${validFields.join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const creditsCost = CREDITS_COST[field];
    console.log(`🪄 Auto-Fill request: field=${field}, cost=${creditsCost}`);

    // ========================================
    // 💳 VERIFICAR Y DESCONTAR CRÉDITOS
    // ========================================
    const { data: subscription, error: subError } = await supabase
      .from("ai_subscriptions")
      .select("*")
      .eq("vendor_id", user.id)
      .maybeSingle();

    if (subError) {
      console.error("Error subscription:", subError);
      return new Response(
        JSON.stringify({ error: "Error al verificar suscripción" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscription) {
      return new Response(
        JSON.stringify({
          error: "No tienes suscripción AI activa. Actualiza tu plan.",
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isUnlimited = subscription.plan === "business";
    if (!isUnlimited && subscription.credits_remaining < creditsCost) {
      return new Response(
        JSON.stringify({
          error: `Créditos insuficientes. Necesitas ${creditsCost} y tienes ${subscription.credits_remaining}`,
          credits_remaining: subscription.credits_remaining,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================
    // 📸 DESCARGAR IMAGEN Y CONVERTIR A BASE64
    // ========================================
    console.log(`📥 Descargando imagen: ${image_url}`);
    const imgResponse = await fetch(image_url);
    if (!imgResponse.ok) {
      return new Response(
        JSON.stringify({ error: "No se pudo descargar la imagen" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imgBuffer = await imgResponse.arrayBuffer();
    const imgBase64 = btoa(
      new Uint8Array(imgBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
    console.log(`✅ Imagen descargada: ${imgBuffer.byteLength} bytes, ${contentType}`);

    // ========================================
    // 🧠 LLAMAR A GEMINI VISION
    // ========================================
    const prompt = buildPrompt(field);
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`;

    console.log(`🧠 Llamando a Gemini Vision...`);
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: contentType,
                  data: imgBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini error:", errText);
      return new Response(
        JSON.stringify({
          error: "Error al analizar imagen con AI",
          details: errText,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    console.log(`📝 Respuesta Gemini: ${rawText.substring(0, 200)}...`);

    // Parsear JSON limpio
    let parsedData: any;
    try {
      parsedData = JSON.parse(cleanJsonResponse(rawText));
    } catch (parseErr) {
      console.error("Parse error:", parseErr, "Raw:", rawText);
      return new Response(
        JSON.stringify({
          error: "Error procesando respuesta AI",
          raw: rawText,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================
    // ✅ VALIDAR Y NORMALIZAR RESPUESTA
    // ========================================
    if (parsedData.category && !CATEGORIES.includes(parsedData.category)) {
      console.warn(`Categoría inválida: ${parsedData.category}, usando 'Otros'`);
      parsedData.category = "Otros";
    }

    // Asegurar precios como números
    if (parsedData.price_min) parsedData.price_min = Number(parsedData.price_min);
    if (parsedData.price_max) parsedData.price_max = Number(parsedData.price_max);
    if (parsedData.price_suggested) parsedData.price_suggested = Number(parsedData.price_suggested);

    // ========================================
    // 💳 DESCONTAR CRÉDITOS
    // ========================================
    if (!isUnlimited) {
      const newCredits = subscription.credits_remaining - creditsCost;
      const newUsed = (subscription.total_used || 0) + creditsCost;

      await supabase
        .from("ai_subscriptions")
        .update({
          credits_remaining: newCredits,
          total_used: newUsed,
          updated_at: new Date().toISOString(),
        })
        .eq("vendor_id", user.id);

      console.log(`💳 Créditos: ${subscription.credits_remaining} → ${newCredits}`);
    }

    // ========================================
    // ✨ RESPUESTA EXITOSA
    // ========================================
    const finalCredits = isUnlimited
      ? -1
      : subscription.credits_remaining - creditsCost;

    return new Response(
      JSON.stringify({
        success: true,
        data: parsedData,
        credits_used: creditsCost,
        credits_remaining: finalCredits,
        field: field,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error general:", error);
    return new Response(
      JSON.stringify({
        error: "Error interno",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});