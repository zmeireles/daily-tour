import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleSchema } from "@daily-tour/shared-types";
import App from "../App";

describe("App smoke", () => {
  it("renders the greeting heading", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /hello, daily tour/i }),
    ).toBeInTheDocument();
  });

  it("renders the shadcn Button", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });
});

describe("shared-types workspace import", () => {
  it("imports a schema from @daily-tour/shared-types", () => {
    expect(LocaleSchema).toBeDefined();
    expect(LocaleSchema.parse("en")).toBe("en");
  });
});
