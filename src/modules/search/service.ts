import { db } from "@/lib/db";
import { toDbDate } from "@/lib/date-only";
import type { Prisma } from "@/generated/prisma/client";
import type { RoomType } from "@/generated/prisma/enums";
import type { SearchQuery } from "./schemas";

export const PAGE_SIZE = 20;

/** sort/page는 생략 가능(기본값 newest / 1). */
export type SearchInput = Partial<SearchQuery>;

/** 공개 응답용 카드. 정확 좌표·주소는 절대 포함하지 않는다. */
export type PublicRoomCard = {
  roomId: string;
  propertyId: string;
  title: string;
  roomName: string;
  district: string;
  roomType: RoomType;
  monthlyRent: number;
  deposit: number;
  photo: string | null;
  approxLat: number;
  approxLng: number;
};

export type MapMarker = {
  propertyId: string;
  approxLat: number;
  approxLng: number;
  minRent: number;
  roomCount: number;
};

/** searchRooms와 mapMarkers가 공유하는 단일 필터. */
function buildWhere(q: SearchInput): Prisma.RoomWhereInput {
  const where: Prisma.RoomWhereInput = {
    status: "PUBLISHED",
    property: { status: "PUBLISHED", ...(q.district ? { district: q.district } : {}) },
  };
  if (q.roomType) where.roomType = q.roomType;
  if (q.minRent !== undefined || q.maxRent !== undefined) {
    where.monthlyRent = {
      ...(q.minRent !== undefined ? { gte: q.minRent } : {}),
      ...(q.maxRent !== undefined ? { lte: q.maxRent } : {}),
    };
  }
  if (q.options?.length) where.options = { hasEvery: q.options };
  if (q.checkIn && q.checkOut) {
    const checkIn = toDbDate(q.checkIn);
    const checkOut = toDbDate(q.checkOut);
    where.bookings = {
      none: { status: { in: ["APPROVED", "CONFIRMED"] }, checkIn: { lt: checkOut }, checkOut: { gt: checkIn } },
    };
    where.blocks = { none: { startDate: { lt: checkOut }, endDate: { gt: checkIn } } };
  }
  return where;
}

function orderBy(sort: SearchQuery["sort"] | undefined): Prisma.RoomOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ monthlyRent: "asc" }, { id: "asc" }];
    case "price_desc":
      return [{ monthlyRent: "desc" }, { id: "asc" }];
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

export async function searchRooms(q: SearchInput): Promise<{ items: PublicRoomCard[]; total: number }> {
  const where = buildWhere(q);
  const page = q.page ?? 1;
  const [rows, total] = await Promise.all([
    db.room.findMany({
      where,
      orderBy: orderBy(q.sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        propertyId: true,
        name: true,
        roomType: true,
        monthlyRent: true,
        deposit: true,
        photos: true,
        property: { select: { title: true, district: true, approxLat: true, approxLng: true } },
      },
    }),
    db.room.count({ where }),
  ]);
  return {
    total,
    items: rows.map((r) => ({
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
    })),
  };
}

/** 같은 필터(정렬·페이지 제외)를 Property 단위로 집계한다. */
export async function mapMarkers(q: SearchInput): Promise<MapMarker[]> {
  const rows = await db.room.findMany({
    where: buildWhere(q),
    select: {
      propertyId: true,
      monthlyRent: true,
      property: { select: { approxLat: true, approxLng: true } },
    },
  });
  const byProperty = new Map<string, MapMarker>();
  for (const r of rows) {
    const m = byProperty.get(r.propertyId);
    if (m) {
      m.minRent = Math.min(m.minRent, r.monthlyRent);
      m.roomCount += 1;
    } else {
      byProperty.set(r.propertyId, {
        propertyId: r.propertyId,
        approxLat: r.property.approxLat,
        approxLng: r.property.approxLng,
        minRent: r.monthlyRent,
        roomCount: 1,
      });
    }
  }
  return [...byProperty.values()];
}
