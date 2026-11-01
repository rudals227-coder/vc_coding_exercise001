import { z } from "zod";
import { parseDateOnly } from "@/lib/date-only";
import { DomainError } from "@/lib/errors";
import { RoomType } from "@/generated/prisma/enums";
import { SEOUL_DISTRICTS } from "@/modules/listings/schemas";
import { validateStay } from "@/modules/pricing";

/** URL 쿼리에서 빈 문자열은 "미지정"으로 취급한다. */
const blank = (v: unknown) => (v === "" ? undefined : v);

const optionalInt = z.preprocess(blank, z.coerce.number().int().min(0).optional());
const optionalDate = z.preprocess(blank, z.string().optional());

export const searchQuery = z
  .object({
    district: z.preprocess(blank, z.enum(SEOUL_DISTRICTS).optional()),
    checkIn: optionalDate,
    checkOut: optionalDate,
    minRent: optionalInt,
    maxRent: optionalInt,
    roomType: z.preprocess(blank, z.enum(RoomType).optional()),
    options: z.preprocess(
      (v) => (typeof v === "string" ? (v === "" ? undefined : [v]) : v),
      z.array(z.string().min(1)).optional(),
    ),
    sort: z.preprocess(blank, z.enum(["price_asc", "price_desc", "newest"]).default("newest")),
    page: z.preprocess(blank, z.coerce.number().int().min(1).default(1)),
  })
  .superRefine((q, ctx) => {
    if (q.minRent !== undefined && q.maxRent !== undefined && q.minRent > q.maxRent) {
      ctx.addIssue({ code: "custom", path: ["minRent"], message: "INVALID_RENT_RANGE" });
    }
    if ((q.checkIn === undefined) !== (q.checkOut === undefined)) {
      ctx.addIssue({ code: "custom", path: ["checkIn"], message: "INVALID_DATE_RANGE" });
      return;
    }
    if (q.checkIn !== undefined && q.checkOut !== undefined) {
      try {
        validateStay(parseDateOnly(q.checkIn), parseDateOnly(q.checkOut));
      } catch (e) {
        if (!(e instanceof DomainError)) throw e;
        ctx.addIssue({ code: "custom", path: ["checkIn"], message: e.code });
      }
    }
  });

export type SearchQuery = z.infer<typeof searchQuery>;
/** 호출자가 기본값 없이 넘길 수 있는 입력 형태. */
export type SearchQueryInput = z.input<typeof searchQuery>;
