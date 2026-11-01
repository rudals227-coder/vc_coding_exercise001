import { describe, it, expect } from "vitest";
import {
  addDays,
  addMonthsClamped,
  diffDays,
  fromDbDate,
  parseDateOnly,
  todayInSeoul,
  toDbDate,
} from "@/lib/date-only";

describe("date-only", () => {
  it("addMonthsClamped clamps to month end from the original day", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonthsClamped("2026-01-31", 2)).toBe("2026-03-31");
    expect(addMonthsClamped("2026-01-31", 3)).toBe("2026-04-30");
    expect(addMonthsClamped("2026-11-15", 2)).toBe("2027-01-15");
  });
  it("diffDays and addDays", () => {
    expect(diffDays("2026-03-01", "2026-02-01")).toBe(28);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("parseDateOnly rejects malformed and non-existent dates", () => {
    for (const bad of ["2026-02-30", "2026-2-1", "abc", "2026-13-01"])
      expect(() => parseDateOnly(bad)).toThrowError(
        expect.objectContaining({ code: "INVALID_DATE" }),
      );
  });
  it("parseDateOnly round-trips without timezone shift", () => {
    expect(fromDbDate(toDbDate("2026-03-15"))).toBe("2026-03-15");
  });
  it("todayInSeoul uses KST", () => {
    expect(todayInSeoul(new Date("2026-03-14T15:30:00Z"))).toBe("2026-03-15");
  });
});
