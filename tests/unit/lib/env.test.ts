import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

type Raw = Record<string, string | undefined>;

function fullRaw(overrides: Raw = {}): Raw {
  return {
    DATABASE_URL: "postgresql://u:p@localhost:5432/db",
    AUTH_SECRET: "secret",
    AUTH_RESEND_KEY: "re_dummy",
    AUTH_GOOGLE_ID: "gid",
    AUTH_GOOGLE_SECRET: "gsecret",
    EMAIL_FROM: "no-reply@example.com",
    GOOGLE_MAPS_SERVER_KEY: "server-key",
    NEXT_PUBLIC_GOOGLE_MAPS_KEY: "public-key",
    NEXT_PUBLIC_GOOGLE_MAP_ID: "map-id",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-role",
    SUPABASE_BUCKET: "room-photos",
    FX_MARKUP_BPS: "300",
    ...overrides,
  };
}

describe("parseEnv", () => {
  it("parses a complete env and defaults FX_MARKUP_BPS to 300", () => {
    const env = parseEnv(fullRaw({ FX_MARKUP_BPS: undefined, SUPABASE_BUCKET: undefined }));
    expect(env.FX_MARKUP_BPS).toBe(300);
    expect(env.SUPABASE_BUCKET).toBe("room-photos");
  });

  it("names the missing key", () => {
    expect(() => parseEnv(fullRaw({ DATABASE_URL: undefined }))).toThrow(/DATABASE_URL/);
  });

  it("allows missing external keys outside production", () => {
    const env = parseEnv({ DATABASE_URL: "postgresql://x", AUTH_SECRET: "s" });
    expect(env.GOOGLE_MAPS_SERVER_KEY).toBeUndefined();
  });

  it("names a missing external key in production", () => {
    expect(() =>
      parseEnv(fullRaw({ NODE_ENV: "production", GOOGLE_MAPS_SERVER_KEY: undefined })),
    ).toThrow(/GOOGLE_MAPS_SERVER_KEY/);
  });
});
