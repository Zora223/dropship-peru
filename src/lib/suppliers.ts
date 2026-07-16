// src/lib/suppliers.ts
// Cliente para gestionar proveedores
// ├─ Suppliers (tabla suppliers) - registros simples usados en catalog_products
// └─ SupplierProfiles (tabla supplier_profiles) - usuarios con login y panel

import { supabase } from "./supabase";
import type { DbSupplier } from "../types/database";


// ═══════════════════════════════════════════════════════════
// 📦 PARTE 1 — SUPPLIERS (tabla suppliers)
// Sistema viejo: registros simples asociados a catalog_products
// ═══════════════════════════════════════════════════════════

/**
 * Obtiene todos los proveedores (tabla suppliers, sistema legacy).
 */
export type LegacySupplierInput = {
  name: string;
  contact_email: string;
  contact_phone: string | null;
  notes: string | null;
  is_active: boolean;
};
export async function fetchSuppliers(): Promise<DbSupplier[]> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbSupplier[];
}

/**
 * Crea un proveedor simple.
 */
export async function createSupplier(
  input: Omit<DbSupplier, "id" | "created_at">
): Promise<DbSupplier> {
  const { data, error } = await supabase
    .from("suppliers")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DbSupplier;
}

/**
 * Actualiza un proveedor.
 */
export async function updateSupplier(
  id: string,
  input: Partial<Omit<DbSupplier, "id" | "created_at">>
): Promise<DbSupplier> {
  const { data, error } = await supabase
    .from("suppliers")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DbSupplier;
}

/**
 * Activa/desactiva un proveedor.
 */
export async function toggleSupplierActive(
  id: string,
  isActive: boolean
): Promise<DbSupplier> {
  const { data, error } = await supabase
    .from("suppliers")
    .update({ is_active: isActive })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DbSupplier;
}

/**
 * Elimina un proveedor.
 */
export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ═══════════════════════════════════════════════════════════
// 🏭 PARTE 2 — SUPPLIER_PROFILES (nuevos usuarios proveedores)
// Sistema nuevo: proveedores con login, panel propio, etc.
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
  supplier_id: string | null; // FK opcional a suppliers legacy
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
  | "supplier_id"
  | "created_at"
  | "updated_at"
>;

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
 * Obtiene todos los proveedores-usuarios (con su perfil de auth).
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
  return (data ?? []) as unknown as SupplierWithProfile[];
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
  return (data ?? []) as unknown as SupplierWithProfile[];
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
  return (data ?? []) as unknown as SupplierWithProfile[];
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
  return (data as unknown as SupplierWithProfile | null) ?? null;
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

/**
 * Vincula un supplier_profile con un supplier (legacy) existente.
 * Útil cuando un proveedor ya registrado en suppliers se une a la plataforma.
 */
export async function linkSupplierProfileToLegacy(
  supplierProfileId: string,
  legacySupplierId: string
): Promise<void> {
  const { error } = await supabase
    .from("supplier_profiles")
    .update({ supplier_id: legacySupplierId })
    .eq("id", supplierProfileId);
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