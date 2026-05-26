import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// loadConfig() validates process.env; CATALOG_SVC_URL has a default, so only the
// min-32-char JWT_SIGNING_KEY needs to be present for the schema to parse.
process.env.JWT_SIGNING_KEY = "test-signing-key-do-not-use-min-32-chars-long";

const { fetchPlacesByAction } = await import("../lib/catalog-client.js");
const { resetConfigCache } = await import("../config.js");

describe("fetchPlacesByAction — hero_image_url mapping", () => {
  beforeEach(() => {
    resetConfigCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards catalog-svc hero_image_url into the PlaceCard (non-null and null)", async () => {
    const base = {
      name: { en: "Ocean View Café" },
      description: { en: "A café with a view" },
      geom_lat: 37.74,
      geom_lng: -25.66,
      address: "Ponta Delgada",
      is_hosts_pick: true,
      status: "published",
      created_at: "2026-01-01T00:00:00.000Z",
      wishes: ["sea-view"],
    };
    const items = [
      {
        ...base,
        id: "aabbccdd-0000-4000-8000-000000000001",
        hero_image_url: "https://example.com/first.jpg",
      },
      { ...base, id: "aabbccdd-0000-4000-8000-000000000002", hero_image_url: null },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ items }), { status: 200 }))),
    );

    const cards = await fetchPlacesByAction("eat");
    expect(cards).toHaveLength(2);
    expect(cards[0]!.hero_image_url).toBe("https://example.com/first.jpg");
    expect(cards[1]!.hero_image_url).toBeNull();
  });
});
