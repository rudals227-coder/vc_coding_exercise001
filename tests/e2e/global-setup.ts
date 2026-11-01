import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { resetTestDb } from "../integration/global-setup";

const ADMIN_EMAIL = "admin@e2e.test";

// 테스트 스키마를 초기화(migrate deploy)하고 관리자 사용자를 시드한다.
export default async function globalSetup() {
  await resetTestDb(); // 개발 DB가 아닌 DATABASE_URL_TEST만 대상으로 한다.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL_TEST });
  const prisma = new PrismaClient({ adapter });
  try {
    const roles = ["GUEST", "HOST", "ADMIN"] as const;
    await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: { roles: [...roles] },
      create: { email: ADMIN_EMAIL, roles: [...roles] },
    });
  } finally {
    await prisma.$disconnect();
  }
}
