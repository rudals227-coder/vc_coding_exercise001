import { googleGeocoder, type Geocoder } from "./geocode";

// E2E 전용 가짜 지오코더: 고정 좌표를 돌려주고 "__notfound__"만 실패시킨다.
const fakeGeocoder: Geocoder = async (address) =>
  address.trim() === "__notfound__" ? null : { lat: 37.5563, lng: 126.9236 };

export function getGeocoder(): Geocoder {
  return process.env.E2E_FAKE_GEOCODER === "1" && process.env.NODE_ENV !== "production" ? fakeGeocoder : googleGeocoder;
}
