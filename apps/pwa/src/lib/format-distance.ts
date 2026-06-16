// Shared distance formatter so PlaceCard and DistanceChip never drift.
// Sub-kilometre distances render in metres ("200 m"); 1 km and above render
// with one decimal ("5.2 km"). Extracted from the original inline formatter
// in place-card.tsx.
export function formatDistanceKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
