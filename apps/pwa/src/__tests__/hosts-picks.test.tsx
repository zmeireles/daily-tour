import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSessionStore } from "@/store/session";
import { HostsPicksRibbon } from "@/features/discover/hosts-picks-ribbon";
import { HostsPicksSection } from "@/features/home/hosts-picks-section";
import type { DiscoverPlace, DiscoverResponse } from "@/features/discover/sort-utils";

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

const PICK: DiscoverPlace = {
  id: "pick-1",
  name: { en: "Lagoa das Sete Cidades" },
  description: { en: "Twin volcanic lake" },
  hero_image_url: null,
  wishes: ["scenic"],
  is_hosts_pick: true,
};

const NON_PICK: DiscoverPlace = {
  id: "non-1",
  name: { en: "Mountain Bistro" },
  description: { en: "A mountain bistro" },
  hero_image_url: null,
  wishes: ["food"],
  is_hosts_pick: false,
};

function wrapInRouter(element: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: "/", element }], { initialEntries: ["/"] });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("HostsPicksRibbon", () => {
  it("renders ribbon with host-pick place names and hides non-picks", () => {
    wrapInRouter(<HostsPicksRibbon places={[PICK, NON_PICK]} />);

    expect(screen.getByRole("region", { name: /host.s picks/i })).toBeInTheDocument();
    expect(screen.getByText("Lagoa das Sete Cidades")).toBeInTheDocument();
    expect(screen.queryByText("Mountain Bistro")).not.toBeInTheDocument();
  });

  it("renders nothing when no places have is_hosts_pick", () => {
    const { container } = wrapInRouter(<HostsPicksRibbon places={[NON_PICK]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("HostsPicksSection", () => {
  const MOCK_JWT = "header.payload.sig";
  const MOCK_CLAIMS = {
    sub: "guest-1",
    rid: "res-1",
    gh: "gh-1",
    locale: "en",
    exp: 9_999_999_999,
  };

  beforeEach(() => {
    useSessionStore.getState().clearSession();
    vi.restoreAllMocks();
  });

  it("renders section with host-pick places after fetch resolves", async () => {
    const response: DiscoverResponse = {
      action: "eat",
      count: 1,
      groups: [{ wish: "scenic", places: [PICK] }],
    };
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json" },
      }),
    );

    act(() => {
      useSessionStore.getState().setSession(MOCK_JWT, MOCK_CLAIMS);
    });

    wrapInRouter(<HostsPicksSection />);

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /host.s picks/i })).toBeInTheDocument();
    });
    expect(screen.getByText("Lagoa das Sete Cidades")).toBeInTheDocument();

    // Home ribbon uses the portrait overlay variant (4:5 gradient cards), not
    // the stacked cream card. The overlay shell is the only one with aspect-[4/5].
    const region = screen.getByRole("region", { name: /host.s picks/i });
    expect(region.querySelector(".aspect-\\[4\\/5\\]")).not.toBeNull();
  });
});
