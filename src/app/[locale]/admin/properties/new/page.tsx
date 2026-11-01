import { getTranslations, setRequestLocale } from "next-intl/server";
import { PropertyForm } from "@/components/admin/PropertyForm";

export default async function NewPropertyPage({
  params,
}: PageProps<"/[locale]/admin/properties/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">{t("newProperty")}</h1>
      <PropertyForm />
    </div>
  );
}
