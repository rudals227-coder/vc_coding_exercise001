import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ quiet: true });

const PORT = 3100;
const testDb = process.env.DATABASE_URL_TEST;
if (!testDb) throw new Error("DATABASE_URL_TEST is required for e2e tests");

// E2E는 항상 테스트 DB만 사용한다(개발 DB 접근 금지).
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    // DB를 읽지 않는 페이지로 준비 상태를 확인한다(globalSetup 전에 스키마가 아직 없을 수 있음).
    url: `http://localhost:${PORT}/en/sign-in`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: testDb,
      AUTH_SECRET: process.env.AUTH_SECRET || "e2e-dev-secret-not-for-production",
      ADMIN_EMAIL: "admin@e2e.test",
      E2E_AUTH_BYPASS: "1",
      E2E_FAKE_GEOCODER: "1",
      // 지도·업로드는 로컬 E2E에서 항상 폴백/비활성 경로를 탄다.
      NEXT_PUBLIC_GOOGLE_MAPS_KEY: "",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
  },
});
