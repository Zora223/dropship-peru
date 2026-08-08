// supabase/functions/auto-fill-product/index.ts
// 🪄 Auto-Fill AI - v8 con Qwen + Suppliers ilimitado

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CREDITS_COST: Record<string, number> = {
  all: 5,
  name: 1,
  description: 2,
  category: 1,
  price: 2,
};

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

function buildPrompt(field: string): string {
  const basePrompt = `Eres un COPYWRITER EXPERTO en e-commerce peruano especializado en VENDER a través de las emociones.

📋 CATEGORÍAS VÁLIDAS (elige SOLO una):
${CATEGORIES.join(", ")}

🎯 CONTEXTO:
- Vendes en Perú (público peruano/latino)
- Precios en Soles (S/)
- Productos de dropshipping para consumidor final
- Tu misión: CREAR DESEO Y NECESIDAD

🚨 REGLAS CRÍTICAS - QUÉ NO HACER:
❌ NO inventes marcas (usa "Sin marca" SIEMPRE)
❌ NO menciones tallas específicas (S, M, L, XL, 38, 42) - el cliente elige
❌ NO inventes materiales exactos (NO digas "100% algodón peinado")
❌ NO inventes medidas (cm, pulgadas, kilos, gramos)
❌ NO uses lenguaje técnico aburrido
❌ NO hagas listas de especificaciones
❌ NO menciones "disponible en tallas..." ni "colores disponibles..."

✅ QUÉ SÍ HACER:
✅ Genera DESEO y NECESIDAD emocional
✅ Habla de BENEFICIOS (qué gana el cliente), no características
✅ Usa palabras poder: "único", "imprescindible", "transforma", "descubre", "eleva"
✅ Crea urgencia sutil: "ideal para", "perfecto cuando", "no te lo pierdas"
✅ Enfócate en QUIÉN es y QUÉ SIENTE al usarlo
✅ Usa emojis estratégicos (2-3 por descripción)
✅ Habla al cliente en segunda persona (tú, tu)

`;

  if (field === "all") {
    return (
      basePrompt +
      `Genera contenido VENDEDOR completo. Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto extra):

{
  "name": "nombre atractivo de 40-70 caracteres que despierte curiosidad",
  "description": "descripción PERSUASIVA de 180-350 caracteres con 2-3 emojis, enfocada en BENEFICIOS emocionales",
  "category": "UNA categoría exacta de la lista",
  "brand_suggested": "Sin marca",
  "colors_detected": ["color1", "color2"],
  "price_min": 30,
  "price_max": 80,
  "price_suggested": 50
}

📝 EJEMPLOS DE NAMES BUENOS ✅:
- "Polera casual que combina con todo, para tu estilo único"
- "Reloj deportivo que eleva cualquier outfit moderno"
- "Zapatillas ideales para quienes buscan comodidad total"
- "Cartera elegante que complementa tu personalidad"
- "Termo que mantiene tu bebida perfecta todo el día"

❌ EJEMPLOS MALOS (NO hacer):
- "Polo 100% algodón peinado talla M color rojo"
- "Reloj Casio A123 acero inoxidable 42mm"
- "Zapatillas Nike Air Max 90 talla 42"
- "Termo Stanley 1L acero inoxidable doble pared"

📝 EJEMPLOS DE DESCRIPTIONS BUENAS ✅:
1. "🔥 Marca la diferencia con este básico que nunca falla. Su corte moderno se adapta a tu estilo único, ideal para el trabajo, salidas casuales o esos momentos donde quieres verte increíble sin esfuerzo. ✨ Un imprescindible en tu armario."

2. "⏰ Más que un reloj, un accesorio que dice quién eres. Elegante, resistente y con ese toque deportivo que combina con todo. Perfecto para el gimnasio, la oficina o esas escapadas de fin de semana. 💪"

3. "☕ Tu bebida siempre a la temperatura perfecta, sin importar dónde estés. Ideal para el trabajo, viajes o esos momentos en los que necesitas algo caliente rápido. 🌟 Compañero fiel en tu día a día."

❌ EJEMPLOS MALOS:
- "Polo confeccionado en tela algodón 180g cuello redondo manga corta talla M"
- "Termo de acero inoxidable capacidad 1000ml doble pared conserva temperatura"

REGLAS FINALES:
- name: 40-70 chars (SIN especificaciones técnicas, SIN tallas)
- description: 180-350 chars (persuasiva, emocional, con emojis)
- category: EXACTA de la lista
- brand_suggested: SIEMPRE "Sin marca"
- colors_detected: solo colores visibles en la imagen
- precios: realistas mercado peruano
- Solo JSON, sin markdown`
    );
  }

  if (field === "name") {
    return (
      basePrompt +
      `Genera SOLO un nombre VENDEDOR. Responde ÚNICAMENTE con JSON válido:

{
  "name": "nombre atractivo 40-70 chars que despierte curiosidad (SIN marcas, SIN tallas, SIN materiales técnicos)"
}

✅ Ejemplos buenos:
- "Polera casual que combina con todo, para tu estilo único"
- "Reloj deportivo que eleva cualquier outfit moderno"
- "Cartera elegante que complementa tu personalidad"

❌ Ejemplos malos:
- "Polo algodón talla M rojo Nike"
- "Reloj digital resistente al agua 30m"`
    );
  }

  if (field === "description") {
    return (
      basePrompt +
      `Genera SOLO una descripción VENDEDORA. Responde ÚNICAMENTE con JSON válido:

{
  "description": "descripción persuasiva 180-350 chars con 2-3 emojis"
}

Estructura recomendada:
1. Emoji + Beneficio principal (engancha)
2. Cómo se siente el cliente al usarlo
3. Casos de uso (para el trabajo, casual, etc)
4. Cierre con emoji + palabra poder

✅ Ejemplo bueno:
"🔥 Marca la diferencia con este básico que nunca falla. Su diseño moderno se adapta a tu estilo único, ideal para el trabajo, salidas casuales o esos momentos donde quieres verte increíble sin esfuerzo. ✨"

❌ Ejemplo malo:
"Polo de algodón cuello redondo manga corta. Disponible en tallas S, M, L. Colores: rojo, azul, negro."`
    );
  }

  if (field === "category") {
    return (
      basePrompt +
      `Detecta SOLO la categoría más apropiada. Responde ÚNICAMENTE con JSON válido:

{
  "category": "UNA categoría EXACTA de la lista"
}`
    );
  }

  if (field === "price") {
    return (
      basePrompt +
      `Sugiere precios realistas para mercado peruano. Responde ÚNICAMENTE con JSON válido:

{
  "price_min": 30,
  "price_max": 80,
  "price_suggested": 50
}

Considera:
- Tipo de producto y calidad aparente
- Poder adquisitivo del peruano promedio
- Márgenes de dropshipping (30-50%)
- Precios competitivos en Mercado Libre, Linio, Falabella Perú
- Rango realista (no sobrestimar ni subestimar)`
    );
  }

  return basePrompt;
}

function cleanJsonResponse(text: string): string {
  let cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const groqApiKey = Deno.env.get("GROQ_API_KEY");

    if (!groqApiKey) {
      console.error("❌ GROQ_API_KEY no configurada");
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY no configurada" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuario no autenticado" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { image_url, field = "all" } = await req.json();

    if (!image_url) {
      return new Response(
        JSON.stringify({ error: "image_url es requerido" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const validFields = ["all", "name", "description", "category", "price"];
    if (!validFields.includes(field)) {
      return new Response(
        JSON.stringify({
          error: `field inválido. Debe ser: ${validFields.join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const creditsCost = CREDITS_COST[field];
    console.log(`🪄 Auto-Fill: field=${field}, cost=${creditsCost}, user=${user.email}`);

    // ========================================
    // 🆕 v22.13 - DETECTAR SI ES SUPPLIER
    // Los suppliers tienen Auto-Fill AI ilimitado (sin créditos)
    // ========================================
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.warn("⚠️ Error al obtener rol:", profileError);
    }

    const isSupplier = profile?.role === "supplier";
    console.log(`👤 Role: ${profile?.role} | isSupplier: ${isSupplier}`);

    let subscription: any = null;
    let isUnlimited = false;

    // ========================================
    // 💳 VERIFICAR CRÉDITOS (SOLO SI NO ES SUPPLIER)
    // ========================================
    if (!isSupplier) {
      const { data: sub, error: subError } = await supabase
        .from("ai_subscriptions")
        .select("*")
        .eq("vendor_id", user.id)
        .maybeSingle();

      if (subError) {
        console.error("Error subscription:", subError);
        return new Response(
          JSON.stringify({ error: "Error al verificar suscripción" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!sub) {
        return new Response(
          JSON.stringify({
            error: "No tienes suscripción AI activa.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      subscription = sub;
      isUnlimited = subscription.plan === "business";

      if (!isUnlimited && subscription.credits_remaining < creditsCost) {
        return new Response(
          JSON.stringify({
            error: `Créditos insuficientes. Necesitas ${creditsCost} y tienes ${subscription.credits_remaining}`,
            credits_remaining: subscription.credits_remaining,
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      console.log(`🏭 Supplier detectado - AI ilimitado, no descontar créditos`);
    }

    console.log(`📸 Imagen URL: ${image_url}`);

    const prompt = buildPrompt(field);

    // ========================================
    // 🧠 LLAMAR A GROQ QWEN 3.6 VISION
    // ========================================
    console.log(`🧠 Llamando a Groq Qwen 3.6 27B Vision...`);
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "qwen/qwen3.6-27b",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: image_url,
                  },
                },
              ],
            },
          ],
          temperature: 0.7,
          max_tokens: 2048,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error(`❌ Groq error ${groqResponse.status}:`, errText);
      return new Response(
        JSON.stringify({
          error: "Error al analizar imagen con AI",
          details: errText.substring(0, 500),
          status: groqResponse.status,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const groqData = await groqResponse.json();
    const rawText = groqData?.choices?.[0]?.message?.content || "{}";
    console.log(`📝 Respuesta Groq (${rawText.length} chars): ${rawText.substring(0, 200)}...`);

    let parsedData: any;
    try {
      const cleaned = cleanJsonResponse(rawText);
      console.log(`🧹 JSON limpio: ${cleaned.substring(0, 200)}...`);
      parsedData = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("❌ Parse error:", parseErr);
      console.error("Raw:", rawText);
      return new Response(
        JSON.stringify({
          error: "Error procesando respuesta AI",
          raw: rawText.substring(0, 300),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ========================================
    // ✅ VALIDAR Y NORMALIZAR RESPUESTA
    // ========================================
    if (parsedData.category && !CATEGORIES.includes(parsedData.category)) {
      console.warn(`⚠️ Categoría inválida: ${parsedData.category}, usando 'Otros'`);
      parsedData.category = "Otros";
    }

    if (parsedData.brand_suggested !== undefined) {
      parsedData.brand_suggested = "Sin marca";
    }

    if (parsedData.price_min !== undefined) {
      parsedData.price_min = Number(parsedData.price_min);
    }
    if (parsedData.price_max !== undefined) {
      parsedData.price_max = Number(parsedData.price_max);
    }
    if (parsedData.price_suggested !== undefined) {
      parsedData.price_suggested = Number(parsedData.price_suggested);
    }

    if (parsedData.colors_detected && !Array.isArray(parsedData.colors_detected)) {
      parsedData.colors_detected = [];
    }

    if (parsedData.name) {
      parsedData.name = cleanNameFromTechnicalTerms(parsedData.name);
    }

    // ========================================
    // 💳 DESCONTAR CRÉDITOS (SOLO SI NO ES SUPPLIER)
    // ========================================
    let finalCredits: number = -1;

    if (!isSupplier && subscription && !isUnlimited) {
      const newCredits = subscription.credits_remaining - creditsCost;
      const newUsed = (subscription.total_used || 0) + creditsCost;

      const { error: updateError } = await supabase
        .from("ai_subscriptions")
        .update({
          credits_remaining: newCredits,
          total_used: newUsed,
          updated_at: new Date().toISOString(),
        })
        .eq("vendor_id", user.id);

      if (updateError) {
        console.error("⚠️ Error actualizando créditos:", updateError);
      } else {
        console.log(`💳 Créditos: ${subscription.credits_remaining} → ${newCredits}`);
      }

      finalCredits = newCredits;
    } else if (!isSupplier && subscription && isUnlimited) {
      finalCredits = -1;
    } else if (isSupplier) {
      finalCredits = 9999; // Suppliers muestran "ilimitado"
    }

    console.log(`✅ Auto-Fill completado para ${user.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: parsedData,
        credits_used: isSupplier ? 0 : creditsCost,
        credits_remaining: finalCredits,
        field: field,
        is_supplier: isSupplier, // 🆕 Info para el frontend
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
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function cleanNameFromTechnicalTerms(name: string): string {
  const patternsToRemove = [
    /\s+talla\s+[SMLXL0-9]+/gi,
    /\s+talle\s+[SMLXL0-9]+/gi,
    /\s+size\s+[SMLXL0-9]+/gi,
    /\s+[SMLXL]{1,3}\s*$/gi,
    /\s+\d{2}(cm|mm|in|"|kg|g|ml|l)\b/gi,
    /\s+100%\s+\w+/gi,
    /\s+algodón\s+peinado/gi,
    /\s+acero\s+inoxidable/gi,
    /\s+(Nike|Adidas|Puma|Reebok|Under Armour|Casio|Rolex|Apple|Samsung|Sony|LG|Xiaomi)\s*/gi,
  ];

  let cleaned = name;
  patternsToRemove.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, " ");
  });

  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}