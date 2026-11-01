import { describe, expect, it } from "vitest";
import { approximate, haversineMeters } from "@/modules/listings/approx";

describe("approximate", () => {
  it("moves 100–300 m for many random draws", () => {
    for (let i = 0; i < 1000; i++) {
      const p = approximate(37.5665, 126.978);
      const d = haversineMeters(37.5665, 126.978, p.lat, p.lng);
      expect(d).toBeGreaterThanOrEqual(100);
      expect(d).toBeLessThanOrEqual(300);
    }
  });

  it("uses the 100 m lower bound and stays within 300 m at the upper bound", () => {
    const lo = approximate(37.5, 127, () => 0);
    expect(haversineMeters(37.5, 127, lo.lat, lo.lng)).toBeCloseTo(100, 0);
    const hi = approximate(37.5, 127, () => 0.999999);
    expect(haversineMeters(37.5, 127, hi.lat, hi.lng)).toBeLessThanOrEqual(300);
  });
});
