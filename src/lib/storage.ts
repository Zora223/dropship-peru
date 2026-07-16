import { supabase } from "./supabase";

export type StorageBucket = "product-images" | "store-logos" | "avatars";

/**
 * Sube un archivo al bucket especificado.
 * Devuelve la URL pública.
 */
export async function uploadFile(
  bucket: StorageBucket,
  file: File,
  folder?: string
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
  const path = folder ? `${folder}/${fileName}` : fileName;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    console.error("Upload error:", error);
    throw new Error(`Error al subir archivo: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Sube múltiples archivos en paralelo.
 */
export async function uploadMultipleFiles(
  bucket: StorageBucket,
  files: File[],
  folder?: string
): Promise<string[]> {
  const uploads = files.map((file) => uploadFile(bucket, file, folder));
  return Promise.all(uploads);
}

/**
 * Elimina un archivo por su URL pública.
 */
export async function deleteFileByUrl(bucket: StorageBucket, publicUrl: string): Promise<void> {
  const urlParts = publicUrl.split(`/${bucket}/`);
  if (urlParts.length < 2) return;
  const path = urlParts[1];

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.error("Delete error:", error);
    throw new Error(`Error al eliminar archivo: ${error.message}`);
  }
}