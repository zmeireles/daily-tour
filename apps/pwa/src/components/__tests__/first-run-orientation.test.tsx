import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FirstRunOrientation } from "@/components/first-run-orientation";

const DISMISSED_KEY = "dt_intro_dismissed";
const VISIT_COUNT_KEY = "pwa_visit_count";

// The local jsdom env ships a bare localStorage object with no methods
// (documented "fail locally, pass in CI" quirk), so install a deterministic
// in-memory shim for these tests. Real Storage in CI satisfies the same shape.
function installMemoryStorage(): Map<string, string> {
  const store = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    },
  });
  return store;
}

describe("FirstRunOrientation", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = installMemoryStorage();
    store.delete(DISMISSED_KEY);
    store.delete(VISIT_COUNT_KEY);
  });

  it("shows on a first visit (visit count <= 1, not dismissed)", () => {
    store.set(VISIT_COUNT_KEY, "1");
    render(<FirstRunOrientation />);

    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/three things you can do/i)).toBeInTheDocument();
  });

  it("does not show after the dismissed flag is set", () => {
    store.set(VISIT_COUNT_KEY, "1");
    store.set(DISMISSED_KEY, "1");
    const { container } = render(<FirstRunOrientation />);

    expect(container.firstChild).toBeNull();
  });

  it("does not show for returning guests (visit count > 1)", () => {
    store.set(VISIT_COUNT_KEY, "5");
    const { container } = render(<FirstRunOrientation />);

    expect(container.firstChild).toBeNull();
  });

  it("hides and persists dismissal when the Got it button is clicked", () => {
    store.set(VISIT_COUNT_KEY, "1");
    const { container } = render(<FirstRunOrientation />);

    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /got it/i }));

    expect(container.firstChild).toBeNull();
    expect(store.get(DISMISSED_KEY)).toBe("1");
  });
});
