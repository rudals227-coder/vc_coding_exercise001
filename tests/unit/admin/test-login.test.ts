import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/test/login/route";

// connection()은 요청 스코프 밖에서는 쓸 수 없으므로 테스트에서는 무력화한다.
vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  connection: async () => {},
}));

const req = () => new Request("http://localhost:3100/api/test/login?email=admin@e2e.test");

describe("GET /api/test/login", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns 404 when E2E_AUTH_BYPASS is not set", async () => {
    vi.stubEnv("E2E_AUTH_BYPASS", "");
    vi.stubEnv("NODE_ENV", "test");
    expect((await GET(req())).status).toBe(404);
  });

  it("returns 404 in production even when the flag is on", async () => {
    vi.stubEnv("E2E_AUTH_BYPASS", "1");
    vi.stubEnv("NODE_ENV", "production");
    expect((await GET(req())).status).toBe(404);
  });
});
