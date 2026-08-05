// supabase/functions/generate-ai-image/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Configuración Cloudflare
const CF_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID")!;
const CF_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN")!;
const CF_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run`;

// Modelos disponibles
const MODELS = {
  FLUX: "@cf/black-forest-labs/flux-1-schnell",
  SDXL: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  SDXL_LIGHTNING: "@cf/bytedance/stable-diffusion-xl-lightning",
  DREAMSHAPER: "@cf/lykon/dreamshaper-8-lcm",
};

interface RequestBody {
  vendor_id: string;
  product_id?: string;
  product_name: string;
  product_description?: string;
  generation_type: "remove_background" | "context" | "model";
  preset_id: string;
  input_image_url?: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Autenticación
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cliente Supabase (con service role para bypass RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parsear body
    const body: RequestBody = await req.json();
    const {
      vendor_id,
      product_id,
      product_name,
      product_description,
      generation_type,
      preset_id,
      input_image_url,
    } = body;

    // Validaciones
    if (!vendor_id || !product_name || !preset_id || !generation_type) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Obtener el preset (para saber el prompt y créditos)
    const { data: preset, error: presetError } = await supabase
      .from("ai_image_presets")
      .select("*")
      .eq("id", preset_id)
      .eq("is_active", true)
      .single();

    if (presetError || !preset) {
      return new Response(
        JSON.stringify({ error: "Preset no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const creditsCost = preset.credits_cost;

    // 2. Verificar y consumir créditos
    const { data: creditsOk, error: creditsError } = await supabase.rpc(
      "consume_ai_credits",
      {
        p_vendor_id: vendor_id,
        p_credits: creditsCost,
      }
    );

    if (creditsError || !creditsOk) {
      return new Response(
        JSON.stringify({
          error: "Créditos insuficientes",
          credits_needed: creditsCost,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Construir el prompt final
    const finalPrompt = buildPrompt(
      preset.prompt_template,
      product_name,
      product_description,
      generation_type
    );

    console.log("🎨 Generando imagen con prompt:", finalPrompt);

    // 4. Seleccionar modelo según tipo
    const model = selectModel(generation_type);

    // 5. Llamar a Cloudflare Workers AI
    const cfResponse = await fetch(`${CF_BASE_URL}/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        num_steps: model === MODELS.FLUX ? 4 : 20,
        width: 1024,
        height: 1024,
      }),
    });

    if (!cfResponse.ok) {
      const errorText = await cfResponse.text();
      console.error("❌ Cloudflare error:", errorText);

      // Devolver créditos al vendor
      await supabase.rpc("refund_ai_credits", {
        p_vendor_id: vendor_id,
        p_credits: creditsCost,
      });

      return new Response(
        JSON.stringify({ error: "Error al generar imagen. Créditos devueltos." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Cloudflare devuelve la imagen en diferentes formatos según el modelo
    const contentType = cfResponse.headers.get("content-type") || "";
    let imageBlob: Blob;

    if (contentType.includes("application/json")) {
      // FLUX devuelve JSON con base64
      const jsonData = await cfResponse.json();
      const base64Image = jsonData.result?.image;
      if (!base64Image) {
        throw new Error("No se recibió imagen de Cloudflare");
      }
      const binaryString = atob(base64Image);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      imageBlob = new Blob([bytes], { type: "image/png" });
    } else {
      // SDXL devuelve imagen binaria directa
      imageBlob = await cfResponse.blob();
    }

    // 7. Subir imagen al bucket de Supabase
    const timestamp = Date.now();
    const fileName = `${vendor_id}/${timestamp}-${generation_type}.png`;

    const { error: uploadError } = await supabase.storage
      .from("ai-generated-images")
      .upload(fileName, imageBlob, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("❌ Upload error:", uploadError);
      throw new Error("Error al guardar imagen");
    }

    // 8. Obtener URL pública
    const { data: urlData } = supabase.storage
      .from("ai-generated-images")
      .getPublicUrl(fileName);

    const publicImageUrl = urlData.publicUrl;

    // 9. Guardar en ai_generations
    const { data: generation, error: genError } = await supabase
      .from("ai_generations")
      .insert({
        vendor_id,
        product_id: product_id || null,
        content_type: generation_type,
        generation_type: "image",
        prompt: finalPrompt,
        result: `Imagen generada: ${preset.name}`,
        image_url: publicImageUrl,
        input_image_url: input_image_url || null,
        image_style: preset.name,
        credits_used: creditsCost,
        tone: null,
      })
      .select()
      .single();

    if (genError) {
      console.error("⚠️ Error guardando generación:", genError);
    }

    // 10. Obtener créditos actualizados
    const { data: subscription } = await supabase
      .from("ai_subscriptions")
      .select("credits_remaining, plan")
      .eq("vendor_id", vendor_id)
      .single();

    // ✅ Respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        image_url: publicImageUrl,
        generation_id: generation?.id,
        preset_name: preset.name,
        credits_used: creditsCost,
        credits_remaining: subscription?.credits_remaining || 0,
        plan: subscription?.plan || "starter",
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

// ============================================
// HELPERS
// ============================================

function buildPrompt(
  template: string,
  productName: string,
  productDescription?: string,
  generationType?: string
): string {
  const baseProduct = productDescription
    ? `${productName}, ${productDescription}`
    : productName;

  let prompt = "";

  if (generationType === "remove_background") {
    prompt = `${baseProduct}, ${template}, high quality product photography, ultra detailed, sharp focus, 8k resolution`;
  } else if (generationType === "context") {
    prompt = `${baseProduct} placed in ${template}, product photography, professional lighting, ultra detailed, commercial photo, sharp focus`;
  } else if (generationType === "model") {
    prompt = `${template}, holding or wearing ${baseProduct}, natural lighting, high quality lifestyle photography, ultra realistic, sharp focus, commercial photo`;
  } else {
    prompt = `${baseProduct}, ${template}`;
  }

  return prompt;
}

function selectModel(generationType: string): string {
  switch (generationType) {
    case "remove_background":
      return MODELS.FLUX; // Rápido y limpio
    case "context":
      return MODELS.FLUX; // Balance calidad/velocidad
    case "model":
      return MODELS.SDXL_LIGHTNING; // Mejor con personas
    default:
      return MODELS.FLUX;
  }
}