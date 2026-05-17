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
});
