"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { hasRole } from "@/modules/auth/roles";
import { getGeocoder } from "@/modules/listings/geocoder";
import {
  propertyInput,
  roomBlockInput,
  roomInput,
  type PropertyInput,
  type RoomBlockInput,
  type RoomInput,
} from "@/modules/listings/schemas";
import { listingsService } from "@/modules/listings/service";
import { uploadRoomPhoto } from "@/modules/listings/storage";
import { runAction, type ActionResult } from "./action-utils";

const service = () => listingsService({ db, geocode: getGeocoder() });

const pinSchema = z
  .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
  .optional();
const statusSchema = z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]);
const kindSchema = z.enum(["property", "room"]);
const id = z.string().min(1);

export async function createPropertyAction(
  input: PropertyInput,
  pin?: { lat: number; lng: number },
): Promise<ActionResult> {
  return runAction(async (user) => {
    const data = propertyInput.parse(input);
    const p = await service().createProperty(user.id, data, pinSchema.parse(pin));
    return { id: p.id };
  });
}

export async function updatePropertyAction(
  propertyId: string,
  input: PropertyInput,
  pin?: { lat: number; lng: number },
): Promise<ActionResult> {
  return runAction(async (user) => {
    await service().updateProperty(
      user,
      id.parse(propertyId),
      propertyInput.parse(input),
      pinSchema.parse(pin),
    );
  });
}

export async function createRoomAction(propertyId: string, input: RoomInput): Promise<ActionResult> {
  return runAction(async (user) => {
    const r = await service().createRoom(user, id.parse(propertyId), roomInput.parse(input));
    return { id: r.id };
  });
}

export async function updateRoomAction(roomId: string, input: RoomInput): Promise<ActionResult> {
  return runAction(async (user) => {
    await service().updateRoom(user, id.parse(roomId), roomInput.parse(input));
  });
}

export async function setStatusAction(
  kind: "property" | "room",
  targetId: string,
  status: "DRAFT" | "PUBLISHED" | "HIDDEN",
): Promise<ActionResult> {
  return runAction(async (user) => {
    await service().setStatus(
      user,
      kindSchema.parse(kind),
      id.parse(targetId),
      statusSchema.parse(status),
    );
  });
}

export async function addRoomBlockAction(roomId: string, input: RoomBlockInput): Promise<ActionResult> {
  return runAction(async (user) => {
    const b = await service().addRoomBlock(user, id.parse(roomId), roomBlockInput.parse(input));
    return { id: b.id };
  });
}

export async function removeRoomBlockAction(blockId: string): Promise<ActionResult> {
  return runAction(async (user) => {
    await service().removeRoomBlock(user, id.parse(blockId));
  });
}

export async function uploadPhotoAction(roomId: string, formData: FormData): Promise<ActionResult> {
  return runAction(async (user) => {
    // 업로드 전에 소유권을 먼저 확인한다(권한 없는 사용자가 스토리지를 쓰지 못하도록).
    const room = await db.room.findUnique({
      where: { id: id.parse(roomId) },
      include: { property: { select: { hostId: true } } },
    });
    if (!room) throw new DomainError("NOT_FOUND");
    if (!hasRole(user, "ADMIN") && room.property.hostId !== user.id) {
      throw new DomainError("FORBIDDEN");
    }
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new DomainError("INVALID_FILE");

    const url = await uploadRoomPhoto(room.id, file);
    await service().appendRoomPhoto(user, room.id, url);
  });
}
