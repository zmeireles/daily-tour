import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MapView, type MapViewPin } from "@/components/map-view";

// Hoist mocks so they're available inside vi.mock factory closures
const { addProtocolSpy, MockMapConstructor, MockMarkerConstructor } = vi.hoisted(() => ({
  addProtocolSpy: vi.fn(),
  MockMapConstructor: vi.fn(),
  MockMarkerConstructor: vi.fn(),
}));

vi.mock("maplibre-gl", () => ({
  default: {
    Map: MockMapConstructor,
    Marker: MockMarkerConstructor,
    addProtocol: addProtocolSpy,
  },
}));

// Allow ensurePmtilesProtocol to run without a real Protocol implementation
vi.mock("pmtiles", () => ({
  Protocol: vi.fn(() => ({ tile: vi.fn() })),
}));

// Prevent real React trees inside MapLibre marker elements (jsdom + createRoot = warnings)
vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => ({ render: vi.fn(), unmount: vi.fn() })),
}));

vi.mock("react-dom", () => ({
  flushSync: vi.fn((fn: () => void) => fn()),
}));

// Track Marker instances created across the lifetime of each test
const markerInstances: Array<{
  setLngLat: ReturnType<typeof vi.fn>;
  addTo: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
}> = [];

let mockMapInstance: {
  addControl: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  flyTo: ReturnType<typeof vi.fn>;
  jumpTo: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  markerInstances.length = 0;

  mockMapInstance = {
    addControl: vi.fn(),
    on: vi.fn(),
    flyTo: vi.fn(),
    jumpTo: vi.fn(),
    remove: vi.fn(),
  };
  MockMapConstructor.mockImplementation(() => mockMapInstance);

  MockMarkerConstructor.mockImplementation(() => {
    const inst = {
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    };
    markerInstances.push(inst);
    return inst;
  });
});

const CENTER = { lng: -25.67, lat: 37.74 };

describe("MapView", () => {
  it("mount: calls addProtocol once (idempotent on remount) and creates map with correct center/zoom", () => {
    const { unmount } = render(<MapView center={CENTER} zoom={10} />);

    expect(MockMapConstructor).toHaveBeenCalledWith(
      expect.objectContaining({ center: [-25.67, 37.74], zoom: 10 }),
    );

    // Remount — module-level guard in ensurePmtilesProtocol must prevent double-registration
    unmount();
    render(<MapView center={CENTER} zoom={10} />);

    expect(addProtocolSpy).toHaveBeenCalledOnce();
  });

  it("pins update: removes old markers and adds new ones on re-render", () => {
    const pins1: MapViewPin[] = [{ id: "a", lng: -25.67, lat: 37.74 }];
    const { rerender } = render(<MapView center={CENTER} pins={pins1} />);

    expect(MockMarkerConstructor).toHaveBeenCalledTimes(1);
    const firstMarker = markerInstances[0];

    const pins2: MapViewPin[] = [
      { id: "b", lng: -25.6, lat: 37.7 },
      { id: "c", lng: -25.5, lat: 37.5 },
    ];
    rerender(<MapView center={CENTER} pins={pins2} />);

    expect(firstMarker.remove).toHaveBeenCalled();
    // 1 initial + 2 replacements
    expect(MockMarkerConstructor).toHaveBeenCalledTimes(3);
  });

  it("prefers-reduced-motion: calls jumpTo instead of flyTo when reduce is set", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });

    const { rerender } = render(<MapView center={CENTER} zoom={10} />);
    rerender(<MapView center={{ lng: -25.0, lat: 37.5 }} zoom={10} />);

    expect(mockMapInstance.jumpTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [-25.0, 37.5] }),
    );
    expect(mockMapInstance.flyTo).not.toHaveBeenCalled();
  });
});
