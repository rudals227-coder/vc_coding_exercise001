"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/app/[locale]/admin/action-utils";

export const nativeSelectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type FieldErrors = Record<string, string[]> | undefined;

export function Field({
  id,
  label,
  errors,
  children,
}: {
  id: string;
  label: string;
  errors?: string[];
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {errors?.map((m) => (
        <p key={m} className="text-xs text-destructive">
          {m}
        </p>
      ))}
    </div>
  );
}

/** 실패한 액션 결과를 `errors.<code>` 문구로 보여준다. */
export function ResultMessage({ result }: { result: ActionResult | null }) {
  const te = useTranslations("errors");
  if (!result || result.ok) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {te(result.code)}
    </p>
  );
}

/** 콤마 표시(1,000,000), 값은 정수. 빈 입력은 null. */
export function MoneyInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      autoComplete="off"
      value={value === null ? "" : value.toLocaleString("en-US")}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^0-9]/g, "");
        onChange(digits === "" ? null : Number(digits));
      }}
    />
  );
}

export function splitList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}
