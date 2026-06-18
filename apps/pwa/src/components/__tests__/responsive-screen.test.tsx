import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResponsiveScreen } from "@/components/responsive-screen";

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

describe("ResponsiveScreen", () => {
  afterEach(() => vi.restoreAllMocks());

  it("mounts ONLY the mobile tree below the breakpoint", () => {
    mockMatchMedia(false);
    render(<ResponsiveScreen mobile={<div>mobile-tree</div>} desktop={<div>desktop-tree</div>} />);
    expect(screen.getByText("mobile-tree")).toBeInTheDocument();
    expect(screen.queryByText("desktop-tree")).toBeNull();
  });

  it("mounts ONLY the desktop tree at/above the breakpoint", () => {
    mockMatchMedia(true);
    render(
      <ResponsiveScreen
        engageAt="md"
        mobile={<div>mobile-tree</div>}
        desktop={<div>desktop-tree</div>}
      />,
    );
    expect(screen.getByText("desktop-tree")).toBeInTheDocument();
    expect(screen.queryByText("mobile-tree")).toBeNull();
  });
});
