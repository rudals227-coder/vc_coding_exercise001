import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { toDbDate } from "@/lib/date-only";
import { mapMarkers, searchRooms } from "@/modules/search/service";
import { searchQuery } from "@/modules/search/schemas";
import { makeRoom, makeUser, resetDb } from "../helpers/db";

beforeEach(resetDb);

const stay = searchQuery.parse({ checkIn: "2026-03-01", checkOut: "2026-04-01" });
const all = searchQuery.parse({});

async function book(roomId: string, checkIn: string, checkOut: string, status: "REQUESTED" | "APPROVED" | "CONFIRMED") {
  const guest = await makeUser();
  await db.booking.create({
    data: { roomId, guestId: guest.id, checkIn: toDbDate(checkIn), checkOut: toDbDate(checkOut), status, priceSnapshot: {} },
  });
}

describe("searchRooms", () => {
  it("excludes rooms with overlapping CONFIRMED/APPROVED booking or RoomBlock", async () => {
    const free = await makeRoom({ name: "free" });
    const conf = await makeRoom({ name: "conf" });
    const appr = await makeRoom({ name: "appr" });
    const blocked = await makeRoom({ name: "blocked" });
    await book(conf.id, "2026-03-15", "2026-04-15", "CONFIRMED");
    await book(appr.id, "2026-02-01", "2026-03-05", "APPROVED");
    await db.roomBlock.create({
      data: { roomId: blocked.id, startDate: toDbDate("2026-03-10"), endDate: toDbDate("2026-03-20") },
    });
    const { items, total } = await searchRooms(stay);
    expect(items.map((i) => i.roomId)).toEqual([free.id]);
    expect(total).toBe(1);
  });

  it("keeps rooms whose booking is adjacent or only REQUESTED", async () => {
    const before = await makeRoom({ name: "before" });
    const after = await makeRoom({ name: "after" });
    const req = await makeRoom({ name: "req" });
    await book(before.id, "2026-02-01", "2026-03-01", "CONFIRMED");
    await book(after.id, "2026-04-01", "2026-05-01", "CONFIRMED");
    await book(req.id, "2026-03-01", "2026-04-01", "REQUESTED");
    const { items } = await searchRooms(stay);
    expect(items.map((i) => i.roomId).sort()).toEqual([before.id, after.id, req.id].sort());
  });

  it("ignores availability when no dates are given", async () => {
    const r = await makeRoom();
    await book(r.id, "2026-03-15", "2026-04-15", "CONFIRMED");
    expect((await searchRooms(all)).total).toBe(1);
  });

  it("excludes DRAFT/HIDDEN rooms and rooms of HIDDEN/DRAFT properties", async () => {
    const ok = await makeRoom({ name: "ok" });
    await makeRoom({ name: "draft", status: "DRAFT" });
    await makeRoom({ name: "hidden", status: "HIDDEN" });
    await makeRoom({ name: "hp" }, { status: "HIDDEN" });
    await makeRoom({ name: "dp" }, { status: "DRAFT" });
    const { items, total } = await searchRooms(all);
    expect(items.map((i) => i.roomId)).toEqual([ok.id]);
    expect(total).toBe(1);
  });

  it("filters by district, roomType, rent range and options (ALL)", async () => {
    const a = await makeRoom({ monthlyRent: 600000, options: ["desk", "wifi"] }, { district: "mapo" });
    await makeRoom({ monthlyRent: 900000, options: ["desk"] }, { district: "mapo" });
    await makeRoom({ monthlyRent: 700000, options: ["desk", "wifi"] }, { district: "gangnam" });
    await makeRoom({ monthlyRent: 650000, options: ["desk", "wifi"], roomType: "STUDIO" }, { district: "mapo" });
    const q = searchQuery.parse({
      district: "mapo", roomType: "PRIVATE", minRent: "500000", maxRent: "800000", options: ["desk", "wifi"],
    });
    const { items } = await searchRooms(q);
    expect(items.map((i) => i.roomId)).toEqual([a.id]);
    expect((await searchRooms(searchQuery.parse({ options: "desk" }))).total).toBe(4);
  });

  it("sorts by price asc/desc and newest, and maps public fields", async () => {
    const mid = await makeRoom({ monthlyRent: 700000, photos: ["p1.jpg", "p2.jpg"], name: "Mid" });
    const low = await makeRoom({ monthlyRent: 500000 });
    const high = await makeRoom({ monthlyRent: 900000 });
    const asc = await searchRooms(searchQuery.parse({ sort: "price_asc" }));
    expect(asc.items.map((i) => i.roomId)).toEqual([low.id, mid.id, high.id]);
    const desc = await searchRooms(searchQuery.parse({ sort: "price_desc" }));
    expect(desc.items.map((i) => i.roomId)).toEqual([high.id, mid.id, low.id]);
    const newest = await searchRooms(searchQuery.parse({ sort: "newest" }));
    expect(newest.items.map((i) => i.roomId)).toEqual([high.id, low.id, mid.id]);
    const m = asc.items.find((i) => i.roomId === mid.id)!;
    expect(m).toMatchObject({
      title: "Test Property", roomName: "Mid", district: "mapo", roomType: "PRIVATE",
      monthlyRent: 700000, deposit: 1000000, photo: "p1.jpg", approxLat: 37.551, approxLng: 126.921,
    });
    expect(asc.items.find((i) => i.roomId === low.id)!.photo).toBeNull();
  });

  it("paginates 20 per page with total", async () => {
    for (let i = 0; i < 22; i++) await makeRoom({ monthlyRent: 500000 + i });
    const p1 = await searchRooms(searchQuery.parse({ sort: "price_asc" }));
    const p2 = await searchRooms(searchQuery.parse({ sort: "price_asc", page: 2 }));
    expect(p1.items).toHaveLength(20);
    expect(p2.items).toHaveLength(2);
    expect(p1.total).toBe(22);
    expect(p2.items[0].monthlyRent).toBe(500020);
  });

  it("never exposes exact coordinates or address", async () => {
    await makeRoom();
    const { items } = await searchRooms(all);
    expect(items.length).toBe(1);
    for (const it of items) for (const k of ["lat", "lng", "address", "addressDetail"]) expect(it).not.toHaveProperty(k);
  });
});

describe("mapMarkers", () => {
  it("groups by property with min rent and room count, using same filters", async () => {
    const r1 = await makeRoom({ monthlyRent: 800000 });
    const p = await db.room.findUniqueOrThrow({ where: { id: r1.id } });
    await db.room.create({
      data: { propertyId: p.propertyId, name: "B", roomType: "PRIVATE", capacity: 1, monthlyRent: 600000, deposit: 0, options: [], photos: [], status: "PUBLISHED" },
    });
    await db.room.create({
      data: { propertyId: p.propertyId, name: "C", roomType: "PRIVATE", capacity: 1, monthlyRent: 300000, deposit: 0, options: [], photos: [], status: "DRAFT" },
    });
    const other = await makeRoom({ monthlyRent: 1000000 });
    await book(other.id, "2026-03-15", "2026-04-15", "CONFIRMED");

    const markers = await mapMarkers(stay);
    expect(markers).toHaveLength(1);
    expect(markers[0]).toEqual({
      propertyId: p.propertyId, approxLat: 37.551, approxLng: 126.921, minRent: 600000, roomCount: 2,
    });
    expect(await mapMarkers(all)).toHaveLength(2);
    for (const m of markers) for (const k of ["lat", "lng", "address"]) expect(m).not.toHaveProperty(k);
  });
});
