import * as React from "react";

import { cn } from "@/lib/utils";

// Hand-rolled switch (a plain accessible button, role="switch") rather than a
// Radix primitive. Radix's pointer-capture internals don't toggle reliably
// under jsdom (see the place-list tests + the sort-drilldown note), so a plain
// button keeps the control fireEvent-testable while looking identical. The
// centered ::after gives a ≥44px tap target without inflating the visual size.
function Switch({
  checked,
  onCheckedChange,
  className,
  disabled,
  ...props
}: Omit<React.ComponentProps<"button">, "onChange" | "type"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-slot="switch"
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        "after:absolute after:left-1/2 after:top-1/2 after:size-11 after:-translate-x-1/2 after:-translate-y-1/2",
        checked ? "bg-primary" : "bg-input",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

export { Switch };
