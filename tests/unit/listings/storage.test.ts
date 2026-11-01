import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { sanitizeImage, saveLocalPhoto, uploadRoomPhoto } from "@/modules/listings/storage";
import { expectCodeAsync } from "../helpers";

describe("saveLocalPhoto", () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "h2h-photos-"));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("writes the bytes under uploads/rooms/<roomId> and returns a public path", async () => {
    const url = await saveLocalPhoto("room1", Buffer.from("img"), "jpg", root);
    expect(url).toMatch(/^\/uploads\/rooms\/room1\/[0-9a-f-]{36}\.jpg$/);
    expect(await readFile(path.join(root, url))).toEqual(Buffer.from("img"));
  });

  it("rejects a room id that could escape the uploads folder", async () => {
    await expectCodeAsync(saveLocalPhoto("../evil", Buffer.from("x"), "jpg", root), "INVALID_FILE");
  });
});

describe("uploadRoomPhoto validation", () => {
  it("rejects a non-image type", async () => {
    const f = new File(["x"], "a.gif", { type: "image/gif" });
    await expectCodeAsync(uploadRoomPhoto("room1", f), "INVALID_FILE");
  });
  it("rejects files over 5MB", async () => {
    const f = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "a.jpg", { type: "image/jpeg" });
    await expectCodeAsync(uploadRoomPhoto("room1", f), "INVALID_FILE");
  });
});

describe("sanitizeImage", () => {
  it("strips EXIF GPS metadata", async () => {
    const withGps = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#888" },
    })
      .jpeg()
      .withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "37/1 33/1 0/1" } })
      .toBuffer();
    expect((await sharp(withGps).metadata()).exif).toBeDefined();

    const out = await sanitizeImage(withGps, "image/jpeg");
    const meta = await sharp(out).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.format).toBe("jpeg");
  });

  it("rejects bytes that are not an image", async () => {
    await expectCodeAsync(sanitizeImage(Buffer.from("nope"), "image/png"), "INVALID_FILE");
  });
});
