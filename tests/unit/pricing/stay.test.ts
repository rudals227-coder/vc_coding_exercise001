import { describe, it, expect } from "vitest";
import { validateStay } from "@/modules/pricing";
import { expectCode } from "../helpers";

describe("validateStay", () => {
  it("accepts exactly one month when it is >= 30 nights", () =>
    expect(() => validateStay("2026-03-15", "2026-04-15")).not.toThrow());
  it("rejects 1/31->2/28 (one month but 28 nights)", () =>
    expectCode(() => validateStay("2026-01-31", "2026-02-28"), "STAY_TOO_SHORT"));
  it("rejects 29 nights", () =>
    expectCode(() => validateStay("2026-04-01", "2026-04-30"), "STAY_TOO_SHORT"));
  it("accepts 30 nights spanning a full month", () =>
    expect(() => validateStay("2026-04-01", "2026-05-01")).not.toThrow());
  it("accepts exactly 12 months, rejects one day more", () => {
    expect(() => validateStay("2026-03-15", "2027-03-15")).not.toThrow();
    expectCode(() => validateStay("2026-03-15", "2027-03-16"), "STAY_TOO_LONG");
  });
  it("rejects reversed or empty range", () => {
    expectCode(() => validateStay("2026-03-15", "2026-03-15"), "INVALID_DATE_RANGE");
    expectCode(() => validateStay("2026-03-15", "2026-03-01"), "INVALID_DATE_RANGE");
  });
});
