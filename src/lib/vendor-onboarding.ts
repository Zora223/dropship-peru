import { supabase } from "./supabase";

// ================================================
// TIPOS
// ================================================

export interface CreateStoreInput {
  name: string;
  slug: string;
  description?: string;
  whatsapp?: string;
  contact_email?: string;
}

export interface CreateStoreResult {
  storeId: string;
  slug: string;
}

// ================================================
// CONFIGURACIÓN
// ================================================

const TRIAL_DAYS = 30;

// Tema por defecto para tiendas nuevas
const DEFAULT_THEME = {
  primary_color: "#e11d48",
  secondary_color: "#1f2937",
  font: "Inter",
};

// Métodos de pago por defecto (todos apagados, el vendor los configura después)
const DEFAULT_PAYMENT_METHODS = {
  yape: { enabled: false, number: "", holder: "" },
  plin: { enabled: false, number: "", holder: "" },
  transfer: { enabled: false, bank: "", account: "", holder: "" },
  cash_on_delivery: { enabled: false },
};

// ================================================
// UTILIDADES
// ================================================

/**
 * Convierte un texto en un slug válido para URL.
 * Ej: "Mi Tienda Genial!" → "mi-tienda-genial"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9\s-]/g, "") // solo letras/números/espacios/guiones
    .replace(/\s+/g, "-") // espacios → guiones
    .replace(/-+/g, "-") // colapsa guiones múltiples
    .replace(/^-|-$/g, ""); // quita guiones al inicio/final
}

/**
 * Verifica si un slug está disponible (no lo usa otra tienda).
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const normalized = generateSlug(slug);

  if (normalized.length < 3) return false;

  const { data, error } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", normalized)
    .maybeSingle();

  if (error) {
    console.error("Error checking slug:", error);
    throw error;
  }

  return data === null;
}

// ================================================
// CREACIÓN DE TIENDA + CONVERSIÓN A VENDOR
// ================================================

/**
 * Crea la tienda del usuario actual, lo convierte en vendor y
 * setea la fecha de fin de prueba (30 días desde ahora).
 *
 * Devuelve el id y slug de la tienda creada.
 */
export async function createStoreForCurrentUser(
  input: CreateStoreInput
): Promise<CreateStoreResult> {
  // 1. Validar sesión
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Debes iniciar sesión para crear una tienda.");
  }

  // 2. Normalizar y validar datos
  const name = input.name.trim();
  const slug = generateSlug(input.slug);

  if (name.length < 3) {
    throw new Error("El nombre de la tienda debe tener al menos 3 caracteres.");
  }

  if (slug.length < 3) {
    throw new Error("El enlace de la tienda debe tener al menos 3 caracteres.");
  }

  // 3. Verificar que el slug esté libre
  const available = await isSlugAvailable(slug);
  if (!available) {
    throw new Error(
      "Ese enlace ya está en uso. Prueba con otro nombre para tu tienda."
    );
  }

  // 4. Calcular fecha fin de prueba
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  // 5. Crear la tienda
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .insert({
      owner_id: user.id,
      name,
      slug,
      description: input.description?.trim() || null,
      whatsapp: input.whatsapp?.trim() || null,
      contact_email: input.contact_email?.trim() || user.email || null,
      theme: DEFAULT_THEME,
      payment_methods: DEFAULT_PAYMENT_METHODS,
      is_active: true,
      subscription_status: "trial",
      trial_ends_at: trialEndsAt.toISOString(),
      plan_price: 15.0,
    })
    .select("id, slug")
    .single();

  if (storeError) {
    console.error("Error creating store:", storeError);
    throw new Error(
      "No pudimos crear tu tienda. Verifica los datos e intenta de nuevo."
    );
  }

  // 6. Cambiar rol del usuario a vendor
  const { error: roleError } = await supabase
    .from("profiles")
    .update({ role: "vendor" })
    .eq("id", user.id);

  if (roleError) {
    console.error("Error updating role:", roleError);
    // La tienda ya se creó, pero no pudimos cambiar el rol.
    // Lo dejamos así para que el admin pueda corregirlo manualmente.
    throw new Error(
      "Tu tienda se creó pero hubo un problema al activar tu rol de vendedor. Contacta soporte."
    );
  }

  return {
    storeId: store.id,
    slug: store.slug,
  };
}