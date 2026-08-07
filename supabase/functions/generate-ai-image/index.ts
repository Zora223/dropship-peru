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
  product_id?: string;
  product_name: string;
  product_description?: string;
  generation_type: "remove_background" | "context" | "model";
  preset_id: string;
  input_image_url?: string;
}

serve(async (req) => {
  console.log("🚀 Request received:", req.method);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Autenticación con el JWT del usuario
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("❌ Sin header de autorización");
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cliente Supabase con auth del usuario
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verificar usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      console.log("❌ Usuario no autenticado:", userError);
      return new Response(
        JSON.stringify({ error: "Usuario no autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vendorId = user.id; // ✅ Usar el ID del usuario autenticado
    console.log("✅ Usuario autenticado:", vendorId);

    // Cliente admin para bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 2. Parsear body
    const body: RequestBody = await req.json();
    const {
      product_id,
      product_name,
      product_description,
      generation_type,
      preset_id,
      input_image_url,
    } = body;

    console.log("📦 Request body:", { product_name, generation_type, preset_id });

    // Validaciones
    if (!product_name || !preset_id || !generation_type) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Obtener el preset
    const { data: preset, error: presetError } = await supabaseAdmin
      .from("ai_image_presets")
      .select("*")
      .eq("id", preset_id)
      .eq("is_active", true)
      .single();

    if (presetError || !preset) {
      console.log("❌ Preset no encontrado:", presetError);
      return new Response(
        JSON.stringify({ error: "Preset no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const creditsCost = preset.credits_cost;
    console.log(`💎 Costo: ${creditsCost} créditos`);

    // 4. Verificar créditos ANTES de consumir
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("ai_subscriptions")
      .select("credits_remaining, plan")
      .eq("vendor_id", vendorId)
      .single();

    if (subError || !subscription) {
      console.log("❌ No hay subscripción:", subError);
      return new Response(
        JSON.stringify({ error: "No tienes una subscripción activa" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`💰 Créditos actuales: ${subscription.credits_remaining}, Plan: ${subscription.plan}`);

    // Verificar si tiene suficientes créditos (excepto BUSINESS ilimitado)
    if (subscription.plan !== "business" && subscription.credits_remaining < creditsCost) {
      console.log(`❌ Créditos insuficientes: tiene ${subscription.credits_remaining}, necesita ${creditsCost}`);
      return new Response(
        JSON.stringify({
          error: "Créditos insuficientes",
          credits_needed: creditsCost,
          credits_available: subscription.credits_remaining,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Consumir créditos
    const { data: creditsOk, error: creditsError } = await supabaseAdmin.rpc(
      "consume_ai_credits",
      {
        p_vendor_id: vendorId,
        p_credits: creditsCost,
      }
    );

    console.log("💳 Resultado consume_ai_credits:", { creditsOk, creditsError });

    if (creditsError || !creditsOk) {
      console.log("❌ Error consumiendo créditos:", creditsError);
      return new Response(
        JSON.stringify({
          error: "Error al procesar créditos",
          credits_needed: creditsCost,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Construir el prompt final
    const finalPrompt = buildPrompt(
      preset.prompt_template,
      product_name,
      product_description,
      generation_type
    );

    console.log("🎨 Generando imagen con prompt:", finalPrompt.substring(0, 100));

    // 7. Seleccionar modelo según tipo
    const model = selectModel(generation_type);
    console.log("🤖 Modelo seleccionado:", model);

    // 8. Llamar a Cloudflare Workers AI
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

    console.log(`☁️ Cloudflare response: ${cfResponse.status}`);

    if (!cfResponse.ok) {
      const errorText = await cfResponse.text();
      console.error("❌ Cloudflare error:", errorText);

      // Devolver créditos al vendor
      await supabaseAdmin.rpc("refund_ai_credits", {
        p_vendor_id: vendorId,
        p_credits: creditsCost,
      });

      return new Response(
        JSON.stringify({
          error: "Error al generar imagen. Créditos devueltos.",
          details: errorText,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 9. Procesar respuesta de Cloudflare
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
      imageBlob = await cfResponse.blob();
    }

    console.log(`🖼️ Imagen recibida: ${imageBlob.size} bytes`);

    // 10. Subir imagen al bucket
    const timestamp = Date.now();
    const fileName = `${vendorId}/${timestamp}-${generation_type}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("ai-generated-images")
      .upload(fileName, imageBlob, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("❌ Upload error:", uploadError);
      throw new Error("Error al guardar imagen");
    }

    console.log("✅ Imagen subida:", fileName);

    // 11. Obtener URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from("ai-generated-images")
      .getPublicUrl(fileName);

    const publicImageUrl = urlData.publicUrl;

    // 12. Guardar en ai_generations
    const { data: generation, error: genError } = await supabaseAdmin
      .from("ai_generations")
      .insert({
        vendor_id: vendorId,
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

    // 13. Obtener créditos actualizados
    const { data: updatedSub } = await supabaseAdmin
      .from("ai_subscriptions")
      .select("credits_remaining, plan")
      .eq("vendor_id", vendorId)
      .single();

    console.log("🎉 Éxito! Créditos restantes:", updatedSub?.credits_remaining);

    // ✅ Respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        image_url: publicImageUrl,
        generation_id: generation?.id,
        preset_name: preset.name,
        credits_used: creditsCost,
        credits_remaining: updatedSub?.credits_remaining || 0,
        plan: updatedSub?.plan || "starter",
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
      return MODELS.FLUX;
    case "context":
      return MODELS.FLUX;
    case "model":
      return MODELS.SDXL_LIGHTNING;
    default:
      return MODELS.FLUX;
  }
}