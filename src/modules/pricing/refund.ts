import { diffDays, type DateOnly } from "@/lib/date-only";
import type { Segment } from "./segments";

export type RefundResult = {
  tier: "FULL" | "HALF" | "DEPOSIT_ONLY";
  rentRefund: number;
  depositRefund: number;
};

/** "First-segment rent" = snapshot.segments[0].amount. Deposit is always refunded. */
export function refundFor(
  snapshot: { segments: Pick<Segment, "amount">[]; deposit: number },
  checkIn: DateOnly,
  cancelDate: DateOnly,
): RefundResult {
  const daysBefore = diffDays(checkIn, cancelDate);
  const firstRent = snapshot.segments[0]?.amount ?? 0;
  if (daysBefore >= 30) return { tier: "FULL", rentRefund: firstRent, depositRefund: snapshot.deposit };
  if (daysBefore >= 7)
    return { tier: "HALF", rentRefund: Math.floor(firstRent / 2), depositRefund: snapshot.deposit };
  return { tier: "DEPOSIT_ONLY", rentRefund: 0, depositRefund: snapshot.deposit };
}
