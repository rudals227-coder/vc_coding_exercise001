import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { db } from "@/lib/db";
import { hasRole } from "@/modules/auth/roles";
import { requirePageRole } from "@/modules/auth/page-guard";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { RoomForm } from "@/components/admin/RoomForm";
import { StatusControl } from "@/components/admin/StatusControl";

export default function PropertyPage({ params }: PageProps<"/[locale]/admin/properties/[id]">) {
  return (
    <Suspense fallback={null}>
      <Content params={params} />
    </Suspense>
  );
}

// 세션·DB는 요청 시점에만 읽는다.
async function Content({ params }: { params: PageProps<"/[locale]/admin/properties/[id]">["params"] }) {
  await connection();
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const user = await requirePageRole(locale, "HOST", "ADMIN");
  const property = await db.property.findUnique({
    where: { id },
    include: { rooms: { orderBy: { createdAt: "asc" } } },
  });
  // 남의 숙소는 존재 여부도 드러내지 않는다.
  if (!property || (!hasRole(user, "ADMIN") && property.hostId !== user.id)) notFound();

  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <Link href="/admin/properties" className="text-sm underline">
          {t("back")}
        </Link>
        <h1 className="text-2xl font-semibold">{property.title}</h1>
        <div data-testid="property-status">
          <StatusControl kind="property" id={property.id} status={property.status} />
        </div>
      </div>

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">{t("rooms")}</h2>
        {property.rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noRooms")}</p>
        ) : (
          <ul className="grid gap-2">
            {property.rooms.map((r) => (
              <li
                key={r.id}
                data-testid="room-row"
                className="flex flex-wrap items-center justify-between gap-2 rounded border p-3"
              >
                <div>
                  <Link href={`/admin/rooms/${r.id}`} className="font-medium underline">
                    {r.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {t(`roomTypes.${r.roomType}`)} · {r.monthlyRent.toLocaleString("en-US")} /{" "}
                    {r.deposit.toLocaleString("en-US")}
                  </p>
                </div>
                <StatusControl kind="room" id={r.id} status={r.status} />
              </li>
            ))}
          </ul>
        )}
        <h3 className="font-medium">{t("addRoom")}</h3>
        <RoomForm propertyId={property.id} />
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">{t("editProperty")}</h2>
        <PropertyForm
          propertyId={property.id}
          defaults={{
            title: property.title,
            description: property.description,
            address: property.address,
            addressDetail: property.addressDetail,
            district: property.district,
            amenities: property.amenities,
            houseRules: property.houseRules,
            // 소유자/관리자에게만 보이는 정확한 위치(이 페이지는 권한 확인 후에만 렌더된다).
            lat: property.lat,
            lng: property.lng,
          }}
        />
      </section>
    </div>
  );
}
