import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ApproxCircleMap } from "@/components/map/ApproxCircleMap";
import { Money } from "@/components/Money";
import { QuotePreview } from "@/components/room/QuotePreview";
import { getPublicRoom } from "@/modules/search/room-detail";

type Props = PageProps<"/[locale]/rooms/[roomId]">;

export default function RoomPage({ params, searchParams }: Props) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <Suspense fallback={null}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// DB는 요청 시점에만 읽는다. 없거나 게시되지 않은 방은 404.
async function Content({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  await connection();
  const { locale, roomId } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("room");
  const ta = await getTranslations("admin.roomTypes");
  const room = await getPublicRoom(roomId);
  if (!room) notFound();

  return (
    <article className="grid gap-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">{room.title}</h1>
        <p className="text-muted-foreground">
          {room.roomName} · {room.district} · {ta(room.roomType)} · {t("capacity", { count: room.capacity })}
        </p>
        <p>
          <Money krw={room.monthlyRent} /> {t("perMonth")} · {t("deposit")} <Money krw={room.deposit} />
        </p>
      </header>
      {room.photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {room.photos.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element -- 호스트가 올린 임의 원격 이미지
            <img key={src} src={src} alt={room.title} className="h-48 rounded" />
          ))}
        </div>
      )}
      <p className="whitespace-pre-line">{room.description}</p>
      {room.amenities.length > 0 && (
        <section>
          <h2 className="font-semibold">{t("amenities")}</h2>
          <p className="text-sm">{room.amenities.join(", ")}</p>
        </section>
      )}
      {room.options.length > 0 && (
        <section>
          <h2 className="font-semibold">{t("options")}</h2>
          <p className="text-sm">{room.options
              .map((o) => (t.has(`optionLabels.${o}`) ? t(`optionLabels.${o}`) : o))
              .join(", ")}</p>
        </section>
      )}
      {room.houseRules && (
        <section>
          <h2 className="font-semibold">{t("houseRules")}</h2>
          <p className="whitespace-pre-line text-sm">{room.houseRules}</p>
        </section>
      )}
      <section className="grid gap-2">
        <h2 className="font-semibold">{t("approximateLocation")}</h2>
        <ApproxCircleMap lat={room.approxLat} lng={room.approxLng} />
      </section>
      <QuotePreview
        roomId={room.roomId}
        defaultCheckIn={first(sp.checkIn)}
        defaultCheckOut={first(sp.checkOut)}
      />
    </article>
  );
}
