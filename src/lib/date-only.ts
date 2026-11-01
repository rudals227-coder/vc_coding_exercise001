import { DomainError } from "@/lib/errors";

/** "YYYY-MM-DD" (time-less calendar date). */
export type DateOnly = string;

const MS_PER_DAY = 86_400_000;
const FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtcMs(d: DateOnly): number {
  const m = FORMAT.exec(d);
  if (!m) throw new DomainError("INVALID_DATE", { value: d });
  const [y, mo, da] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, da);
  const dt = new Date(ms);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== da) {
    throw new DomainError("INVALID_DATE", { value: d });
  }
  return ms;
}

function fromUtcMs(ms: number): DateOnly {
  const dt = new Date(ms);
  const y = String(dt.getUTCFullYear()).padStart(4, "0");
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateOnly(s: string): DateOnly {
  toUtcMs(s);
  return s;
}

export function addDays(d: DateOnly, n: number): DateOnly {
  return fromUtcMs(toUtcMs(d) + n * MS_PER_DAY);
}

/** a - b in days. */
export function diffDays(a: DateOnly, b: DateOnly): number {
  return Math.round((toUtcMs(a) - toUtcMs(b)) / MS_PER_DAY);
}

/** Adds k months to base, clamping to month end (always computed from base's day). */
export function addMonthsClamped(base: DateOnly, k: number): DateOnly {
  const ms = toUtcMs(base);
  const dt = new Date(ms);
  const day = dt.getUTCDate();
  const total = dt.getUTCFullYear() * 12 + dt.getUTCMonth() + k;
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return fromUtcMs(Date.UTC(year, month, Math.min(day, lastDay)));
}

export function toDbDate(d: DateOnly): Date {
  return new Date(toUtcMs(d));
}

export function fromDbDate(d: Date): DateOnly {
  return fromUtcMs(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function todayInSeoul(now: Date = new Date()): DateOnly {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parseDateOnly(s);
}
