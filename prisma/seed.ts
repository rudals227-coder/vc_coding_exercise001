import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim();
  if (!email) {
    console.log("ADMIN_EMAIL is not set; skipping admin seed.");
    return;
  }
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    const roles = ["GUEST", "HOST", "ADMIN"] as const;
    const user = await prisma.user.upsert({
      where: { email },
      update: { roles: [...roles] },
      create: { email, roles: [...roles] },
    });
    console.log(`Seeded admin user ${user.email} (${user.roles.join(", ")}).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
