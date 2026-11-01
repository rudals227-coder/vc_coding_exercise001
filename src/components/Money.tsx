import { useLocale } from "next-intl";

/** 금액(원, 정수)을 현재 로캘 형식으로 표시한다. 계획 2에서 USD "≈" 표시를 덧붙인다. */
export function Money({ krw }: { krw: number }) {
  const locale = useLocale();
  return (
    <span>{new Intl.NumberFormat(locale, { style: "currency", currency: "KRW" }).format(krw)}</span>
  );
}
