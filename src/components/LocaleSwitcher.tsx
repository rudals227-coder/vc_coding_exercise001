"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, routing } from "@/i18n/routing";

const LABELS: Record<string, string> = { en: "English", ko: "한국어" };

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams().toString();
  const t = useTranslations("common.nav");

  return (
    <select
      aria-label={t("language")}
      value={locale}
      onChange={(e) => router.replace(search ? `${pathname}?${search}` : pathname, { locale: e.target.value })}
      className="rounded border bg-transparent px-2 py-1 text-sm"
    >
      {routing.locales.map((l) => (
        <option key={l} value={l}>
          {LABELS[l] ?? l}
        </option>
      ))}
    </select>
  );
}
