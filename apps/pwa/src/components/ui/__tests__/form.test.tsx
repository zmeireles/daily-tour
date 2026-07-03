import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
});

function TestForm({ onSubmit = () => {} }: { onSubmit?: () => void }) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Insira o nome" {...field} />
              </FormControl>
              <FormDescription>O nome do lugar.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Guardar</button>
      </form>
    </Form>
  );
}

describe("Form (smoke)", () => {
  it("renders label and input", () => {
    render(<TestForm />);
    expect(screen.getByText("Nome")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Insira o nome")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<TestForm />);
    expect(screen.getByText("O nome do lugar.")).toBeInTheDocument();
  });

  it("shows zod validation error on submit with empty field", async () => {
    render(<TestForm />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Nome é obrigatório")).toBeInTheDocument();
  });

  it("error message has data-slot=form-message", async () => {
    render(<TestForm />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    const msg = await screen.findByText("Nome é obrigatório");
    expect(msg.closest("[data-slot='form-message']")).toBeInTheDocument();
  });

  it("label turns destructive color class on error", async () => {
    const { container } = render(<TestForm />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await screen.findByText("Nome é obrigatório");
    const label = container.querySelector("[data-slot='form-label']");
    expect(label?.className).toMatch(/text-destructive/);
  });
});
