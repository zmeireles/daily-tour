import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActionGroupHeader } from "@/components/action-group-header";

const baseProps = {
  actionSlug: "eat",
  actionLabel: "Eat",
  iconName: "UtensilsCrossed",
  href: "/actions/eat",
};

describe("ActionGroupHeader", () => {
  it("renders label and href on the link", () => {
    render(<ActionGroupHeader {...baseProps} />);

    const link = screen.getByRole("link", { name: /eat/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/actions/eat");
    expect(screen.getByText("Eat")).toBeInTheDocument();
  });

  it("full-row click is handled by the outer anchor element", () => {
    render(<ActionGroupHeader {...baseProps} />);

    const link = screen.getByRole("link", { name: /eat/i });
    // jsdom does not navigate on anchor click, but we verify the outer container is the anchor.
    fireEvent.click(link);
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/actions/eat");
  });
});
