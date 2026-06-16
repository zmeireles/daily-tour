// plan-006 6.B.2 — hero credit line renders only for attributed (CC-BY-SA)
// media; PD / owner-provided heroes (attribution null) show nothing.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hero } from "@/features/place-detail/hero";

const baseProps = {
  onBack: vi.fn(),
  backLabel: "Back",
  saveLabel: "Save — coming soon",
};

describe("Hero attribution credit", () => {
  it("renders a credit link when attribution is present", () => {
    render(
      <Hero
        {...baseProps}
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
    render(
      <Hero
        {...baseProps}
        imageUrl="https://example.com/img.jpg"
        title="Sete Cidades"
        attribution={null}
      />,
    );
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders the branded placeholder (no img, no credit) when imageUrl is empty", () => {
    render(<Hero {...baseProps} imageUrl="" title="Tony's Restaurant" attribution={null} />);
    // branded fallback panel, not a broken <img>
    expect(screen.getByTestId("place-hero-placeholder")).toHaveAttribute(
      "aria-label",
      "Tony's Restaurant — photo coming soon",
    );
    expect(screen.queryByTestId("place-hero-placeholder")?.querySelector("img")).toBeNull();
    // hero region carries the accessible name; the visible title now lives on
    // the canvas below (route-level). No attribution chip in the fallback.
    expect(screen.getByRole("region", { name: "Tony's Restaurant" })).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("invokes onBack when the back button is pressed", () => {
    const onBack = vi.fn();
    render(
      <Hero
        {...baseProps}
        onBack={onBack}
        imageUrl="https://example.com/img.jpg"
        title="Sete Cidades"
        attribution={null}
      />,
    );
    screen.getByRole("button", { name: "Back" }).click();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("renders the bookmark save stub as a disabled button", () => {
    render(
      <Hero
        {...baseProps}
        imageUrl="https://example.com/img.jpg"
        title="Sete Cidades"
        attribution={null}
      />,
    );
    expect(screen.getByRole("button", { name: "Save — coming soon" })).toBeDisabled();
  });
});
