import { diffDays, type DateOnly } from "@/lib/date-only";
import { segments, type Segment } from "./segments";

export type Quote = {
  monthlyRent: number;
  deposit: number;
  segments: Segment[];
  rentTotal: number;
  nights: number;
};

/** Callers must validate the stay first (validateStay); quote does not. */
export function quote(
  room: { monthlyRent: number; deposit: number },
  checkIn: DateOnly,
  checkOut: DateOnly,
): Quote {
  const segs: Segment[] = segments(checkIn, checkOut).map((s) => ({
    ...s,
    amount:
      s.kind === "FULL" ? room.monthlyRent : Math.floor((room.monthlyRent * s.nights) / 30),
  }));
  return {
    monthlyRent: room.monthlyRent,
    deposit: room.deposit,
    segments: segs,
    rentTotal: segs.reduce((sum, s) => sum + s.amount, 0),
    nights: diffDays(checkOut, checkIn),
  };
}
