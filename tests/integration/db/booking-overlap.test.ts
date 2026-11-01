import { beforeEach, describe, expect, it } from "vitest";
import type { Room, User } from "@/generated/prisma/client";
import type { BookingStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { toDbDate } from "@/lib/date-only";
import { quote } from "@/modules/pricing";
import { makeRoom, makeUser, resetDb } from "../helpers/db";

function book(room: Room, guest: User, checkIn: string, checkOut: string, status: BookingStatus) {
  return db.booking.create({
    data: {
      roomId: room.id,
      guestId: guest.id,
      checkIn: toDbDate(checkIn),
      checkOut: toDbDate(checkOut),
      status,
      priceSnapshot: quote(room, checkIn, checkOut),
    },
  });
}

describe("booking_no_overlap exclusion constraint", () => {
  beforeEach(resetDb);

  it("rejects overlapping APPROVED/CONFIRMED bookings on the same room", async () => {
    const room = await makeRoom();
    const g = await makeUser();
    await book(room, g, "2026-03-15", "2026-05-15", "CONFIRMED");
    const err = await book(room, g, "2026-05-01", "2026-06-01", "APPROVED").then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).not.toBeNull();
    expect(JSON.stringify(err, Object.getOwnPropertyNames(err as object))).toMatch(
      /booking_no_overlap/,
    );
  });

  it("allows adjacent ranges ([a,b) then [b,c))", async () => {
    const room = await makeRoom();
    const g = await makeUser();
    await book(room, g, "2026-03-15", "2026-04-15", "CONFIRMED");
    await expect(book(room, g, "2026-04-15", "2026-05-15", "APPROVED")).resolves.toBeDefined();
  });

  it("allows overlap when either is REQUESTED/EXPIRED/CANCELLED", async () => {
    const room = await makeRoom();
    const g = await makeUser();
    await book(room, g, "2026-03-15", "2026-05-15", "REQUESTED");
    await book(room, g, "2026-04-01", "2026-06-01", "REQUESTED");
    await book(room, g, "2026-03-20", "2026-05-20", "EXPIRED");
    await book(room, g, "2026-03-25", "2026-05-25", "CANCELLED");
    await expect(book(room, g, "2026-04-10", "2026-06-10", "CONFIRMED")).resolves.toBeDefined();
  });

  it("allows overlap on different rooms", async () => {
    const roomA = await makeRoom();
    const roomB = await makeRoom();
    const g = await makeUser();
    await book(roomA, g, "2026-03-15", "2026-05-15", "CONFIRMED");
    await expect(book(roomB, g, "2026-03-15", "2026-05-15", "CONFIRMED")).resolves.toBeDefined();
  });
});
