import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { db } from "@/lib/db";
import { fromDbDate } from "@/lib/date-only";
import { hasRole, requireRole } from "@/modules/auth/roles";
import { PhotoUploader } from "@/components/admin/PhotoUploader";
import { RoomBlocks } from "@/components/admin/RoomBlocks";
import { RoomForm } from "@/components/admin/RoomForm";
import { StatusControl } from "@/components/admin/StatusControl";

export default function RoomPage({ params }: PageProps<"/[locale]/admin/rooms/[id]">) {
  return (
    <Suspense fallback={null}>
      <Content params={params} />
    </Suspense>
  );
}

// 세션·DB는 요청 시점에만 읽는다.
async function Content({ params }: { params: PageProps<"/[locale]/admin/rooms/[id]">["params"] }) {
  await connection();
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const user = await requireRole("HOST", "ADMIN");
  const room = await db.room.findUnique({
    where: { id },
    include: { property: true, blocks: { orderBy: { startDate: "asc" } } },
  });
  if (!room || (!hasRole(user, "ADMIN") && room.property.hostId !== user.id)) notFound();

  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <Link href={`/admin/properties/${room.propertyId}`} className="text-sm underline">
          {t("back")}
        </Link>
        <h1 className="text-2xl font-semibold">{room.name}</h1>
        <StatusControl kind="room" id={room.id} status={room.status} />
      </div>

      <RoomForm
        roomId={room.id}
        defaults={{
          name: room.name,
          roomType: room.roomType,
          capacity: room.capacity,
          monthlyRent: room.monthlyRent,
          deposit: room.deposit,
          options: room.options,
        }}
      />
      <PhotoUploader roomId={room.id} photos={room.photos} />
      <RoomBlocks
        roomId={room.id}
        blocks={room.blocks.map((b) => ({
          id: b.id,
          startDate: fromDbDate(b.startDate),
          endDate: fromDbDate(b.endDate),
          reason: b.reason,
        }))}
      />
    </div>
  );
}
