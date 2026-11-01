import { addMonthsClamped, diffDays, type DateOnly } from "@/lib/date-only";

export type Segment = {
  start: DateOnly;
  end: DateOnly;
  kind: "FULL" | "PRORATED";
  nights: number;
  amount: number;
};

/**
 * Splits [checkIn, checkOut) into monthly segments. Boundaries are always
 * addMonthsClamped(checkIn, k), anchored on the original check-in day.
 */
export function segments(checkIn: DateOnly, checkOut: DateOnly): Omit<Segment, "amount">[] {
  const result: Omit<Segment, "amount">[] = [];
  let prev = checkIn;
  let k = 1;
  while (prev < checkOut) {
    const b = addMonthsClamped(checkIn, k);
    if (b <= checkOut) {
      result.push({ start: prev, end: b, kind: "FULL", nights: diffDays(b, prev) });
      prev = b;
      k++;
    } else {
      result.push({ start: prev, end: checkOut, kind: "PRORATED", nights: diffDays(checkOut, prev) });
      break;
    }
  }
  return result;
}
