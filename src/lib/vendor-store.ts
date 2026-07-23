import { supabase } from "./supabase";
import { uploadFile } from "./storage";
import type { DbStore, DbStoreTheme, DbStorePaymentMethod } from "../types/database";
import { upsertPaymentQr, uploadQrImage, deletePaymentQr, getVendorQrs } from "./payment-qrs";

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

// ============================================
// 🆕 v20 - Sistema unificado payment_qrs
// ============================================

/**
 * 🆕 Sube imagen de QR del vendor a bucket y retorna URL.
 */
export async function uploadVendorQrImage(
  storeId: string,
  file: File,
  paymentMethod: "yape" | "plin" | "transfer"
): Promise<string> {
  return uploadQrImage(file, "vendor", storeId, paymentMethod);
}

/**
 * 🆕 Sincroniza los métodos de pago con la tabla payment_qrs.
 * Esto permite al sistema unificado usar los QRs del vendor.
 */
export async function syncVendorPaymentQrs(
  storeId: string,
  paymentMethods: DbStorePaymentMethod[]
): Promise<void> {
  // Obtener QRs existentes del vendor
  const existingQrs = await getVendorQrs(storeId);

  // Solo sincronizar yape, plin, transfer (los que tienen QR)
  const methodsToSync = paymentMethods.filter(
    (m) => m.id === "yape" || m.id === "plin" || m.id === "transfer"
  );

  for (const method of methodsToSync) {
    const existing = existingQrs.find(
      (q) => q.payment_method === method.id
    );

    // Si está deshabilitado, marcar como inactivo o eliminar
    if (!method.enabled) {
      if (existing) {
        await deletePaymentQr(existing.id);
      }
      continue;
    }

    // Si está habilitado, upsertear
    const config = method.config ?? {};

    await upsertPaymentQr(
      {
        owner_type: "vendor",
        owner_id: storeId,
        payment_method: method.id as "yape" | "plin" | "transfer",
        holder_name: (config.holder_name as string) || (config.account_holder as string) || "Vendor",
        phone: (config.phone as string) || null,
        account_number: (config.account_number as string) || null,
        cci: (config.cci as string) || null,
        bank_name: (config.bank_name as string) || null,
        qr_image_url: (config.qr_url as string) || null,
        notes: (config.instructions as string) || null,
        is_active: true,
      },
      existing?.id
    );
  }
}