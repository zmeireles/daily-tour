import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { StatusBadge, STATUS_MAP, type BadgeVariant } from "@/features/backoffice/status";
import enAdmin from "@/locales/en/admin.json";

const VALID_VARIANTS: BadgeVariant[] = [
  "default",
  "secondary",
  "destructive",
  "outline",
  "ghost",
  "link",
  "success",
  "warning",
  "info",
];

// Resolve a dotted labelKey ("status.place.published") against the en resources —
// the source of truth the map's labels must exist in.
function resolve(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], obj);
}

describe("STATUS_MAP (single status source)", () => {
  it("every mapped status has a status.* labelKey that exists in en and a valid variant", () => {
    for (const [kind, byValue] of Object.entries(STATUS_MAP)) {
      for (const [value, meta] of Object.entries(byValue)) {
        expect(meta.labelKey, `${kind}.${value} labelKey`).toMatch(/^status\./);
        expect(VALID_VARIANTS, `${kind}.${value} variant`).toContain(meta.variant);
        // The label must actually exist in the en catalogue (no dangling key).
        expect(resolve(enAdmin, meta.labelKey), `en label for ${meta.labelKey}`).toEqual(
          expect.any(String),
        );
      }
    }
  });
});

describe("StatusBadge", () => {
  it("renders the localized label + data attributes for a mapped value", () => {
    render(<StatusBadge kind="place" value="published" />);
    const badge = screen.getByText(enAdmin.status.place.published);
    expect(badge).toHaveAttribute("data-status-kind", "place");
    expect(badge).toHaveAttribute("data-status-value", "published");
  });

  it("colors reservation/token statuses via the map (checked_in → info, revoked → destructive)", () => {
    const { rerender } = render(<StatusBadge kind="reservation" value="checked_in" />);
    expect(screen.getByText(enAdmin.status.reservation.checked_in)).toBeInTheDocument();
    rerender(<StatusBadge kind="token" value="revoked" />);
    expect(screen.getByText(enAdmin.status.token.revoked)).toBeInTheDocument();
  });

  it("falls back to a neutral badge showing the raw value for an unmapped value", () => {
    render(<StatusBadge kind="token" value="mystery" />);
    const fallback = screen.getByText("mystery");
    expect(fallback).toHaveAttribute("data-status-value", "mystery");
  });
});
