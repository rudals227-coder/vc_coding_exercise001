"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addRoomBlockAction, removeRoomBlockAction } from "@/app/[locale]/admin/actions";
import type { ActionResult } from "@/app/[locale]/admin/action-utils";
import { Field, ResultMessage } from "./form-bits";

type Block = { id: string; startDate: string; endDate: string; reason: string };

export function RoomBlocks({ roomId, blocks }: { roomId: string; blocks: Block[] }) {
  const t = useTranslations("admin.blocks");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const fe = result && !result.ok ? result.fieldErrors : undefined;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const str = (k: string) => String(f.get(k) ?? "");
    start(async () => {
      const res = await addRoomBlockAction(roomId, {
        startDate: str("startDate"),
        endDate: str("endDate"),
        reason: str("reason"),
      });
      setResult(res);
      if (res.ok) {
        form.reset();
        router.refresh();
      }
    });
  }

  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      {blocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <ul className="grid gap-1">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center gap-3 text-sm">
              <span>
                {b.startDate} ~ {b.endDate}
                {b.reason ? ` (${b.reason})` : ""}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await removeRoomBlockAction(b.id);
                    setResult(res);
                    if (res.ok) router.refresh();
                  })
                }
              >
                {t("remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onSubmit} className="grid max-w-md gap-3">
        <Field id="block-start" label={t("startDate")} errors={fe?.startDate}>
          <Input id="block-start" name="startDate" type="date" required />
        </Field>
        <Field id="block-end" label={t("endDate")} errors={fe?.endDate}>
          <Input id="block-end" name="endDate" type="date" required />
        </Field>
        <Field id="block-reason" label={t("reason")} errors={fe?.reason}>
          <Input id="block-reason" name="reason" />
        </Field>
        <ResultMessage result={result} />
        <div>
          <Button type="submit" disabled={pending}>
            {t("add")}
          </Button>
        </div>
      </form>
    </section>
  );
}
