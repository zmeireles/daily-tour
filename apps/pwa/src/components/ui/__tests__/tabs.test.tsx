import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

describe("Tabs (smoke)", () => {
  it("renders trigger labels", () => {
    render(
      <Tabs defaultValue="en">
        <TabsList>
          <TabsTrigger value="en">English</TabsTrigger>
          <TabsTrigger value="pt">Português</TabsTrigger>
        </TabsList>
        <TabsContent value="en">EN content</TabsContent>
        <TabsContent value="pt">PT content</TabsContent>
      </Tabs>,
    );

    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Português")).toBeInTheDocument();
  });

  it("shows active content by default value", () => {
    render(
      <Tabs defaultValue="pt">
        <TabsList>
          <TabsTrigger value="en">English</TabsTrigger>
          <TabsTrigger value="pt">Português</TabsTrigger>
        </TabsList>
        <TabsContent value="en">EN content</TabsContent>
        <TabsContent value="pt">PT content</TabsContent>
      </Tabs>,
    );

    expect(screen.getByText("PT content")).toBeInTheDocument();
  });

  it("active trigger has data-state=active", () => {
    render(
      <Tabs defaultValue="en">
        <TabsList>
          <TabsTrigger value="en">English</TabsTrigger>
        </TabsList>
        <TabsContent value="en">EN content</TabsContent>
      </Tabs>,
    );

    const trigger = screen.getByRole("tab", { name: "English" });
    expect(trigger).toHaveAttribute("data-state", "active");
  });

  it("applies data-slot attributes", () => {
    const { container } = render(
      <Tabs defaultValue="en">
        <TabsList>
          <TabsTrigger value="en">English</TabsTrigger>
        </TabsList>
        <TabsContent value="en">Content</TabsContent>
      </Tabs>,
    );

    expect(container.querySelector("[data-slot='tabs-list']")).toBeInTheDocument();
    expect(container.querySelector("[data-slot='tabs-trigger']")).toBeInTheDocument();
    expect(container.querySelector("[data-slot='tabs-content']")).toBeInTheDocument();
  });
});
