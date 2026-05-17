import * as React from "react";
import { motion } from "motion/react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export type LocationValue = "me" | "guesthouse";

export type LocationToggleProps = {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  geolocationDenied?: boolean;
};

export function LocationToggle({
  value,
  onChange,
  geolocationDenied = false,
}: LocationToggleProps) {
  return (
    <div className="relative inline-flex rounded-full border border-input bg-muted">
      {/* Animated active pill — w-1/2 translates 100% of its own width to slide right */}
      <motion.div
        className="absolute inset-0 w-1/2 rounded-full bg-primary pointer-events-none"
        animate={{ x: value === "me" ? "0%" : "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        aria-hidden="true"
      />

      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => {
          if (v) onChange(v as LocationValue);
        }}
        className="relative z-10 gap-0 w-full"
      >
        <ToggleGroupItem
          value="me"
          disabled={geolocationDenied}
          aria-disabled={geolocationDenied}
          className={cn(
            "flex-1 rounded-full px-4 min-h-[40px] text-sm font-medium",
            "data-[state=on]:bg-transparent data-[state=on]:shadow-none",
            "data-[state=on]:text-primary-foreground",
            "hover:bg-transparent",
            geolocationDenied && "text-[--basalt-300] cursor-not-allowed opacity-50",
          )}
          aria-label="Use my location"
        >
          <span aria-hidden="true">📍</span> <span>Me</span>
        </ToggleGroupItem>

        <ToggleGroupItem
          value="guesthouse"
          className={cn(
            "flex-1 rounded-full px-4 min-h-[40px] text-sm font-medium",
            "data-[state=on]:bg-transparent data-[state=on]:shadow-none",
            "data-[state=on]:text-primary-foreground",
            "hover:bg-transparent",
          )}
          aria-label="Use guesthouse location"
        >
          <span aria-hidden="true">🏠</span> <span>Guesthouse</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
