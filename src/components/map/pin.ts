export type Pin = { lat: number; lng: number };

function parseCoord(raw: string, min: number, max: number): number | null {
  // Number("")은 0이므로 빈 문자열을 먼저 걸러낸다.
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/** 입력 문자열이 둘 다 유효한 좌표일 때만 핀을 돌려준다(한쪽만 있으면 null). */
export function parsePin(lat: string, lng: string): Pin | null {
  const la = parseCoord(lat, -90, 90);
  const ln = parseCoord(lng, -180, 180);
  return la === null || ln === null ? null : { lat: la, lng: ln };
}

/**
 * 폼 제출용 핀 직렬화. 사용자가 핀을 직접 바꾼 경우(dirty)에만 보낸다.
 * 보내지 않으면 서버가 주소가 바뀐 경우 다시 지오코딩한다.
 */
export function serializePin(state: { lat: string; lng: string; dirty: boolean }): Pin | undefined {
  if (!state.dirty) return undefined;
  return parsePin(state.lat, state.lng) ?? undefined;
}
