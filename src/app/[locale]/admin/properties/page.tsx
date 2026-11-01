import { Suspense } from "react";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { db } from "@/lib/db";
import { hasRole } from "@/modules/auth/roles";
import { requirePageRole } from "@/modules/auth/page-guard";

export default function PropertiesPage({ params }: PageProps<"/[locale]/admin/properties">) {
  return (
    <Suspense fallback={null}>
      <Content params={params} />
    </Suspense>
  );
}

// 세션·DB는 요청 시점에만 읽는다.
async function Content({ params }: { params: PageProps<"/[locale]/admin/properties">["params"] }) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const user = await requirePageRole(locale, "HOST", "ADMIN");
  const properties = await db.property.findMany({
    where: hasRole(user, "ADMIN") ? {} : { hostId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { rooms: true } } },
  });

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("properties")}</h1>
        <Link href="/admin/properties/new" className="rounded border px-3 py-1.5 text-sm">
          {t("newProperty")}
        </Link>
      </div>
      {properties.length === 0 ? (
        <p className="text-muted-foreground">{t("noProperties")}</p>
      ) : (
        <ul className="grid gap-2">
          {properties.map((p) => (
            <li
              key={p.id}
              data-testid="property-row"
              className="flex items-center justify-between rounded border p-3"
            >
              <div>
                <Link href={`/admin/properties/${p.id}`} className="font-medium underline">
                  {p.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {p.district} · {t("rooms")} {p._count.rooms}
                </p>
              </div>
              <span className="rounded bg-muted px-2 py-0.5 text-xs">{t(`status.${p.status}`)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
