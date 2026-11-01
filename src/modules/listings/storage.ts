import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { DomainError } from "@/lib/errors";
import { env } from "@/lib/env";

const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Uploads a room photo to Supabase Storage and returns its public URL. */
export async function uploadRoomPhoto(roomId: string, file: File): Promise<string> {
  const ext = EXT[file.type];
  if (!ext || file.size > MAX_BYTES) throw new DomainError("INVALID_FILE");

  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new DomainError("UPLOAD_UNAVAILABLE");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const path = `${roomId}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(env.SUPABASE_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type });
  if (error) throw new DomainError("UPLOAD_UNAVAILABLE", { reason: error.message });
  return supabase.storage.from(env.SUPABASE_BUCKET).getPublicUrl(path).data.publicUrl;
}
