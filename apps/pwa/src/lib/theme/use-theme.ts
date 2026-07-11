import { useCallback, useEffect, useSyncExternalStore } from "react";

// Manual light/dark override for the owner backoffice shell, layered on top of
// the guest-side `useThemeAuto` (which follows São Miguel day/night). Three
// preferences — `system` (follow the OS `prefers-color-scheme`, reacting to OS
// changes), `light`, `dark` — persisted in localStorage and applied via the same
// `data-theme` attribute the whole app is already styled off. Kept separate from
// `use-theme-auto.ts` so the guest hook (8 route callers + test mocks) is untouched.

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "dt-admin-theme";

// Cycle order for the toggle button: system → light → dark → system.
const CYCLE: ThemePreference[] = ["system", "light", "dark"];

export function nextPreference(current: ThemePreference): ThemePreference {
  const i = CYCLE.indexOf(current);
  // (i + 1) % length is always an in-bounds index (i is 0..2 for any
  // ThemePreference), so the access is non-null despite noUncheckedIndexedAccess.
  return CYCLE[(i + 1) % CYCLE.length]!;
}

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "system" || v === "light" || v === "dark") return v;
  } catch {
    /* localStorage unavailable (private mode / SSR) — fall through to default */
  }
  return "system";
}

function prefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === "light" || pref === "dark") return pref;
  return prefersDark() ? "dark" : "light";
}

function applyTheme(theme: ResolvedTheme): void {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

// In-memory source of truth for the preference. Seeded from localStorage once;
// thereafter every change updates this synchronously and localStorage is only a
// best-effort persistence layer. This keeps the toggle working AND honest even
// when storage access throws (e.g. a "block all cookies" profile), where
// re-reading storage on every snapshot would pin the preference to the default
// forever (dark unreachable, icon/label lying).
let currentPref: ThemePreference = readPreference();

// Apply the persisted preference at module load so the first backoffice paint is
// already themed (no flash of the wrong theme before effects run).
applyTheme(resolveTheme(currentPref));

// Module-singleton store so every consumer — the rail toggle, the mobile top-bar
// toggle, the shell — reads one source of truth and re-renders together.
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// A primitive-string snapshot from the in-memory var is Object.is-stable between
// changes, so it's safe for useSyncExternalStore (no re-render loop).
function getSnapshot(): ThemePreference {
  return currentPref;
}

function getServerSnapshot(): ThemePreference {
  return "system";
}

export function setThemePreference(pref: ThemePreference): void {
  currentPref = pref;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* best-effort persistence — the in-memory currentPref above is authoritative */
  }
  applyTheme(resolveTheme(pref));
  for (const l of listeners) l();
}

export interface UseThemeResult {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  cycle: () => void;
}

export function useTheme(): UseThemeResult {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    applyTheme(resolveTheme(preference));
    // Only follow the OS in `system` mode, and only where matchMedia exists.
    if (preference !== "system") return;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(resolveTheme("system"));
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => setThemePreference(pref), []);
  const cycle = useCallback(() => setThemePreference(nextPreference(currentPref)), []);

  return { preference, resolvedTheme: resolveTheme(preference), setPreference, cycle };
}
