"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PinPicker } from "@/components/map/PinPicker";
import { SEOUL_DISTRICTS } from "@/modules/listings/schemas";
import {
  createPropertyAction,
  updatePropertyAction,
} from "@/app/[locale]/admin/actions";
import type { ActionResult } from "@/app/[locale]/admin/action-utils";
import { Field, nativeSelectClass, ResultMessage, splitList } from "./form-bits";

type Defaults = {
  title: string;
  description: string;
  address: string;
  addressDetail: string;
  district: string;
  amenities: string[];
  houseRules: string;
  lat?: number;
  lng?: number;
};

export function PropertyForm({ propertyId, defaults }: { propertyId?: string; defaults?: Defaults }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const fe = result && !result.ok ? result.fieldErrors : undefined;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "");
    const input = {
      title: str("title"),
      description: str("description"),
      address: str("address"),
      addressDetail: str("addressDetail"),
      district: str("district") as (typeof SEOUL_DISTRICTS)[number],
      amenities: splitList(str("amenities")),
      houseRules: str("houseRules"),
    };
    const lat = str("lat");
    const lng = str("lng");
    const pin = lat !== "" && lng !== "" ? { lat: Number(lat), lng: Number(lng) } : undefined;

    start(async () => {
      const res = propertyId
        ? await updatePropertyAction(propertyId, input, pin)
        : await createPropertyAction(input, pin);
      setResult(res);
      if (!res.ok) return;
      if (propertyId) router.refresh();
      else if (res.id) router.push(`/admin/properties/${res.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-4">
      <Field id="title" label={t("fields.title")} errors={fe?.title}>
        <Input id="title" name="title" defaultValue={defaults?.title} required />
      </Field>
      <Field id="description" label={t("fields.description")} errors={fe?.description}>
        <Textarea id="description" name="description" defaultValue={defaults?.description} required />
      </Field>
      <Field id="address" label={t("fields.address")} errors={fe?.address}>
        <Input id="address" name="address" defaultValue={defaults?.address} required />
      </Field>
      <Field id="addressDetail" label={t("fields.addressDetail")} errors={fe?.addressDetail}>
        <Input id="addressDetail" name="addressDetail" defaultValue={defaults?.addressDetail} />
      </Field>
      <Field id="district" label={t("fields.district")} errors={fe?.district}>
        <select
          id="district"
          name="district"
          defaultValue={defaults?.district ?? ""}
          required
          className={nativeSelectClass}
        >
          <option value="" disabled />
          {SEOUL_DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Field>
      <Field id="amenities" label={t("fields.amenities")} errors={fe?.amenities}>
        <Input id="amenities" name="amenities" defaultValue={defaults?.amenities.join(", ")} />
      </Field>
      <Field id="houseRules" label={t("fields.houseRules")} errors={fe?.houseRules}>
        <Textarea id="houseRules" name="houseRules" defaultValue={defaults?.houseRules} />
      </Field>
      <PinPicker
        defaultValue={
          defaults?.lat !== undefined && defaults.lng !== undefined
            ? { lat: defaults.lat, lng: defaults.lng }
            : undefined
        }
      />
      <ResultMessage result={result} />
      {result?.ok && propertyId && <p role="status" className="text-sm">{t("saved")}</p>}
      <div>
        <Button type="submit" disabled={pending}>
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
