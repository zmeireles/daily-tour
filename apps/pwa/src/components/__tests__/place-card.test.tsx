import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlaceCard } from "@/components/place-card";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" } }),
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

const baseProps = {
  id: "place-1",
  name: { en: "Lagoa das Sete Cidades" },
  description: { en: "A stunning twin lake." },
  heroImageUrl: "https://example.com/lagoa.jpg",
  distanceKm: 5.2,
  wishes: ["wish-1"],
  actions: [
    { slug: "hike", icon: "Mountain" },
    { slug: "swim", icon: "Waves" },
    { slug: "photo", icon: "Camera" },
  ],
};

describe("PlaceCard", () => {
  it("renders name, distance chip, and first 2 action chips", () => {
    render(<PlaceCard {...baseProps} />);

    expect(screen.getByText("Lagoa das Sete Cidades")).toBeInTheDocument();
    expect(screen.getByLabelText(/5\.2 km away/i)).toBeInTheDocument();
    expect(screen.getByText("hike")).toBeInTheDocument();
    expect(screen.getByText("swim")).toBeInTheDocument();
  });

  it("renders distance via the hydrangea DistanceChip, not a styled Badge", () => {
    render(<PlaceCard {...baseProps} />);
    const chip = screen.getByLabelText(/5\.2 km away/i);
    expect(chip.className).toMatch(/bg-tertiary-container/);
  });

  it("renders the name with font-display and no inline fontFamily override", () => {
    render(<PlaceCard {...baseProps} />);
    const heading = screen.getByRole("heading", { name: "Lagoa das Sete Cidades" });
    expect(heading.className).toMatch(/font-display/);
    expect(heading.getAttribute("style")).toBeNull();
  });

  it("uses a cream-paper surface (bg-surface-container-low, no shadow)", () => {
    const { container } = render(<PlaceCard {...baseProps} />);
    const card = container.querySelector(".bg-surface-container-low");
    expect(card).not.toBeNull();
    expect(card?.className).toMatch(/shadow-none/);
  });

  it("calls onPress when the card is clicked", () => {
    const onPress = vi.fn();
    render(<PlaceCard {...baseProps} onPress={onPress} />);

    fireEvent.click(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it("applies motion-reduce:transform-none to prevent transforms on the card", () => {
    const { container } = render(<PlaceCard {...baseProps} onPress={vi.fn()} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/motion-reduce:transform-none/);
  });

  it("renders the action-icon placeholder when heroImageUrl is null", () => {
    // Today the catalog returns hero_image_url=null pending the media-svc
    // signed-URL wire-up. The card should show a placeholder (using the
    // first action's icon) rather than a broken-image icon. DT-TESTS-4
    // FAIL surfaced this behaviour.
    render(<PlaceCard {...baseProps} heroImageUrl={null} />);

    expect(screen.getByTestId("place-card-hero-placeholder")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Lagoa das Sete Cidades$/i })).toBeNull();
    // The placeholder uses role="img" with a descriptive aria-label.
    expect(screen.getByRole("img", { name: /image coming soon/i })).toBeInTheDocument();
  });

  it("renders the placeholder when heroImageUrl is empty string", () => {
    render(<PlaceCard {...baseProps} heroImageUrl="" />);
    expect(screen.getByTestId("place-card-hero-placeholder")).toBeInTheDocument();
  });

  it("placeholderIcon override wins over actions[0].icon", () => {
    // Regression guard for DT-TESTS-12: every wish chip is hardcoded to
    // icon: "MapPin", so without the explicit placeholderIcon override,
    // every action drill-down (Eat, See, etc.) shows MapPin instead of
    // the category icon. Route passes placeholderIcon to override the
    // chip-derived default. Verified by checking that the rendered icon
    // matches the override name, not the first action's icon.
    const { container } = render(
      <PlaceCard {...baseProps} heroImageUrl={null} placeholderIcon="Utensils" />,
    );

    const placeholder = container.querySelector("[data-testid='place-card-hero-placeholder']");
    expect(placeholder).not.toBeNull();
    // Lucide icons render an <svg> with a class attribute that includes
    // the kebab-case version of the icon name (e.g. "lucide-utensils").
    const svg = placeholder?.querySelector("svg");
    expect(svg?.getAttribute("class") ?? "").toMatch(/utensils/i);
    expect(svg?.getAttribute("class") ?? "").not.toMatch(/mountain/i);
  });

  describe('variant="overlay"', () => {
    it("renders the name in a bottom gradient block, white text", () => {
      const { container } = render(<PlaceCard {...baseProps} variant="overlay" />);
      const heading = screen.getByRole("heading", { name: "Lagoa das Sete Cidades" });
      expect(heading.className).toMatch(/font-display/);
      expect(heading.className).toMatch(/text-white/);
      // Strengthened scrim (from-black/85 + via-black/40 + taller pt-12) keeps
      // multi-line names legible over real photos.
      const gradient = container.querySelector(".bg-gradient-to-t.from-black\\/85");
      expect(gradient).not.toBeNull();
      expect(gradient?.contains(heading)).toBe(true);
    });

    it("renders the no-photo placeholder on a dark forest-green tone (legible white name)", () => {
      // Regression guard for the desktop-audit blocker: the overlay name is
      // overlaid white text, so a light placeholder rendered white-on-cream
      // (unreadable). The overlay placeholder must use the dark tea-green tone.
      render(<PlaceCard {...baseProps} variant="overlay" heroImageUrl={null} />);
      const placeholder = screen.getByTestId("place-card-hero-placeholder");
      expect(placeholder.className).toMatch(/tea-600/);
      expect(placeholder.className).not.toMatch(/from-muted/);
    });

    it("renders a glass DistanceChip top-right", () => {
      render(<PlaceCard {...baseProps} variant="overlay" />);
      const chip = screen.getByLabelText(/5\.2 km away/i);
      expect(chip.className).toMatch(/backdrop-blur-md/);
      expect(chip.className).toMatch(/bg-tertiary-container\/80/);
    });

    it("renders no action chips in overlay mode", () => {
      render(<PlaceCard {...baseProps} variant="overlay" />);
      expect(screen.queryByLabelText("Action chips")).toBeNull();
      expect(screen.queryByText("hike")).toBeNull();
    });

    it("renders the hero placeholder fallback when heroImageUrl is null", () => {
      render(<PlaceCard {...baseProps} variant="overlay" heroImageUrl={null} />);
      expect(screen.getByTestId("place-card-hero-placeholder")).toBeInTheDocument();
    });

    it("calls onPress when clicked and is keyboard-activatable", () => {
      const onPress = vi.fn();
      render(<PlaceCard {...baseProps} variant="overlay" onPress={onPress} />);
      const card = screen.getByRole("button");
      fireEvent.click(card);
      fireEvent.keyDown(card, { key: "Enter" });
      expect(onPress).toHaveBeenCalledTimes(2);
    });
  });
});
