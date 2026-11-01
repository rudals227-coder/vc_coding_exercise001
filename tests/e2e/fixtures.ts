import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

/** E2E 전용: 테스트 DB(DATABASE_URL_TEST)에 직접 공개 매물을 시드한다. */
export async function seedPublicListings(): Promise<{ title: string; otherTitle: string }> {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL_TEST });
  const prisma = new PrismaClient({ adapter });
  const suffix = Date.now();
  const title = `E2E Mapo House ${suffix}`;
  const otherTitle = `E2E Gangnam Studio ${suffix}`;
  try {
    const host = await prisma.user.create({
      data: { email: `host-${suffix}@e2e.test`, name: "E2E Host", roles: ["HOST"] },
    });
    const base = {
      hostId: host.id,
      description: "Bright place near the station.",
      address: "1 Secret-ro, Seoul",
      addressDetail: "Unit 202",
      lat: 37.55,
      lng: 126.92,
      approxLat: 37.551,
      approxLng: 126.921,
      amenities: ["wifi", "washer"],
      houseRules: "No smoking.",
      status: "PUBLISHED" as const,
    };
    const roomBase = {
      roomType: "PRIVATE" as const,
      capacity: 1,
      monthlyRent: 600000,
      deposit: 1000000,
      options: ["desk"],
      photos: [],
      status: "PUBLISHED" as const,
    };
    await prisma.property.create({
      data: {
        ...base,
        title,
        district: "mapo",
        rooms: { create: [{ ...roomBase, name: "Room A" }, { ...roomBase, name: "Room B" }] },
      },
    });
    await prisma.property.create({
      data: {
        ...base,
        title: otherTitle,
        district: "gangnam",
        rooms: { create: [{ ...roomBase, name: "Studio" }] },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
  return { title, otherTitle };
}
