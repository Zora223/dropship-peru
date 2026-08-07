// supabase/functions/product-launch-ai/index.ts
// 🍌 Product Launch AI v2 - Solo textos con Groq (SIN Gemini)
// Marketing kit completo: captions + hashtags + WhatsApp + email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Groq
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const CREDITS_COST = 15;

interface RequestBody {
  product_id: string;
  product_name: string;
  product_description?: string;
  product_category?: string;
  product_price: number;
  input_image_url: string;
  store_name?: string;
  store_city?: string;
  store_phone?: string;
}

// ============================================
// DETECCIÓN DE CATEGORÍA
// ============================================
type ProductCategory =
  | "clothing_female"
  | "clothing_male"
  | "toys"
  | "accessories"
  | "electronics"
  | "beauty"
  | "pets"
  | "kitchen"
  | "home"
  | "sports"
  | "generic";

function detectProductCategory(
  name: string,
  description: string,
  category: string
): ProductCategory {
  const text = `${name} ${description} ${category}`.toLowerCase();
  const matches = (keywords: string[]) => keywords.some((kw) => text.includes(kw));

  if (matches(["blusa", "polo mujer", "jean mujer", "falda", "vestido", "chompa mujer", "chaqueta mujer", "pantalon mujer", "short mujer", "top", "crop", "brasier", "leggins", "ropa mujer", "ropa femenina"])) return "clothing_female";
  if (matches(["camisa hombre", "polo hombre", "terno", "pantalon hombre", "short hombre", "chompa hombre", "chaqueta hombre", "ropa hombre"])) return "clothing_male";
  if (matches(["juguete", "muñeca", "peluche", "lego", "bloques", "carrito", "figura", "rompecabezas", "didactico", "juego infantil"])) return "toys";
  if (matches(["arete", "pulsera", "collar", "anillo", "bisuteria", "vincha", "diadema", "hebilla", "brazalete"])) return "accessories";
  if (matches(["audifono", "celular", "cargador", "cable", "usb", "parlante", "smartwatch", "auricular", "tablet", "laptop", "mouse", "teclado", "power bank"])) return "electronics";
  if (matches(["labial", "sombra", "polvo", "base", "mascara", "crema", "serum", "perfume", "maquillaje", "esmalte"])) return "beauty";
  if (matches(["perro", "gato", "mascota", "cama para", "correa", "comedero", "arenero"])) return "pets";
  if (matches(["olla", "sarten", "utensilio", "cuchara", "cuchillo cocina", "tabla picar", "colador", "rallador"])) return "kitchen";
  if (matches(["decoracion", "mueble", "lampara", "cortina", "almohada", "cojin", "sabanas", "edredon", "florero", "cuadro", "alfombra"])) return "home";
  if (matches(["deportivo", "fitness", "yoga", "gimnasio", "pesa", "mancuerna", "proteina", "pelota deporte", "colchoneta"])) return "sports";
  return "generic";
}

// ============================================
// GROQ - TEXTO
// ============================================
async function callGroq(prompt: string, temperature = 0.8): Promise<string> {
  const groqApiKey = Deno.env.get("GROQ_API_KEY");
  if (!groqApiKey) throw new Error("GROQ_API_KEY no configurada");

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// ============================================
// GENERADORES DE CONTENIDO
// ============================================
async function generateInstagramCaption(
  productName: string,
  price: number,
  category: ProductCategory
): Promise<string> {
  const prompt = `Eres un copywriter viral de Instagram para e-commerce peruano.

Genera un caption ATRACTIVO y VIRAL para Instagram para este producto:
- Nombre: ${productName}
- Precio: S/ ${price.toFixed(2)}
- Categoría: ${category}

REGLAS:
- Máximo 220 caracteres
- Empieza con 1 emoji fuerte
- 1 pregunta que genere engagement
- 1 CTA claro (llamada a la acción)
- 2-3 emojis en total
- Habla al cliente de "tú"
- Crea urgencia sutil
- NO uses "compra ahora" (usa "descubre", "consíguelo")
- NO menciones descuentos si no los sabes

Responde SOLO el caption, sin explicaciones, sin comillas.`;

  return await callGroq(prompt, 0.9);
}

async function generateFacebookCaption(
  productName: string,
  price: number,
  category: ProductCategory
): Promise<string> {
  const prompt = `Eres un copywriter de Facebook para e-commerce peruano.

Genera un post ATRACTIVO para Facebook para:
- Nombre: ${productName}
- Precio: S/ ${price.toFixed(2)}
- Categoría: ${category}

REGLAS:
- Máximo 350 caracteres
- Empieza con emoji y hook fuerte
- 2-3 beneficios emocionales (no técnicos)
- 1 CTA claro
- 3-4 emojis estratégicos
- Habla al cliente de "tú"
- Estilo más informativo que Instagram
- NO uses "compra ahora"

Responde SOLO el post, sin explicaciones, sin comillas.`;

  return await callGroq(prompt, 0.8);
}

async function generateHashtags(
  productName: string,
  category: ProductCategory
): Promise<string[]> {
  const prompt = `Genera 15 hashtags optimizados para Instagram/TikTok Perú para este producto:
- Nombre: ${productName}
- Categoría: ${category}

REGLAS:
- Mezcla de trending + nichos + geolocalización
- Incluye hashtags Perú (#peru, #lima, #compraslocalperu)
- Incluye hashtags de categoría específica
- Formato: cada hashtag empieza con #
- Sin espacios, sin mayúsculas
- Un hashtag por línea
- SOLO los hashtags, sin numeración, sin explicaciones

Ejemplo formato:
#hashtag1
#hashtag2
#hashtag3`;

  const raw = await callGroq(prompt, 0.6);
  const hashtags = raw
    .split(/\n|\s+/)
    .map((t) => t.trim())
    .filter((t) => t.startsWith("#") && t.length > 2)
    .slice(0, 15);

  return hashtags.length > 0
    ? hashtags
    : ["#peru", "#compraslocalperu", "#emprendimientoperu", "#lima", "#dropshipperu"];
}

async function generateWhatsAppMessage(
  productName: string,
  price: number,
  storeName: string,
  storePhone: string
): Promise<string> {
  const prompt = `Eres un experto en marketing WhatsApp para tiendas peruanas.

Genera un mensaje persuasivo para enviar por WhatsApp Broadcast/Estado:
- Producto: ${productName}
- Precio: S/ ${price.toFixed(2)}
- Tienda: ${storeName}

REGLAS:
- Máximo 300 caracteres
- Empieza con emoji fuerte + saludo cálido
- 1 línea vendedora
- Precio destacado con emoji 💰
- CTA claro: "Escríbeme al ${storePhone}" o "Responde este mensaje"
- 3-4 emojis estratégicos
- Tono cercano peruano
- Máximo 4 líneas separadas por saltos

Responde SOLO el mensaje, sin explicaciones, sin comillas.`;

  return await callGroq(prompt, 0.8);
}

async function generateEmailSubject(productName: string): Promise<string> {
  const prompt = `Genera un asunto ATRACTIVO para email marketing sobre: ${productName}

REGLAS:
- Máximo 50 caracteres
- Genera curiosidad o urgencia
- Puede usar 1-2 emojis
- NO uses "compra ahora" o "descuento"

Responde SOLO el asunto, sin comillas, sin explicaciones.`;

  return await callGroq(prompt, 0.9);
}

async function generateEmailBody(
  productName: string,
  price: number,
  storeName: string
): Promise<string> {
  const prompt = `Genera el cuerpo de un email marketing profesional para:
- Producto: ${productName}
- Precio: S/ ${price.toFixed(2)}
- Tienda: ${storeName}

REGLAS:
- Estructura: Saludo + Hook + Beneficios + CTA + Cierre
- Máximo 500 caracteres
- Tono cercano y profesional
- 2-3 emojis estratégicos
- Habla al cliente de "tú"
- CTA: "Descúbrelo aquí" o "Conócelo"
- Cierre con nombre de tienda

Responde SOLO el cuerpo del email, sin asunto, sin comillas.`;

  return await callGroq(prompt, 0.8);
}

// ============================================
// HANDLER PRINCIPAL
// ============================================
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuario no autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    const {
      product_id,
      product_name,
      product_description = "",
      product_category = "",
      product_price,
      input_image_url,
      store_name = "Mi tienda",
      store_phone = "",
    } = body;

    if (!product_id || !product_name || !input_image_url) {
      return new Response(
        JSON.stringify({ error: "Faltan datos requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🍌 Launch AI: ${product_name} (user: ${user.email})`);

    // ========================================
    // VERIFICAR CRÉDITOS
    // ========================================
    const { data: subscription, error: subError } = await supabase
      .from("ai_subscriptions")
      .select("*")
      .eq("vendor_id", user.id)
      .maybeSingle();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: "No tienes suscripción AI activa." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isUnlimited = subscription.plan === "business";
    if (!isUnlimited && subscription.credits_remaining < CREDITS_COST) {
      return new Response(
        JSON.stringify({
          error: `Créditos insuficientes. Necesitas ${CREDITS_COST} y tienes ${subscription.credits_remaining}`,
          credits_remaining: subscription.credits_remaining,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================
    // GENERAR CONTENIDO EN PARALELO
    // ========================================
    const detectedCategory = detectProductCategory(
      product_name,
      product_description,
      product_category
    );
    console.log(`🎯 Categoría detectada: ${detectedCategory}`);

    console.log("🧠 Generando contenido con Groq...");
    const [
      captionInstagram,
      captionFacebook,
      hashtags,
      whatsappMessage,
      emailSubject,
      emailBody,
    ] = await Promise.all([
      generateInstagramCaption(product_name, product_price, detectedCategory),
      generateFacebookCaption(product_name, product_price, detectedCategory),
      generateHashtags(product_name, detectedCategory),
      generateWhatsAppMessage(product_name, product_price, store_name, store_phone),
      generateEmailSubject(product_name),
      generateEmailBody(product_name, product_price, store_name),
    ]);

    console.log("✅ Contenido generado");

    // ========================================
    // DESCONTAR CRÉDITOS
    // ========================================
    if (!isUnlimited) {
      const newCredits = subscription.credits_remaining - CREDITS_COST;
      const newUsed = (subscription.total_used || 0) + CREDITS_COST;
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
    // GUARDAR KIT EN BD
    // ========================================
    const generationTime = Date.now() - startTime;

    const kit = {
      product_id,
      vendor_id: user.id,
      detected_category: detectedCategory,
      original_image_url: input_image_url,
      enhanced_image_url: input_image_url, // 🔥 IGUAL a la original (por ahora)
      caption_instagram: captionInstagram,
      caption_facebook: captionFacebook,
      hashtags: hashtags,
      whatsapp_message: whatsappMessage,
      email_subject: emailSubject,
      email_body: emailBody,
      credits_used: CREDITS_COST,
      generation_time_ms: generationTime,
    };

    const { data: savedKit } = await supabase
      .from("product_launch_kits")
      .insert(kit)
      .select()
      .single();

    console.log(`✅ Kit guardado en ${generationTime}ms`);

    const finalCredits = isUnlimited
      ? -1
      : subscription.credits_remaining - CREDITS_COST;

    return new Response(
      JSON.stringify({
        success: true,
        kit: savedKit || kit,
        credits_used: CREDITS_COST,
        credits_remaining: finalCredits,
        generation_time_ms: generationTime,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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