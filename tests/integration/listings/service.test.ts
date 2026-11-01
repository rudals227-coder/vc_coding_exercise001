import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { listingsService } from "@/modules/listings/service";
import type { Geocoder } from "@/modules/listings/geocode";
import { haversineMeters } from "@/modules/listings/approx";
import { expectCodeAsync } from "../../unit/helpers";
import { makeRoom, makeUser, resetDb } from "../helpers/db";

const validInput = {
  title: "Cozy place",
  description: "Nice",
  address: "1 Test-ro, Mapo-gu, Seoul",
  addressDetail: "101",
  district: "mapo" as const,
  amenities: ["wifi"],
  houseRules: "",
};
const roomIn = {
  name: "Room A",
  roomType: "PRIVATE" as const,
  capacity: 2,
  monthlyRent: 900000,
  deposit: 1000000,
  options: ["desk"],
};

const geo: Geocoder = async () => ({ lat: 37.5, lng: 127.0 });

beforeEach(resetDb);

describe("listingsService", () => {
  it("stores exact and approx coords", async () => {
    const host = await makeUser(["HOST"]);
    const p = await listingsService({ db, geocode: geo }).createProperty(host.id, validInput);
    expect(p.lat).toBe(37.5);
    expect(p.lng).toBe(127.0);
    const d = haversineMeters(p.lat, p.lng, p.approxLat, p.approxLng);
    expect(d).toBeGreaterThanOrEqual(100);
    expect(d).toBeLessThanOrEqual(300);
  });

  it("fails with GEOCODE_FAILED and stores nothing", async () => {
    const host = await makeUser(["HOST"]);
    const svc = listingsService({ db, geocode: async () => null });
    await expectCodeAsync(svc.createProperty(host.id, validInput), "GEOCODE_FAILED");
    expect(await db.property.count()).toBe(0);
  });

  it("uses the dragged pin without geocoding", async () => {
    const host = await makeUser(["HOST"]);
    const spy = vi.fn(geo);
    const p = await listingsService({ db, geocode: spy }).createProperty(host.id, validInput, {
      lat: 37.6,
      lng: 127.1,
    });
    expect(spy).not.toHaveBeenCalled();
    expect(p.lat).toBe(37.6);
    expect(p.lng).toBe(127.1);
  });

  it("keeps approx coords when exact coords do not change, regenerates when they do", async () => {
    const host = await makeUser(["HOST"]);
    const svc = listingsService({ db, geocode: geo });
    const p = await svc.createProperty(host.id, validInput);
    const same = await svc.updateProperty(host, p.id, { ...validInput, title: "New" }, {
      lat: p.lat,
      lng: p.lng,
    });
    expect(same.title).toBe("New");
    expect(same.approxLat).toBe(p.approxLat);
    expect(same.approxLng).toBe(p.approxLng);
    const moved = await svc.updateProperty(host, p.id, validInput, { lat: 37.7, lng: 127.2 });
    expect(moved.lat).toBe(37.7);
    expect(moved.approxLat).not.toBe(p.approxLat);
  });

  it("does not re-geocode when address is unchanged and no pin", async () => {
    const host = await makeUser(["HOST"]);
    const spy = vi.fn(geo);
    const svc = listingsService({ db, geocode: spy });
    const p = await svc.createProperty(host.id, validInput);
    spy.mockClear();
    const u = await svc.updateProperty(host, p.id, { ...validInput, title: "X" });
    expect(spy).not.toHaveBeenCalled();
    expect(u.approxLat).toBe(p.approxLat);
  });

  it("forbids editing another host's room; allows owner and admin", async () => {
    const room = await makeRoom();
    const other = await makeUser(["HOST"]);
    const admin = await makeUser(["ADMIN"]);
    const prop = await db.property.findUniqueOrThrow({ where: { id: room.propertyId } });
    const svc = listingsService({ db, geocode: geo });
    await expectCodeAsync(svc.updateRoom(other, room.id, roomIn), "FORBIDDEN");
    await expectCodeAsync(svc.setStatus(other, "room", room.id, "HIDDEN"), "FORBIDDEN");
    await expectCodeAsync(
      svc.addRoomBlock(other, room.id, { startDate: "2027-01-01", endDate: "2027-02-01", reason: "" }),
      "FORBIDDEN",
    );
    await svc.updateRoom({ id: prop.hostId, roles: ["HOST"] }, room.id, roomIn);
    await svc.updateRoom(admin, room.id, { ...roomIn, name: "By admin" });
    expect((await db.room.findUniqueOrThrow({ where: { id: room.id } })).name).toBe("By admin");
  });

  it("NOT_FOUND for missing parents", async () => {
    const admin = await makeUser(["ADMIN"]);
    const svc = listingsService({ db, geocode: geo });
    await expectCodeAsync(svc.createRoom(admin, "nope", roomIn), "NOT_FOUND");
    await expectCodeAsync(svc.updateRoom(admin, "nope", roomIn), "NOT_FOUND");
    await expectCodeAsync(svc.removeRoomBlock(admin, "nope"), "NOT_FOUND");
    await expectCodeAsync(svc.setStatus(admin, "property", "nope", "HIDDEN"), "NOT_FOUND");
  });

  it("creates room, sets status, adds/removes blocks", async () => {
    const host = await makeUser(["HOST"]);
    const svc = listingsService({ db, geocode: geo });
    const p = await svc.createProperty(host.id, validInput);
    const r = await svc.createRoom(host, p.id, roomIn);
    expect(r.status).toBe("DRAFT");
    await svc.setStatus(host, "room", r.id, "PUBLISHED");
    await svc.setStatus(host, "property", p.id, "PUBLISHED");
    expect((await db.room.findUniqueOrThrow({ where: { id: r.id } })).status).toBe("PUBLISHED");
    const b = await svc.addRoomBlock(host, r.id, {
      startDate: "2027-01-01",
      endDate: "2027-02-01",
      reason: "repair",
    });
    expect(b.startDate.toISOString().slice(0, 10)).toBe("2027-01-01");
    await svc.removeRoomBlock(host, b.id);
    expect(await db.roomBlock.count()).toBe(0);
  });

  it("rejects RoomBlock with endDate <= startDate", async () => {
    const room = await makeRoom();
    const admin = await makeUser(["ADMIN"]);
    const svc = listingsService({ db, geocode: geo });
    await expectCodeAsync(
      svc.addRoomBlock(admin, room.id, { startDate: "2027-01-05", endDate: "2027-01-05", reason: "" }),
      "INVALID_DATE_RANGE",
    );
    await expectCodeAsync(
      svc.addRoomBlock(admin, room.id, { startDate: "2027-01-05", endDate: "2027-01-01", reason: "" }),
      "INVALID_DATE_RANGE",
    );
  });
});
