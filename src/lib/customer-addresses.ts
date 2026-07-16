import { supabase } from "./supabase";
import type { DbCustomerAddress } from "../types/database";

export interface CustomerAddressInput {
  label: string;
  full_name: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  reference: string | null;
  is_default: boolean;
}

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  return user.id;
}

export async function fetchMyCustomerAddresses(): Promise<DbCustomerAddress[]> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("customer_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customer addresses:", error);
    throw error;
  }

  return (data ?? []) as DbCustomerAddress[];
}

export async function createMyCustomerAddress(
  input: CustomerAddressInput
): Promise<DbCustomerAddress> {
  const userId = await getCurrentUserId();

  const { count, error: countError } = await supabase
    .from("customer_addresses")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", userId);

  if (countError) {
    console.error("Error counting addresses:", countError);
    throw countError;
  }

  const shouldBeDefault = input.is_default || (count ?? 0) === 0;

  if (shouldBeDefault) {
    const { error: unsetError } = await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", userId);

    if (unsetError) {
      console.error("Error unsetting default addresses:", unsetError);
      throw unsetError;
    }
  }

  const { data, error } = await supabase
    .from("customer_addresses")
    .insert({
      customer_id: userId,
      label: input.label,
      full_name: input.full_name,
      phone: input.phone,
      street: input.street,
      district: input.district,
      city: input.city,
      reference: input.reference,
      is_default: shouldBeDefault,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating customer address:", error);
    throw error;
  }

  return data as DbCustomerAddress;
}

export async function updateMyCustomerAddress(
  addressId: string,
  input: CustomerAddressInput
): Promise<DbCustomerAddress> {
  const userId = await getCurrentUserId();

  if (input.is_default) {
    const { error: unsetError } = await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", userId);

    if (unsetError) {
      console.error("Error unsetting default addresses:", unsetError);
      throw unsetError;
    }
  }

  const { data, error } = await supabase
    .from("customer_addresses")
    .update({
      label: input.label,
      full_name: input.full_name,
      phone: input.phone,
      street: input.street,
      district: input.district,
      city: input.city,
      reference: input.reference,
      is_default: input.is_default,
    })
    .eq("id", addressId)
    .eq("customer_id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating customer address:", error);
    throw error;
  }

  return data as DbCustomerAddress;
}

export async function setDefaultCustomerAddress(
  addressId: string
): Promise<void> {
  const userId = await getCurrentUserId();

  const { error: unsetError } = await supabase
    .from("customer_addresses")
    .update({ is_default: false })
    .eq("customer_id", userId);

  if (unsetError) {
    console.error("Error unsetting default addresses:", unsetError);
    throw unsetError;
  }

  const { error } = await supabase
    .from("customer_addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("customer_id", userId);

  if (error) {
    console.error("Error setting default address:", error);
    throw error;
  }
}

export async function deleteMyCustomerAddress(
  addressId: string
): Promise<void> {
  const userId = await getCurrentUserId();

  const { data: current, error: fetchError } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("id", addressId)
    .eq("customer_id", userId)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching address before delete:", fetchError);
    throw fetchError;
  }

  const wasDefault = Boolean(current?.is_default);

  const { error } = await supabase
    .from("customer_addresses")
    .delete()
    .eq("id", addressId)
    .eq("customer_id", userId);

  if (error) {
    console.error("Error deleting customer address:", error);
    throw error;
  }

  if (wasDefault) {
    const { data: remaining, error: remainingError } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (remainingError) {
      console.error("Error fetching remaining addresses:", remainingError);
      throw remainingError;
    }

    const nextDefault = remaining?.[0];

    if (nextDefault) {
      const { error: setDefaultError } = await supabase
        .from("customer_addresses")
        .update({ is_default: true })
        .eq("id", nextDefault.id)
        .eq("customer_id", userId);

      if (setDefaultError) {
        console.error("Error setting next default address:", setDefaultError);
        throw setDefaultError;
      }
    }
  }
}