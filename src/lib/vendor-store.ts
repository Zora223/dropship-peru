import { supabase } from "./supabase";
import { uploadFile } from "./storage";
import type { DbStore, DbStoreTheme, DbStorePaymentMethod } from "../types/database";

/**
 * Obtiene la tienda del vendor actualmente logueado.
 * Retorna null si aún no ha creado una.
 */
export async function fetchMyStore(): Promise<DbStore | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching my store:", error);
    throw error;
  }

  return data as DbStore | null;
}

export interface CreateStoreInput {
  name: string;
  slug: string;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
}

/**
 * Crea la tienda del vendor.
 */
export async function createMyStore(input: CreateStoreInput): Promise<DbStore> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("stores")
    .insert({
      ...input,
      owner_id: user.id,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating store:", error);
    if (error.code === "23505") {
      throw new Error("Esa URL ya está siendo usada por otra tienda. Elige otra.");
    }
    throw error;
  }

  return data as DbStore;
}

/**
 * Actualiza datos básicos de la tienda.
 */
export async function updateMyStore(
  storeId: string,
  updates: Partial<CreateStoreInput>
): Promise<DbStore> {
  const { data, error } = await supabase
    .from("stores")
    .update(updates)
    .eq("id", storeId)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Esa URL ya está siendo usada por otra tienda. Elige otra.");
    }
    throw error;
  }

  return data as DbStore;
}

/**
 * Sube un logo y actualiza la tienda.
 */
export async function updateStoreLogo(storeId: string, file: File): Promise<string> {
  const url = await uploadFile("store-logos", file, storeId);
  const { error } = await supabase
    .from("stores")
    .update({ logo_url: url })
    .eq("id", storeId);
  if (error) throw error;
  return url;
}

/**
 * Actualiza el tema visual de la tienda.
 */
export async function updateStoreTheme(
  storeId: string,
  theme: DbStoreTheme
): Promise<void> {
  const { error } = await supabase
    .from("stores")
    .update({ theme })
    .eq("id", storeId);
  if (error) throw error;
}

/**
 * Actualiza los métodos de pago configurados.
 */
export async function updateStorePaymentMethods(
  storeId: string,
  payment_methods: DbStorePaymentMethod[]
): Promise<void> {
  const { error } = await supabase
    .from("stores")
    .update({ payment_methods })
    .eq("id", storeId);
  if (error) throw error;
}

/**
 * Valida si un slug está disponible.
 */
export async function isSlugAvailable(slug: string, excludeStoreId?: string): Promise<boolean> {
  let query = supabase.from("stores").select("id").eq("slug", slug);
  if (excludeStoreId) {
    query = query.neq("id", excludeStoreId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data === null;
}
