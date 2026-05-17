export function appleMapsHref(lat: number, lng: number): string {
  return `https://maps.apple.com/?q=${lat},${lng}&ll=${lat},${lng}`;
}

export function geoHref(lat: number, lng: number, name: string): string {
  return `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})`;
}

export function telHref(phone: string): string {
  return `tel:${phone}`;
}

export function waMeHref(phone: string, text: string): string {
  const normalized = phone.replace(/\D/g, "");
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}
