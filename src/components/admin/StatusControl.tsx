"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { setStatusAction } from "@/app/[locale]/admin/actions";
import type { ActionResult } from "@/app/[locale]/admin/action-utils";
import { ResultMessage } from "./form-bits";

type Status = "DRAFT" | "PUBLISHED" | "HIDDEN";

// 현재 상태 표시 + 게시/숨김 토글.
export function StatusControl({
  kind,
  id,
  status,
}: {
  kind: "property" | "room";
  id: string;
  status: Status;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const next: Status = status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED";

  return (
    <span className="inline-flex items-center gap-2">
      <span className="rounded bg-muted px-2 py-0.5 text-xs">{t(`status.${status}`)}</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await setStatusAction(kind, id, next);
            setResult(res);
            if (res.ok) router.refresh();
          })
        }
      >
        {status === "PUBLISHED" ? t("hide") : t("publish")}
      </Button>
      <ResultMessage result={result} />
    </span>
  );
}
