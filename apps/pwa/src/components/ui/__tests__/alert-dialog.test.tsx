import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function TestDialog({ onConfirm = () => {} }: { onConfirm?: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>Apagar lugar</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Apagar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe("AlertDialog (smoke)", () => {
  it("renders the trigger", () => {
    render(<TestDialog />);
    expect(screen.getByText("Apagar lugar")).toBeInTheDocument();
  });

  it("opens on trigger click and shows content", async () => {
    render(<TestDialog />);
    fireEvent.click(screen.getByText("Apagar lugar"));
    expect(await screen.findByText("Tem a certeza?")).toBeInTheDocument();
    expect(screen.getByText("Esta ação não pode ser desfeita.")).toBeInTheDocument();
  });

  it("fires onConfirm when action button is clicked", async () => {
    const onConfirm = vi.fn();
    render(<TestDialog onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText("Apagar lugar"));
    fireEvent.click(await screen.findByText("Apagar"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("closes on cancel", async () => {
    render(<TestDialog />);
    fireEvent.click(screen.getByText("Apagar lugar"));
    await screen.findByText("Tem a certeza?");
    fireEvent.click(screen.getByText("Cancelar"));
    expect(screen.queryByText("Tem a certeza?")).not.toBeInTheDocument();
  });
});
