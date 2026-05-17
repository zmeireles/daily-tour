import { useState, useEffect, useCallback } from "react";
import * as SunCalc from "suncalc";

// São Miguel, Azores
const SAO_MIGUEL_LAT = 37.74;
const SAO_MIGUEL_LNG = -25.67;

type Theme = "light" | "dark";

function computeTheme(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;

  try {
    const now = new Date();
    const times = SunCalc.getTimes(now, SAO_MIGUEL_LAT, SAO_MIGUEL_LNG);
    if (now >= times.sunrise && now <= times.sunset) return "light";
    return "dark";
  } catch {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function useThemeAuto() {
  const [theme, setTheme] = useState<Theme>(() => {
    const t = computeTheme();
    applyTheme(t);
    return t;
  });

  const refresh = useCallback(() => {
    const t = computeTheme();
    applyTheme(t);
    setTheme(t);
  }, []);

  useEffect(() => {
    window.addEventListener("focus", refresh);
    const interval = setInterval(refresh, 30 * 60 * 1000);
    return () => {
      window.removeEventListener("focus", refresh);
      clearInterval(interval);
    };
  }, [refresh]);

  const setOverride = useCallback(
    (value: Theme | null) => {
      if (value) {
        localStorage.setItem("theme", value);
      } else {
        localStorage.removeItem("theme");
      }
      refresh();
    },
    [refresh],
  );

  return { theme, setOverride };
}
