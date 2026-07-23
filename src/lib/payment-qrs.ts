import { supabase } from "./supabase";

export type PaymentQrMethod = "yape" | "plin" | "transfer";
export type PaymentQrOwnerType = "platform" | "vendor";

export interface PaymentQr {
  id: string;
  owner_type: PaymentQrOwnerType;
  owner_id: string | null;
  payment_method: PaymentQrMethod;
  holder_name: string;
  phone: string | null;
  account_number: string | null;
  cci: string | null;
  bank_name: string | null;
  qr_image_url: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentQrInput {
  owner_type: PaymentQrOwnerType;
  owner_id: string | null;
  payment_method: PaymentQrMethod;
  holder_name: string;
  phone?: string | null;
  account_number?: string | null;
  cci?: string | null;
  bank_name?: string | null;
  qr_image_url?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

// 🆕 Obtener QRs de la plataforma (Dropship)
export async function getPlatformQrs(): Promise<PaymentQr[]> {
  const { data, error } = await supabase
    .from("payment_qrs")
    .select("*")
    .eq("owner_type", "platform")
    .order("payment_method");

  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentQr[];
}

// 🆕 Obtener QRs de un vendor específico
export async function getVendorQrs(vendorId: string): Promise<PaymentQr[]> {
  const { data, error } = await supabase
    .from("payment_qrs")
    .select("*")
    .eq("owner_type", "vendor")
    .eq("owner_id", vendorId)
    .order("payment_method");

  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentQr[];
}

// 🆕 Obtener QRs de MIS tiendas (para vendor logueado)
export async function getMyVendorQrs(): Promise<PaymentQr[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");

  const { data: stores } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id);

  if (!stores || stores.length === 0) return [];

  const storeIds = stores.map((s) => s.id);

  const { data, error } = await supabase
    .from("payment_qrs")
    .select("*")
    .eq("owner_type", "vendor")
    .in("owner_id", storeIds)
    .order("payment_method");

  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentQr[];
}

// 🆕 Crear o actualizar QR
export async function upsertPaymentQr(
  input: PaymentQrInput,
  qrId?: string
): Promise<PaymentQr> {
  if (qrId) {
    // UPDATE
    const { data, error } = await supabase
      .from("payment_qrs")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", qrId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as PaymentQr;
  } else {
    // INSERT
    const { data, error } = await supabase
      .from("payment_qrs")
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as PaymentQr;
  }
}

// 🆕 Eliminar QR
export async function deletePaymentQr(qrId: string): Promise<void> {
  const { error } = await supabase.from("payment_qrs").delete().eq("id", qrId);
  if (error) throw new Error(error.message);
}

// 🆕 Subir imagen QR a Storage
export async function uploadQrImage(
  file: File,
  ownerType: PaymentQrOwnerType,
  ownerId: string | null,
  paymentMethod: PaymentQrMethod
): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const folder = ownerType === "platform" ? "platform" : `vendor-${ownerId}`;
  const fileName = `${folder}/${paymentMethod}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("payment-qrs")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from("payment-qrs").getPublicUrl(fileName);
  return data.publicUrl;
}

// 🆕 Obtener QR de pago según receptor (usado en PaymentPage)
export async function getPaymentQrForOrder(
  paymentReceiver: "platform" | "vendor",
  vendorId: string | null,
  paymentMethod: PaymentQrMethod
): Promise<PaymentQr | null> {
  let query = supabase
    .from("payment_qrs")
    .select("*")
    .eq("payment_method", paymentMethod)
    .eq("is_active", true);

  if (paymentReceiver === "platform") {
    query = query.eq("owner_type", "platform");
  } else {
    query = query.eq("owner_type", "vendor").eq("owner_id", vendorId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return data as PaymentQr | null;
}