import { z } from "zod";
import { parseDateOnly } from "@/lib/date-only";
import { DomainError } from "@/lib/errors";
import { RoomType } from "@/generated/prisma/enums";
import { SEOUL_DISTRICTS } from "@/modules/listings/schemas";
import { validateStay } from "@/modules/pricing";

/** URL 쿼리에서 빈 문자열은 "미지정"으로 취급한다. */
const blank = (v: unknown) => (v === "" ? undefined : v);

/** UI가 현지화할 수 있도록 날짜 외 모든 이슈 메시지는 ErrorCode다. */
const V = { error: "VALIDATION_FAILED" } as const;

const optionalInt = z.preprocess(blank, z.coerce.number(V).int(V).min(0, V).optional());
const optionalDate = z.preprocess(blank, z.string(V).optional());

export const searchQuery = z
  .object(
    {
      district: z.preprocess(blank, z.enum(SEOUL_DISTRICTS, V).optional()),
      checkIn: optionalDate,
      checkOut: optionalDate,
      minRent: optionalInt,
      maxRent: optionalInt,
      roomType: z.preprocess(blank, z.enum(RoomType, V).optional()),
      options: z.preprocess(
        (v) => (typeof v === "string" ? (v === "" ? undefined : [v]) : v),
        z.array(z.string(V).min(1, V), V).optional(),
      ),
      sort: z.preprocess(blank, z.enum(["price_asc", "price_desc", "newest"], V).default("newest")),
      page: z.preprocess(blank, z.coerce.number(V).int(V).min(1, V).default(1)),
    },
    V,
  )
  .superRefine((q, ctx) => {
    if (q.minRent !== undefined && q.maxRent !== undefined && q.minRent > q.maxRent) {
      ctx.addIssue({ code: "custom", path: ["minRent"], message: "VALIDATION_FAILED" });
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
