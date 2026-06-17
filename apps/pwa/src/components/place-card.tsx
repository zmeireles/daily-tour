import * as React from "react";
import * as LucideIcons from "lucide-react";
import { ImageOff, MapPin, type LucideProps } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DistanceChip } from "@/components/distance-chip";
import { cn } from "@/lib/utils";
import { formatDistanceKm } from "@/lib/format-distance";
import { type I18nText, pickLocale, type Locale } from "@daily-tour/shared-types";

export type PlaceCardAction = {
  slug: string;
  icon: string;
};

// "stacked" (default) — cream-paper card: 16:9 hero, name + action chips below.
// "overlay" — portrait ribbon card: photo fills a 4:5 frame, name in a bottom
//   gradient block, glass distance chip top-right, no action chips.
export type PlaceCardVariant = "stacked" | "overlay";

export type PlaceCardProps = {
  id: string;
  name: I18nText;
  description: I18nText;
  // null/empty only for places with no media row. Real hero URLs are wired
  // through /v1/discover (seed #250–#252: 18 of 43 places carry a hero — 14
  // Commons landmarks + Miguel's 4 guesthouses). Photo-less places render the
  // branded placeholder instead of a broken-image icon so the card still
  // looks intentional.
  heroImageUrl: string | null | undefined;
  distanceKm?: number;
  wishes: string[];
  actions: PlaceCardAction[];
  // Optional override for the hero placeholder's icon. Callers in
  // action-context surfaces (e.g. ActionDrillDownRoute) pass the action
  // category icon here (Utensils for eat, Eye for see, etc.) so the
  // placeholder is context-relevant rather than borrowing the first wish
  // chip's icon (which is currently hardcoded to MapPin everywhere — see
  // DT-TESTS-12 for the regression that surfaced this).
  placeholderIcon?: string | null;
  variant?: PlaceCardVariant;
  onPress?: () => void;
};

function DynamicIcon({ name, ...props }: { name: string } & LucideProps) {
  const IconComp = (LucideIcons as unknown as Record<string, React.FC<LucideProps>>)[name];
  if (!IconComp) return <MapPin {...props} />;
  return <IconComp {...props} />;
}

// Fallback rendered in the hero slot when heroImageUrl is missing. Icon
// resolution priority:
//   1. placeholderIcon (explicit from caller — surfaces with action context)
//   2. actions[0]?.icon (first chip's icon — currently always "MapPin"
//      until the chip-icon registry lands; see daily-tour project task 127)
//   3. ImageOff (generic fallback when neither is available)
// tone "light" (default) = cream gradient for the stacked variant, where the
// name sits BELOW the hero on a cream card. tone "dark" = forest-green editorial
// surface for the overlay variant, where the name is OVERLAID in white — a light
// placeholder there renders white-on-cream (unreadable for multi-line names).
function HeroPlaceholder({
  actions,
  label,
  placeholderIcon,
  tone = "light",
}: {
  actions: PlaceCardAction[];
  label: string;
  placeholderIcon?: string | null;
  tone?: "light" | "dark";
}) {
  const iconName = placeholderIcon ?? actions[0]?.icon;
  const iconClass = tone === "dark" ? "text-white/70" : "text-muted-foreground/60";
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br",
        tone === "dark" ? "from-[var(--tea-600)] to-[var(--tea-500)]" : "from-muted to-muted/60",
      )}
      role="img"
      aria-label={`${label} — image coming soon`}
      data-testid="place-card-hero-placeholder"
    >
      {iconName ? (
        <DynamicIcon name={iconName} size={40} className={iconClass} />
      ) : (
        <ImageOff size={40} className={iconClass} />
      )}
    </div>
  );
}

// Hero media (photo or branded placeholder), shared by both variants. Callers
// control the wrapper sizing; this only fills it.
function HeroMedia({
  heroImageUrl,
  displayName,
  actions,
  placeholderIcon,
  tone,
}: {
  heroImageUrl: string | null | undefined;
  displayName: string;
  actions: PlaceCardAction[];
  placeholderIcon?: string | null;
  tone?: "light" | "dark";
}) {
  if (heroImageUrl) {
    return (
      <img
        src={heroImageUrl}
        alt={displayName}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <HeroPlaceholder
      actions={actions}
      label={displayName}
      placeholderIcon={placeholderIcon}
      tone={tone}
    />
  );
}

// Press/keyboard affordances shared by both variants: tap-scale animation plus
// button role + Enter/Space activation when onPress is supplied.
function PressableShell({
  onPress,
  className,
  children,
}: {
  onPress?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      whileTap={{ scale: onPress ? 0.97 : 1 }}
      transition={{ duration: 0.15 }}
      className="motion-reduce:transform-none"
    >
      <div
        className={cn(className, onPress && "cursor-pointer")}
        onClick={onPress}
        role={onPress ? "button" : undefined}
        tabIndex={onPress ? 0 : undefined}
        onKeyDown={
          onPress
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPress();
                }
              }
            : undefined
        }
      >
        {children}
      </div>
    </motion.div>
  );
}

export function PlaceCard({
  id: _id,
  name,
  description: _description,
  heroImageUrl,
  distanceKm,
  wishes: _wishes,
  actions,
  placeholderIcon,
  variant = "stacked",
  onPress,
}: PlaceCardProps) {
  const { i18n } = useTranslation();
  const displayName = pickLocale(name, i18n.language as Locale);
  const distanceLabel = distanceKm !== undefined ? formatDistanceKm(distanceKm) : null;

  if (variant === "overlay") {
    return (
      <PressableShell
        onPress={onPress}
        className="relative aspect-[4/5] overflow-hidden rounded-xl bg-surface-container-high"
      >
        <div className="absolute inset-0 h-full w-full">
          <HeroMedia
            heroImageUrl={heroImageUrl}
            displayName={displayName}
            actions={actions}
            placeholderIcon={placeholderIcon}
            tone="dark"
          />
        </div>
        {distanceKm !== undefined && distanceLabel && (
          <DistanceChip
            km={distanceKm}
            className="absolute right-3 top-3 bg-tertiary-container/80 backdrop-blur-md"
            aria-label={`${distanceLabel} away`}
          />
        )}
        {/* Taller, stronger scrim so multi-line names stay legible over real
            photos; the dark placeholder covers the no-photo case. */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-4 pt-12">
          <h3 className="font-display text-lg leading-tight text-white">{displayName}</h3>
        </div>
      </PressableShell>
    );
  }

  return (
    <PressableShell onPress={onPress}>
      <Card className="overflow-hidden rounded-xl border-outline-variant bg-surface-container-low shadow-none">
        {/* 16:9 hero */}
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <HeroMedia
            heroImageUrl={heroImageUrl}
            displayName={displayName}
            actions={actions}
            placeholderIcon={placeholderIcon}
          />
          {distanceKm !== undefined && distanceLabel && (
            <DistanceChip
              km={distanceKm}
              className="absolute left-2 top-2"
              aria-label={`${distanceLabel} away`}
            />
          )}
        </div>

        <CardContent className="px-3 pt-3 pb-0">
          <h3 className="font-display text-lg leading-tight text-on-surface">{displayName}</h3>
        </CardContent>

        {actions.length > 0 && (
          <div
            className="flex min-h-[56px] snap-x snap-mandatory items-center gap-2 overflow-x-auto px-3 py-3"
            aria-label="Action chips"
          >
            {actions.map((action) => (
              <Badge
                key={action.slug}
                variant="outline"
                className="flex shrink-0 cursor-default snap-start items-center gap-1.5 border-outline-variant px-3 py-1.5 text-on-surface-variant"
              >
                <DynamicIcon name={action.icon} size={14} aria-hidden="true" />
                <span>{action.slug}</span>
              </Badge>
            ))}
          </div>
        )}
      </Card>
    </PressableShell>
  );
}
