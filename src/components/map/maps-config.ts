// 지도 컴포넌트 공용: NEXT_PUBLIC_ 값은 클라이언트 번들에 인라인되므로 서버·클라이언트 모두에서 쓸 수 있다.
export function getMapsConfig(): { apiKey: string; mapId: string } | null {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!apiKey) return null;
  return { apiKey, mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID" };
}

export function isMapsConfigured(): boolean {
  return getMapsConfig() !== null;
}

// 서울 시청 부근
export const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 };
