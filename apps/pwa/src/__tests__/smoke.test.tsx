import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleSchema } from "@daily-tour/shared-types";
import App from "../App";

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

describe("App smoke", () => {
  it("renders the public landing hero heading", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders the locale switcher", async () => {
    render(<App />);
    expect(await screen.findByRole("button", { name: /english/i })).toBeInTheDocument();
  });
});

describe("shared-types workspace import", () => {
  it("imports a schema from @daily-tour/shared-types", () => {
    expect(LocaleSchema).toBeDefined();
    expect(LocaleSchema.parse("en")).toBe("en");
  });
});
