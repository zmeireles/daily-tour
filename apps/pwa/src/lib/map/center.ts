export const SAO_MIGUEL_CENTER = { lng: -25.67, lat: 37.74, zoom: 10 } as const;

export function clampZoom(z: number): number {
  return Math.min(18, Math.max(6, z));
}
