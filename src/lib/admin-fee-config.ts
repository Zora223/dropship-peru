// src/lib/admin-fee-config.ts
// Configuración global de fees de la plataforma
import { supabase } from "./supabase";

export interface FeeConfig {
  id: number;
  fee_percent: number;
  fee_min: number;
  updated_at: string;
  updated_by: string | null;
}

// Obtener config global (singleton, id=1)
export async function getFeeConfig(): Promise<FeeConfig | null> {
  const { data, error } = await supabase
    .from("platform_fee_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw error;
  return (data as FeeConfig) ?? null;
}

// Actualizar config global
export async function updateFeeConfig(
  feePercent: number,
  feeMin: number
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const { error } = await supabase
    .from("platform_fee_config")
    .update({
      fee_percent: feePercent,
      fee_min: feeMin,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("id", 1);

  if (error) throw error;
}

// Calcular el fee que se aplicaría a un monto (preview)
export function previewFee(
  grossAmount: number,
  feePercent: number,
  feeMin: number
): { fee: number; net: number } {
  const percentFee = (grossAmount * feePercent) / 100;
  const fee = Math.min(Math.max(percentFee, feeMin), grossAmount);
  const net = Math.max(grossAmount - fee, 0);
  return { fee, net };
}