import { Suspense } from "react";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { requirePageRole } from "@/modules/auth/page-guard";

export default function NewPropertyPage({
  params,
}: PageProps<"/[locale]/admin/properties/new">) {
  return (
    <Suspense fallback={null}>
      <Content params={params} />
    </Suspense>
  );
}

// 클라이언트 내비게이션에서는 레이아웃 가드가 다시 실행되지 않으므로 페이지에서도 확인한다.
async function Content({
  params,
}: {
  params: PageProps<"/[locale]/admin/properties/new">["params"];
}) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageRole(locale, "HOST", "ADMIN");
  const t = await getTranslations("admin");
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">{t("newProperty")}</h1>
      <PropertyForm />
    </div>
  );
}
