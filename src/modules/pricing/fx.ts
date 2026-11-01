/** KRW -> USD cents with markup (bps), rounded up. Integer math on rate*100. */
export function toUsdCents(krw: number, krwPerUsd: number, markupBps: number): number {
  const rateCenti = Math.round(krwPerUsd * 100);
  return Math.ceil((krw * (10000 + markupBps)) / rateCenti);
}
