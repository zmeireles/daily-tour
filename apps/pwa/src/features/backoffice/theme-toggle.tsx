import { useTranslation } from "react-i18next";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, type ThemePreference } from "@/lib/theme/use-theme";

// Owner light/dark/system toggle. A single button that cycles the persisted
// preference (system → light → dark → system); the icon reflects the current
// preference. Placed in the desktop rail footer and the mobile top app bar.
// Accessible: real <button>, descriptive aria-label naming the current mode,
// keyboard-activated for free.

const ICONS: Record<ThemePreference, typeof Monitor> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export function ThemeToggle({
  size = "icon",
  className,
}: {
  size?: "icon" | "icon-touch";
  className?: string;
}) {
  const { t } = useTranslation("admin");
  const { preference, cycle } = useTheme();
  const Icon = ICONS[preference];
  const modeLabel = t(`theme.${preference}`);

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={cycle}
      aria-label={t("theme.switch", { mode: modeLabel })}
      title={t("theme.switch", { mode: modeLabel })}
      className={className}
    >
      <Icon aria-hidden="true" className="size-5" />
    </Button>
  );
}
