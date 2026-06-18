import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CategorySegmented } from "@/features/discover/category-segmented";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("CategorySegmented", () => {
  it("renders all 6 category toggles", () => {
    const { container } = render(
      <MemoryRouter>
        <CategorySegmented action="see" />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll("button").length).toBe(6);
  });

  it("marks the current action as pressed", () => {
    render(
      <MemoryRouter>
        <CategorySegmented action="eat" />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("actions.eat").getAttribute("data-state")).toBe("on");
  });
});
