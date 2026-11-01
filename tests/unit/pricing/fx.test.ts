import { describe, it, expect } from "vitest";
import { toUsdCents } from "@/modules/pricing";

describe("toUsdCents", () => {
  it("adds 3% and rounds up to the cent", () =>
    expect(toUsdCents(1_600_000, 1385.42, 300)).toBe(118_954));
  it("exact division still rounds correctly", () =>
    expect(toUsdCents(1_000_000, 1000, 0)).toBe(100_000));
});
