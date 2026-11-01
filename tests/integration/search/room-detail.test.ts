import { beforeEach, describe, expect, it } from "vitest";
import { getPublicRoom } from "@/modules/search/room-detail";
import { makeRoom, resetDb } from "../helpers/db";

beforeEach(resetDb);

describe("getPublicRoom", () => {
  it("returns public fields for a published room", async () => {
    const room = await makeRoom({ options: ["desk"], photos: ["https://x/1.jpg"], capacity: 2 });
    const r = await getPublicRoom(room.id);
    expect(r).toMatchObject({
      roomId: room.id,
      title: "Test Property",
      district: "mapo",
      capacity: 2,
      options: ["desk"],
      photos: ["https://x/1.jpg"],
      amenities: ["wifi"],
      description: "A test property",
    });
  });

  it("returns null for unknown, unpublished room or unpublished property", async () => {
    const draftRoom = await makeRoom({ status: "DRAFT" });
    const hiddenProp = await makeRoom({}, { status: "HIDDEN" });
    expect(await getPublicRoom(draftRoom.id)).toBeNull();
    expect(await getPublicRoom(hiddenProp.id)).toBeNull();
    expect(await getPublicRoom("nope")).toBeNull();
  });

  it("omits exact location", async () => {
    const room = await makeRoom();
    const r = await getPublicRoom(room.id);
    const json = JSON.stringify(r);
    expect(r).toHaveProperty("approxLat", 37.551);
    for (const k of ["lat", "lng", "address", "addressDetail"]) expect(r).not.toHaveProperty(k);
    expect(json).not.toContain("1 Test-ro");
    expect(json).not.toContain("101");
  });
});
