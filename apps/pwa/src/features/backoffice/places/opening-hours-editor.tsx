import { useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Copy } from "lucide-react";
import type { PlaceHoursEntry } from "./use-places";
import { TimeField, isValidTime } from "@/components/ui/time-field";
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
//
// The half-filled case is rejected by hoursRowsSchema before submit ever reaches
// here — otherwise this filter drops the row and the day silently persists as
// closed, losing what the owner typed.
export function rowsToHours(rows: HoursRow[]): PlaceHoursEntry[] {
  return DAY_ROWS.map((day, i) => ({
    dow: day.dow,
    open: (rows[i]?.open ?? "").trim(),
    close: (rows[i]?.close ?? "").trim(),
  })).filter((h) => h.open !== "" && h.close !== "");
}

/**
 * Form schema for the 7 day rows. A day is either closed (both blank) or open
 * (both filled); a half-filled row is a validation error rather than a silent
 * drop. The issue is attached to whichever input is empty so the message lands
 * on the field the owner still has to fill.
 */
export const hoursRowsSchema = z
  .array(z.object({ open: z.string().default(""), close: z.string().default("") }))
  .superRefine((rows, ctx) => {
    rows.forEach((row, i) => {
      const open = (row.open ?? "").trim();
      const close = (row.close ?? "").trim();
      // A malformed time is its own error. `type="time"` used to make this
      // unreachable by construction; TimeField is a text input, so the
      // guarantee has to live here instead of being assumed.
      for (const side of ["open", "close"] as const) {
        const raw = side === "open" ? open : close;
        if (raw !== "" && !isValidTime(raw)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [i, side],
            message: "Times must be written as HH:MM",
          });
        }
      }
      if ((open === "") === (close === "")) return; // both blank or both filled
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [i, open === "" ? "open" : "close"],
        message: "Both opening and closing times are required",
      });
    });
  });

// The editor reads/writes the shared form's `hours` array via context, so the
// parent owns the field and its persisted shape stays untouched.
type HoursForm = { hours: HoursRow[] };

export function OpeningHoursEditor() {
  const { t } = useTranslation("admin");
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<HoursForm>();
  const rows = useWatch({ control, name: "hours" });

  // Hours stashed when a day is switched to 24h, so switching back restores what
  // the owner had rather than clobbering it with the 09:00–17:00 default.
  const preH24 = useRef<Map<number, HoursRow>>(new Map());

  function setRow(i: number, open: string, close: string) {
    setValue(`hours.${i}.open`, open, { shouldDirty: true, shouldValidate: true });
    setValue(`hours.${i}.close`, close, { shouldDirty: true, shouldValidate: true });
  }

  function toggle24h(i: number, on: boolean) {
    if (on) {
      const current = rows?.[i];
      // Stash anything the owner actually typed, including a half-filled row.
      // Restoring a partial re-surfaces the "both times required" prompt, which
      // beats replacing their input with the 09:00–17:00 default — discarding
      // typed input silently is the very thing this editor was fixed for.
      if (current?.open || current?.close) preH24.current.set(i, { ...current });
      setRow(i, H24_OPEN, H24_CLOSE);
      return;
    }
    // A day persisted as 24h has nothing stashed on first load, so fall back to
    // the defaults rather than leaving the row blank (which would read as closed).
    const restored = preH24.current.get(i);
    preH24.current.delete(i);
    setRow(i, restored?.open ?? DEFAULT_OPEN, restored?.close ?? DEFAULT_CLOSE);
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
          // Either side of the pair can carry the issue; one message per row.
          const rowError =
            errors.hours?.[i]?.open?.message ?? errors.hours?.[i]?.close?.message ?? null;
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
                    <TimeField
                      aria-label={t("places.form.hours.open_for", { day: dayLabel })}
                      value={row.open}
                      onChange={(v) =>
                        setValue(`hours.${i}.open`, v, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      disabled={is24h}
                    />
                    <span aria-hidden className="text-muted-foreground">
                      –
                    </span>
                    <TimeField
                      aria-label={t("places.form.hours.close_for", { day: dayLabel })}
                      value={row.close}
                      onChange={(v) =>
                        setValue(`hours.${i}.close`, v, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      disabled={is24h}
                    />
                  </div>
                  {rowError && (
                    <p className="text-sm text-destructive" role="alert">
                      {t("places.form.hours.both_times_required")}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        aria-label={`${t("places.form.hours.open_24h")} — ${dayLabel}`}
                        checked={is24h}
                        onCheckedChange={(on) => toggle24h(i, on)}
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
