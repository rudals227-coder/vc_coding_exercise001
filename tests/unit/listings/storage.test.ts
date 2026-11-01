import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { sanitizeImage, uploadRoomPhoto } from "@/modules/listings/storage";
import { expectCodeAsync } from "../helpers";

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
