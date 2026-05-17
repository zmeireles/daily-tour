import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { configureAxe, toHaveNoViolations } from "jest-axe";

import { Hero as PublicHero } from "@/features/public-landing/hero";
import { OwnerPitch } from "@/features/public-landing/owner-pitch";
import { CheckAvailabilityCta } from "@/features/public-landing/check-availability-cta";
import { Greeting } from "@/features/home/greeting";
import { ActionGrid } from "@/features/home/action-grid";
import { PremiumStubs } from "@/features/home/premium-stubs";
import { BackofficeShell } from "@/features/backoffice/shell";
import { IntakeForm } from "@/features/tour/intake-form";
import { InstallBanner } from "@/features/pwa-install/install-banner";
import { OfflineBanner } from "@/components/offline-banner";
import { PlaceCard } from "@/components/place-card";
import { ControlsBar } from "@/features/discover/controls-bar";

expect.extend(toHaveNoViolations);

// Only critical/serious violations are in scope for WCAG 2.2 AA
const axe = configureAxe({ impactLevels: ["critical", "serious"] });

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

vi.mock("@/lib/pwa/use-install-prompt", () => ({
  useInstallPrompt: () => ({
    canInstall: true,
    install: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock("@/lib/offline/use-offline-status", () => ({
  useOfflineStatus: () => ({ isOffline: true }),
}));

function withRouter(element: React.ReactElement, path = "/") {
  const router = createMemoryRouter([{ path: "/*", element }], { initialEntries: [path] });
  return <RouterProvider router={router} />;
}

const PLACE_CARD_PROPS = {
  id: "p-1",
  name: { en: "Sete Cidades" },
  description: { en: "Twin lakes in a volcanic crater." },
  heroImageUrl: "https://example.com/sete-cidades.jpg",
  distanceKm: 12.5,
  wishes: ["see"],
  actions: [
    { slug: "hike", icon: "Mountain" },
    { slug: "photo", icon: "Camera" },
  ],
};

describe("WCAG 2.2 AA — a11y audit (critical/serious violations only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Public landing", () => {
    it("Hero has no critical/serious violations", async () => {
      const { container } = render(<PublicHero />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it("OwnerPitch has no critical/serious violations", async () => {
      const { container } = render(<OwnerPitch />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it("CheckAvailabilityCta has no critical/serious violations", async () => {
      const { container } = render(<CheckAvailabilityCta />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe("Authed home", () => {
    it("Greeting has no critical/serious violations", async () => {
      const { container } = render(<Greeting />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it("ActionGrid has no critical/serious violations", async () => {
      const { container } = render(withRouter(<ActionGrid />));
      expect(await axe(container)).toHaveNoViolations();
    });

    it("PremiumStubs has no critical/serious violations", async () => {
      const { container } = render(<PremiumStubs />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe("Place detail", () => {
    it("PlaceCard (interactive) has no critical/serious violations", async () => {
      const { container } = render(<PlaceCard {...PLACE_CARD_PROPS} onPress={() => undefined} />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it("PlaceCard (display-only) has no critical/serious violations", async () => {
      const { container } = render(<PlaceCard {...PLACE_CARD_PROPS} />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe("Action drill-down (Discover)", () => {
    it("ControlsBar has no critical/serious violations", async () => {
      const { container } = render(
        <ControlsBar
          locValue="guesthouse"
          geolocationDenied={false}
          kmRange={10}
          sortBy="distance"
          groupBy="grouped"
          vehicleMode="car"
          onLocationChange={vi.fn()}
          onKmChange={vi.fn()}
          onSortChange={vi.fn()}
          onGroupChange={vi.fn()}
          onVehicleChange={vi.fn()}
        />,
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe("Admin shell", () => {
    it("BackofficeShell nav has no critical/serious violations", async () => {
      const { container } = render(
        withRouter(
          <BackofficeShell>
            <div>Content</div>
          </BackofficeShell>,
        ),
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe("Tour intake", () => {
    it("IntakeForm has no critical/serious violations", async () => {
      const { container } = render(<IntakeForm onSubmit={vi.fn()} />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe("PWA banners", () => {
    it("InstallBanner has no critical/serious violations", async () => {
      const { container } = render(<InstallBanner />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it("OfflineBanner has no critical/serious violations", async () => {
      const { container } = render(<OfflineBanner />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
