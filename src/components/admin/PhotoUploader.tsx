"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadPhotoAction } from "@/app/[locale]/admin/actions";
import type { ActionResult } from "@/app/[locale]/admin/action-utils";
import { ResultMessage } from "./form-bits";

export function PhotoUploader({ roomId, photos }: { roomId: string; photos: string[] }) {
  const t = useTranslations("admin.photos");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const res = await uploadPhotoAction(roomId, fd);
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
      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {photos.map((src) => (
            <li key={src}>
              {/* 외부 스토리지 URL: 도메인 설정 없이 표시하기 위해 일반 img 사용 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-24 w-32 rounded object-cover" />
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onSubmit} className="flex max-w-md items-center gap-2">
        <Input
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={t("upload")}
          required
        />
        <Button type="submit" disabled={pending}>
          {t("upload")}
        </Button>
      </form>
      <ResultMessage result={result} />
    </section>
  );
}
