export const ALL_ERROR_CODES = [
  "INVALID_DATE",
  "INVALID_DATE_RANGE",
  "STAY_TOO_SHORT",
  "STAY_TOO_LONG",
  "GEOCODE_FAILED",
  "NOT_FOUND",
  "FORBIDDEN",
  "BOOKING_CONFLICT",
] as const;

export type ErrorCode = (typeof ALL_ERROR_CODES)[number];

export class DomainError extends Error {
  code: ErrorCode;
  meta?: Record<string, unknown>;

  constructor(code: ErrorCode, meta?: Record<string, unknown>, message?: string) {
    super(message ?? code);
    this.name = "DomainError";
    this.code = code;
    this.meta = meta;
  }
}
