import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";
import type { Room, User } from "@/generated/prisma/client";

let seq = 0;
const next = () => `${Date.now()}-${++seq}`;

/** 모든 테이블 TRUNCATE ... CASCADE. */
export async function resetDb(): Promise<void> {
  const rows = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (rows.length === 0) return;
  const list = rows.map((r) => `"${r.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export async function makeUser(roles: Role[] = ["GUEST"]): Promise<User> {
  return db.user.create({
    data: { email: `user-${next()}@example.com`, name: "Test User", roles },
  });
}

/** Property(와 호스트)를 함께 만들고 Room을 반환한다. */
export async function makeRoom(overrides: Partial<Omit<Room, "id">> = {}): Promise<Room> {
  const host = await makeUser(["HOST"]);
  const property = await db.property.create({
    data: {
      hostId: host.id,
      title: "Test Property",
      description: "A test property",
      address: "1 Test-ro, Mapo-gu, Seoul",
      addressDetail: "101",
      lat: 37.55,
      lng: 126.92,
      approxLat: 37.551,
      approxLng: 126.921,
      district: "Mapo-gu",
      amenities: ["wifi"],
      houseRules: "",
      status: "PUBLISHED",
    },
  });
  return db.room.create({
    data: {
      propertyId: property.id,
      name: "Room A",
      roomType: "PRIVATE",
      capacity: 1,
      monthlyRent: 900000,
      deposit: 1000000,
      options: [],
      photos: [],
      status: "PUBLISHED",
      ...overrides,
    },
  });
}
