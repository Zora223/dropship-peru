// supabase/functions/product-launch-ai/index.ts
// 🍌 Product Launch AI v3 - Personalización profunda + Prompts revolucionarios
// v22.3.0

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
}

interface StoreData {
  id: string;
  name: string;
  slug: string;
  contact_phone?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  description?: string;
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
// GROQ
// ============================================
async function callGroq(prompt: string, temperature = 0.85): Promise<string> {
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
// 🎨 PROMPTS REVOLUCIONARIOS
// ============================================

async function generateInstagramCaption(
  productName: string,
  price: number,
  category: ProductCategory,
  store: StoreData,
  productUrl: string
): Promise<string> {
  const socialHandle = store.instagram
    ? `@${store.instagram.replace(/[@\/]/g, "").replace("instagram.com/", "").trim()}`
    : "";

  const prompt = `Eres el mejor copywriter viral de Instagram Perú. Trabajas para "${store.name}", una tienda peruana.

TU MISIÓN: Crear un caption VIRAL que genere DESEO y URGENCIA para vender:
- Producto: ${productName}
- Precio: S/ ${price.toFixed(2)}
- Categoría: ${category}

REGLAS DE ORO:
1. GANCHO PODEROSO en la primera línea (pregunta, dato impactante, promesa)
2. HABLA DE BENEFICIOS EMOCIONALES (no características técnicas)
3. Crea FOMO sutil ("stock limitado" pero SIN ser desesperado)
4. USA EMOJIS ESTRATÉGICAMENTE (3-5 total, no más)
5. HABLA DE TÚ AL CLIENTE (peruano, cercano)
6. CTA CLARO al final (pero NO uses "compra ahora")
7. Máximo 200 caracteres para el cuerpo principal
8. Incluye el precio de forma llamativa

TÉCNICAS PROBADAS QUE FUNCIONAN:
- "¿Sabías que...?" (curiosidad)
- "Imagínate..." (visualización)
- "El secreto de las mujeres/hombres que..." (aspiracional)
- "3 razones por las que necesitas..." (listas)
- "Esto va a cambiar tu forma de..." (transformación)

EJEMPLO PERFECTO:
"✨ Ese detalle que dice 'sé lo que hago' sin decir nada.
Este vestido no solo abraza tu figura, cuenta tu historia.
💰 Solo S/ 89.90 · Stock limitado
🔗 Link en bio"

Responde SOLO el caption (SIN incluir link ni hashtags), sin comillas, sin explicaciones.`;

  const caption = await callGroq(prompt, 0.9);

  // Agregar CTA con social
  let footer = "";
  if (socialHandle) {
    footer = `\n\n📷 Síguenos ${socialHandle}`;
  }

  return caption + footer;
}

async function generateFacebookCaption(
  productName: string,
  price: number,
  category: ProductCategory,
  store: StoreData
): Promise<string> {
  const fbPage = store.facebook
    ? store.facebook.replace(/[\/]/g, "").replace("facebook.com/", "").trim()
    : "";

  const prompt = `Eres copywriter experto de Facebook para "${store.name}", tienda peruana.

CREA UN POST que VENDA para Facebook:
- Producto: ${productName}
- Precio: S/ ${price.toFixed(2)}
- Categoría: ${category}
${store.description ? `- Nuestra tienda: ${store.description}` : ""}

REGLAS ESPECÍFICAS FACEBOOK:
1. Más INFORMATIVO que Instagram (audiencia lee más)
2. Empieza con HOOK visual (emoji + frase impactante)
3. LISTA 3 BENEFICIOS con emojis (bullets visuales)
4. Menciona PRECIO con emoji 💰
5. CTA doble: comentar + escribir por WhatsApp
6. Máximo 320 caracteres
7. Tono peruano cercano pero profesional
${fbPage ? `8. Menciona nuestra página: /${fbPage}` : ""}

ESTRUCTURA GANADORA:
[Emoji + Hook]
[Descripción emocional 1 línea]
✨ Beneficio 1
✨ Beneficio 2  
✨ Beneficio 3
💰 [Precio]
👇 [CTA]

Responde SOLO el post, sin comillas, sin explicaciones.`;

  return await callGroq(prompt, 0.85);
}

async function generateHashtags(
  productName: string,
  category: ProductCategory,
  storeCity?: string
): Promise<string[]> {
  const prompt = `Genera EXACTAMENTE 15 hashtags virales para Instagram/TikTok Perú:
- Producto: ${productName}
- Categoría: ${category}
${storeCity ? `- Ciudad: ${storeCity}` : ""}

ESTRATEGIA:
- 5 hashtags de ALTA competencia (millones de posts): #moda #peru #compras
- 5 hashtags de MEDIA competencia (miles-cientos de miles): #modaperu #compraslocalperu
- 5 hashtags de NICHO específico del producto (miles): dependen del producto

REGLAS:
- Todos en minúsculas, sin espacios
- Empieza con #
- Un hashtag por línea
- SIN números al final
- SIN emojis
- Combina: tendencia + geolocalización Perú + nicho producto

Ejemplo formato:
#hashtag1
#hashtag2
#hashtag3`;

  const raw = await callGroq(prompt, 0.6);
  const hashtags = raw
    .split(/\n|\s+/)
    .map((t) => t.trim())
    .filter((t) => t.startsWith("#") && t.length > 2 && !/\d/.test(t))
    .slice(0, 15);

  return hashtags.length > 0
    ? hashtags
    : ["#peru", "#compraslocalperu", "#emprendimientoperu", "#lima", "#modaperu"];
}

async function generateWhatsAppMessage(
  productName: string,
  price: number,
  store: StoreData,
  productUrl: string
): Promise<string> {
  const contactPhone = store.whatsapp || store.contact_phone || "";
  const cleanPhone = contactPhone.replace(/[^\d]/g, "");

  const prompt = `Eres experto en WhatsApp Marketing para tiendas peruanas.

CREA MENSAJE PERSONALIZADO para ${store.name}:
- Producto: ${productName}
- Precio: S/ ${price.toFixed(2)}
- Tienda: ${store.name}

REGLAS:
1. Empieza con emoji cálido + saludo peruano ("¡Hola!" "¿Qué tal!")
2. Frase vendedora que despierte curiosidad
3. Menciona el producto con detalle
4. Precio con emoji 💰 destacado
5. Cierre con invitación (no presión)
6. Máximo 250 caracteres
7. Tono conversacional, como amigo cercano
8. Usa saltos de línea para respirar

ESTRUCTURA:
[Emoji + Saludo cálido]
[Hook: por qué este producto es especial]
🎯 [Producto]
💰 S/ [Precio]
[CTA suave: "¿Te interesa?" o "Cuéntame si quieres detalles"]

Responde SOLO el mensaje, sin comillas.`;

  const message = await callGroq(prompt, 0.85);

  // Agregar CTA con contacto real
  let footer = "";
  if (cleanPhone) {
    footer = `\n\n📱 ${cleanPhone}`;
  }

  return message + footer;
}

async function generateEmailSubject(
  productName: string,
  storeName: string
): Promise<string> {
  const prompt = `Genera un ASUNTO de email IRRESISTIBLE (que NO parezca spam) para:
- Tienda: ${storeName}
- Producto: ${productName}

REGLAS:
- Máximo 45 caracteres
- Genera CURIOSIDAD sin ser clickbait
- Puedes usar máximo 1 emoji
- NO uses: "OFERTA" "DESCUENTO" "COMPRA YA" (van a spam)
- Sí usa: "descubre" "conoce" "para ti"
- Tono personal, como si fuera de un amigo

Ejemplos buenos:
"Pensé en ti al ver esto 💭"
"El detalle que te va a encantar"
"Nuevo en ${storeName}: échale un vistazo"

Responde SOLO el asunto, sin comillas.`;

  return await callGroq(prompt, 0.9);
}

async function generateEmailBody(
  productName: string,
  price: number,
  store: StoreData
): Promise<string> {
  const prompt = `Genera un EMAIL MARKETING profesional para ${store.name}:
- Producto: ${productName}
- Precio: S/ ${price.toFixed(2)}

ESTRUCTURA GANADORA:
1. Saludo cálido personal
2. Hook: por qué le puede interesar
3. Descripción emocional (2-3 líneas)
4. Beneficios en bullets (2-3)
5. Precio con contexto de valor
6. CTA claro (link al producto)
7. Firma con nombre de tienda

REGLAS:
- Máximo 400 caracteres
- Tono cercano pero profesional
- 2 emojis máximo
- Habla de TÚ al cliente
- NO uses "compra ahora"
- Sí usa "descúbrelo" "conócelo" "échale un vistazo"

Responde SOLO el cuerpo del email, sin asunto, sin firma final (yo la agrego).`;

  const body = await callGroq(prompt, 0.85);

  return `${body}\n\n💜 El equipo de ${store.name}`;
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
    } = body;

    if (!product_id || !product_name || !input_image_url) {
      return new Response(
        JSON.stringify({ error: "Faltan datos requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🍌 Launch AI v3: ${product_name} (user: ${user.email})`);

    // ========================================
    // OBTENER DATOS DE LA TIENDA
    // ========================================
    const { data: storeData } = await supabase
      .from("stores")
      .select("id, name, slug, contact_phone, whatsapp, instagram, facebook, description")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!storeData) {
      return new Response(
        JSON.stringify({ error: "No tienes tienda registrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const store: StoreData = storeData;
    const baseUrl = "https://dropship-peru-mym.netlify.app";
    const productUrl = `${baseUrl}/tienda/${store.slug}?producto=${product_id}`;

    console.log(`🏪 Tienda: ${store.name} (/${store.slug})`);

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
    // GENERAR CONTENIDO PERSONALIZADO
    // ========================================
    const detectedCategory = detectProductCategory(
      product_name,
      product_description,
      product_category
    );
    console.log(`🎯 Categoría: ${detectedCategory}`);

    console.log("🧠 Generando contenido personalizado con Groq...");
    const [
      captionInstagram,
      captionFacebook,
      hashtags,
      whatsappMessage,
      emailSubject,
      emailBody,
    ] = await Promise.all([
      generateInstagramCaption(product_name, product_price, detectedCategory, store, productUrl),
      generateFacebookCaption(product_name, product_price, detectedCategory, store),
      generateHashtags(product_name, detectedCategory),
      generateWhatsAppMessage(product_name, product_price, store, productUrl),
      generateEmailSubject(product_name, store.name),
      generateEmailBody(product_name, product_price, store),
    ]);

    console.log("✅ Contenido generado y personalizado");

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
      enhanced_image_url: input_image_url,
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
        store: {
          name: store.name,
          slug: store.slug,
          whatsapp: store.whatsapp || store.contact_phone,
          instagram: store.instagram,
          facebook: store.facebook,
        },
        product_url: productUrl,
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