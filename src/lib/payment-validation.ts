// ============================================================
// PAYMENT VALIDATION — Cliente para validar pagos con OCR
// ============================================================
// Envía la imagen del comprobante a la Edge Function que
// la procesa con Google Vision API y retorna el resultado.
// ============================================================

import { supabase } from "./supabase";

export interface OCRDetails {
  amount: number | null;
  code: string | null;
  date: string | null;
  method: "yape" | "plin" | "transfer" | "unknown";
  recipient: string | null;
}

export interface ValidationResponse {
  status: "approved" | "rejected" | "manual_review";
  confidence: number;
  reason: string;
  ocr: OCRDetails;
  validation_id: string | null;
}

/**
 * Convierte un File a base64 (sin el prefijo data:image/...)
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Quitar el prefijo "data:image/jpeg;base64,"
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Valida el comprobante de pago llamando a la Edge Function.
 *
 * Usa fetch directo (NO el SDK) para evitar problemas de
 * autenticación cuando el cliente no está logueado.
 */
export async function validatePaymentReceipt(
  orderId: string,
  imageFile: File
): Promise<ValidationResponse> {
  // Validar tamaño (máx 5MB)
  if (imageFile.size > 5 * 1024 * 1024) {
    throw new Error("La imagen no puede pesar más de 5MB");
  }

  // Validar tipo
  if (!imageFile.type.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen");
  }

  // Convertir a base64
  const imageBase64 = await fileToBase64(imageFile);

  // URL y key desde variables de entorno
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Configuración de Supabase no disponible");
  }

  // Llamar Edge Function con fetch directo
  // (evitamos supabase.functions.invoke porque envía tokens
  // problemáticos cuando el usuario no está logueado)
  const response = await fetch(
    `${supabaseUrl}/functions/v1/validate-payment`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        order_id: orderId,
        image_base64: imageBase64,
      }),
    }
  );

  // Manejar errores HTTP
  if (!response.ok) {
    let errorMessage = `Error ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // Ignorar si no se puede parsear
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  if (!data) {
    throw new Error("Sin respuesta del servidor");
  }

  return data as ValidationResponse;
}

/**
 * Obtiene las validaciones previas de un pedido.
 */
export async function getOrderValidations(orderId: string) {
  const { data, error } = await supabase
    .from("payment_validations")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}