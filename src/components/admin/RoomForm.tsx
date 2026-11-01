"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createRoomAction, updateRoomAction } from "@/app/[locale]/admin/actions";
import type { ActionResult } from "@/app/[locale]/admin/action-utils";
import { ROOM_OPTIONS, type RoomOption } from "@/modules/listings/schemas";
import { Field, MoneyInput, nativeSelectClass, ResultMessage } from "./form-bits";

type RoomType = "PRIVATE" | "SHARED" | "STUDIO";
const ROOM_TYPES: RoomType[] = ["PRIVATE", "SHARED", "STUDIO"];

type Defaults = {
  name: string;
  roomType: RoomType;
  capacity: number;
  monthlyRent: number;
  deposit: number;
  options: string[];
};


type Props = { propertyId: string; roomId?: undefined } | { roomId: string; propertyId?: undefined };

export function RoomForm({ propertyId, roomId, defaults }: Props & { defaults?: Defaults }) {
  const t = useTranslations("admin");
  const to = useTranslations("room.optionLabels");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [rent, setRent] = useState<number | null>(defaults?.monthlyRent ?? null);
  const [deposit, setDeposit] = useState<number | null>(defaults?.deposit ?? null);
  const fe = result && !result.ok ? result.fieldErrors : undefined;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const str = (k: string) => String(f.get(k) ?? "");
    const input = {
      name: str("name"),
      roomType: str("roomType") as RoomType,
      capacity: Number(str("capacity")),
      monthlyRent: rent ?? Number.NaN,
      deposit: deposit ?? Number.NaN,
      options: f.getAll("options").map(String) as RoomOption[],
    };
    start(async () => {
      const res = roomId
        ? await updateRoomAction(roomId, input)
        : await createRoomAction(propertyId!, input);
      setResult(res);
      if (!res.ok) return;
      if (!roomId) {
        form.reset();
        setRent(null);
        setDeposit(null);
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-4">
      <Field id="room-name" label={t("fields.roomName")} errors={fe?.name}>
        <Input id="room-name" name="name" defaultValue={defaults?.name} required />
      </Field>
      <Field id="room-type" label={t("fields.roomType")} errors={fe?.roomType}>
        <select
          id="room-type"
          name="roomType"
          defaultValue={defaults?.roomType ?? "PRIVATE"}
          className={nativeSelectClass}
        >
          {ROOM_TYPES.map((r) => (
            <option key={r} value={r}>
              {t(`roomTypes.${r}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field id="capacity" label={t("fields.capacity")} errors={fe?.capacity}>
        <Input
          id="capacity"
          name="capacity"
          type="number"
          min={1}
          max={8}
          defaultValue={defaults?.capacity ?? 1}
          required
        />
      </Field>
      <Field id="rent" label={t("fields.monthlyRent")} errors={fe?.monthlyRent}>
        <MoneyInput id="rent" value={rent} onChange={setRent} />
      </Field>
      <Field id="deposit" label={t("fields.deposit")} errors={fe?.deposit}>
        <MoneyInput id="deposit" value={deposit} onChange={setDeposit} />
      </Field>
      <Field id="options" label={t("fields.options")} errors={fe?.options}>
        <div id="options" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {ROOM_OPTIONS.map((o) => (
            <label key={o} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                name="options"
                value={o}
                defaultChecked={defaults?.options.includes(o)}
              />
              {to(o)}
            </label>
          ))}
        </div>
      </Field>
      <ResultMessage result={result} />
      {result?.ok && roomId && <p role="status" className="text-sm">{t("saved")}</p>}
      <div>
        <Button type="submit" disabled={pending}>
          {roomId ? t("editRoom") : t("addRoom")}
        </Button>
      </div>
    </form>
  );
}
