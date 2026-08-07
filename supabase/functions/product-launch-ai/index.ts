// supabase/functions/product-launch-ai/index.ts
// 🍌 Product Launch AI - Kit completo de marketing con Gemini 2.5 Flash Image (Nano Banana)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Gemini API
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image-preview";
const GEMINI_TEXT_MODEL = "gemini-2.0-flash-exp";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Groq (para texto rápido)
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

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
// SMART CATEGORY DETECTOR
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

  const matches = (keywords: string[]) =>
    keywords.some((kw) => text.includes(kw));

  // 👗 ROPA MUJER
  if (
    matches([
      "blusa", "polo mujer", "jean mujer", "falda", "vestido", "chompa mujer",
      "chaqueta mujer", "pantalon mujer", "short mujer", "top", "crop",
      "brasier", "sujetador", "leggins", "ropa mujer", "ropa femenina",
    ])
  ) {
    return "clothing_female";
  }

  // 👔 ROPA HOMBRE
  if (
    matches([
      "camisa hombre", "polo hombre", "terno", "pantalon hombre", "short hombre",
      "chompa hombre", "chaqueta hombre", "ropa hombre",
    ])
  ) {
    return "clothing_male";
  }

  // 🧸 JUGUETES
  if (
    matches([
      "juguete", "muneca", "muñeca", "peluche", "lego", "bloques", "carrito",
      "carro juguete", "figura", "accion", "rompecabezas", "didactico",
      "juego infantil", "juego niño", "pelota juguete",
    ])
  ) {
    return "toys";
  }

  // 💎 BISUTERÍA/ACCESORIOS
  if (
    matches([
      "gancho", "collet", "vincha", "liga", "arete", "pulsera", "collar",
      "anillo", "bisuteria", "accesorio cabello", "diadema", "hebilla",
      "aretes", "pendientes", "brazalete",
    ])
  ) {
    return "accessories";
  }

  // 📱 ELECTRÓNICA
  if (
    matches([
      "audifono", "audífono", "celular", "cargador", "cable", "usb", "bocina",
      "parlante", "reloj inteligente", "smartwatch", "auricular", "audifonos",
      "tablet", "laptop", "mouse", "teclado", "power bank", "powerbank",
    ])
  ) {
    return "electronics";
  }

  // 💄 BELLEZA
  if (
    matches([
      "labial", "labios", "sombra", "polvo", "base", "mascara", "crema",
      "serum", "perfume", "maquillaje", "corrector", "rubor", "delineador",
      "esmalte", "brillo", "kit maquillaje",
    ])
  ) {
    return "beauty";
  }

  // 🐕 MASCOTAS
  if (
    matches([
      "perro", "gato", "mascota", "cama para", "juguete para perro",
      "juguete para gato", "correa", "plato mascota", "comedero", "arenero",
      "collar mascota", "rascador",
    ])
  ) {
    return "pets";
  }

  // 🍳 COCINA
  if (
    matches([
      "olla", "sarten", "sartén", "utensilio", "cuchara", "cuchillo cocina",
      "tabla picar", "colador", "rallador", "batidor", "espatula", "espátula",
      "recipiente cocina", "envase cocina",
    ])
  ) {
    return "kitchen";
  }

  // 🏠 HOGAR/DECORACIÓN
  if (
    matches([
      "decoracion", "mueble", "lampara", "lámpara", "cortina", "almohada",
      "cojin", "cojín", "sabanas", "sábanas", "edredon", "edredón", "florero",
      "cuadro", "alfombra", "manta",
    ])
  ) {
    return "home";
  }

  // ⚽ DEPORTES
  if (
    matches([
      "deportivo", "fitness", "yoga", "gimnasio", "pesa", "mancuerna",
      "proteina", "proteína", "suplemento", "pelota deporte", "colchoneta",
      "banda elastica", "tenis deportivo",
    ])
  ) {
    return "sports";
  }

  return "generic";
}

// ============================================
// SMART PROMPT ENGINE (10 categorías)
// ============================================

function buildImagePrompt(
  productName: string,
  category: ProductCategory
): string {
  const BASE_QUALITY = `
Formato: Imagen cuadrada 1:1, resolución 2048x2048, calidad 4K.
La imagen NO debe parecer generada por IA. Debe verse como fotografía publicitaria real.
Optimizada para Instagram, Facebook, TikTok, Marketplace y catálogos digitales.

ENCABEZADO SUPERIOR:
Colocar en la parte superior el texto "${productName}" con tipografía moderna, gruesa, elegante, centrada, con ligera sombra. Color según fondo (blanco, dorado o negro). Debe captar atención inmediatamente.

MEJORA FOTOGRÁFICA PROFESIONAL:
- Aumentar ligeramente brillo, contraste y nitidez
- Mejorar iluminación
- Resaltar colores reales sin sobresaturar
- Mantener 100% fidelidad al producto original
- Apariencia natural

RESTRICCIONES CRÍTICAS:
- NO modificar color, forma, diseño, material, textura, empaque, etiquetas o marca del producto
- NO deformar el producto
- NO inventar detalles que no existan
- NO alterar proporciones
- El producto debe verse 100% idéntico al original

CALIDAD FINAL:
Hiperrealista, nítida, alta definición, acabado premium, composición impecable, iluminación profesional, sombras naturales, profundidad de campo realista, sin artefactos, sin ruido.
`;

  const PROMPTS: Record<ProductCategory, string> = {
    clothing_female: `
${BASE_QUALITY}

PRESENTACIÓN OBLIGATORIA:
La prenda SIEMPRE debe aparecer PUESTA en una modelo femenina joven, elegante y atractiva.
Bajo ninguna circunstancia mostrar la prenda sola, doblada, colgada en un gancho, sobre un maniquí o flotando.

MODELO:
- Debe vestir exactamente la prenda de la imagen de referencia
- Pose natural y elegante estilo campaña de moda profesional
- Ocupar 80-90% del encuadre
- Transmitir: elegancia, confianza, naturalidad, belleza, sofisticación
- No ocultar detalles importantes con cabello, brazos o accesorios

FONDO:
Boutique moderna y elegante de moda femenina.
Elementos: escaparates, maniquíes, percheros modernos, vestidos, blusas, jeans, chaquetas, carteras, zapatos, espejos, plantas, decoración minimalista.
Iluminación cálida tipo boutique de lujo.
Efecto bokeh suave.

ESTILO PUBLICITARIO:
Inspirado en campañas internacionales de moda femenina premium.
Debe transmitir: elegancia, glamour, calidad, exclusividad, modernidad.
`,

    clothing_male: `
${BASE_QUALITY}

PRESENTACIÓN OBLIGATORIA:
La prenda SIEMPRE debe aparecer PUESTA en un modelo masculino joven y elegante.
NO mostrar la prenda sola, colgada o sobre maniquí.

MODELO:
- Debe vestir exactamente la prenda de la imagen de referencia
- Pose masculina natural y sofisticada
- Ocupar 80-90% del encuadre
- Transmitir: confianza, elegancia, modernidad, estilo urbano

FONDO:
Boutique moderna masculina o setting urbano premium.
Elementos: ropa masculina en exhibición, iluminación profesional, decoración minimalista moderna.
Efecto bokeh suave.

ESTILO: Campaña masculina internacional premium.
`,

    toys: `
${BASE_QUALITY}

PRESENTACIÓN PRINCIPAL:
El juguete debe ocupar 65-70% del espacio, perfectamente centrado.
Proyectar calidad premium, diversión, seguridad.

FONDO:
Tienda moderna de juguetes con estanterías, exhibidores, muñecas, peluches, bloques, figuras, rompecabezas, juguetes educativos, decoración colorida y elegante. Iluminación cálida. Efecto bokeh.

IMAGEN CIRCULAR (obligatoria):
Agregar círculo en esquina inferior derecha (25% del tamaño total).
Dentro del círculo: un niño o niña usando el juguete con alegría, diversión, entusiasmo natural.
Borde del círculo: fino, limpio, elegante.

ESTILO: Campaña oficial de marca internacional de juguetes.
Transmitir: diversión, calidad, seguridad, creatividad, entretenimiento.
`,

    accessories: `
${BASE_QUALITY}

PRESENTACIÓN PRINCIPAL:
El accesorio debe ocupar 65-70% del espacio, perfectamente centrado.
Sombras suaves y reflejos naturales para dar profundidad.

FONDO:
Tienda moderna y elegante de bisutería y accesorios femeninos.
Elementos: vitrinas iluminadas, estantes modernos, exhibidores, bisutería fina, aretes, pulseras, collares, accesorios para cabello, maquillaje. Iluminación cálida tipo boutique.
Efecto bokeh suave.

IMAGEN CIRCULAR (obligatoria):
Agregar círculo en esquina inferior derecha (25% del tamaño total).
Dentro: modelo joven y elegante usando el accesorio de manera natural y atractiva.
Modelo transmite: elegancia, naturalidad, confianza, belleza, estilo moderno.
Borde del círculo: fino, elegante, limpio.

ESTILO: Boutique premium de accesorios femeninos internacional.
`,

    electronics: `
${BASE_QUALITY}

PRESENTACIÓN PRINCIPAL:
El producto electrónico debe ocupar 65-70% del espacio, perfectamente centrado.
Iluminación tipo estudio tecnológico con reflejos elegantes.

FONDO:
Setting tecnológico moderno y minimalista.
Elementos: superficie oscura tipo cristal, luces LED sutiles, ambiente futurista, gradient sutil, decoración tech premium.
Efecto bokeh con luces bokeh coloridas suaves.

ESTILO: Campaña de Apple, Samsung o marca tech premium.
Transmitir: innovación, calidad, tecnología avanzada, elegancia moderna.
`,

    beauty: `
${BASE_QUALITY}

PRESENTACIÓN PRINCIPAL:
El producto de belleza debe ocupar 60-65% del espacio, con composición elegante.
Puede incluir elementos decorativos: pétalos de rosa, gotas de agua, mármol.

FONDO:
Setting beauty premium tipo Sephora o Dior.
Elementos: superficie de mármol, iluminación suave dorada o rosa, decoración femenina elegante, flores frescas, ambiente spa/beauty lounge.
Efecto bokeh suave.

IMAGEN CIRCULAR (obligatoria):
Agregar círculo en esquina inferior derecha (25% del tamaño total).
Dentro: modelo femenina joven aplicándose o mostrando el producto con belleza natural.
Piel radiante, expresión serena y elegante.
Borde del círculo: fino, dorado o blanco.

ESTILO: Campaña beauty internacional premium.
`,

    pets: `
${BASE_QUALITY}

PRESENTACIÓN PRINCIPAL:
El producto para mascotas debe ocupar 60-65% del espacio.

FONDO:
Setting hogar acogedor con toques pet-friendly.
Elementos: sala moderna, alfombras suaves, luz natural, ambiente cálido.
Efecto bokeh.

IMAGEN CIRCULAR (obligatoria):
Agregar círculo en esquina inferior derecha (25% del tamaño total).
Dentro: mascota (perro o gato según corresponda) usando o disfrutando el producto felizmente.
Expresión alegre y natural.
Borde del círculo: fino y elegante.

ESTILO: Campaña de marca premium de productos para mascotas.
Transmitir: cariño, calidad, bienestar animal.
`,

    kitchen: `
${BASE_QUALITY}

PRESENTACIÓN PRINCIPAL:
El utensilio/producto de cocina debe ocupar 60-65% del espacio.

FONDO:
Cocina moderna premium tipo revista de decoración.
Elementos: encimera de mármol o madera, iluminación natural, utensilios profesionales al fondo desenfocados, plantas aromáticas, ambiente gourmet.
Efecto bokeh.

IMAGEN CIRCULAR (opcional):
Círculo en esquina inferior derecha con producto en uso durante preparación de comida.

ESTILO: Campaña de marca premium de utensilios de cocina.
Transmitir: calidad, funcionalidad, elegancia culinaria.
`,

    home: `
${BASE_QUALITY}

PRESENTACIÓN PRINCIPAL:
El producto de hogar debe ocupar 65-70% del espacio.

FONDO:
Interior moderno estilo revista Architectural Digest.
Elementos: sala minimalista, luz natural cálida, decoración nórdica o moderna, texturas naturales.
Efecto bokeh suave.

ESTILO: Campaña IKEA premium o West Elm.
Transmitir: elegancia, confort, modernidad, calidez hogareña.
`,

    sports: `
${BASE_QUALITY}

PRESENTACIÓN PRINCIPAL:
El producto deportivo debe ocupar 65-70% del espacio.

FONDO:
Gimnasio moderno tipo Equinox o setting outdoor deportivo.
Elementos: equipos profesionales al fondo, iluminación dinámica, ambiente motivador.
Efecto bokeh dinámico.

IMAGEN CIRCULAR (obligatoria):
Círculo en esquina inferior derecha con atleta usando el producto en acción.
Pose dinámica y motivadora.

ESTILO: Campaña Nike, Adidas o Under Armour.
Transmitir: energía, rendimiento, motivación, calidad deportiva.
`,

    generic: `
${BASE_QUALITY}

PRESENTACIÓN PRINCIPAL:
El producto debe ocupar 65-70% del espacio, perfectamente centrado.

FONDO:
Setting comercial premium moderno.
Elementos: superficie elegante, iluminación profesional de estudio, decoración minimalista sofisticada.
Efecto bokeh suave.

ESTILO: Campaña publicitaria premium internacional.
Transmitir: calidad, elegancia, profesionalismo, exclusividad.
`,
  };

  return PROMPTS[category];
}

// ============================================
// GEMINI IMAGE GENERATION (Nano Banana)
// ============================================

async function generateImageWithGemini(
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const url = `${GEMINI_BASE_URL}/${GEMINI_IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
    },
  };

  console.log("🍌 Llamando a Nano Banana...");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Gemini error:", errorText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log("✅ Gemini respondió");

  // Extraer imagen base64 de la respuesta
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("No hay parts en la respuesta de Gemini");

  const imagePart = parts.find((p: any) => p.inline_data || p.inlineData);
  if (!imagePart) throw new Error("No se encontró imagen en la respuesta");

  const base64Result =
    imagePart.inline_data?.data || imagePart.inlineData?.data;
  if (!base64Result) throw new Error("Imagen base64 vacía");

  return base64Result;
}

// ============================================
// GROQ TEXT GENERATION (Kit de marketing)
// ============================================

async function generateMarketingKit(data: {
  productName: string;
  productDescription: string;
  productPrice: number;
  category: ProductCategory;
  storeName: string;
  storeCity: string;
  storePhone?: string;
}): Promise<{
  caption_instagram: string;
  caption_facebook: string;
  hashtags: string[];
  whatsapp_message: string;
  email_subject: string;
  email_body: string;
}> {
  const prompt = `Eres un experto en marketing digital peruano. Genera un KIT COMPLETO DE MARKETING para este producto.

PRODUCTO:
- Nombre: ${data.productName}
- Descripción: ${data.productDescription || "Sin descripción"}
- Precio: S/ ${data.productPrice.toFixed(2)}
- Categoría detectada: ${data.category}

TIENDA:
- Nombre: ${data.storeName}
- Ciudad: ${data.storeCity}
${data.storePhone ? `- WhatsApp: +51 ${data.storePhone}` : ""}

Genera EXACTAMENTE en formato JSON válido (sin markdown, sin backticks):

{
  "caption_instagram": "caption viral para Instagram, máx 2000 chars, con emojis moderados, sin hashtags al final, con CTA claro",
  "caption_facebook": "caption para Facebook, más informativo, máx 3000 chars, orientado a comunidad",
  "hashtags": ["#tag1", "#tag2", ...15 hashtags mix populares/medios/nicho/locales de Peru"],
  "whatsapp_message": "mensaje broadcast personalizado, máx 800 chars, con *negrita* de WhatsApp, emojis, CTA a responder",
  "email_subject": "asunto atractivo máx 50 chars",
  "email_body": "email completo con saludo, hook, desarrollo, precio, CTA, cierre. Máx 1500 palabras. Formato limpio con saltos de línea."
}

REGLAS:
- Español peruano natural (soles, chévere, bacán)
- Menciona ${data.storeCity} de forma natural
- Precio destacado
- Auténtico, no robótico
- CTA claro en cada pieza

Solo el JSON. Nada más.`;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq error: ${error}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content);
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  const startTime = Date.now();
  console.log("🚀 Product Launch AI - Request received");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Autenticación
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuario no autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vendorId = user.id;
    console.log("✅ Usuario:", vendorId);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 2. Parse body
    const body: RequestBody = await req.json();
    const {
      product_id,
      product_name,
      product_description,
      product_category,
      product_price,
      input_image_url,
      store_name,
      store_city,
      store_phone,
    } = body;

    if (!product_name || !input_image_url || !product_id) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Verificar créditos (15 créditos por kit completo)
    const CREDITS_COST = 15;
    const { data: subscription } = await supabaseAdmin
      .from("ai_subscriptions")
      .select("credits_remaining, plan")
      .eq("vendor_id", vendorId)
      .single();

    if (!subscription) {
      return new Response(
        JSON.stringify({ error: "Sin subscripción activa" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (subscription.plan !== "business" && subscription.credits_remaining < CREDITS_COST) {
      return new Response(
        JSON.stringify({
          error: "Créditos insuficientes",
          credits_needed: CREDITS_COST,
          credits_available: subscription.credits_remaining,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Consumir créditos
    const { data: creditsOk } = await supabaseAdmin.rpc("consume_ai_credits", {
      p_vendor_id: vendorId,
      p_credits: CREDITS_COST,
    });

    if (!creditsOk) {
      return new Response(
        JSON.stringify({ error: "Error al consumir créditos" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Detectar categoría automáticamente
    const detectedCategory = detectProductCategory(
      product_name,
      product_description || "",
      product_category || ""
    );
    console.log("🎯 Categoría detectada:", detectedCategory);

    // 6. Crear registro en product_launch_kits
    const { data: kit, error: kitError } = await supabaseAdmin
      .from("product_launch_kits")
      .insert({
        vendor_id: vendorId,
        product_id,
        detected_category: detectedCategory,
        original_image_url: input_image_url,
        status: "generating",
        progress: 10,
        credits_used: CREDITS_COST,
      })
      .select()
      .single();

    if (kitError) throw new Error(`Error creando kit: ${kitError.message}`);

    // 7. Descargar imagen original y convertir a base64
    console.log("📥 Descargando imagen original...");
    const imageResponse = await fetch(input_image_url);
    if (!imageResponse.ok) throw new Error("No se pudo descargar la imagen");

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

    // Convertir a base64
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < imageBytes.length; i += chunkSize) {
      const chunk = imageBytes.slice(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const imageBase64 = btoa(binary);

    console.log(`📊 Imagen cargada: ${imageBytes.length} bytes, tipo: ${mimeType}`);

    // 8. Generar imagen mejorada con Gemini
    await supabaseAdmin
      .from("product_launch_kits")
      .update({ progress: 30 })
      .eq("id", kit.id);

    const imagePrompt = buildImagePrompt(product_name, detectedCategory);
    const generatedImageBase64 = await generateImageWithGemini(
      imagePrompt,
      imageBase64,
      mimeType
    );

    // 9. Subir imagen generada al bucket
    console.log("💾 Guardando imagen generada...");
    await supabaseAdmin
      .from("product_launch_kits")
      .update({ progress: 60 })
      .eq("id", kit.id);

    const generatedBinaryString = atob(generatedImageBase64);
    const generatedBytes = new Uint8Array(generatedBinaryString.length);
    for (let i = 0; i < generatedBinaryString.length; i++) {
      generatedBytes[i] = generatedBinaryString.charCodeAt(i);
    }
    const generatedBlob = new Blob([generatedBytes], { type: "image/png" });

    const timestamp = Date.now();
    const fileName = `${vendorId}/${timestamp}-${detectedCategory}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("product-launch-images")
      .upload(fileName, generatedBlob, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) throw new Error(`Error subiendo imagen: ${uploadError.message}`);

    const { data: urlData } = supabaseAdmin.storage
      .from("product-launch-images")
      .getPublicUrl(fileName);

    const enhancedImageUrl = urlData.publicUrl;
    console.log("✅ Imagen guardada:", enhancedImageUrl);

    // 10. Generar kit de marketing (texto) con Groq
    await supabaseAdmin
      .from("product_launch_kits")
      .update({ progress: 80, enhanced_image_url: enhancedImageUrl })
      .eq("id", kit.id);

    const marketingKit = await generateMarketingKit({
      productName: product_name,
      productDescription: product_description || "",
      productPrice: product_price,
      category: detectedCategory,
      storeName: store_name || "Mi Tienda",
      storeCity: store_city || "Iquitos",
      storePhone: store_phone,
    });

    // 11. Actualizar kit con todo el contenido
    const generationTime = Date.now() - startTime;

    const { data: finalKit, error: updateError } = await supabaseAdmin
      .from("product_launch_kits")
      .update({
        status: "completed",
        progress: 100,
        caption_instagram: marketingKit.caption_instagram,
        caption_facebook: marketingKit.caption_facebook,
        hashtags: marketingKit.hashtags,
        whatsapp_message: marketingKit.whatsapp_message,
        email_subject: marketingKit.email_subject,
        email_body: marketingKit.email_body,
        generation_time_ms: generationTime,
        completed_at: new Date().toISOString(),
      })
      .eq("id", kit.id)
      .select()
      .single();

    if (updateError) throw new Error(`Error actualizando kit: ${updateError.message}`);

    // 12. Obtener créditos actualizados
    const { data: updatedSub } = await supabaseAdmin
      .from("ai_subscriptions")
      .select("credits_remaining, plan")
      .eq("vendor_id", vendorId)
      .single();

    console.log(`🎉 Kit generado en ${generationTime}ms`);

    // ✅ Respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        kit: finalKit,
        credits_used: CREDITS_COST,
        credits_remaining: updatedSub?.credits_remaining || 0,
        generation_time_ms: generationTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("💥 Error general:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Error desconocido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});