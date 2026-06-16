import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

describe("Avatar (smoke)", () => {
  it("renders the fallback while the image has not loaded", () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/miguel.jpg" alt="Miguel" />
        <AvatarFallback>MG</AvatarFallback>
      </Avatar>,
    );
    // In jsdom the image never fires onLoad, so Radix shows the fallback.
    expect(screen.getByText("MG")).toBeInTheDocument();
  });

  it("applies the rounded avatar base classes", () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>MG</AvatarFallback>
      </Avatar>,
    );
    const root = container.querySelector("[data-slot='avatar']");
    expect(root?.className).toMatch(/rounded-full/);
  });
});
