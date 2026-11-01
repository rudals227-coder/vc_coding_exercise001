import { describe, expect, it } from "vitest";
import { searchQuery } from "@/modules/search/schemas";

describe("searchQuery", () => {
  it("applies defaults", () => {
    const r = searchQuery.parse({});
    expect(r.sort).toBe("newest");
    expect(r.page).toBe(1);
    expect(r.options).toBeUndefined();
  });

  it("rejects one-sided date range", () => {
    expect(searchQuery.safeParse({ checkIn: "2026-03-01" }).success).toBe(false);
    expect(searchQuery.safeParse({ checkOut: "2026-04-01" }).success).toBe(false);
  });

  it("rejects a too-short stay with the error code as message", () => {
    const r = searchQuery.safeParse({ checkIn: "2026-03-01", checkOut: "2026-03-20" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.message)).toContain("STAY_TOO_SHORT");
  });

  it("rejects a too-long stay and reversed range", () => {
    const long = searchQuery.safeParse({ checkIn: "2026-03-01", checkOut: "2027-04-01" });
    expect(!long.success && long.error.issues.map((i) => i.message)).toContain("STAY_TOO_LONG");
    const rev = searchQuery.safeParse({ checkIn: "2026-04-01", checkOut: "2026-03-01" });
    expect(!rev.success && rev.error.issues.map((i) => i.message)).toContain("INVALID_DATE_RANGE");
  });

  it("accepts a valid stay", () => {
    expect(searchQuery.safeParse({ checkIn: "2026-03-01", checkOut: "2026-04-01" }).success).toBe(true);
  });

  it("coerces numeric strings and normalizes options", () => {
    const r = searchQuery.parse({ minRent: "500000", maxRent: "900000", page: "2", options: "desk" });
    expect(r).toMatchObject({ minRent: 500000, maxRent: 900000, page: 2, options: ["desk"] });
    expect(searchQuery.parse({ options: ["desk", "wifi"] }).options).toEqual(["desk", "wifi"]);
  });

  it("rejects minRent > maxRent, negatives, bad page, bad district/roomType/sort", () => {
    expect(searchQuery.safeParse({ minRent: 10, maxRent: 5 }).success).toBe(false);
    expect(searchQuery.safeParse({ minRent: -1 }).success).toBe(false);
    expect(searchQuery.safeParse({ page: 0 }).success).toBe(false);
    expect(searchQuery.safeParse({ district: "atlantis" }).success).toBe(false);
    expect(searchQuery.safeParse({ roomType: "CASTLE" }).success).toBe(false);
    expect(searchQuery.safeParse({ sort: "random" }).success).toBe(false);
  });

  it("accepts a valid district and roomType", () => {
    expect(searchQuery.safeParse({ district: "mapo", roomType: "PRIVATE" }).success).toBe(true);
  });
});
