import { describe, it, expect } from "vitest";
import { appleMapsHref, geoHref, telHref, waMeHref } from "@/lib/maps/deep-links";

describe("deep-links", () => {
  it("appleMapsHref: produces Apple Maps HTTPS URL", () => {
    const href = appleMapsHref(37.7749, -122.4194);
    expect(href).toBe("https://maps.apple.com/?q=37.7749,-122.4194&ll=37.7749,-122.4194");
  });

  it("geoHref: encodes place name in geo URI", () => {
    const href = geoHref(37.7749, -122.4194, "Sete Cidades");
    expect(href).toContain("geo:37.7749,-122.4194");
    expect(href).toContain(encodeURIComponent("Sete Cidades"));
  });

  it("telHref: produces tel: URI", () => {
    expect(telHref("+351912345678")).toBe("tel:+351912345678");
  });

  it("waMeHref: strips non-digits and encodes text once", () => {
    const href = waMeHref("+351 912 345 678", "Hi! I'm at Sete Cidades");
    expect(href.startsWith("https://wa.me/351912345678?text=")).toBe(true);
    const textParam = new URL(href).searchParams.get("text");
    expect(textParam).toBe("Hi! I'm at Sete Cidades");
  });
});
