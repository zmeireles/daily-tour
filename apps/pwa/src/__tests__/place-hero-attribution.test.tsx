// plan-006 6.B.2 — hero credit line renders only for attributed (CC-BY-SA)
// media; PD / owner-provided heroes (attribution null) show nothing.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hero } from "@/features/place-detail/hero";

describe("Hero attribution credit", () => {
  it("renders a credit link when attribution is present", () => {
    render(
      <Hero
        imageUrl="https://example.com/img.jpg"
        title="Lagoa do Fogo"
        attribution={{
          author: "Samuel Fonseca 85",
          license: "CC BY-SA 3.0",
          source_url: "https://commons.wikimedia.org/w/index.php?curid=40347024",
        }}
      />,
    );
    const credit = screen.getByRole("link", {
      name: /Samuel Fonseca 85 · CC BY-SA 3\.0/,
    });
    expect(credit).toHaveAttribute(
      "href",
      "https://commons.wikimedia.org/w/index.php?curid=40347024",
    );
    expect(credit).toHaveAttribute("target", "_blank");
  });

  it("renders no credit when attribution is null", () => {
    render(<Hero imageUrl="https://example.com/img.jpg" title="Sete Cidades" attribution={null} />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders the branded placeholder (no img, no credit) when imageUrl is empty", () => {
    render(<Hero imageUrl="" title="Tony's Restaurant" attribution={null} />);
    // branded fallback panel, not a broken <img>
    expect(screen.getByTestId("place-hero-placeholder")).toHaveAttribute(
      "aria-label",
      "Tony's Restaurant — photo coming soon",
    );
    expect(screen.queryByTestId("place-hero-placeholder")?.querySelector("img")).toBeNull();
    // title still renders; no attribution chip
    expect(screen.getByRole("heading", { name: "Tony's Restaurant" })).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
