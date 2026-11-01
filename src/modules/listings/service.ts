import type { PrismaClient, Property, Room, RoomBlock } from "@/generated/prisma/client";
import type { ListingStatus } from "@/generated/prisma/enums";
import { parseDateOnly, diffDays, toDbDate } from "@/lib/date-only";
import { DomainError } from "@/lib/errors";
import type { SessionUser } from "@/modules/auth/roles";
import { hasRole } from "@/modules/auth/roles";
import { approximate } from "./approx";
import type { Geocoder } from "./geocode";
import {
  propertyInput,
  roomBlockInput,
  roomInput,
  type PropertyInput,
  type RoomBlockInput,
  type RoomInput,
} from "./schemas";

type Actor = Pick<SessionUser, "id" | "roles">;
type Pin = { lat: number; lng: number };

export function listingsService(deps: { db: PrismaClient; geocode: Geocoder }) {
  const { db, geocode } = deps;

  const canEdit = (actor: Actor, hostId: string) => hasRole(actor, "ADMIN") || actor.id === hostId;

  async function ownedProperty(actor: Actor, id: string): Promise<Property> {
    const p = await db.property.findUnique({ where: { id } });
    if (!p) throw new DomainError("NOT_FOUND");
    if (!canEdit(actor, p.hostId)) throw new DomainError("FORBIDDEN");
    return p;
  }

  async function ownedRoom(actor: Actor, id: string): Promise<void> {
    const r = await db.room.findUnique({ where: { id }, include: { property: true } });
    if (!r) throw new DomainError("NOT_FOUND");
    if (!canEdit(actor, r.property.hostId)) throw new DomainError("FORBIDDEN");
  }

  async function resolveCoords(address: string, pin?: Pin): Promise<Pin> {
    const exact = pin ?? (await geocode(address));
    if (!exact) throw new DomainError("GEOCODE_FAILED", { address });
    return exact;
  }

  return {
    async createProperty(hostId: string, input: PropertyInput, pin?: Pin): Promise<Property> {
      const data = propertyInput.parse(input);
      // 지오코딩을 먼저 끝내므로 실패 시 아무것도 저장되지 않는다.
      const exact = await resolveCoords(data.address, pin);
      const approx = approximate(exact.lat, exact.lng);
      return db.property.create({
        data: {
          ...data,
          addressDetail: data.addressDetail ?? "",
          hostId,
          lat: exact.lat,
          lng: exact.lng,
          approxLat: approx.lat,
          approxLng: approx.lng,
        },
      });
    },

    async updateProperty(actor: Actor, id: string, input: PropertyInput, pin?: Pin): Promise<Property> {
      const data = propertyInput.parse(input);
      const current = await ownedProperty(actor, id);
      let coords: Pin = { lat: current.lat, lng: current.lng };
      if (pin || data.address !== current.address) coords = await resolveCoords(data.address, pin);
      const moved = coords.lat !== current.lat || coords.lng !== current.lng;
      const approx = moved ? approximate(coords.lat, coords.lng) : null;
      return db.property.update({
        where: { id },
        data: {
          ...data,
          addressDetail: data.addressDetail ?? "",
          lat: coords.lat,
          lng: coords.lng,
          ...(approx ? { approxLat: approx.lat, approxLng: approx.lng } : {}),
        },
      });
    },

    async createRoom(actor: Actor, propertyId: string, input: RoomInput): Promise<Room> {
      const data = roomInput.parse(input);
      await ownedProperty(actor, propertyId);
      return db.room.create({ data: { ...data, propertyId, photos: [] } });
    },

    async updateRoom(actor: Actor, id: string, input: RoomInput): Promise<Room> {
      const data = roomInput.parse(input);
      await ownedRoom(actor, id);
      return db.room.update({ where: { id }, data });
    },

    /** 원자적 추가: 동시 업로드가 서로의 사진을 덮어쓰지 않는다. */
    async appendRoomPhoto(actor: Actor, id: string, url: string): Promise<Room> {
      await ownedRoom(actor, id);
      return db.room.update({ where: { id }, data: { photos: { push: url } } });
    },

    async setStatus(
      actor: Actor,
      kind: "property" | "room",
      id: string,
      status: ListingStatus,
    ): Promise<void> {
      if (kind === "property") {
        await ownedProperty(actor, id);
        await db.property.update({ where: { id }, data: { status } });
      } else {
        await ownedRoom(actor, id);
        await db.room.update({ where: { id }, data: { status } });
      }
    },

    async addRoomBlock(actor: Actor, roomId: string, input: RoomBlockInput): Promise<RoomBlock> {
      const data = roomBlockInput.parse(input);
      const start = parseDateOnly(data.startDate);
      const end = parseDateOnly(data.endDate);
      if (diffDays(end, start) <= 0) throw new DomainError("INVALID_DATE_RANGE");
      await ownedRoom(actor, roomId);
      return db.roomBlock.create({
        data: { roomId, startDate: toDbDate(start), endDate: toDbDate(end), reason: data.reason },
      });
    },

    async removeRoomBlock(actor: Actor, blockId: string): Promise<void> {
      const b = await db.roomBlock.findUnique({ where: { id: blockId } });
      if (!b) throw new DomainError("NOT_FOUND");
      await ownedRoom(actor, b.roomId);
      await db.roomBlock.delete({ where: { id: blockId } });
    },
  };
}

export type ListingsService = ReturnType<typeof listingsService>;
