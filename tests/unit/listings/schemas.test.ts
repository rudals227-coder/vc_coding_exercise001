import { describe, expect, it } from "vitest";
import { roomInput, ROOM_OPTIONS } from "@/modules/listings/schemas";

const base = {
  name: "A",
  roomType: "PRIVATE" as const,
  capacity: 1,
  monthlyRent: 1,
  deposit: 0,
};

describe("roomInput.options", () => {
  it("accepts known options and dedupes", () => {
    const r = roomInput.parse({ ...base, options: ["wifi", "desk", "wifi"] });
    expect(r.options).toEqual(["wifi", "desk"]);
  });
  it("rejects free-text options", () => {
    expect(roomInput.safeParse({ ...base, options: ["Wi-Fi"] }).success).toBe(false);
  });
  it("exposes the fixed option list", () => {
    expect(ROOM_OPTIONS).toHaveLength(8);
  });
});
