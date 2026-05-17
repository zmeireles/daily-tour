import * as React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { LocationToggle, type LocationValue } from "@/components/location-toggle";
import { RangeSlider } from "@/components/range-slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import type { SortBy } from "./sort-utils";

export type GroupBy = "grouped" | "flat";

type ControlsBarProps = {
  locValue: LocationValue;
  geolocationDenied: boolean;
  kmRange: number;
  sortBy: SortBy;
  groupBy: GroupBy;
  onLocationChange: (v: LocationValue) => void;
  onKmChange: (v: number) => void;
  onSortChange: (v: SortBy) => void;
  onGroupChange: (v: GroupBy) => void;
};

export function ControlsBar({
  locValue,
  geolocationDenied,
  kmRange,
  sortBy,
  groupBy,
  onLocationChange,
  onKmChange,
  onSortChange,
  onGroupChange,
}: ControlsBarProps) {
  const { t } = useTranslation("discover");

  return (
    <div className="flex flex-col gap-3 px-4 py-3 bg-muted/40 border-b border-border">
      <div className="flex items-center gap-3 flex-wrap">
        <LocationToggle
          value={locValue}
          onChange={onLocationChange}
          geolocationDenied={geolocationDenied}
        />

        <div className="flex items-center gap-2 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                {t(`controls.sort.${sortBy}`)}
                <ChevronDown size={14} aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={sortBy}
                onValueChange={(v) => onSortChange(v as SortBy)}
              >
                <DropdownMenuRadioItem value="distance">
                  {t("controls.sort.distance")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="rating">
                  {t("controls.sort.rating")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name">
                  {t("controls.sort.name")}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <ToggleGroup
            type="single"
            value={groupBy}
            onValueChange={(v) => {
              if (v) onGroupChange(v as GroupBy);
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="grouped" aria-label={t("controls.group.grouped")}>
              {t("controls.group.grouped")}
            </ToggleGroupItem>
            <ToggleGroupItem value="flat" aria-label={t("controls.group.flat")}>
              {t("controls.group.flat")}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <RangeSlider value={kmRange} onChange={onKmChange} />
    </div>
  );
}
