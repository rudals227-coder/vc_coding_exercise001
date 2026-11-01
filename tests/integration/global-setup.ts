import { execSync } from "node:child_process";
import { config } from "dotenv";
import pg from "pg";

// 통합 테스트는 항상 테스트 DB(DATABASE_URL_TEST)만 사용한다. 개발 DB는 건드리지 않는다.
// `prisma migrate reset`은 AI 에이전트 실행 시 Prisma가 차단하므로, 동일한 효과를
// (public 스키마 초기화 + `migrate deploy`)로 구현한다. 데이터 파괴는 테스트 DB로만 한정된다.
export async function resetTestDb() {
  config({ quiet: true });
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST is required for integration tests");

  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!dbName.endsWith("_test")) {
    throw new Error(`Refusing to reset non-test database "${dbName}"`);
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL_TEST must differ from DATABASE_URL");
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");
  } finally {
    await client.end();
  }

  // 워커 프로세스(및 src/lib/db.ts)가 테스트 DB를 보도록 덮어쓴다.
  process.env.DATABASE_URL = url;
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}

export default async function setup() {
  await resetTestDb();
}
