import { supabase } from "@/lib/supabase";

const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? "catch-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

export async function uploadCatchPhoto(file: File, userId: string): Promise<string> {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

  if (uploadError) {
    throw uploadError;
  }

  // Store path in DB; resolve to signed/public URL when reading.
  return path;
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function extractPathFromSupabaseUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const publicPrefix = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
    const signedPrefix = `/storage/v1/object/sign/${STORAGE_BUCKET}/`;

    if (url.pathname.startsWith(publicPrefix)) {
      return decodeURIComponent(url.pathname.slice(publicPrefix.length));
    }

    if (url.pathname.startsWith(signedPrefix)) {
      return decodeURIComponent(url.pathname.slice(signedPrefix.length));
    }

    return null;
  } catch {
    return null;
  }
}

function toStoragePath(value: string): string | null {
  if (!isHttpUrl(value)) {
    return value;
  }

  return extractPathFromSupabaseUrl(value);
}

export function getCatchPhotoStoragePath(storedValue: string | null): string | null {
  if (!storedValue) {
    return null;
  }
  return toStoragePath(storedValue);
}

export async function deleteCatchPhoto(storedValue: string | null): Promise<void> {
  const path = getCatchPhotoStoragePath(storedValue);
  if (!path) {
    return;
  }

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) {
    throw error;
  }
}

export async function resolveCatchPhotoUrl(storedValue: string | null): Promise<string | null> {
  if (!storedValue) {
    return null;
  }

  const path = toStoragePath(storedValue);
  if (!path) {
    // Keep non-Supabase external URLs as-is.
    return storedValue;
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  // Fallback if bucket is public.
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
