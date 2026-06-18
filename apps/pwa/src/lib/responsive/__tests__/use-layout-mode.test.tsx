import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useLayoutMode } from "@/lib/responsive/use-layout-mode";
import type { LayoutEngageAt } from "@/lib/responsive/breakpoints";

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }));
}

function Probe({ engageAt }: { engageAt?: LayoutEngageAt }) {
  return <div data-testid="mode">{useLayoutMode(engageAt)}</div>;
}

describe("useLayoutMode", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 'mobile' when the engage query does not match", () => {
    mockMatchMedia(false);
    render(<Probe engageAt="lg" />);
    expect(screen.getByTestId("mode").textContent).toBe("mobile");
  });

  it("returns 'desktop' when the engage query matches", () => {
    mockMatchMedia(true);
    render(<Probe engageAt="md" />);
    expect(screen.getByTestId("mode").textContent).toBe("desktop");
  });

  it("queries the engageAt width (lg=1024 default, md=768)", () => {
    mockMatchMedia(false);
    render(<Probe engageAt="md" />);
    expect(window.matchMedia).toHaveBeenCalledWith("(min-width: 768px)");
  });
});
