import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Copy } from "lucide-react";
import type { PlaceHoursEntry } from "./use-places";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export interface HoursRow {
  open: string;
  close: string;
}

// Weekly hours editor rows: one per day in Mon→Sun display order, each mapped to
// the schema's dow integer (JS convention: 0=Sunday … 6=Saturday). The row index
// is the array index in the form's `hours`; dow is what gets persisted.
export const DAY_ROWS = [
  { dow: 1, key: "mon" },
  { dow: 2, key: "tue" },
  { dow: 3, key: "wed" },
  { dow: 4, key: "thu" },
  { dow: 5, key: "fri" },
  { dow: 6, key: "sat" },
  { dow: 0, key: "sun" },
] as const;

// Defaults applied when a closed day is switched open, plus the sentinel pair we
// use to represent an all-day (24h) opening inside the {open, close} HH:MM shape.
const DEFAULT_OPEN = "09:00";
const DEFAULT_CLOSE = "17:00";
const H24_OPEN = "00:00";
const H24_CLOSE = "23:59";

// Project persisted hours[] onto the 7 display rows, matching on dow so the order
// of the source array doesn't matter. Missing days become empty (closed) rows.
export function hoursToRows(hours?: PlaceHoursEntry[]): HoursRow[] {
  return DAY_ROWS.map((day) => {
    const match = (hours ?? []).find((h) => h.dow === day.dow);
    return { open: match?.open ?? "", close: match?.close ?? "" };
  });
}

// Emit only days where both open and close are filled, mapping each display-row
// index back to its dow integer. Preserves the exact shape the API expects.
export function rowsToHours(rows: HoursRow[]): PlaceHoursEntry[] {
  return DAY_ROWS.map((day, i) => ({
    dow: day.dow,
    open: (rows[i]?.open ?? "").trim(),
    close: (rows[i]?.close ?? "").trim(),
  })).filter((h) => h.open !== "" && h.close !== "");
}

// The editor reads/writes the shared form's `hours` array via context, so the
// parent owns the field and its persisted shape stays untouched.
type HoursForm = { hours: HoursRow[] };

export function OpeningHoursEditor() {
  const { t } = useTranslation("admin");
  const { control, register, setValue } = useFormContext<HoursForm>();
  const rows = useWatch({ control, name: "hours" });

  function setRow(i: number, open: string, close: string) {
    setValue(`hours.${i}.open`, open, { shouldDirty: true });
    setValue(`hours.${i}.close`, close, { shouldDirty: true });
  }

  function copyToAll(i: number) {
    const source = rows?.[i];
    if (!source) return;
    DAY_ROWS.forEach((_, j) => setRow(j, source.open, source.close));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{t("places.form.hours.hint")}</p>
      <ul className="flex flex-col divide-y divide-border">
        {DAY_ROWS.map((day, i) => {
          const dayLabel = t(`places.form.hours.days.${day.key}`);
          const row = rows?.[i] ?? { open: "", close: "" };
          const isClosed = row.open === "" && row.close === "";
          const is24h = row.open === H24_OPEN && row.close === H24_CLOSE;
          return (
            <li key={day.key} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start">
              <div className="flex items-center justify-between gap-3 sm:w-44 sm:pt-2.5">
                <span className="text-sm font-medium">{dayLabel}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {isClosed
                      ? t("places.form.hours.state_closed")
                      : t("places.form.hours.state_open")}
                  </span>
                  <Switch
                    aria-label={t("places.form.hours.toggle_day", { day: dayLabel })}
                    checked={!isClosed}
                    onCheckedChange={(open) =>
                      open ? setRow(i, DEFAULT_OPEN, DEFAULT_CLOSE) : setRow(i, "", "")
                    }
                  />
                </div>
              </div>

              {!isClosed && (
                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      aria-label={t("places.form.hours.open_for", { day: dayLabel })}
                      {...register(`hours.${i}.open`)}
                      disabled={is24h}
                    />
                    <span aria-hidden className="text-muted-foreground">
                      –
                    </span>
                    <Input
                      type="time"
                      aria-label={t("places.form.hours.close_for", { day: dayLabel })}
                      {...register(`hours.${i}.close`)}
                      disabled={is24h}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        aria-label={`${t("places.form.hours.open_24h")} — ${dayLabel}`}
                        checked={is24h}
                        onCheckedChange={(on) =>
                          on
                            ? setRow(i, H24_OPEN, H24_CLOSE)
                            : setRow(i, DEFAULT_OPEN, DEFAULT_CLOSE)
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        {t("places.form.hours.open_24h")}
                      </span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => copyToAll(i)}>
                      <Copy aria-hidden className="size-4" />
                      {t("places.form.hours.copy_to_all")}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
