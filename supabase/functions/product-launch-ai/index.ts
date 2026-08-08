// supabase/functions/product-launch-ai/index.ts
// 🍌 v22.11 - SENIOR MASTER + Inclusivo + Variación total + Gatillos mentales

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
// 🎯 DETECCIÓN AVANZADA DE CATEGORÍA + GÉNERO
// ============================================
type ProductCategory =
  | "clothing_female"
  | "clothing_male"
  | "clothing_unisex"
  | "clothing_kids"
  | "toys"
  | "accessories_female"
  | "accessories_male"
  | "accessories_unisex"
  | "electronics"
  | "beauty"
  | "pets"
  | "kitchen"
  | "home"
  | "sports"
  | "office"
  | "generic";

type ProductGender = "female" | "male" | "unisex" | "kids";

interface ProductContext {
  category: ProductCategory;
  gender: ProductGender;
  isGiftable: boolean;
  priceRange: "budget" | "mid" | "premium";
  buyerPersonas: string[];
}

function analyzeProductContext(
  name: string,
  description: string,
  category: string,
  price: number
): ProductContext {
  const text = `${name} ${description} ${category}`.toLowerCase();
  const matches = (keywords: string[]) => keywords.some((kw) => text.includes(kw));

  // Detectar género
  let gender: ProductGender = "unisex";
  if (matches(["mujer", "dama", "femenin", "chica", "señora", "señorita", "brasier", "falda", "vestido", "blusa", "leggins", "crop", "top", "cartera", "labial", "sombra"])) {
    gender = "female";
  } else if (matches(["hombre", "varón", "masculin", "caballero", "chico", "señor", "terno", "corbata"])) {
    gender = "male";
  } else if (matches(["niño", "niña", "bebé", "infantil", "kids", "chibolo", "chibolito"])) {
    gender = "kids";
  }

  // Detectar categoría
  let cat: ProductCategory = "generic";
  if (matches(["blusa", "polo mujer", "jean mujer", "falda", "vestido", "chompa mujer", "chaqueta mujer", "pantalon mujer", "short mujer", "top", "crop", "brasier", "leggins", "ropa mujer", "ropa femenina"])) {
    cat = "clothing_female";
  } else if (matches(["camisa hombre", "polo hombre", "terno", "pantalon hombre", "short hombre", "chompa hombre", "chaqueta hombre", "ropa hombre"])) {
    cat = "clothing_male";
  } else if (matches(["polo unisex", "hoodie", "sudadera", "casaca"]) && gender === "unisex") {
    cat = "clothing_unisex";
  } else if (matches(["ropa niño", "ropa bebé", "pañal", "body bebé"])) {
    cat = "clothing_kids";
  } else if (matches(["juguete", "muñeca", "peluche", "lego", "bloques", "carrito", "figura", "rompecabezas", "didactico"])) {
    cat = "toys";
  } else if (matches(["arete", "pulsera", "collar", "anillo", "bisuteria", "vincha", "diadema"]) && gender === "female") {
    cat = "accessories_female";
  } else if (matches(["reloj hombre", "cartera hombre", "billetera"]) && gender === "male") {
    cat = "accessories_male";
  } else if (matches(["mochila", "cartera", "billetera", "cinturón", "reloj", "gafas", "lentes"])) {
    cat = "accessories_unisex";
  } else if (matches(["audifono", "celular", "cargador", "cable", "usb", "parlante", "smartwatch", "auricular", "tablet", "laptop", "mouse", "teclado"])) {
    cat = "electronics";
  } else if (matches(["labial", "sombra", "polvo", "base", "mascara", "crema", "serum", "perfume", "maquillaje", "esmalte"])) {
    cat = "beauty";
  } else if (matches(["perro", "gato", "mascota", "cama para", "correa", "comedero", "arenero"])) {
    cat = "pets";
  } else if (matches(["olla", "sarten", "utensilio", "cuchara", "cuchillo cocina", "tabla picar"])) {
    cat = "kitchen";
  } else if (matches(["decoracion", "mueble", "lampara", "cortina", "almohada", "cojin", "sabanas", "edredon"])) {
    cat = "home";
  } else if (matches(["deportivo", "fitness", "yoga", "gimnasio", "pesa", "mancuerna", "proteina", "colchoneta"])) {
    cat = "sports";
  } else if (matches(["oficina", "escritorio", "silla", "libreta", "cuaderno", "lapicero", "impresora"])) {
    cat = "office";
  }

  // Detectar rango de precio (Perú)
  let priceRange: "budget" | "mid" | "premium" = "mid";
  if (price < 30) priceRange = "budget";
  else if (price > 150) priceRange = "premium";

  // Detectar si es giftable (regalable)
  const isGiftable = !matches(["repuesto", "herramienta", "insumo", "material"]);

  // Buyer personas potenciales
  const buyerPersonas: string[] = [];
  if (gender === "female") {
    buyerPersonas.push("mujer que compra para sí misma", "novio buscando regalo", "esposo/pareja", "amiga que regala", "mamá que regala a su hija", "hija que regala a mamá");
  } else if (gender === "male") {
    buyerPersonas.push("hombre que compra para sí mismo", "novia buscando regalo", "esposa/pareja", "amigo que regala", "mamá que regala a su hijo", "hija que regala a papá");
  } else if (gender === "kids") {
    buyerPersonas.push("padres para su hijo/a", "abuelos", "tíos", "padrinos", "amigos de la familia");
  } else {
    buyerPersonas.push("uso personal", "regalo para pareja", "regalo para amig@", "regalo empresarial", "autoregalo");
  }

  return {
    category: cat,
    gender,
    isGiftable,
    priceRange,
    buyerPersonas,
  };
}

// ============================================
// 🎨 BANCOS DE VARIACIÓN (para kits únicos)
// ============================================

const INSTAGRAM_STYLES = [
  "aspiracional_poetico",
  "minimalista_directo",
  "storytelling_emocional",
  "provocador_curiosidad",
  "testimonial_inspirador",
];

const FACEBOOK_STYLES = [
  "informativo_confianza",
  "beneficios_bullets",
  "comparativo_valor",
  "educativo_experto",
  "testimonial_social",
];

const WHATSAPP_STYLES = [
  "casual_amigable",
  "entusiasta_directo",
  "consultivo_pregunta",
  "presentacion_novedad",
  "recomendacion_personal",
];

const TIKTOK_STYLES = [
  "pov_visual",
  "cuando_relatable",
  "storytime_breve",
  "trend_educativo",
  "shock_curiosidad",
];

const WHATSAPP_GREETINGS = [
  "¡Hola! 👋",
  "¡Buenas! ✨",
  "¡Ey qué tal! 💫",
  "¡Hola qué gusto! 💜",
  "Hola! Cómo estás? 🌟",
  "¡Buen día! ☀️",
  "¡Hola bonit@! 💛",
];

const CTA_INSTAGRAM = [
  "🔔 Sígueme para más novedades como esta",
  "✨ Guarda este post, tienes que verlo bien",
  "❤️ Dale like si te enamoraste",
  "💌 Escríbeme al DM para más info",
  "🎁 Comparte con alguien que le encantaría",
];

const CTA_FACEBOOK = [
  "👍 Dale like si te gustó",
  "🔄 Comparte con quien lo necesita",
  "📩 Consulta cualquier duda por DM",
  "🔥 Muchos más productos nuevos esperándote",
];

const CTA_WHATSAPP = [
  "¿Te interesa? Cuéntame 💬",
  "¿Lo separo para ti? 🛍️",
  "¿Necesitas más info o fotos? Aquí estoy 💜",
  "Escríbeme si quieres uno 🙌",
];

const CTA_TIKTOK = [
  "Sígueme para más 🔔",
  "Guarda este video 📌",
  "Link en bio 🔗",
  "Comenta 'QUIERO' 💬",
];

const URGENCY_PHRASES = [
  "⏰ Últimas unidades",
  "🔥 Se están agotando",
  "⚡ Solo por tiempo limitado",
  "🎁 Envío GRATIS hoy",
  "💥 Casi sin stock",
];

const GIFT_ANGLES = [
  "Perfecto para regalar 🎁",
  "Ideal para sorprender a alguien especial 💝",
  "Para ti o para un regalo increíble 💫",
  "Consiéntete o consiente a quien amas ✨",
  "Excelente regalo para cualquier ocasión 🎀",
];

const SOCIAL_PROOF = [
  "Ya muchos lo tienen y les encanta",
  "Uno de los más pedidos esta semana",
  "Nuestros clientes lo aman",
  "Se está haciendo tendencia",
];

// Función helper para elegir aleatoriamente
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMultiple<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ============================================
// UTILS
// ============================================
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  temperature = 0.95, // 🆕 más alto para mayor variación
  model = MODEL_LARGE,
  maxTokens = 3500
): Promise<string> {
  const apiKeys = getApiKeys();
  let lastError: Error | null = null;

  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const apiKey = apiKeys[keyIndex];
    const keyLabel = keyIndex === 0 ? "principal" : "respaldo";

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
            // 🆕 seed aleatorio para máxima variación
            seed: Math.floor(Math.random() * 1000000),
          }),
        });

        if (response.status === 429) {
          console.log(`⏱️ Rate limit en key ${keyLabel}, probando siguiente...`);
          lastError = new Error(`Rate limit key ${keyLabel}`);
          break;
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
// 🎨 MEGA PROMPT v22.11 - SENIOR MASTER
// ============================================
async function generateMegaKit(
  productName: string,
  price: number,
  context: ProductContext,
  store: StoreData,
  storeUrl: string
): Promise<MegaKit> {
  const igHandle = store.instagram
    ? `@${store.instagram.replace(/[@\/]/g, "").replace("instagram.com/", "").trim()}`
    : "";
  const fbPage = store.facebook
    ? store.facebook.replace(/[\/]/g, "").replace("facebook.com/", "").trim()
    : "";

  // 🆕 Elegir estilos aleatorios para este kit
  const igStyle = pickRandom(INSTAGRAM_STYLES);
  const fbStyle = pickRandom(FACEBOOK_STYLES);
  const waStyle = pickRandom(WHATSAPP_STYLES);
  const ttStyle = pickRandom(TIKTOK_STYLES);
  const waGreeting = pickRandom(WHATSAPP_GREETINGS);
  const giftAngle = pickRandom(GIFT_ANGLES);
  const socialProof = pickRandom(SOCIAL_PROOF);

  console.log(`🎨 Estilos: IG=${igStyle} | FB=${fbStyle} | WA=${waStyle} | TT=${ttStyle}`);

  // 🎯 Configuración según género
  const genderConfig = {
    female: {
      lookGood: "te va a quedar hermoso, resaltará tu estilo único",
      audience: "mujeres con estilo propio",
      pronoun: "te",
      moreItems: "más piezas increíbles para ti",
    },
    male: {
      lookGood: "te va a quedar increíble, marcará tu estilo",
      audience: "hombres con actitud",
      pronoun: "te",
      moreItems: "más productos increíbles para ti",
    },
    unisex: {
      lookGood: "te va a encantar, es perfecto para tu estilo",
      audience: "personas con buen gusto",
      pronoun: "te",
      moreItems: "más productos increíbles esperándote",
    },
    kids: {
      lookGood: "le va a encantar, es perfecto para peques",
      audience: "papás y mamás modernos",
      pronoun: "le",
      moreItems: "más productos para los peques",
    },
  };

  const cfg = genderConfig[context.gender];

  const prompt = `Eres el CHIEF CREATIVE OFFICER de una agencia global de marketing digital, con 20+ años de experiencia trabajando con marcas como Nike, Apple, Zara y ecommerce peruanos exitosos. Tu especialidad es NEUROMARKETING y COPYWRITING PERSUASIVO.

Tu misión: Generar un kit de marketing de VENTA MASIVA para el producto, aplicando GATILLOS MENTALES avanzados:
- Escasez (últimas unidades)
- Prueba social (otros ya lo tienen)
- Autoridad (calidad premium)
- Reciprocidad (envío gratis)
- Deseo aspiracional
- FOMO (miedo a perderse algo)

═══ ANÁLISIS DE CONTEXTO ═══
- Tienda: ${store.name}
- Producto: ${productName}
- Precio: S/ ${price.toFixed(2)}
- Categoría detectada: ${context.category}
- Género objetivo: ${context.gender} (audiencia: ${cfg.audience})
- Rango precio: ${context.priceRange}
- ¿Es regalable?: ${context.isGiftable ? "SÍ" : "NO"}
- Buyer personas potenciales:
${context.buyerPersonas.map((bp) => `  • ${bp}`).join("\n")}

═══ INFORMACIÓN DE LA TIENDA ═══
- Nombre: ${store.name}
- 🔗 LINK OBLIGATORIO: ${storeUrl}
${store.description ? `- Descripción: ${store.description}` : ""}
${igHandle ? `- Instagram: ${igHandle}` : ""}
${fbPage ? `- Facebook: facebook.com/${fbPage}` : ""}

═══ ESTILOS ASIGNADOS (respetar) ═══
- Instagram estilo: ${igStyle}
- Facebook estilo: ${fbStyle}
- WhatsApp estilo: ${waStyle}
- TikTok estilo: ${ttStyle}

═══ MENSAJES CLAVE OBLIGATORIOS ═══

1️⃣ "${cfg.lookGood}" (adaptar según red)
2️⃣ "Hay ${cfg.moreItems} en mi tienda"
3️⃣ ${giftAngle} (donde aplique)
4️⃣ ${socialProof} (donde encaje)

═══ TAREA ═══
Genera un objeto JSON con exactamente esta estructura (SOLO JSON, sin texto adicional):

{
  "instagram": "Caption Instagram (${igStyle})",
  "facebook": "Post Facebook (${fbStyle}) + link obligatorio",
  "hashtags": ["#hashtag1", "... EXACTO 20 hashtags Perú"],
  "whatsapp": "Mensaje WhatsApp (${waStyle}) + link obligatorio",
  "tiktok": "Caption TikTok (${ttStyle})",
  "email_subject": "Asunto email (máx 45 chars, sin spam)",
  "email_body": "Email completo storytelling + link + urgencia"
}

═══ REGLAS ESTRICTAS POR CAMPO ═══

📷 INSTAGRAM (Estilo: ${igStyle}):
Estilos posibles:
- aspiracional_poetico: metáforas emocionales, lírico
- minimalista_directo: pocas palabras, alto impacto
- storytelling_emocional: mini historia + producto
- provocador_curiosidad: pregunta que atrapa
- testimonial_inspirador: como si un cliente hablara

Estructura:
1. Hook impactante primera línea
2. Cuerpo aspiracional (${cfg.lookGood})
3. Menciona que hay MÁS productos en la tienda
4. Precio con 💰
5. Urgencia sutil
6. CTA + "link en bio"

Máximo: 220 caracteres

📘 FACEBOOK (Estilo: ${fbStyle}) - LINK OBLIGATORIO:
Estilos posibles:
- informativo_confianza: datos, características, garantías
- beneficios_bullets: lista con ✨
- comparativo_valor: precio vs beneficio
- educativo_experto: tips + producto
- testimonial_social: reseñas ficticias creíbles

Estructura:
1. Hook visual con emoji
2. 3 beneficios con ✨
3. Menciona "${cfg.lookGood}"
4. Precio destacado
5. 🛒 LINK COMPLETO: ${storeUrl}
6. Menciona que hay más productos en la tienda
7. CTA engagement

Máximo: 400 caracteres

🏷️ HASHTAGS (20 exactos):
- 5 grandes globales
- 8 medianos Perú (#modaperu #comprasperu #emprendimientoperu #limaperu #cuscoperu #iquitosperu)
- 7 nicho del producto
Sin espacios, sin mayúsculas, sin números al final

💬 WHATSAPP (Estilo: ${waStyle}) - INCLUSIVO + LINK OBLIGATORIO:
⚠️ CRÍTICO: NO uses "bella", "hermosa", "guapo", "amor", "corazón" 
Usa saludo NEUTRAL: "${waGreeting}"
Habla como a un amigo/a de cualquier género.

Estilos posibles:
- casual_amigable: como charla entre amigos
- entusiasta_directo: energético, va al grano
- consultivo_pregunta: hace pregunta que engancha
- presentacion_novedad: "acaba de llegar..."
- recomendacion_personal: "te acordé porque..."

Estructura:
1. Saludo neutral: "${waGreeting}"
2. Presentación del producto (calidez sin género)
3. Beneficio principal: "${cfg.lookGood}" o "es perfecto para ti o para regalar"
4. Mencionar: "Además tengo ${cfg.moreItems} en mi tienda"
5. 💰 Precio
6. 🛒 Link: ${storeUrl}
7. CTA amigable

Máximo: 350 caracteres

Ejemplo IDEAL (inclusivo):
"${waGreeting}

Acaba de llegar algo increíble a la tienda 🛍️

[Producto] - ${cfg.lookGood}. Además, es perfecto para regalar o para ti mism@.

💰 Solo S/ ${price.toFixed(2)}

También tengo ${cfg.moreItems}:
🛒 ${storeUrl}

¿Te separo uno? 💬"

🎵 TIKTOK (Estilo: ${ttStyle}) - VIRAL:
Estilos posibles:
- pov_visual: "POV: encontraste..."
- cuando_relatable: "Cuando por fin..."
- storytime_breve: "Storytime rápido..."
- trend_educativo: "3 razones por qué..."
- shock_curiosidad: "Nadie te dijo esto..."

Estructura:
1. Hook viral primera línea
2. Precio breve
3. "Link en bio"
4. CTA corto

Máximo: 150 caracteres

📧 EMAIL SUBJECT:
- NO spam words (GRATIS, OFERTA, 50% OFF)
- Máx 1 emoji
- Genera curiosidad genuina
Ejemplos:
- "Pensé en ti al ver esto 💭"
- "Nueva llegada que amarás"
- "Algo especial esperándote"

📧 EMAIL BODY - LINK OBLIGATORIO + STORYTELLING:
Estructura:
1. Saludo cálido personalizado
2. Mini historia o contexto (2-3 líneas)
3. Presentación del producto
4. 3 beneficios con ✓
5. "${cfg.lookGood}"
6. 💰 Precio
7. 🛒 CTA con LINK COMPLETO destacado: ${storeUrl}
8. Menciona "más productos en la tienda"
9. Urgencia sutil
10. Cierre cálido firmado

═══ REGLA DE ORO ═══
- INSTAGRAM: aspiracional, sin link directo
- FACEBOOK: informativo, LINK OBLIGATORIO
- WHATSAPP: personal INCLUSIVO, LINK OBLIGATORIO, sin sexismo
- TIKTOK: viral, "link en bio"
- EMAIL: storytelling, LINK OBLIGATORIO

═══ IMPORTANTE ═══
1. Responde SOLO JSON válido
2. Sin markdown, sin \`\`\`
3. Escapa comillas con \\"
4. Usa \\n para saltos de línea
5. Link ${storeUrl} DEBE estar en Facebook, WhatsApp, Email
6. WhatsApp SIN sexismo (nada de "bella", "guapo", "amor")
7. Mencionar "hay más productos en la tienda" al menos en 3 redes

RESPONDE AHORA (solo JSON):`;

  console.log("🧠 Enviando MEGA PROMPT v22.11 SENIOR MASTER...");
  const response = await callGroq(prompt, 0.95, MODEL_LARGE, 3500);

  // Parse JSON robusto
  let parsed: MegaKit;
  try {
    let clean = response.trim();
    if (clean.startsWith("```json")) clean = clean.slice(7);
    if (clean.startsWith("```")) clean = clean.slice(3);
    if (clean.endsWith("```")) clean = clean.slice(0, -3);
    clean = clean.trim();

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
      if (field === "hashtags") parsed.hashtags = ["#peru", "#compraslocalperu", "#emprendimientoperu", "#lima", "#modaperu"];
      else parsed[field] = "" as any;
    }
  }

  if (!Array.isArray(parsed.hashtags)) {
    parsed.hashtags = ["#peru", "#compraslocalperu", "#emprendimientoperu"];
  }

  parsed.hashtags = parsed.hashtags
    .map((t) => (t.startsWith("#") ? t : `#${t}`))
    .filter((t) => t.length > 1)
    .slice(0, 20);

  // 🛡️ POST-PROCESAMIENTO: Garantizar links + CTAs + eliminar sexismo

  // 📷 INSTAGRAM: Reforzar link en bio + CTA
  const igCta = pickRandom(CTA_INSTAGRAM);
  if (!parsed.instagram.toLowerCase().includes("link en bio")) {
    parsed.instagram += `\n\n👆 Link en bio para ver más productos increíbles`;
  }
  if (igHandle && !parsed.instagram.includes(igHandle)) {
    parsed.instagram += `\n📷 ${igCta}: ${igHandle}`;
  }

  // 📘 FACEBOOK: Garantizar link completo
  if (!parsed.facebook.includes(storeUrl)) {
    const fbCta = pickRandom(CTA_FACEBOOK);
    parsed.facebook += `\n\n🛒 CÓMPRALO AQUÍ:\n👉 ${storeUrl}\n\n🔥 Encuentra ${cfg.moreItems} en la tienda\n${fbCta}`;
    if (fbPage) {
      parsed.facebook += `\n📘 facebook.com/${fbPage}`;
    }
  }

  // 💬 WHATSAPP: LIMPIAR SEXISMO + garantizar link
  // Reemplazar términos sexistas por neutrales
  parsed.whatsapp = parsed.whatsapp
    .replace(/¡?hola bella!?/gi, waGreeting)
    .replace(/¡?hola guapo!?/gi, waGreeting)
    .replace(/¡?hola hermosa!?/gi, waGreeting)
    .replace(/¡?hola amor!?/gi, waGreeting)
    .replace(/¡?hola corazón!?/gi, waGreeting)
    .replace(/¡?hola linda!?/gi, waGreeting)
    .replace(/bella/gi, "")
    .replace(/guapa/gi, "")
    .replace(/hermosa/gi, "")
    .replace(/mi amor/gi, "")
    .replace(/mi corazón/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!parsed.whatsapp.includes(storeUrl)) {
    const waCta = pickRandom(CTA_WHATSAPP);
    parsed.whatsapp += `\n\n🛒 Míralo (y más productos increíbles):\n${storeUrl}\n\n${waCta}`;
  }

  // 🎵 TIKTOK: Reforzar link en bio
  if (!parsed.tiktok.toLowerCase().includes("link en bio")) {
    const ttCta = pickRandom(CTA_TIKTOK);
    parsed.tiktok += `\n🔗 Link en bio\n${ttCta}`;
  }

  // 📧 EMAIL: Garantizar link + urgencia
  if (!parsed.email_body.includes(storeUrl)) {
    const urgency = pickRandom(URGENCY_PHRASES);
    parsed.email_body += `\n\n🛒 CÓMPRALO EN 2 MINUTOS:\n👉 ${storeUrl}\n\n🔥 Descubre ${cfg.moreItems} en la tienda\n\n${urgency}\n\nCon cariño,\nEl equipo de ${store.name} 💜`;
  }

  console.log("✅ MEGA KIT v22.11 SENIOR MASTER parseado + limpio + enriquecido");
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

    console.log(`🍌 Launch AI v22.11 SENIOR MASTER: ${product_name} (user: ${user.email})`);

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
    const storeUrl = `${baseUrl}/tienda/${store.slug}`;
    const productUrl = `${storeUrl}?producto=${product_id}`;

    console.log(`🏪 Tienda: ${store.name} (${storeUrl})`);

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

    // 🆕 v22.11: Análisis profundo de contexto
    const context = analyzeProductContext(
      product_name,
      product_description,
      product_category,
      product_price
    );

    console.log(`🎯 Contexto detectado:`);
    console.log(`   Categoría: ${context.category}`);
    console.log(`   Género: ${context.gender}`);
    console.log(`   Precio: ${context.priceRange}`);
    console.log(`   Giftable: ${context.isGiftable}`);

    // 🚀 v22.11: SENIOR MASTER PROMPT con variación total
    const megaKit = await generateMegaKit(
      product_name,
      product_price,
      context,
      store,
      storeUrl
    );

    console.log("✅ Kit SENIOR MASTER generado");

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
      detected_category: context.category,
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
        store_url: storeUrl,
        detected_context: context,
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