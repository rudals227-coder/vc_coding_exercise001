import { addMonthsClamped, diffDays, type DateOnly } from "@/lib/date-only";
import { DomainError } from "@/lib/errors";
import { PRICING } from "./config";

/** Order: invalid range -> min months -> min nights -> max months. */
export function validateStay(checkIn: DateOnly, checkOut: DateOnly): void {
  if (checkOut <= checkIn) throw new DomainError("INVALID_DATE_RANGE");
  if (checkOut < addMonthsClamped(checkIn, PRICING.minMonths)) throw new DomainError("STAY_TOO_SHORT");
  if (diffDays(checkOut, checkIn) < PRICING.minNights) throw new DomainError("STAY_TOO_SHORT");
  if (checkOut > addMonthsClamped(checkIn, PRICING.maxMonths)) throw new DomainError("STAY_TOO_LONG");
}
