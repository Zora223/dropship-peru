// supabase/functions/product-launch-ai/index.ts
// 🍌 v22.9 - MEGA PROMPT + Doble API key + 1 solo request

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL_LARGE = "llama-3.3-70b-versatile";
const MODEL_FAST = "llama-3.1-8b-instant";
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

interface MegaKit {
  instagram: string;
  facebook: string;
  hashtags: string[];
  whatsapp: string;
  tiktok: string;
  email_subject: string;
  email_body: string;
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
// UTILS
// ============================================
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 🆕 v22.9: Sistema de doble API key con failover
function getApiKeys(): string[] {
  const key1 = Deno.env.get("GROQ_API_KEY");
  const key2 = Deno.env.get("GROQ_API_KEY_2");
  const keys: string[] = [];
  if (key1) keys.push(key1);
  if (key2) keys.push(key2);
  if (keys.length === 0) throw new Error("No hay GROQ API keys configuradas");
  return keys;
}

async function callGroq(
  prompt: string,
  temperature = 0.85,
  model = MODEL_LARGE,
  maxTokens = 2048
): Promise<string> {
  const apiKeys = getApiKeys();
  let lastError: Error | null = null;

  // Intentar con cada key
  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const apiKey = apiKeys[keyIndex];
    const keyLabel = keyIndex === 0 ? "principal" : "respaldo";

    // 2 intentos por key
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`🔑 Usando API key ${keyLabel} (intento ${attempt}/2)`);

        const response = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature,
            max_tokens: maxTokens,
          }),
        });

        if (response.status === 429) {
          console.log(`⏱️ Rate limit en key ${keyLabel}, probando siguiente...`);
          lastError = new Error(`Rate limit key ${keyLabel}`);
          break; // Salir del loop de intentos, probar siguiente key
        }

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`Groq error ${response.status}: ${err}`);
        }

        const data = await response.json();
        console.log(`✅ Respuesta OK con key ${keyLabel}`);
        return data.choices?.[0]?.message?.content?.trim() || "";
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.log(`⚠️ Error con key ${keyLabel}: ${lastError.message}`);
        if (attempt === 1) await sleep(1000);
      }
    }
  }

  throw lastError || new Error("Todos los intentos fallaron");
}

// ============================================
// 🎨 MEGA PROMPT - TODO EN UN SOLO REQUEST
// ============================================
async function generateMegaKit(
  productName: string,
  price: number,
  category: ProductCategory,
  store: StoreData,
  productUrl: string
): Promise<MegaKit> {
  const igHandle = store.instagram
    ? `@${store.instagram.replace(/[@\/]/g, "").replace("instagram.com/", "").trim()}`
    : "";
  const fbPage = store.facebook
    ? store.facebook.replace(/[\/]/g, "").replace("facebook.com/", "").trim()
    : "";

  const prompt = `Eres el mejor copywriter multi-plataforma para tiendas peruanas. Genera un kit COMPLETO de marketing.

═══ CONTEXTO ═══
- Tienda: ${store.name}
- Producto: ${productName}
- Precio: S/ ${price.toFixed(2)}
- Categoría: ${category}
${store.description ? `- Descripción tienda: ${store.description}` : ""}
${igHandle ? `- Instagram: ${igHandle}` : ""}
${fbPage ? `- Facebook: facebook.com/${fbPage}` : ""}

═══ TAREA ═══
Genera un objeto JSON con exactamente esta estructura (SIN texto adicional):

{
  "instagram": "Caption aspiracional Instagram (máx 180 chars, 3-5 emojis, SIN hashtags aquí, SIN link)",
  "facebook": "Post Facebook informativo (máx 320 chars, 2-3 beneficios con ✨, precio con 💰, CTA doble, SIN hashtags)",
  "hashtags": ["#hashtag1", "#hashtag2", "... EXACTO 20 hashtags Perú"],
  "whatsapp": "Mensaje WhatsApp personal (máx 200 chars, saludo cálido, CERO hashtags, CERO link, tono amigo)",
  "tiktok": "Caption TikTok viral (máx 100 chars, POV/Cuando/Nadie, 2-3 emojis, SIN hashtags aquí)",
  "email_subject": "Asunto email (máx 45 chars, sin palabras spam)",
  "email_body": "Cuerpo email profesional (máx 500 chars, 3 beneficios con ✓, tono cercano, SIN hashtags)"
}

═══ REGLAS POR CAMPO ═══

📷 INSTAGRAM (Aspiracional):
- Gancho poderoso primera línea
- Habla de beneficios EMOCIONALES
- CTA sutil: "Descubre" "Consíguelo"
- Precio con ✨💰
- Ejemplo: "✨ Ese vestido que cuenta tu historia. Elegancia que empodera 💫\\n💰 S/ 89.90 · Últimas piezas"

📘 FACEBOOK (Informativo):
- Hook visual con emoji
- Bullets con ✨ o 🔥
- CTA: "Escríbenos" + "Visítanos"
- Habla en plural "nosotros"
- Ejemplo: "🔥 Nuevo en ${store.name}\\nDiseño único.\\n✨ Tela premium\\n✨ Perfecto para ocasiones\\n💰 S/ 89.90\\n📩 Escríbenos"

🏷️ HASHTAGS (20 exactos):
- 5 grandes: #moda #fashion #peru #compras #style
- 8 medianos: #modaperu #compraslocalperu #modafemeninaperu #comprasonlineperu
- 7 nicho: relacionados al producto exacto
- Sin espacios, sin mayúsculas, sin números al final

💬 WHATSAPP (Personal):
- Saludo peruano: "¡Hola!" "Hola bella/guapo"
- NUNCA hashtags
- Tono amigo cercano
- CTA suave: "¿Te interesa?"
- Ejemplo: "¡Hola bella! 💜\\n\\nTengo algo que te va a encantar...\\n\\nVestido casual único.\\n\\n💰 S/ 89.90\\n\\n¿Quieres más fotos?"

🎵 TIKTOK (Viral):
- POV / Cuando / Nadie
- Slang joven peruano
- Sin punto final
- Ejemplo: "POV: encontraste el vestido perfecto 💅✨"

📧 EMAIL SUBJECT:
- NO spam words (GRATIS, OFERTA, 50% OFF)
- SÍ: "descubre" "para ti" "nuevo"
- Máx 1 emoji
- Ejemplo: "Pensé en ti al verlo 💭"

📧 EMAIL BODY:
- Saludo cálido
- Hook + descripción + 3 beneficios ✓
- Precio con contexto
- CTA "descúbrelo" (SIN "compra ahora")

═══ IMPORTANTE ═══
1. Responde SOLO el JSON válido, sin texto antes/después
2. Sin comillas triples, sin markdown
3. Escapa correctamente comillas dobles con \\"
4. Usa \\n para saltos de línea
5. Los hashtags SIN # dentro del array son inválidos
6. Ejemplo válido de inicio: {"instagram":"..."

RESPONDE AHORA (solo JSON):`;

  console.log("🧠 Enviando MEGA PROMPT (1 solo request)...");
  const response = await callGroq(prompt, 0.85, MODEL_LARGE, 3000);

  // Parse JSON robusto
  let parsed: MegaKit;
  try {
    // Limpiar respuesta (quitar posibles ```json...```)
    let clean = response.trim();
    if (clean.startsWith("```json")) clean = clean.slice(7);
    if (clean.startsWith("```")) clean = clean.slice(3);
    if (clean.endsWith("```")) clean = clean.slice(0, -3);
    clean = clean.trim();

    // Buscar el JSON en la respuesta
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No se encontró JSON en la respuesta");

    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("❌ Error parseando JSON:", err);
    console.error("Respuesta cruda:", response.slice(0, 500));
    throw new Error("El AI no devolvió JSON válido. Reintenta.");
  }

  // Validar estructura
  const required: (keyof MegaKit)[] = [
    "instagram",
    "facebook",
    "hashtags",
    "whatsapp",
    "tiktok",
    "email_subject",
    "email_body",
  ];
  for (const field of required) {
    if (!parsed[field]) {
      console.warn(`⚠️ Campo faltante: ${field}, usando fallback`);
      // Fallbacks
      if (field === "hashtags") parsed.hashtags = ["#peru", "#compraslocalperu", "#emprendimientoperu", "#lima", "#modaperu"];
      else parsed[field] = "" as any;
    }
  }

  // Asegurar hashtags array válido
  if (!Array.isArray(parsed.hashtags)) {
    parsed.hashtags = ["#peru", "#compraslocalperu", "#emprendimientoperu"];
  }

  // Limpiar hashtags
  parsed.hashtags = parsed.hashtags
    .map((t) => (t.startsWith("#") ? t : `#${t}`))
    .filter((t) => t.length > 1)
    .slice(0, 20);

  // Agregar footers automáticos
  if (igHandle && !parsed.instagram.includes(igHandle)) {
    parsed.instagram += `\n\n📷 Síguenos: ${igHandle}`;
  }

  if (!parsed.facebook.includes(productUrl)) {
    parsed.facebook += `\n\n🔗 Ver más: ${productUrl}`;
    if (fbPage) {
      parsed.facebook += `\n📘 Síguenos: facebook.com/${fbPage}`;
    }
  }

  if (!parsed.email_body.includes(productUrl)) {
    parsed.email_body += `\n\n🔗 Ver producto:\n${productUrl}\n\nCon cariño,\nEl equipo de ${store.name} 💜`;
  }

  console.log("✅ MEGA KIT parseado y enriquecido correctamente");
  return parsed;
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

    console.log(`🍌 Launch AI v22.9 MEGA: ${product_name} (user: ${user.email})`);

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

    // 🚀 v22.9: UN SOLO REQUEST PARA TODO
    const megaKit = await generateMegaKit(
      product_name,
      product_price,
      detectedCategory,
      store,
      productUrl
    );

    console.log("✅ Kit completo generado en 1 request");

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

    const generationTime = Date.now() - startTime;

    const kit = {
      product_id,
      vendor_id: user.id,
      detected_category: detectedCategory,
      original_image_url: input_image_url,
      enhanced_image_url: input_image_url,
      caption_instagram: megaKit.instagram,
      caption_facebook: megaKit.facebook,
      hashtags: megaKit.hashtags,
      whatsapp_message: megaKit.whatsapp,
      tiktok_caption: megaKit.tiktok,
      email_subject: megaKit.email_subject,
      email_body: megaKit.email_body,
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