import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock catalog-client at the boundary — the unit under test is the mapping, not catalog-svc.
vi.mock("../lib/catalog-client.js", () => ({
  CatalogError: class CatalogError extends Error {
    constructor(
      public readonly status: number,
      message: string,
    ) {
      super(message);
      this.name = "CatalogError";
    }
  },
  fetchPlaceHydrated: vi.fn(),
}));

const catalogClient = await import("../lib/catalog-client.js");
const fetchMock = catalogClient.fetchPlaceHydrated as ReturnType<typeof vi.fn>;
const { withStops } = await import("../lib/tour-plan-view.js");

const PLACE_A = "c0000001-0000-4000-a000-000000000017";
const PLACE_B = "c0000002-0000-4000-a000-000000000018";

function hydrated(
  id: string,
  names: Record<string, string>,
  media: Array<{ kind: string; url: string }> = [],
  geom: { geom_lat: number; geom_lng: number } = { geom_lat: 37.74, geom_lng: -25.68 },
) {
  return { id, name: names, media, ...geom };
}

function step(overrides: Record<string, unknown> = {}) {
  return {
    slot: "morning",
    place_id: PLACE_A,
    start: "2026-05-31T09:30:00Z",
    end: "2026-05-31T11:00:00Z",
    rationale: "A great start to the day.",
    travel_to_minutes: 10,
    locked: false,
    ...overrides,
  };
}

describe("tour-plan-view withStops", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("maps a step to a stop: name, HH:MM, description, duration, activity kind", async () => {
    fetchMock.mockResolvedValueOnce(
      hydrated(PLACE_A, { en: "Sete Cidades", "pt-PT": "Sete Cidades" }),
    );

    const plan = { id: "p1", status: "ready", plan_payload: { steps: [step()] } };
    const out = await withStops(plan);
    const stops = (out.plan_payload as { stops: unknown[] }).stops;

    expect(stops).toHaveLength(1);
    expect(stops[0]).toEqual({
      id: PLACE_A,
      time: "09:30",
      kind: "activity",
      name: "Sete Cidades",
      description: "A great start to the day.",
      hero_image_url: null,
      geom_lat: 37.74,
      geom_lng: -25.68,
      duration_min: 90,
      travel_to_minutes: 10,
    });
  });

  it("surfaces the first image media url as hero_image_url", async () => {
    fetchMock.mockResolvedValueOnce(
      hydrated(PLACE_A, { en: "Terra Nostra" }, [
        { kind: "video", url: "https://example.com/clip.mp4" },
        { kind: "image", url: "https://example.com/hero.jpg" },
        { kind: "image", url: "https://example.com/second.jpg" },
      ]),
    );

    const plan = { id: "p1", status: "ready", plan_payload: { steps: [step()] } };
    const out = await withStops(plan);
    const stops = (out.plan_payload as { stops: { hero_image_url: string | null }[] }).stops;

    expect(stops[0]!.hero_image_url).toBe("https://example.com/hero.jpg");
  });

  it("sets hero_image_url to null when the place carries no image media", async () => {
    fetchMock.mockResolvedValueOnce(
      hydrated(PLACE_A, { en: "Place" }, [{ kind: "video", url: "https://example.com/clip.mp4" }]),
    );

    const plan = { id: "p1", status: "ready", plan_payload: { steps: [step()] } };
    const out = await withStops(plan);
    const stops = (out.plan_payload as { stops: { hero_image_url: string | null }[] }).stops;

    expect(stops[0]!.hero_image_url).toBeNull();
  });

  it("carries travel_to_minutes when positive; omits it when absent or zero", async () => {
    fetchMock
      .mockResolvedValueOnce(hydrated(PLACE_A, { en: "First" }))
      .mockResolvedValueOnce(hydrated(PLACE_B, { en: "Second" }))
      .mockResolvedValueOnce(hydrated(PLACE_A, { en: "Third" }));

    const plan = {
      id: "p1",
      status: "ready",
      plan_payload: {
        steps: [
          step({ place_id: PLACE_A, travel_to_minutes: undefined }), // first stop — no travel
          step({ place_id: PLACE_B, travel_to_minutes: 14 }),
          step({ place_id: PLACE_A, travel_to_minutes: 0 }), // zero — omitted
        ],
      },
    };
    const out = await withStops(plan);
    const stops = (out.plan_payload as { stops: Record<string, unknown>[] }).stops;

    expect(stops[0]).not.toHaveProperty("travel_to_minutes");
    expect(stops[1]!.travel_to_minutes).toBe(14);
    expect(stops[2]).not.toHaveProperty("travel_to_minutes");
  });

  it.each([
    ["breakfast", "meal"],
    ["lunch", "meal"],
    ["dinner", "meal"],
    ["morning", "activity"],
    ["afternoon", "activity"],
    ["evening", "activity"],
  ])("derives kind from slot: %s -> %s", async (slot, expectedKind) => {
    fetchMock.mockResolvedValueOnce(hydrated(PLACE_A, { en: "Place" }));

    const plan = { id: "p1", status: "ready", plan_payload: { steps: [step({ slot })] } };
    const out = await withStops(plan);
    const stops = (out.plan_payload as { stops: { kind: string }[] }).stops;

    expect(stops[0]!.kind).toBe(expectedKind);
  });

  it("renders wall-clock HH:MM from the Z-offset ISO string without tz shift", async () => {
    fetchMock.mockResolvedValueOnce(hydrated(PLACE_A, { en: "Place" }));

    const plan = {
      id: "p1",
      status: "ready",
      plan_payload: { steps: [step({ start: "2026-05-31T23:05:00Z" })] },
    };
    const out = await withStops(plan);
    const stops = (out.plan_payload as { stops: { time: string }[] }).stops;

    expect(stops[0]!.time).toBe("23:05");
  });

  it("with no locale, prefers en name and falls back to first available", async () => {
    fetchMock.mockResolvedValueOnce(hydrated(PLACE_A, { "pt-PT": "Lagoa do Fogo" }));

    const plan = { id: "p1", status: "ready", plan_payload: { steps: [step()] } };
    const out = await withStops(plan);
    const stops = (out.plan_payload as { stops: { name: string }[] }).stops;

    // No pt-PT-preferring locale passed → defaults to en, then first available.
    expect(stops[0]!.name).toBe("Lagoa do Fogo");
  });

  it("prefers the requested locale's name over en", async () => {
    fetchMock.mockResolvedValueOnce(
      hydrated(PLACE_A, { en: "Fire Lagoon", "pt-PT": "Lagoa do Fogo" }),
    );

    const plan = { id: "p1", status: "ready", plan_payload: { steps: [step()] } };
    const out = await withStops(plan, "pt-PT");
    const stops = (out.plan_payload as { stops: { name: string }[] }).stops;

    expect(stops[0]!.name).toBe("Lagoa do Fogo");
  });

  it("falls back to en when the requested locale name is absent", async () => {
    fetchMock.mockResolvedValueOnce(hydrated(PLACE_A, { en: "Fire Lagoon" }));

    const plan = { id: "p1", status: "ready", plan_payload: { steps: [step()] } };
    const out = await withStops(plan, "pt-PT");
    const stops = (out.plan_payload as { stops: { name: string }[] }).stops;

    expect(stops[0]!.name).toBe("Fire Lagoon");
  });

  it("emits geom_lat/geom_lng from the catalog place; null when the place is missing", async () => {
    fetchMock
      .mockResolvedValueOnce(
        hydrated(PLACE_A, { en: "Sete Cidades" }, [], { geom_lat: 37.86, geom_lng: -25.79 }),
      )
      .mockRejectedValueOnce(new Error("404"));

    const plan = {
      id: "p1",
      status: "ready",
      plan_payload: { steps: [step({ place_id: PLACE_A }), step({ place_id: PLACE_B })] },
    };
    const out = await withStops(plan);
    const stops = (
      out.plan_payload as { stops: { geom_lat: number | null; geom_lng: number | null }[] }
    ).stops;

    expect(stops[0]!.geom_lat).toBe(37.86);
    expect(stops[0]!.geom_lng).toBe(-25.79);
    expect(stops[1]!.geom_lat).toBeNull();
    expect(stops[1]!.geom_lng).toBeNull();
  });

  it("falls back to raw place_id and null hero when the place is missing from catalog", async () => {
    fetchMock.mockRejectedValueOnce(new Error("404"));

    const plan = { id: "p1", status: "ready", plan_payload: { steps: [step()] } };
    const out = await withStops(plan);
    const stops = (out.plan_payload as { stops: { name: string; hero_image_url: string | null }[] })
      .stops;

    expect(stops[0]!.name).toBe(PLACE_A);
    expect(stops[0]!.hero_image_url).toBeNull();
  });

  it("omits duration_min when start/end do not parse cleanly", async () => {
    fetchMock.mockResolvedValueOnce(hydrated(PLACE_A, { en: "Place" }));

    const plan = {
      id: "p1",
      status: "ready",
      plan_payload: { steps: [step({ start: "not-a-date", end: "also-bad" })] },
    };
    const out = await withStops(plan);
    const stops = (out.plan_payload as { stops: Record<string, unknown>[] }).stops;

    expect(stops[0]).not.toHaveProperty("duration_min");
    expect(stops[0]!.time).toBe("");
  });

  it("suffixes ids with #idx only for duplicate place_ids", async () => {
    fetchMock
      .mockResolvedValueOnce(hydrated(PLACE_A, { en: "A" }))
      .mockResolvedValueOnce(hydrated(PLACE_B, { en: "B" }))
      .mockResolvedValueOnce(hydrated(PLACE_A, { en: "A again" }));

    const plan = {
      id: "p1",
      status: "ready",
      plan_payload: {
        steps: [
          step({ place_id: PLACE_A }),
          step({ place_id: PLACE_B }),
          step({ place_id: PLACE_A }),
        ],
      },
    };
    const out = await withStops(plan);
    const ids = (out.plan_payload as { stops: { id: string }[] }).stops.map((s) => s.id);

    expect(ids).toEqual([`${PLACE_A}#0`, PLACE_B, `${PLACE_A}#2`]);
  });

  it("preserves the original steps array (additive)", async () => {
    fetchMock.mockResolvedValueOnce(hydrated(PLACE_A, { en: "Place" }));

    const plan = { id: "p1", status: "ready", plan_payload: { steps: [step()] } };
    const out = await withStops(plan);
    const payload = out.plan_payload as { steps: unknown[]; stops: unknown[] };

    expect(payload.steps).toHaveLength(1);
    expect(payload.stops).toHaveLength(1);
  });

  it("returns empty stops when steps is absent", async () => {
    const plan = { id: "p1", status: "ready", plan_payload: { foo: "bar" } };
    const out = await withStops(plan);
    const payload = out.plan_payload as { stops: unknown[]; foo: string };

    expect(payload.stops).toEqual([]);
    expect(payload.foo).toBe("bar");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns empty stops when steps is empty", async () => {
    const plan = { id: "p1", status: "ready", plan_payload: { steps: [] } };
    const out = await withStops(plan);

    expect((out.plan_payload as { stops: unknown[] }).stops).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the plan unchanged when plan_payload is null", async () => {
    const plan = { id: "p1", status: "ready", plan_payload: null };
    const out = await withStops(plan);

    expect(out.plan_payload).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
