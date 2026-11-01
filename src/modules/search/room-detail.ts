import { db } from "@/lib/db";
import type { PublicRoomCard } from "./service";

/** 공개 상세. 정확 좌표·주소는 절대 포함하지 않는다. */
export type PublicRoomDetail = PublicRoomCard & {
  description: string;
  amenities: string[];
  houseRules: string;
  options: string[];
  photos: string[];
  capacity: number;
};

/** Room과 Property가 모두 PUBLISHED일 때만 반환한다. */
export async function getPublicRoom(roomId: string): Promise<PublicRoomDetail | null> {
  const r = await db.room.findFirst({
    where: { id: roomId, status: "PUBLISHED", property: { status: "PUBLISHED" } },
    select: {
      id: true,
      propertyId: true,
      name: true,
      roomType: true,
      capacity: true,
      monthlyRent: true,
      deposit: true,
      options: true,
      photos: true,
      property: {
        select: {
          title: true,
          description: true,
          district: true,
          amenities: true,
          houseRules: true,
          approxLat: true,
          approxLng: true,
        },
      },
    },
  });
  if (!r) return null;
  return {
    roomId: r.id,
    propertyId: r.propertyId,
    title: r.property.title,
    roomName: r.name,
    district: r.property.district,
    roomType: r.roomType,
    monthlyRent: r.monthlyRent,
    deposit: r.deposit,
    photo: r.photos[0] ?? null,
    approxLat: r.property.approxLat,
    approxLng: r.property.approxLng,
    description: r.property.description,
    amenities: r.property.amenities,
    houseRules: r.property.houseRules,
    options: r.options,
    photos: r.photos,
    capacity: r.capacity,
  };
}
