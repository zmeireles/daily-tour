import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { LocationPicker } from "@/features/backoffice/location-picker";
import { useOwnerSessionStore } from "@/store/owner-session";
import enAdmin from "@/locales/en/admin.json";
import ptAdmin from "@/locales/pt-PT/admin.json";
import esAdmin from "@/locales/es/admin.json";

// maplibre-gl is dynamically imported by the picker only when the Sheet opens.
// Mock it with a controllable stub: flyTo records its target and feeds getCenter,
// and `on` captures the moveend handler so tests can drive the reverse-geocode.
const { MockMapConstructor } = vi.hoisted(() => ({ MockMapConstructor: vi.fn() }));

vi.mock("maplibre-gl", () => ({
  default: { Map: MockMapConstructor, addProtocol: vi.fn() },
}));

let mapState: {
  center: { lng: number; lat: number };
  handlers: Record<string, () => void>;
  moving: boolean;
};
let lastFlyTo: { center: [number, number]; zoom: number } | null;

function makeMockMap() {
  return {
    on: (ev: string, cb: () => void) => {
      mapState.handlers[ev] = cb;
    },
    off: vi.fn(),
    once: (ev: string, cb: () => void) => {
      if (ev === "load") cb();
    },
    flyTo: (arg: { center: [number, number]; zoom: number }) => {
      lastFlyTo = arg;
      mapState.center = { lng: arg.center[0], lat: arg.center[1] };
    },
    // Confirm reads getCenter() only when the camera is idle; tests flip
    // `mapState.moving` to simulate a mid-flight flyTo.
    isMoving: () => mapState.moving,
    resize: vi.fn(),
    remove: vi.fn(),
    getCenter: () => ({ lng: mapState.center.lng, lat: mapState.center.lat }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mapState = { center: { lng: -25.67, lat: 37.75 }, handlers: {}, moving: false };
  lastFlyTo = null;
  MockMapConstructor.mockImplementation((opts: { center: [number, number] }) => {
    mapState.center = { lng: opts.center[0], lat: opts.center[1] };
    return makeMockMap();
  });
  useOwnerSessionStore.setState({ jwt: "test-jwt", profile: null });
  global.fetch = vi.fn();
});

const fetchMock = () => global.fetch as unknown as ReturnType<typeof vi.fn>;

function jsonOk(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}

async function openPicker() {
  fireEvent.click(screen.getByRole("button", { name: /set location on map/i }));
  await waitFor(() => expect(MockMapConstructor).toHaveBeenCalled());
}

describe("LocationPicker", () => {
  it("shows the current coordinates on the trigger before opening", () => {
    render(<LocationPicker lat={37.77} lng={-25.31} onConfirm={vi.fn()} />);
    expect(screen.getByRole("button", { name: /set location on map/i })).toHaveTextContent(
      "37.77000, -25.31000",
    );
    // Map is only instantiated once the Sheet opens.
    expect(MockMapConstructor).not.toHaveBeenCalled();
  });

  it("debounces the address search, hits the proxy once, and renders results", async () => {
    fetchMock().mockResolvedValue(
      jsonOk({
        results: [
          { label: "Ponta Delgada, Azores", lat: 37.74, lng: -25.66 },
          { label: "Ponta Garça", lat: 37.72, lng: -25.38 },
        ],
      }),
    );

    render(<LocationPicker lat={37.75} lng={-25.67} onConfirm={vi.fn()} />);
    await openPicker();

    const combo = screen.getByRole("combobox");
    // Three keystrokes in quick succession must collapse to a single request.
    fireEvent.change(combo, { target: { value: "Pon" } });
    fireEvent.change(combo, { target: { value: "Ponta" } });
    fireEvent.change(combo, { target: { value: "Ponta D" } });

    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("Ponta Delgada");

    const geocodeCalls = fetchMock().mock.calls.filter((c) => c[0] === "/v1/admin/geocode");
    expect(geocodeCalls).toHaveLength(1);
    expect(geocodeCalls[0]?.[1]).toMatchObject({ method: "POST" });
    expect(JSON.parse((geocodeCalls[0]?.[1] as { body: string }).body)).toMatchObject({
      query: "Ponta D",
      limit: 10,
    });
  });

  it("flies the map and updates the pin when a result is selected", async () => {
    fetchMock().mockResolvedValue(
      jsonOk({ results: [{ label: "Furnas, São Miguel", lat: 37.77, lng: -25.31 }] }),
    );

    render(<LocationPicker lat={37.75} lng={-25.67} onConfirm={vi.fn()} />);
    await openPicker();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Furnas" } });
    fireEvent.click(await screen.findByRole("option", { name: /furnas/i }));

    expect(lastFlyTo).toEqual({ center: [-25.31, 37.77], zoom: 15 });
    expect(screen.getByTestId("location-picker-coords")).toHaveTextContent("37.77000, -25.31000");
    // Selecting closes the results list.
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("confirms with the current map-center coordinates and closes", async () => {
    const onConfirm = vi.fn();
    fetchMock().mockResolvedValue(
      jsonOk({ results: [{ label: "Furnas, São Miguel", lat: 37.77, lng: -25.31 }] }),
    );

    render(<LocationPicker lat={37.75} lng={-25.67} onConfirm={onConfirm} />);
    await openPicker();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Furnas" } });
    fireEvent.click(await screen.findByRole("option", { name: /furnas/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm location/i }));

    expect(onConfirm).toHaveBeenCalledWith({ lat: 37.77, lng: -25.31 });
    await waitFor(() => expect(screen.queryByRole("combobox")).not.toBeInTheDocument());
  });

  it("confirms the pin target, not the mid-flight camera centre, during an in-flight flyTo", async () => {
    const onConfirm = vi.fn();
    fetchMock().mockResolvedValue(
      jsonOk({ results: [{ label: "Furnas, São Miguel", lat: 37.77, lng: -25.31 }] }),
    );

    render(<LocationPicker lat={37.75} lng={-25.67} onConfirm={onConfirm} />);
    await openPicker();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Furnas" } });
    fireEvent.click(await screen.findByRole("option", { name: /furnas/i }));

    // Simulate the camera still animating toward the target: getCenter() returns
    // a point along the flight path, NOT the destination.
    mapState.moving = true;
    mapState.center = { lng: -25.5, lat: 37.9 };
    fireEvent.click(screen.getByRole("button", { name: /confirm location/i }));

    // Must save the pin (the target), never the mid-flight camera centre.
    expect(onConfirm).toHaveBeenCalledWith({ lat: 37.77, lng: -25.31 });
    expect(onConfirm).not.toHaveBeenCalledWith({ lat: 37.9, lng: -25.5 });
  });

  it("resets combobox state on reopen — no stale results or spinner over the map", async () => {
    fetchMock().mockResolvedValue(
      jsonOk({ results: [{ label: "Furnas, São Miguel", lat: 37.77, lng: -25.31 }] }),
    );

    render(<LocationPicker lat={37.75} lng={-25.67} onConfirm={vi.fn()} />);
    await openPicker();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Furnas" } });
    await screen.findByRole("option", { name: /furnas/i });

    // Close (confirm) then reopen.
    fireEvent.click(screen.getByRole("button", { name: /confirm location/i }));
    await waitFor(() => expect(screen.queryByRole("combobox")).not.toBeInTheDocument());
    await openPicker();

    // Fresh session: empty query, no leftover results.
    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("degrades gracefully on a 503 (feature disabled) without throwing", async () => {
    const onConfirm = vi.fn();
    fetchMock().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ error: "geocode_unavailable" }),
    });

    render(<LocationPicker lat={37.75} lng={-25.67} onConfirm={onConfirm} />);
    await openPicker();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Ponta" } });

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/unavailable/i));
    expect(screen.queryAllByRole("option")).toHaveLength(0);

    // The picker is still usable: confirm still works (numeric inputs remain the
    // form-side fallback).
    fireEvent.click(screen.getByRole("button", { name: /confirm location/i }));
    expect(onConfirm).toHaveBeenCalledWith({ lat: 37.75, lng: -25.67 });
  });

  it("treats a reverse-geocode failure on moveend as non-fatal", async () => {
    fetchMock().mockRejectedValue(new Error("network down"));

    render(<LocationPicker lat={37.75} lng={-25.67} onConfirm={vi.fn()} />);
    await openPicker();

    // Simulate the host panning the map far enough to trigger a reverse lookup.
    mapState.center = { lng: -25.3, lat: 37.8 };
    expect(mapState.handlers.moveend).toBeTypeOf("function");
    await act(async () => {
      mapState.handlers.moveend();
      await Promise.resolve();
    });

    // No throw; the working pin still tracks the new centre and the UI survives.
    expect(screen.getByTestId("location-picker-coords")).toHaveTextContent("37.80000, -25.30000");
    expect(screen.getByRole("button", { name: /confirm location/i })).toBeInTheDocument();
  });

  it("shows a geolocation-denied message when the browser refuses", async () => {
    const getCurrentPosition = vi.fn(
      (_ok: PositionCallback, err: PositionErrorCallback | undefined) => {
        err?.({ code: 1, message: "denied" } as GeolocationPositionError);
      },
    );
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    render(<LocationPicker lat={37.75} lng={-25.67} onConfirm={vi.fn()} />);
    await openPicker();

    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't get your location/i);
    delete (navigator as { geolocation?: unknown }).geolocation;
  });
});

describe("location i18n parity", () => {
  const keys = (o: { location: Record<string, string> }) => Object.keys(o.location).sort();

  it("exposes identical location.* keys across en, pt-PT and es", () => {
    expect(keys(ptAdmin)).toEqual(keys(enAdmin));
    expect(keys(esAdmin)).toEqual(keys(enAdmin));
  });

  it("resolves pt-PT and es to distinct (non-fallback) strings", () => {
    expect(ptAdmin.location.confirm).not.toBe(enAdmin.location.confirm);
    expect(esAdmin.location.confirm).not.toBe(enAdmin.location.confirm);
  });
});
