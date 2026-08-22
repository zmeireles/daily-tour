import * as React from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";

// A 24-hour time field.
//
// It replaces `<input type="time">`, which cannot be used here: a native time
// input renders in the BROWSER's locale, not the app's. An owner running the
// console in Portuguese on a US-locale browser was shown "07:15 AM — 11:00 PM",
// which is not how time is written in pt-PT, and no app-level setting can change
// it. The native picker's chrome is also unstyleable and differs per browser.
//
// The value in and out stays `"HH:MM"` (24h, zero-padded) — the same string the
// native input produced — so nothing downstream changes.

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** True for a zero-padded 24-hour `HH:MM`. An empty string is NOT valid here. */
export function isValidTime(value: string): boolean {
  return HH_MM.test(value);
}

function format(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Coerce whatever was typed into `HH:MM`, or `""` for empty input.
 *
 * `"7:5"` → `"07:05"` · `"1930"` → `"19:30"` · `"25:99"` → `"23:59"`.
 * Clamps rather than rejecting: the owner sees a usable time instead of losing
 * what they typed, which is the failure this editor has been bitten by before.
 */
export function normaliseTime(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") return "";

  let hours: number;
  let minutes: number;

  if (trimmed.includes(":")) {
    // A typed colon says where the split is, and must be believed: reading
    // "7:5" as the digits "75" would clamp it to 23:00 and destroy what the
    // owner wrote, which is the exact data loss this editor exists to avoid.
    const [rawHours = "", rawMinutes = ""] = trimmed.split(":");
    const h = rawHours.replace(/\D/g, "");
    const m = rawMinutes.replace(/\D/g, "");
    if (h === "" && m === "") return "";
    hours = Number(h || 0);
    minutes = Number(m || 0);
  } else {
    // No colon: the last two digits are minutes ("1930" → 19:30, "9" → 09:00).
    const digits = trimmed.replace(/\D/g, "").slice(0, 4);
    if (digits.length === 0) return "";
    hours = digits.length <= 2 ? Number(digits) : Number(digits.slice(0, -2));
    minutes = digits.length <= 2 ? 0 : Number(digits.slice(-2));
  }

  return format(Math.min(23, Math.max(0, hours)), Math.min(59, Math.max(0, minutes)));
}

/** Move a time by ±minutes, wrapping across midnight in both directions. */
export function stepTime(value: string, deltaMinutes: number): string {
  const base = isValidTime(value) ? value : "00:00";
  const [hours = 0, minutes = 0] = base.split(":").map(Number);
  const total = (((hours * 60 + minutes + deltaMinutes) % 1440) + 1440) % 1440;
  return format(Math.floor(total / 60), total % 60);
}

const STEP_MINUTES = 5;
const STEP_MINUTES_LARGE = 60;

export interface TimeFieldProps extends Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "type"
> {
  /** `"HH:MM"`, or `""` for no time set. */
  value: string;
  onChange: (value: string) => void;
}

export function TimeField({ value, onChange, className, disabled, ...props }: TimeFieldProps) {
  // Non-empty and unparseable — flagged while typing, corrected on blur.
  const invalid = value !== "" && !isValidTime(value);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    // Arrow stepping is why this reads as a real time control rather than a
    // text box: ±5 min, or ±1 hour with Shift.
    event.preventDefault();
    const magnitude = event.shiftKey ? STEP_MINUTES_LARGE : STEP_MINUTES;
    onChange(stepTime(value, event.key === "ArrowUp" ? magnitude : -magnitude));
  }

  return (
    <div
      data-slot="time-field"
      className={cn(
        "flex min-h-11 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
        "ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "cursor-not-allowed opacity-50",
        invalid && "border-destructive ring-destructive/20",
        className,
      )}
    >
      <Clock aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <input
        // Spread FIRST so the handlers below cannot be clobbered: a consumer
        // passing `onBlur` must not silently disable normalisation. Their
        // handler still runs — it is called from ours.
        {...props}
        // `text`, not `time` — see the note at the top of this file.
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={5}
        placeholder="--:--"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        value={value}
        onChange={(event) => {
          // Keep only what can appear in HH:MM so the field cannot hold letters,
          // but do NOT normalise mid-keystroke — that would fight the owner as
          // they type the second digit.
          onChange(event.target.value.replace(/[^\d:]/g, "").slice(0, 5));
        }}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          const tidy = normaliseTime(event.target.value);
          if (tidy !== value) onChange(tidy);
          props.onBlur?.(event);
        }}
        className={cn(
          "min-w-0 flex-1 bg-transparent tabular-nums outline-none",
          "placeholder:text-muted-foreground disabled:cursor-not-allowed",
        )}
      />
    </div>
  );
}
