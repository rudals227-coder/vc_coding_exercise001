import { Suspense } from "react";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ALL_ERROR_CODES, type ErrorCode } from "@/lib/errors";
import { SearchMap } from "@/components/map/SearchMap";
import { Filters } from "@/components/search/Filters";
import { ResultsView } from "@/components/search/ResultsView";
import { RoomCard } from "@/components/search/RoomCard";
import { searchQuery } from "@/modules/search/schemas";
import { mapMarkers, PAGE_SIZE, searchRooms } from "@/modules/search/service";

type Props = PageProps<"/[locale]">;

export default function SearchPage({ params, searchParams }: Props) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 p-6">
      <Suspense fallback={null}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const toErrorCode = (m: string): ErrorCode =>
  (ALL_ERROR_CODES as readonly string[]).includes(m) ? (m as ErrorCode) : "VALIDATION_FAILED";

// 검색 조건·DB는 요청 시점에만 읽는다(프리렌더 중에는 읽지 않음).
async function Content({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = await searchParams;
  const t = await getTranslations("search");
  const te = await getTranslations("errors");

  const parsed = searchQuery.safeParse(raw);
  const errors = parsed.success
    ? []
    : [...new Set(parsed.error.issues.map((i) => toErrorCode(i.message)))].map((c) => te(c));
  const [result, markers] = parsed.success
    ? await Promise.all([searchRooms(parsed.data), mapMarkers(parsed.data)])
    : [{ items: [], total: 0 }, []];
  const values = parsed.success ? parsed.data : raw;
  const page = parsed.success ? parsed.data.page : 1;
  const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(raw)) {
      if (k === "page" || v === undefined) continue;
      for (const item of Array.isArray(v) ? v : [v]) qs.append(k, item);
    }
    qs.set("page", String(p));
    return `/?${qs}`;
  };

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <Filters values={values} errors={errors} />
      {parsed.success && <p className="text-sm text-muted-foreground">{t("results", { count: result.total })}</p>}
      <ResultsView
        list={
          result.items.length === 0 ? (
            <p className="text-muted-foreground">{t("noResults")}</p>
          ) : (
            <div className="grid gap-3">
              <ul className="grid gap-3">
                {result.items.map((r) => (
                  <RoomCard
                    key={r.roomId}
                    room={r}
                    stay={parsed.success ? { checkIn: parsed.data.checkIn, checkOut: parsed.data.checkOut } : undefined}
                  />
                ))}
              </ul>
              {lastPage > 1 && (
                <nav className="flex justify-between text-sm">
                  {page > 1 ? <Link href={pageHref(page - 1)}>{t("previous")}</Link> : <span />}
                  {page < lastPage && <Link href={pageHref(page + 1)}>{t("next")}</Link>}
                </nav>
              )}
            </div>
          )
        }
        map={<SearchMap markers={markers} />}
      />
    </div>
  );
}
