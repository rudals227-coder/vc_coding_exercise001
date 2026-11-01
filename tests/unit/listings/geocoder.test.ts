import { afterEach, describe, expect, it, vi } from "vitest";
import { googleGeocoder } from "@/modules/listings/geocode";
import { getGeocoder } from "@/modules/listings/geocoder";

describe("getGeocoder", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the fake geocoder only when flagged and not in production", async () => {
    vi.stubEnv("E2E_FAKE_GEOCODER", "1");
    vi.stubEnv("NODE_ENV", "test");
    expect(getGeocoder()).not.toBe(googleGeocoder);
    expect(await getGeocoder()("anywhere")).toEqual({ lat: 37.5563, lng: 126.9236 });
  });

  it("ignores the flag in production", () => {
    vi.stubEnv("E2E_FAKE_GEOCODER", "1");
    vi.stubEnv("NODE_ENV", "production");
    expect(getGeocoder()).toBe(googleGeocoder);
  });

  it("uses Google when the flag is off", () => {
    vi.stubEnv("E2E_FAKE_GEOCODER", "");
    expect(getGeocoder()).toBe(googleGeocoder);
  });
});
