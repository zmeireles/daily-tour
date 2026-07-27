import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import i18n from "@/lib/i18n";
import { useSessionStore } from "@/store/session";
import IndexRoute from "@/routes/index";

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

function renderLanding(path = "/") {
  const router = createMemoryRouter([{ path: "/", element: <IndexRoute /> }], {
    initialEntries: [path],
  });
  return render(<RouterProvider router={router} />);
}

describe("Public landing (IndexRoute)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().clearSession();
  });

  it("renders hero, owner pitch, 4 sample PlaceCards, CTA, and locale switcher without authed shell", () => {
    renderLanding();

    // hero h1
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();

    // 4 PlaceCard hero images
    expect(screen.getAllByRole("img")).toHaveLength(4);

    // CTA mailto link
    expect(screen.getByRole("link", { name: /check availability/i })).toBeInTheDocument();

    // locale switcher buttons
    expect(screen.getByRole("button", { name: /english/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /português/i })).toBeInTheDocument();
  });

  it("preserves the expired-message paragraph when ?reason=expired is present", () => {
    renderLanding("/?reason=expired");
    expect(screen.getByTestId("expired-message")).toBeInTheDocument();
  });

  it("clicking the pt-PT locale button calls i18n.changeLanguage('pt-PT')", () => {
    const spy = vi
      .spyOn(i18n, "changeLanguage")
      .mockImplementation(
        () => Promise.resolve(() => "") as ReturnType<typeof i18n.changeLanguage>,
      );

    renderLanding();
    fireEvent.click(screen.getByRole("button", { name: /português/i }));

    expect(spy).toHaveBeenCalledWith("pt-PT");
  });

  it("no element with data-premium='true' is rendered on the public landing", () => {
    renderLanding();
    expect(document.querySelector("[data-premium='true']")).toBeNull();
  });

  it("renders a persistent guest-preview signal so the surface reads as unauthenticated", () => {
    renderLanding();
    const banner = screen.getByTestId("guest-banner");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/public preview/i);
    expect(banner).toHaveTextContent(/booking link/i);
  });

  it("presents the sample places as non-interactive examples (no ghost-click affordance)", () => {
    renderLanding();
    const grid = screen.getByTestId("sample-places-grid");
    // pointer-events-none removes the hover/tap affordance the cards would
    // otherwise borrow from the authed home — they read as static examples.
    expect(grid.className).toContain("pointer-events-none");
    // one "Sample" tag per example card
    expect(screen.getAllByText(/^sample$/i)).toHaveLength(4);
    // none of the sample cards expose a button role / click target
    expect(grid.querySelectorAll('[role="button"]')).toHaveLength(0);
  });
});
