import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LegalDocument } from "@/components/legal-document";

describe("LegalDocument", () => {
  it("renders the privacy policy heading, sections, contact and cross-link to terms", () => {
    render(<LegalDocument docKey="privacy" />);

    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getByText("Last updated 25 June 2026")).toBeInTheDocument();

    // Section titles render as <h2>; at least these key GDPR sections must exist.
    expect(screen.getByRole("heading", { level: 2, name: "What we collect" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Your rights" })).toBeInTheDocument();

    // Contact line is reachable and carries the data-contact email.
    expect(screen.getByText(/privacy@portugalodyssey\.pt/)).toBeInTheDocument();

    // Cross-link points to the sibling document.
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  });

  it("renders the terms document with its heading and cross-link to privacy", () => {
    render(<LegalDocument docKey="terms" />);

    expect(screen.getByRole("heading", { level: 1, name: "Terms of Use" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "What Daily Tour does — and does not do" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  });
});
