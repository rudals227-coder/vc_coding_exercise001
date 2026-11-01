import { describe, it } from "vitest";
import { uploadRoomPhoto } from "@/modules/listings/storage";
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
