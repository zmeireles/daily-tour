import * as React from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { VehicleMode } from "@/lib/preferences/use-vehicle-pref";

type VehicleToggleProps = {
  value: VehicleMode;
  onChange: (v: VehicleMode) => void;
};

export function VehicleToggle({ value, onChange }: VehicleToggleProps) {
  const { t } = useTranslation("discover");

  return (
    <div className="relative inline-flex rounded-full border border-input bg-muted">
      <motion.div
        layoutId="vehicle-pill"
        className="absolute inset-0 w-1/2 rounded-full bg-primary pointer-events-none"
        animate={{ x: value === "car" ? "0%" : "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        aria-hidden="true"
      />

      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => {
          if (v) onChange(v as VehicleMode);
        }}
        className="relative z-10 gap-0 w-full"
      >
        <ToggleGroupItem
          value="car"
          className={cn(
            "flex-1 rounded-full px-4 min-h-[36px] text-sm font-medium",
            "data-[state=on]:bg-transparent data-[state=on]:shadow-none",
            "data-[state=on]:text-primary-foreground",
            "hover:bg-transparent",
          )}
          aria-label={t("vehicle.car")}
        >
          <span aria-hidden="true">🚗</span> <span>{t("vehicle.car")}</span>
        </ToggleGroupItem>

        <ToggleGroupItem
          value="foot"
          className={cn(
            "flex-1 rounded-full px-4 min-h-[36px] text-sm font-medium",
            "data-[state=on]:bg-transparent data-[state=on]:shadow-none",
            "data-[state=on]:text-primary-foreground",
            "hover:bg-transparent",
          )}
          aria-label={t("vehicle.foot")}
        >
          <span aria-hidden="true">🚶</span> <span>{t("vehicle.foot")}</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
