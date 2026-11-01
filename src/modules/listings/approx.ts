const R = 6_371_000; // earth radius (m)
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Moves the point 100–300 m in a random direction (spherical destination point). */
export function approximate(
  lat: number,
  lng: number,
  rand: () => number = Math.random,
): { lat: number; lng: number } {
  const dist = 100 + rand() * 200;
  const bearing = rand() * 2 * Math.PI;
  const ang = dist / R;
  const phi1 = toRad(lat);
  const lam1 = toRad(lng);
  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(ang) + Math.cos(phi1) * Math.sin(ang) * Math.cos(bearing),
  );
  const lam2 =
    lam1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(ang) * Math.cos(phi1),
      Math.cos(ang) - Math.sin(phi1) * Math.sin(phi2),
    );
  return { lat: toDeg(phi2), lng: toDeg(lam2) };
}
