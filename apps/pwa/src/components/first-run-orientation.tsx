import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, Compass, MessageCircle, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "dt_intro_dismissed";
const VISIT_COUNT_KEY = "pwa_visit_count";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // storage unavailable — silently ignore
  }
}

function readVisitCount(): number {
  try {
    return parseInt(localStorage.getItem(VISIT_COUNT_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

// First-run only: shown while the guest is brand-new (visit count <= 1) and not
// yet dismissed. Dismissal persists, so it never reappears once acknowledged.
function shouldShow(): boolean {
  return !readDismissed() && readVisitCount() <= 1;
}

type ActionRow = {
  Icon: LucideIcon;
  labelKey: string;
  blurbKey: string;
};

const ACTIONS: ActionRow[] = [
  { Icon: CalendarDays, labelKey: "onboarding.plan.label", blurbKey: "onboarding.plan.blurb" },
  { Icon: Compass, labelKey: "onboarding.discover.label", blurbKey: "onboarding.discover.blurb" },
  {
    Icon: MessageCircle,
    labelKey: "onboarding.message.label",
    blurbKey: "onboarding.message.blurb",
  },
];

export type FirstRunOrientationProps = {
  className?: string;
};

// One-time, dismissible welcome card. Renders nothing once dismissed or after a
// guest's first visit, so it neither blocks nor shifts the home layout long-term.
export function FirstRunOrientation({ className }: FirstRunOrientationProps) {
  const { t } = useTranslation("home");
  const [visible, setVisible] = useState(shouldShow);

  if (!visible) return null;

  const handleDismiss = () => {
    writeDismissed();
    setVisible(false);
  };

  return (
    <section
      aria-label={t("onboarding.title", "Welcome to Daily Tour")}
      className={cn(
        "relative mx-4 mt-4 rounded-xl border border-outline-variant bg-surface-container p-5",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        aria-label={t("onboarding.close", "Close")}
        className="absolute right-2 top-2 size-8 text-on-surface-variant"
      >
        <X aria-hidden="true" className="size-4" />
      </Button>

      <h2 className="font-display text-xl text-on-surface">
        {t("onboarding.title", "Welcome to Daily Tour")}
      </h2>
      <p className="mt-1 max-w-prose text-sm text-on-surface-variant">
        {t("onboarding.intro", "Three things you can do here:")}
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {ACTIONS.map(({ Icon, labelKey, blurbKey }) => (
          <li key={labelKey} className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <span className="flex flex-col">
              <span className="font-medium text-on-surface">{t(labelKey)}</span>
              <span className="text-sm text-on-surface-variant">{t(blurbKey)}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex justify-end">
        <Button type="button" onClick={handleDismiss}>
          {t("onboarding.dismiss", "Got it")}
        </Button>
      </div>
    </section>
  );
}
