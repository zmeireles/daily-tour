import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

describe("Sheet (smoke)", () => {
  it("renders its trigger and shows content when opened by default", () => {
    render(
      <Sheet defaultOpen>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Narrow the list</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.getByText("Open")).toBeInTheDocument();
    // Content is portalled into the body when open.
    expect(screen.getByText("Filters")).toBeInTheDocument();
    // Vendored close affordance is present.
    expect(screen.getByText("Close")).toBeInTheDocument();
  });
});
