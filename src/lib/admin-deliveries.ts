// src/lib/admin-deliveries.ts
// Gestión de deliveries desde el panel de admin

import { supabase } from "./supabase";
import type { VehicleType } from "./delivery";

// ============================================
// 📋 TIPOS
// ============================================

/**
 * Perfil de delivery + datos del profile asociado (join)
 * Vista consolidada para el admin
 */
export interface AdminDeliveryRow {
  // De delivery_profiles
  id: string;
  phone: string;
  yape_number: string;
  vehicle_type: VehicleType;
  vehicle_plate: string | null;
  base_rate: number;
  zone_description: string | null;
  photo_url: string | null;
  is_active: boolean;
  available: boolean;
  rating: number;
  total_deliveries: number;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;

  // De profiles (join)
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

// ============================================
// 📥 QUERIES
// ============================================

/**
 * Obtiene todos los deliveries (con datos del profile).
 * Se usa en /admin/deliveries.
 */
export async function fetchAllDeliveries(): Promise<AdminDeliveryRow[]> {
  const { data, error } = await supabase
    .from("delivery_profiles")
    .select(
      `
      id,
      phone,
      yape_number,
      vehicle_type,
      vehicle_plate,
      base_rate,
      zone_description,
      photo_url,
      is_active,
      available,
      rating,
      total_deliveries,
      admin_notes,
      created_at,
      updated_at,
      profiles:id (
        full_name,
        email,
        avatar_url
      )
      `
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Aplanamos el join profiles:id → campos al mismo nivel
  const rows = (data ?? []).map((row: any) => ({
    id: row.id,
    phone: row.phone,
    yape_number: row.yape_number,
    vehicle_type: row.vehicle_type,
    vehicle_plate: row.vehicle_plate,
    base_rate: Number(row.base_rate),
    zone_description: row.zone_description,
    photo_url: row.photo_url,
    is_active: row.is_active,
    available: row.available,
    rating: Number(row.rating ?? 0),
    total_deliveries: Number(row.total_deliveries ?? 0),
    admin_notes: row.admin_notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    full_name: row.profiles?.full_name ?? null,
    email: row.profiles?.email ?? "",
    avatar_url: row.profiles?.avatar_url ?? null,
  })) as AdminDeliveryRow[];

  return rows;
}

// ============================================
// ✏️ MUTATIONS
// ============================================

/**
 * Activa o desactiva la cuenta de un delivery.
 * Cuando is_active=false, los vendors NO lo verán al asignar.
 */
export async function toggleDeliveryActive(
  deliveryId: string,
  active: boolean
): Promise<void> {
  const { error } = await supabase
    .from("delivery_profiles")
    .update({ is_active: active })
    .eq("id", deliveryId);

  if (error) throw new Error(error.message);
}

/**
 * Actualiza las notas internas del admin sobre un delivery.
 */
export async function updateAdminNotes(
  deliveryId: string,
  notes: string
): Promise<void> {
  const { error } = await supabase
    .from("delivery_profiles")
    .update({ admin_notes: notes })
    .eq("id", deliveryId);

  if (error) throw new Error(error.message);
}