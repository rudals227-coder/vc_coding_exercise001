import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Money } from "@/components/Money";
import type { PublicRoomCard } from "@/modules/search/service";

export function RoomCard({
  room,
  stay,
}: {
  room: PublicRoomCard;
  /** 검색한 기간을 상세 화면으로 이어 준다. */
  stay?: { checkIn?: string; checkOut?: string };
}) {
  const t = useTranslations("room");
  const tt = useTranslations("admin.roomTypes");
  const qs = new URLSearchParams();
  if (stay?.checkIn && stay.checkOut) {
    qs.set("checkIn", stay.checkIn);
    qs.set("checkOut", stay.checkOut);
  }
  const href = `/rooms/${room.roomId}${qs.size ? `?${qs}` : ""}`;
  return (
    <li data-testid="room-card" className="flex gap-3 rounded border p-3">
      <div className="h-24 w-32 shrink-0 overflow-hidden rounded bg-muted">
        {room.photo && (
          // eslint-disable-next-line @next/next/no-img-element -- 호스트가 올린 임의 원격 이미지
          <img src={room.photo} alt={room.title} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="grid content-start gap-1">
        <Link href={href} className="font-medium underline">
          {room.title} · {room.roomName}
        </Link>
        <p className="text-sm text-muted-foreground">
          {room.district} · {tt(room.roomType)}
        </p>
        <p className="text-sm">
          <Money krw={room.monthlyRent} /> {t("perMonth")} · {t("deposit")} <Money krw={room.deposit} />
        </p>
      </div>
    </li>
  );
}
