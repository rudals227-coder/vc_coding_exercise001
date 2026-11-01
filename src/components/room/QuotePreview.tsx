"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Money } from "@/components/Money";
import { ALL_ERROR_CODES, type ErrorCode } from "@/lib/errors";
import type { Quote } from "@/modules/pricing";

type Result = { key: string; quote?: Quote; code?: ErrorCode };

const isErrorCode = (c: unknown): c is ErrorCode =>
  typeof c === "string" && (ALL_ERROR_CODES as readonly string[]).includes(c);

/** 날짜는 "YYYY-MM-DD" 문자열 그대로 서버에 보낸다(Date로 바꾸지 않는다). */
export function QuotePreview({
  roomId,
  defaultCheckIn = "",
  defaultCheckOut = "",
}: {
  roomId: string;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
}) {
  const t = useTranslations("room.quote");
  const ts = useTranslations("search");
  const te = useTranslations("errors");
  const tr = useTranslations("room");
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [result, setResult] = useState<Result | null>(null);

  const key = checkIn && checkOut ? `${roomId}|${checkIn}|${checkOut}` : "";

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    const qs = new URLSearchParams({ roomId, checkIn, checkOut });
    fetch(`/api/quote?${qs}`, { signal: ctrl.signal })
      .then(async (res) => {
        const body = await res.json();
        if (res.ok && body.quote) setResult({ key, quote: body.quote as Quote });
        else setResult({ key, code: isErrorCode(body.code) ? body.code : "INTERNAL" });
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setResult({ key, code: "INTERNAL" });
      });
    return () => ctrl.abort();
  }, [key, roomId, checkIn, checkOut]);

  const current = result && result.key === key ? result : null;
  const input = "rounded border bg-transparent px-2 py-1";

  return (
    <section className="grid gap-3 rounded border p-4" data-testid="quote-preview">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">
          {ts("checkIn")}
          <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={input} />
        </label>
        <label className="grid gap-1 text-sm">
          {ts("checkOut")}
          <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={input} />
        </label>
      </div>
      {!key && <p className="text-sm text-muted-foreground">{t("pickDates")}</p>}
      {key && !current && <p className="text-sm text-muted-foreground">{t("loading")}</p>}
      {current?.code && (
        <p role="alert" data-testid="quote-error" className="text-sm text-red-600">
          {te(current.code)}
        </p>
      )}
      {current?.quote && (
        <div className="grid gap-2 text-sm">
          <p className="text-muted-foreground">{tr("nights", { count: current.quote.nights })}</p>
          <ul className="grid gap-1">
            {current.quote.segments.map((s) => (
              <li key={s.start} data-testid="quote-segment" className="flex justify-between gap-2">
                <span>
                  {s.start} – {s.end} · {s.kind === "FULL" ? t("full") : t("prorated")}
                </span>
                <Money krw={s.amount} />
              </li>
            ))}
          </ul>
          <p className="flex justify-between font-medium" data-testid="quote-rent-total">
            <span>{t("rentTotal")}</span>
            <Money krw={current.quote.rentTotal} />
          </p>
          <p className="flex justify-between" data-testid="quote-deposit">
            <span>{tr("deposit")}</span>
            <Money krw={current.quote.deposit} />
          </p>
        </div>
      )}
    </section>
  );
}
