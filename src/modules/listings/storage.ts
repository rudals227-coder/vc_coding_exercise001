import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { DomainError } from "@/lib/errors";
import { env } from "@/lib/env";

const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * 업로드 이미지를 재인코딩해 EXIF/XMP(GPS 포함)를 제거한다. 방향은 픽셀에 반영한다.
 * 정확한 위치가 사진으로 공개되면 근사 위치 규칙이 무력화되기 때문이다.
 */
export async function sanitizeImage(buf: Buffer, type: string): Promise<Buffer> {
  try {
    const img = sharp(buf).rotate();
    if (type === "image/png") return await img.png().toBuffer();
    if (type === "image/webp") return await img.webp().toBuffer();
    return await img.jpeg().toBuffer();
  } catch {
    throw new DomainError("INVALID_FILE");
  }
}

/** Uploads a room photo (metadata stripped) to Supabase Storage and returns its public URL. */
export async function uploadRoomPhoto(roomId: string, file: File): Promise<string> {
  const ext = EXT[file.type];
  if (!ext || file.size > MAX_BYTES) throw new DomainError("INVALID_FILE");

  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new DomainError("UPLOAD_UNAVAILABLE");

  const body = await sanitizeImage(Buffer.from(await file.arrayBuffer()), file.type);

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const path = `${roomId}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(env.SUPABASE_BUCKET)
    .upload(path, body, { contentType: file.type });
  if (error) throw new DomainError("UPLOAD_UNAVAILABLE", { reason: error.message });
  return supabase.storage.from(env.SUPABASE_BUCKET).getPublicUrl(path).data.publicUrl;
}
