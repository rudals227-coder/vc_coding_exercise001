import { describe, it, expect } from "vitest";
import { refundFor } from "@/modules/pricing";

const snap = { segments: [{ amount: 600_001 }], deposit: 1_000_000 };

describe("refundFor", () => {
  it("30 days before -> FULL", () =>
    expect(refundFor(snap, "2026-05-01", "2026-04-01")).toEqual({ tier: "FULL", rentRefund: 600_001, depositRefund: 1_000_000 }));
  it("29 days before -> HALF, floored", () =>
    expect(refundFor(snap, "2026-05-01", "2026-04-02")).toEqual({ tier: "HALF", rentRefund: 300_000, depositRefund: 1_000_000 }));
  it("7 days before -> HALF", () =>
    expect(refundFor(snap, "2026-05-01", "2026-04-24").tier).toBe("HALF"));
  it("6 days before -> DEPOSIT_ONLY", () =>
    expect(refundFor(snap, "2026-05-01", "2026-04-25")).toEqual({ tier: "DEPOSIT_ONLY", rentRefund: 0, depositRefund: 1_000_000 }));
  it("after check-in -> DEPOSIT_ONLY", () =>
    expect(refundFor(snap, "2026-05-01", "2026-05-03").tier).toBe("DEPOSIT_ONLY"));
});
