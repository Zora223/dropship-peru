// supabase/functions/product-launch-ai/index.ts
// 🍌 v22.4 - Prompts ESPECIALIZADOS por red social

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
// 🎨 PROMPTS ESPECIALIZADOS POR RED SOCIAL
// ============================================

// 📷 INSTAGRAM: Aspiracional, visual, con hashtags integrados en caption
async function generateInstagramCaption(
  productName: string,
  price: number,
  category: ProductCategory,
  store: StoreData
): Promise<string> {
  const igHandle = store.instagram
    ? `@${store.instagram.replace(/[@\/]/g, "").replace("instagram.com/", "").trim()}`
    : "";

  const prompt = `Eres el mejor copywriter de INSTAGRAM Perú, especializado en captions VIRALES.

CONTEXTO:
- Tienda: ${store.name}
- Producto: ${productName}
- Precio: S/ ${price.toFixed(2)}
- Categoría: ${category}

CARACTERÍSTICAS DE INSTAGRAM:
- Audiencia visual, joven-adulta
- Tono ASPIRACIONAL (hacer soñar)
- Storytelling emocional
- Los usuarios NO leen mucho, gancho fuerte

REGLAS ESTRICTAS:
1. GANCHO PODEROSO primera línea (pregunta, dato, transformación)
2. Máximo 180 caracteres CUERPO PRINCIPAL
3. 3-5 emojis ESTRATÉGICOS (no decorativos)
4. HABLA DE BENEFICIOS EMOCIONALES (autoestima, admiración, confianza)
5. CTA sutil: "Descubre" "Consíguelo" "Hazlo tuyo" (NUNCA "compra ahora")
6. Menciona precio con emoji ✨💰
7. Frase de urgencia sutil ("Stock limitado", "Últimas piezas")
8. NO uses "link en bio" (ya se agrega automático)
9. NO agregues hashtags aquí (van separados)

FÓRMULAS QUE FUNCIONAN:
- "Ese detalle que dice todo sin decir nada..."
- "El secreto detrás de [transformación]"
- "Imagínate [visualización deseada]"
- "3 razones por las que [beneficio]"

EJEMPLO PERFECTO:
"✨ Ese vestido que cuenta tu historia sin necesidad de palabras.
Elegancia que abraza, feminidad que empodera 💫
💰 S/ 89.90 · Últimas piezas"

Responde SOLO el caption, sin comillas, sin hashtags, sin explicaciones.`;

  const caption = await callGroq(prompt, 0.9);

  // Agregar handle de Instagram si existe
  let footer = "";
  if (igHandle) {
    footer = `\n\n📷 Síguenos: ${igHandle}`;
  }

  return caption + footer;
}

// 📘 FACEBOOK: Informativo, con link, más largo, sin hashtags
async function generateFacebookCaption(
  productName: string,
  price: number,
  category: ProductCategory,
  store: StoreData,
  productUrl: string
): Promise<string> {
  const fbPage = store.facebook
    ? store.facebook.replace(/[\/]/g, "").replace("facebook.com/", "").trim()
    : "";

  const prompt = `Eres copywriter EXPERTO de FACEBOOK para tiendas peruanas.

CONTEXTO:
- Tienda: ${store.name}
- Producto: ${productName}
- Precio: S/ ${price.toFixed(2)}
- Categoría: ${category}
${store.description ? `- Descripción tienda: ${store.description}` : ""}

CARACTERÍSTICAS DE FACEBOOK:
- Audiencia más adulta (25-55 años)
- Leen MÁS que en Instagram
- Buscan INFORMACIÓN + CONFIANZA
- Los posts con LINK funcionan bien (a diferencia de IG)
- Los hashtags NO funcionan igual (usa máximo 2)

REGLAS ESTRICTAS:
1. HOOK visual primera línea (emoji + frase impactante)
2. 2-3 BENEFICIOS CONCRETOS en bullets con ✨ o 🔥
3. Máximo 320 caracteres TOTAL
4. Tono INFORMATIVO pero cercano peruano
5. Precio destacado con 💰
6. CTA DOBLE: "Escríbenos" + "Visítanos" 
7. Menciona GARANTÍA/CONFIANZA (envío, calidad)
8. NO uses hashtags dentro del texto (máximo 2 al final si son necesarios)
9. Habla en PLURAL (nosotros, nuestra tienda)

ESTRUCTURA GANADORA:
[Emoji + Hook]
[Descripción emocional 1 línea]
✨ [Beneficio 1]
✨ [Beneficio 2]
💰 [Precio]
📩 [CTA cerrar venta]

EJEMPLO PERFECTO:
"🔥 Nuevo en Infinity Shop
Diseño único que resalta lo mejor de ti.
✨ Tela premium que abraza tu figura
✨ Perfecto para ocasiones especiales
💰 Solo S/ 89.90
📩 Escríbenos por WhatsApp y coordinamos tu envío 🚚"

Responde SOLO el post, sin comillas, sin explicaciones.`;

  const caption = await callGroq(prompt, 0.85);

  // Facebook SÍ soporta links directos
  let footer = `\n\n🔗 Ver más: ${productUrl}`;
  if (fbPage) {
    footer += `\n📘 Síguenos: facebook.com/${fbPage}`;
  }

  return caption + footer;
}

// 🏷️ HASHTAGS: Solo para Instagram/TikTok (NO WhatsApp/Facebook)
async function generateHashtags(
  productName: string,
  category: ProductCategory
): Promise<string[]> {
  const prompt = `Genera EXACTAMENTE 20 hashtags para Instagram Perú.

Producto: ${productName}
Categoría: ${category}

MEZCLA ESTRATÉGICA:
- 5 hashtags GRANDES (millones): #moda #fashion #peru #compras #style
- 8 hashtags MEDIANOS (miles-cientos miles): #modaperu #compraslocalperu #modafemeninaperu
- 7 hashtags NICHO ESPECÍFICO: relacionados al producto exacto

REGLAS:
- Todos con #
- Sin espacios, sin mayúsculas
- Sin números al final
- Un hashtag por línea
- SIN emojis
- Combinar tendencia + geo Perú + nicho

Ejemplo formato:
#hashtag1
#hashtag2
#hashtag3`;

  const raw = await callGroq(prompt, 0.6);
  const hashtags = raw
    .split(/\n|\s+/)
    .map((t) => t.trim())
    .filter((t) => t.startsWith("#") && t.length > 2 && !/\d/.test(t))
    .slice(0, 20);

  return hashtags.length > 0
    ? hashtags
    : ["#peru", "#compraslocalperu", "#emprendimientoperu", "#lima", "#modaperu"];
}

// 💬 WHATSAPP: Personal, íntimo, SIN hashtags, corto
async function generateWhatsAppMessage(
  productName: string,
  price: number,
  category: ProductCategory,
  store: StoreData,
  productUrl: string
): Promise<string> {
  const contactPhone = store.whatsapp || store.contact_phone || "";
  const cleanPhone = contactPhone.replace(/[^\d]/g, "");

  const prompt = `Eres experto en WHATSAPP MARKETING para tiendas peruanas.

CONTEXTO:
- Tienda: ${store.name}
- Producto: ${productName}
- Precio: S/ ${price.toFixed(2)}
- Categoría: ${category}

CARACTERÍSTICAS DE WHATSAPP:
- Conversación 1 a 1 (íntimo)
- El cliente LEE COMPLETO (a diferencia de IG)
- Se lee en 5 segundos máximo
- CERO hashtags (parece spam)
- Máximo 2-3 emojis
- Tono de AMIGO/CONFIANZA
- Usar SALTOS DE LÍNEA para respirar

REGLAS ESTRICTAS:
1. Saludo cálido peruano: "¡Hola!" "¿Qué tal?" "Hola bella/guapo"
2. NUNCA uses hashtags (#)
3. Máximo 200 caracteres TOTAL
4. Frase corta que despierte curiosidad
5. Producto con detalle breve
6. Precio con 💰 destacado
7. CTA suave: "¿Te interesa?" "Cuéntame" "Escríbeme"
8. Tono como si fuera amiga/o cercano
9. NO uses "compra ahora" ni presión
10. NO menciones "stock limitado" (para IG sí, para WA no)

ESTRUCTURA GANADORA:
[Saludo cálido con emoji]

[Hook personal: "Tengo algo que te va a encantar" o "Mira lo que llegó"]

[Producto en 1 línea]

💰 Precio: S/ [precio]

[CTA suave: "¿Te interesa?" o "¿Quieres verlo?"]

EJEMPLO PERFECTO:
"¡Hola bella! 💜

Tengo algo que te va a encantar...

Vestido casual vino que abraza tu figura de forma única.

💰 Solo S/ 89.90

¿Quieres que te mande más fotos?"

Responde SOLO el mensaje, sin comillas, sin hashtags, sin explicaciones.`;

  const message = await callGroq(prompt, 0.85);

  // Agregar link + teléfono al final (WhatsApp SÍ acepta links)
  let footer = `\n\n🔗 Ver detalles:\n${productUrl}`;
  if (cleanPhone) {
    footer += `\n\n📱 O escríbeme: +51 ${cleanPhone}`;
  }

  return message + footer;
}

// 🎵 TIKTOK: Muy corto, trendy, con hashtags
async function generateTikTokCaption(
  productName: string,
  category: ProductCategory,
  store: StoreData
): Promise<string> {
  const prompt = `Eres creador viral de TIKTOK Perú, expert en captions.

CONTEXTO:
- Tienda: ${store.name}
- Producto: ${productName}
- Categoría: ${category}

CARACTERÍSTICAS DE TIKTOK:
- Audiencia MUY joven (Gen Z / millennials jóvenes)
- Tono TRENDY, casual, divertido
- MUY CORTO (máx 100 caracteres)
- Los hashtags 3-5 MÁXIMO (integrados)
- Usa slang joven pero peruano
- Los captions viral usan FÓRMULAS conocidas

REGLAS:
1. MÁXIMO 100 caracteres
2. Tono casual, como texting con amigos
3. Usa frases como: "Cuando..." "POV:" "Nadie:"
4. 2-3 emojis MÁXIMO
5. Sin punto final
6. Puede ser 1 sola línea potente

FÓRMULAS VIRALES:
- "POV: encontraste [producto perfecto]"
- "Cuando por fin encuentras [beneficio]"
- "Este [producto] hits diferente"
- "Necesitas esto en tu vida"
- "Nadie:\n[Producto]: [transformación]"

EJEMPLO PERFECTO:
"POV: encontraste el vestido perfecto para todo 💅✨"

Responde SOLO el caption, sin comillas, sin explicaciones.`;

  return await callGroq(prompt, 0.95);
}

// 📧 EMAIL: Formal-cercano, con estructura completa, sin hashtags
async function generateEmailSubject(
  productName: string,
  storeName: string
): Promise<string> {
  const prompt = `Genera un ASUNTO DE EMAIL para ${storeName}.

Producto: ${productName}

REGLAS ESTRICTAS EMAIL:
1. Máximo 45 caracteres (importante para no cortarse en móvil)
2. NO uses spam words: "GRATIS" "OFERTA" "50% OFF" "COMPRA YA"
3. SÍ usa: "descubre" "conoce" "para ti" "nuevo"
4. Máximo 1 emoji
5. Tono personal, no corporativo
6. Genera curiosidad sin ser clickbait

BUENOS EJEMPLOS:
"Pensé en ti al verlo 💭"
"Algo nuevo para ti en ${storeName}"
"Descubre lo último en ${storeName}"
"El detalle que estabas buscando"

Responde SOLO el asunto, sin comillas.`;

  return await callGroq(prompt, 0.9);
}

async function generateEmailBody(
  productName: string,
  price: number,
  store: StoreData,
  productUrl: string
): Promise<string> {
  const prompt = `Genera CUERPO DE EMAIL profesional para ${store.name}.

Producto: ${productName}
Precio: S/ ${price.toFixed(2)}

CARACTERÍSTICAS EMAIL:
- Se lee CON CALMA (no como IG)
- Estructura formal-cercana
- CERO hashtags (parece spam)
- Máximo 2 emojis
- Habla de TÚ al cliente
- Firma con nombre de tienda

ESTRUCTURA:
[Saludo personal cálido]

[Hook: por qué le puede interesar]

[Descripción emocional del producto - 2 líneas]

[3 beneficios en párrafo o bullets con ✓]

[Precio con contexto de valor]

[CTA claro con link]

REGLAS:
1. Máximo 500 caracteres cuerpo
2. NO uses hashtags (#)
3. NO uses "compra ahora"
4. SÍ usa "descúbrelo" "conócelo" "échale un vistazo"
5. Menciona confianza (envío, calidad)

EJEMPLO PERFECTO:
"Hola,

Hoy queremos compartirte algo especial que llegó a ${store.name}.

Un vestido casual vino diseñado para resaltar tu esencia. Cómodo, elegante y perfecto para cualquier ocasión.

✓ Tela premium y cómoda
✓ Diseño exclusivo
✓ Envío seguro a todo Perú

Por solo S/ 89.90, es una inversión que vale la pena.

Descúbrelo aquí 👉 [LINK]"

Responde SOLO el cuerpo, sin asunto, sin firma final (yo la agrego).`;

  const body = await callGroq(prompt, 0.85);

  return `${body}\n\n🔗 Ver producto:\n${productUrl}\n\nCon cariño,\nEl equipo de ${store.name} 💜`;
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

    console.log(`🍌 Launch AI v4: ${product_name} (user: ${user.email})`);

    // OBTENER DATOS TIENDA
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

    // VERIFICAR CRÉDITOS
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

    const detectedCategory = detectProductCategory(
      product_name,
      product_description,
      product_category
    );
    console.log(`🎯 Categoría: ${detectedCategory}`);

    // GENERAR CONTENIDO ESPECIALIZADO POR RED
    console.log("🧠 Generando contenido especializado por red...");
    const [
      captionInstagram,
      captionFacebook,
      hashtags,
      whatsappMessage,
      tiktokCaption,
      emailSubject,
      emailBody,
    ] = await Promise.all([
      generateInstagramCaption(product_name, product_price, detectedCategory, store),
      generateFacebookCaption(product_name, product_price, detectedCategory, store, productUrl),
      generateHashtags(product_name, detectedCategory),
      generateWhatsAppMessage(product_name, product_price, detectedCategory, store, productUrl),
      generateTikTokCaption(product_name, detectedCategory, store),
      generateEmailSubject(product_name, store.name),
      generateEmailBody(product_name, product_price, store, productUrl),
    ]);

    console.log("✅ Contenido especializado generado");

    // DESCONTAR CRÉDITOS
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

    // GUARDAR KIT
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
      tiktok_caption: tiktokCaption,
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