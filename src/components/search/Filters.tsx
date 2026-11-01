import { useTranslations } from "next-intl";
import { SEOUL_DISTRICTS } from "@/modules/listings/schemas";
type Values = Record<string, string | number | string[] | undefined>;

const ROOM_TYPES = ["PRIVATE", "SHARED", "STUDIO"] as const;
const SORTS = [
  ["newest", "sortNewest"],
  ["price_asc", "sortPriceAsc"],
  ["price_desc", "sortPriceDesc"],
] as const;

const field = "grid gap-1 text-sm";
const control = "rounded border bg-transparent px-2 py-1";

/** GET 폼: 조건은 URL 쿼리스트링에 담겨 공유할 수 있다. 오류는 서버가 계산해 넘긴다. */
export function Filters({ values, errors }: { values: Values; errors: string[] }) {
  const t = useTranslations("search");
  const tt = useTranslations("admin.roomTypes");
  return (
    <form method="get" className="grid gap-3" data-testid="filters">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className={field}>
          {t("district")}
          <select name="district" defaultValue={values.district ?? ""} className={control}>
            <option value="">{t("anyDistrict")}</option>
            {SEOUL_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d[0].toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className={field}>
          {t("checkIn")}
          <input type="date" name="checkIn" defaultValue={values.checkIn ?? ""} className={control} />
        </label>
        <label className={field}>
          {t("checkOut")}
          <input type="date" name="checkOut" defaultValue={values.checkOut ?? ""} className={control} />
        </label>
        <label className={field}>
          {t("roomType")}
          <select name="roomType" defaultValue={values.roomType ?? ""} className={control}>
            <option value="">{t("anyType")}</option>
            {ROOM_TYPES.map((r) => (
              <option key={r} value={r}>
                {tt(r)}
              </option>
            ))}
          </select>
        </label>
        <label className={field}>
          {t("minRent")}
          <input type="number" min={0} name="minRent" defaultValue={values.minRent ?? ""} className={control} />
        </label>
        <label className={field}>
          {t("maxRent")}
          <input type="number" min={0} name="maxRent" defaultValue={values.maxRent ?? ""} className={control} />
        </label>
        <label className={field}>
          {t("sort")}
          <select name="sort" defaultValue={values.sort ?? "newest"} className={control}>
            {SORTS.map(([v, k]) => (
              <option key={v} value={v}>
                {t(k)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" className="rounded bg-foreground px-4 py-1.5 text-sm text-background">
            {t("submit")}
          </button>
        </div>
      </div>
      {errors.length > 0 && (
        <ul role="alert" data-testid="filter-error" className="text-sm text-red-600">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
