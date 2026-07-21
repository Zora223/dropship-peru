// ============================================================
// LIB: Payment Validations Admin
// Gestión de validaciones OCR para el panel admin
// ============================================================

import { supabase } from "./supabase";

// ─── TYPES ─────────────────────────────────────────────────

export type ValidationStatus = "approved" | "rejected" | "manual_review";

export interface PaymentValidation {
  id: string;
  order_id: string;
  customer_id: string;
  receipt_image_url: string;

  ocr_raw_text: string | null;
  ocr_detected_amount: number | null;
  ocr_detected_code: string | null;
  ocr_detected_date: string | null;
  ocr_detected_recipient: string | null;
  ocr_detected_method: string | null;

  expected_amount: number;
  amount_matches: boolean;
  code_is_unique: boolean;
  date_is_recent: boolean;

  status: ValidationStatus;
  rejection_reason: string | null;
  confidence_score: number;
  requires_manual_review: boolean;

  processed_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;

  // Relaciones (joins)
  order?: {
    id: string;
    order_number: string;
    total: number;
    status: string;
    store_id: string;
    store?: {
      name: string;
      slug: string;
    };
  };
  customer?: {
    full_name: string;
    email: string;
  };
}

export interface ValidationStats {
  total: number;
  approved: number;
  rejected: number;
  manual_review: number;
  approval_rate: number;
  today_count: number;
  this_week_count: number;
}

// ─── LISTAR VALIDACIONES ──────────────────────────────────

export async function listPaymentValidations(filters?: {
  status?: ValidationStatus | "all";
  search?: string;
  limit?: number;
}): Promise<PaymentValidation[]> {
  let query = supabase
    .from("payment_validations")
    .select(
      `
      *,
      order:orders!payment_validations_order_id_fkey(
        id,
        order_number,
        total,
        status,
        store_id,
        store:stores!orders_store_id_fkey(
          name,
          slug
        )
      ),
      customer:profiles!payment_validations_customer_id_fkey(
        full_name,
        email
      )
    `
    )
    .order("processed_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(100);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error listando validaciones:", error);
    throw error;
  }

  let results = (data ?? []) as PaymentValidation[];

  // Filtro de búsqueda en frontend (por order_number)
  if (filters?.search) {
    const search = filters.search.toLowerCase().trim();
    results = results.filter(
      (v) =>
        v.order?.order_number?.toLowerCase().includes(search) ||
        v.customer?.full_name?.toLowerCase().includes(search) ||
        v.customer?.email?.toLowerCase().includes(search) ||
        v.ocr_detected_recipient?.toLowerCase().includes(search)
    );
  }

  return results;
}

// ─── ESTADÍSTICAS ─────────────────────────────────────────

export async function getValidationStats(): Promise<ValidationStats> {
  const { data, error } = await supabase
    .from("payment_validations")
    .select("status, processed_at");

  if (error) {
    console.error("Error obteniendo stats:", error);
    return {
      total: 0,
      approved: 0,
      rejected: 0,
      manual_review: 0,
      approval_rate: 0,
      today_count: 0,
      this_week_count: 0,
    };
  }

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const total = data.length;
  const approved = data.filter((v) => v.status === "approved").length;
  const rejected = data.filter((v) => v.status === "rejected").length;
  const manual_review = data.filter(
    (v) => v.status === "manual_review"
  ).length;

  const today_count = data.filter(
    (v) => new Date(v.processed_at) >= startOfToday
  ).length;

  const this_week_count = data.filter(
    (v) => new Date(v.processed_at) >= startOfWeek
  ).length;

  return {
    total,
    approved,
    rejected,
    manual_review,
    approval_rate: total > 0 ? Math.round((approved / total) * 100) : 0,
    today_count,
    this_week_count,
  };
}

// ─── APROBAR MANUALMENTE ──────────────────────────────────

export async function approveValidationManually(
  validationId: string,
  adminNotes?: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");

  // 1. Obtener validación con order_id
  const { data: validation, error: fetchError } = await supabase
    .from("payment_validations")
    .select("order_id, status")
    .eq("id", validationId)
    .single();

  if (fetchError || !validation) {
    throw new Error("Validación no encontrada");
  }

  // 2. Actualizar validación
  const { error: updateError } = await supabase
    .from("payment_validations")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      admin_notes: adminNotes || "Aprobado manualmente por admin",
      requires_manual_review: false,
    })
    .eq("id", validationId);

  if (updateError) throw updateError;

  // 3. Confirmar el pedido
  const { error: orderError } = await supabase
    .from("orders")
    .update({ status: "confirmed" })
    .eq("id", validation.order_id);

  if (orderError) {
    console.error("Error confirmando pedido:", orderError);
    throw orderError;
  }
}

// ─── RECHAZAR MANUALMENTE ─────────────────────────────────

export async function rejectValidationManually(
  validationId: string,
  reason: string,
  adminNotes?: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("payment_validations")
    .update({
      status: "rejected",
      rejection_reason: reason,
      admin_notes: adminNotes || "Rechazado manualmente por admin",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      requires_manual_review: false,
    })
    .eq("id", validationId);

  if (error) throw error;
}

// ─── OBTENER UNA VALIDACIÓN ───────────────────────────────

export async function getValidationById(
  validationId: string
): Promise<PaymentValidation | null> {
  const { data, error } = await supabase
    .from("payment_validations")
    .select(
      `
      *,
      order:orders!payment_validations_order_id_fkey(
        id,
        order_number,
        total,
        status,
        store_id,
        store:stores!orders_store_id_fkey(
          name,
          slug
        )
      ),
      customer:profiles!payment_validations_customer_id_fkey(
        full_name,
        email
      )
    `
    )
    .eq("id", validationId)
    .single();

  if (error) {
    console.error("Error obteniendo validación:", error);
    return null;
  }

  return data as PaymentValidation;
}