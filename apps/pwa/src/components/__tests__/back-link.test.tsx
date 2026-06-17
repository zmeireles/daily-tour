import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { BackLink } from "@/components/back-link";

function withRouter(element: React.ReactElement) {
  const router = createMemoryRouter([{ path: "/*", element }], { initialEntries: ["/somewhere"] });
  return <RouterProvider router={router} />;
}

describe("BackLink", () => {
  it("links to the target with an accessible name = the label", () => {
    render(withRouter(<BackLink to="/">Voltar ao início</BackLink>));
    const link = screen.getByRole("link", { name: /voltar ao início/i });
    expect(link.getAttribute("href")).toBe("/");
  });

  it("renders a lucide arrow icon and no underline (editorial, not a bare-arrow text link)", () => {
    render(withRouter(<BackLink to="/">Back</BackLink>));
    const link = screen.getByRole("link", { name: /back/i });
    // lucide ArrowLeft renders an <svg>; the bare "←" glyph it replaced did not.
    expect(link.querySelector("svg")).not.toBeNull();
    expect(link.className).not.toMatch(/underline/);
    // The decorative icon must not pollute the link's accessible name.
    expect(link).toHaveAccessibleName("Back");
  });
});
