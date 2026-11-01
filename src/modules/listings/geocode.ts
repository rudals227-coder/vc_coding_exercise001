export type Geocoder = (address: string) => Promise<{ lat: number; lng: number } | null>;

/** Google Geocoding API. Returns null when the key is missing or nothing is found. */
export const googleGeocoder: Geocoder = async (address) => {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("region", "kr");
  url.searchParams.set("key", key);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      status?: string;
      results?: { geometry?: { location?: { lat: number; lng: number } } }[];
    };
    if (body.status !== "OK") return null;
    const loc = body.results?.[0]?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng } : null;
  } catch {
    return null;
  }
};
