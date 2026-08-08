// src/lib/suppliers.ts
// v22.6 — Sin código legacy + conteo real de productos
// Cliente para gestionar proveedores (supplier_profiles)

import { supabase } from "./supabase";

// ═══════════════════════════════════════════════════════════
// 🏭 SUPPLIER_PROFILES — Usuarios proveedores con login
// ═══════════════════════════════════════════════════════════

// ─── TIPOS ─────────────────────────────────────────────────

export interface SupplierProfile {
  id: string;
  business_name: string;
  ruc: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  district: string | null;
  city: string;
  reference: string | null;
  bio: string | null;
  logo_url: string | null;
  category: string | null;
  is_active: boolean;
  is_verified: boolean;
  rating: number;
  total_orders: number;
  total_products: number;
  yape_number: string | null;
  bank_account: string | null;
  bank_name: string | null;
  admin_notes: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierWithProfile extends SupplierProfile {
  profiles?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export type SupplierInput = Omit<
  SupplierProfile,
  | "id"
  | "is_active"
  | "is_verified"
  | "rating"
  | "total_orders"
  | "total_products"
  | "approved_at"
  | "approved_by"
  | "admin_notes"
  | "created_at"
  | "updated_at"
>;

// ─── HELPER interno: enriquecer con conteo real ─────────────

async function enrichWithProductCount<T extends { id: string }>(
  suppliers: T[]
): Promise<(T & { total_products: number })[]> {
  if (!suppliers || suppliers.length === 0) return [];

  const supplierIds = suppliers.map((s) => s.id);

  const { data: products, error } = await supabase
    .from("catalog_products")
    .select("supplier_id")
    .in("supplier_id", supplierIds)
    .is("deleted_at", null);

  if (error) {
    console.warn("Error contando productos:", error);
  }

  const productCount: Record<string, number> = {};
  (products ?? []).forEach((p) => {
    if (p.supplier_id) {
      productCount[p.supplier_id] = (productCount[p.supplier_id] ?? 0) + 1;
    }
  });

  return suppliers.map((s) => ({
    ...s,
    total_products: productCount[s.id] ?? 0,
  }));
}

// ─── MI PERFIL (proveedor autenticado) ─────────────────────

export async function getMySupplierProfile(): Promise<SupplierProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("supplier_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as SupplierProfile | null) ?? null;
}

export async function upsertMySupplierProfile(
  input: Partial<SupplierInput>
): Promise<SupplierProfile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("supplier_profiles")
    .upsert({
      id: user.id,
      ...input,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as SupplierProfile;
}

// ─── ADMIN ─────────────────────────────────────────────────

/**
 * Obtiene todos los proveedores-usuarios (con su perfil de auth + stats reales).
 */
export async function getAllSupplierProfiles(): Promise<SupplierWithProfile[]> {
  const { data, error } = await supabase
    .from("supplier_profiles")
    .select(
      `
      *,
      profiles!supplier_profiles_id_fkey (
        full_name,
        email,
        avatar_url
      )
      `
    )
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const enriched = await enrichWithProductCount(data as any[]);
  return enriched as unknown as SupplierWithProfile[];
}

/**
 * Obtiene proveedores pendientes de aprobación.
 */
export async function getPendingSupplierProfiles(): Promise<
  SupplierWithProfile[]
> {
  const { data, error } = await supabase
    .from("supplier_profiles")
    .select(
      `
      *,
      profiles!supplier_profiles_id_fkey (
        full_name,
        email,
        avatar_url
      )
      `
    )
    .eq("is_active", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const enriched = await enrichWithProductCount(data as any[]);
  return enriched as unknown as SupplierWithProfile[];
}

/**
 * Obtiene proveedores activos.
 */
export async function getActiveSupplierProfiles(): Promise<
  SupplierWithProfile[]
> {
  const { data, error } = await supabase
    .from("supplier_profiles")
    .select(
      `
      *,
      profiles!supplier_profiles_id_fkey (
        full_name,
        email,
        avatar_url
      )
      `
    )
    .eq("is_active", true)
    .order("business_name", { ascending: true });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const enriched = await enrichWithProductCount(data as any[]);
  return enriched as unknown as SupplierWithProfile[];
}

/**
 * Obtiene un proveedor-usuario por ID.
 */
export async function getSupplierProfileById(
  id: string
): Promise<SupplierWithProfile | null> {
  const { data, error } = await supabase
    .from("supplier_profiles")
    .select(
      `
      *,
      profiles!supplier_profiles_id_fkey (
        full_name,
        email,
        avatar_url
      )
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  // Contar productos reales
  const { count } = await supabase
    .from("catalog_products")
    .select("*", { count: "exact", head: true })
    .eq("supplier_id", id)
    .is("deleted_at", null);

  return {
    ...(data as any),
    total_products: count ?? 0,
  } as unknown as SupplierWithProfile;
}

/**
 * Aprueba un proveedor (solo admin).
 */
export async function approveSupplier(supplierId: string): Promise<void> {
  const { error } = await supabase.rpc("approve_supplier", {
    p_supplier_id: supplierId,
  });
  if (error) throw new Error(error.message);
}

/**
 * Revoca un proveedor (solo admin).
 */
export async function revokeSupplier(
  supplierId: string,
  reason?: string
): Promise<void> {
  const { error } = await supabase.rpc("revoke_supplier", {
    p_supplier_id: supplierId,
    p_reason: reason ?? null,
  });
  if (error) throw new Error(error.message);
}

/**
 * Actualiza el perfil de un proveedor (admin).
 */
export async function updateSupplierAsAdmin(
  supplierId: string,
  input: Partial<SupplierProfile>
): Promise<SupplierProfile> {
  const { data, error } = await supabase
    .from("supplier_profiles")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", supplierId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as SupplierProfile;
}

/**
 * Actualiza notas del admin sobre el proveedor.
 */
export async function updateSupplierNotes(
  supplierId: string,
  notes: string
): Promise<void> {
  const { error } = await supabase
    .from("supplier_profiles")
    .update({ admin_notes: notes, updated_at: new Date().toISOString() })
    .eq("id", supplierId);
  if (error) throw new Error(error.message);
}

// ═══════════════════════════════════════════════════════════
// 🏷️ HELPERS UI
// ═══════════════════════════════════════════════════════════

export function getSupplierStatusLabel(
  supplier: Pick<SupplierProfile, "is_active" | "is_verified">
): string {
  if (supplier.is_active && supplier.is_verified) return "✅ Activo";
  if (supplier.is_active) return "⚡ Activo (sin verificar)";
  return "⏳ Pendiente de aprobación";
}

export function getSupplierStatusColor(
  supplier: Pick<SupplierProfile, "is_active" | "is_verified">
): string {
  if (supplier.is_active && supplier.is_verified)
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (supplier.is_active)
    return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

/**
 * Categorías sugeridas para proveedores
 */
export const SUPPLIER_CATEGORIES = [
  { value: "ropa", label: "👕 Ropa y moda" },
  { value: "calzado", label: "👟 Calzado" },
  { value: "accesorios", label: "👜 Accesorios" },
  { value: "tecnologia", label: "📱 Tecnología" },
  { value: "hogar", label: "🏠 Hogar y decoración" },
  { value: "belleza", label: "💄 Belleza y cuidado" },
  { value: "deportes", label: "⚽ Deportes" },
  { value: "juguetes", label: "🧸 Juguetes" },
  { value: "otros", label: "📦 Otros" },
] as const;

export function getCategoryLabel(value: string | null): string {
  if (!value) return "Sin categoría";
  const cat = SUPPLIER_CATEGORIES.find((c) => c.value === value);
  return cat?.label ?? value;
}

/**
 * Formatea la dirección completa del proveedor
 */
export function formatSupplierAddress(
  supplier: Pick<SupplierProfile, "address" | "district" | "city">
): string {
  const parts: string[] = [];
  if (supplier.address) parts.push(supplier.address);
  if (supplier.district) parts.push(supplier.district);
  if (supplier.city) parts.push(supplier.city);
  return parts.length > 0 ? parts.join(", ") : "Sin dirección";
}