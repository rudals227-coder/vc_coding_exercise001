import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/modules/auth/page-guard";

export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <Guard locale={locale}>{children}</Guard>
    </Suspense>
  );
}

// 세션은 요청 시점에만 읽는다(빌드·프리렌더 중에는 읽지 않음). 권한이 없으면 로그인 페이지로 보낸다.
async function Guard({ locale, children }: { locale: string; children: ReactNode }) {
  await connection();
  await requirePageRole(locale, "HOST", "ADMIN");
  return <main className="mx-auto w-full max-w-3xl flex-1 p-6">{children}</main>;
}
