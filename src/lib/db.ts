import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// 개발 중 핫리로드마다 커넥션이 늘어나지 않도록 전역 싱글턴으로 유지한다.
const globalForDb = globalThis as unknown as { __db?: PrismaClient };

export const db: PrismaClient = globalForDb.__db ?? createClient();

if (process.env.NODE_ENV !== "production") globalForDb.__db = db;
