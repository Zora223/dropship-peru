import { supabase } from "./supabase";
import type { DbProfile, UserRole } from "../types/database";

export interface AdminUserView extends DbProfile {
  last_sign_in_at?: string | null;
}

/**
 * Lista todos los profiles (solo admin tiene acceso por RLS).
 */
export async function fetchAllUsers(): Promise<DbProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
  return data ?? [];
}

/**
 * Cambia el rol de un usuario.
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) {
    console.error("Error updating role:", error);
    throw error;
  }
}

/**
 * Activa/desactiva una cuenta.
 */
export async function toggleUserActive(userId: string, is_active: boolean): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_active })
    .eq("id", userId);

  if (error) {
    console.error("Error toggling user:", error);
    throw error;
  }
}

/**
 * Elimina un usuario completamente (profile + auth).
 * Esto requiere que tengamos una función RPC en Supabase porque
 * desde el cliente no se puede borrar de auth.users directamente.
 */
export async function deleteUser(userId: string): Promise<void> {
  // Por ahora solo borramos el profile.
  // El registro en auth.users queda huérfano (sin profile).
  // En producción real se usaría una Edge Function con service_role.
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}