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
  it("renders name, distance pill, and first 2 action chips", () => {
    render(<PlaceCard {...baseProps} />);

    expect(screen.getByText("Lagoa das Sete Cidades")).toBeInTheDocument();
    expect(screen.getByLabelText(/5\.2 km away/i)).toBeInTheDocument();
    expect(screen.getByText("hike")).toBeInTheDocument();
    expect(screen.getByText("swim")).toBeInTheDocument();
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
});
