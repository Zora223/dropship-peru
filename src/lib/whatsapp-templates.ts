// src/lib/whatsapp-templates.ts
// Cliente para gestionar templates de WhatsApp

import { supabase } from "./supabase";

// Tipos
export interface WhatsappTemplate {
  id: string;
  event_key: string;
  recipient: "customer" | "vendor" | "delivery";
  title: string;
  description: string | null;
  message_template: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface WhatsappLog {
  id: string;
  event_key: string;
  order_id: string | null;
  recipient_type: string;
  recipient_phone: string;
  recipient_name: string | null;
  message_sent: string;
  status: "pending" | "sent" | "failed";
  error_message: string | null;
  bot_message_id: string | null;
  created_at: string;
  sent_at: string | null;
}

// Listar todos los templates
export async function getTemplates(): Promise<WhatsappTemplate[]> {
  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .order("recipient", { ascending: true })
    .order("event_key", { ascending: true });

  if (error) throw error;
  return data || [];
}

// Obtener un template por id
export async function getTemplate(id: string): Promise<WhatsappTemplate | null> {
  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// Actualizar un template
export async function updateTemplate(
  id: string,
  updates: Partial<Pick<WhatsappTemplate, "title" | "description" | "message_template" | "active">>
): Promise<WhatsappTemplate> {
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("whatsapp_templates")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: userData.user?.id || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Extraer variables de un template (busca {{variable}})
export function extractVariables(template: string): string[] {
  const regex = /\{\{\s*(\w+)\s*\}\}/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(template)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
}

// Reemplazar variables en preview
export function renderPreview(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    result = result.replace(regex, value || `{{${key}}}`);
  }
  return result;
}

// Enviar mensaje de prueba
export async function sendTestMessage(
  event_key: string,
  variables: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-event`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ event_key, variables }),
      }
    );

    const result = await response.json();
    return {
      success: result.success || false,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}