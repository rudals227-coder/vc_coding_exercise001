import { Suspense } from "react";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { enabledAuthMethods, signIn } from "@/auth";

export default async function SignInPage({ params }: PageProps<"/[locale]/sign-in">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense>
      <SignInForms locale={locale} />
    </Suspense>
  );
}

// 설정된 로그인 수단은 런타임 환경변수에 의존하므로 빌드 시점이 아니라 요청 시점에 렌더링한다.
async function SignInForms({ locale }: { locale: string }) {
  await connection();
  const t = await getTranslations("common");
  const methods = enabledAuthMethods();
  const redirectTo = `/${locale}`;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">{t("signInTitle")}</h1>

      {!methods.email && !methods.google && (
        <p role="status" className="text-zinc-600">
          {t("signInUnavailable")}
        </p>
      )}

      {methods.email && (
        <form
          className="flex flex-col gap-2"
          action={async (formData: FormData) => {
            "use server";
            await signIn("resend", {
              email: String(formData.get("email") ?? ""),
              redirectTo,
            });
          }}
        >
          <label htmlFor="email" className="text-sm">
            {t("signInEmailLabel")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="rounded border px-3 py-2"
          />
          <button type="submit" className="rounded bg-black px-3 py-2 text-white">
            {t("signInEmailButton")}
          </button>
        </form>
      )}

      {methods.google && (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo });
          }}
        >
          <button type="submit" className="w-full rounded border px-3 py-2">
            {t("signInGoogle")}
          </button>
        </form>
      )}
    </main>
  );
}
