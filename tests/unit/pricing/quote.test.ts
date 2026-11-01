import { describe, it, expect } from "vitest";
import { quote, segments } from "@/modules/pricing";

const room = { monthlyRent: 600_000, deposit: 1_000_000 };

describe("pricing quote", () => {
  it("spec example: 3/15 → 5/25 is two full months + 10 prorated nights", () => {
    const q = quote(room, "2026-03-15", "2026-05-25");
    expect(q.segments.map((s) => [s.start, s.end, s.kind, s.amount])).toEqual([
      ["2026-03-15", "2026-04-15", "FULL", 600_000],
      ["2026-04-15", "2026-05-15", "FULL", 600_000],
      ["2026-05-15", "2026-05-25", "PRORATED", 200_000],
    ]);
    expect(q.rentTotal).toBe(1_400_000);
    expect(q.nights).toBe(71);
    expect(q.deposit).toBe(1_000_000);
  });
  it("boundaries anchor on the original check-in day", () => {
    expect(segments("2026-01-31", "2026-04-30").map((s) => s.end)).toEqual([
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });
  it("prorated amount floors to the won", () => {
    const q = quote({ monthlyRent: 550_001, deposit: 0 }, "2026-03-01", "2026-04-08");
    expect(q.segments[1]).toMatchObject({ kind: "PRORATED", nights: 7, amount: 128_333 });
  });
  it("exact one month yields one FULL segment", () => {
    expect(segments("2026-03-15", "2026-04-15")).toHaveLength(1);
  });
});
