import * as React from "react";
import * as LucideIcons from "lucide-react";
import { ImageOff, MapPin, type LucideProps } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type I18nText, pickLocale, type Locale } from "@daily-tour/shared-types";

export type PlaceCardAction = {
  slug: string;
  icon: string;
};

export type PlaceCardProps = {
  id: string;
  name: I18nText;
  description: I18nText;
  // null/empty when catalog hasn't yet wired media-svc signed URLs (the
  // hero_image_url field in /v1/discover responses is currently null per
  // bff/src/lib/catalog-client.ts:88 — TODO: T-1.4.x). Render a placeholder
  // instead of a broken-image icon so the card still looks intentional.
  heroImageUrl: string | null | undefined;
  distanceKm?: number;
  wishes: string[];
  actions: PlaceCardAction[];
  onPress?: () => void;
};

function DynamicIcon({ name, ...props }: { name: string } & LucideProps) {
  const IconComp = (LucideIcons as unknown as Record<string, React.FC<LucideProps>>)[name];
  if (!IconComp) return <MapPin {...props} />;
  return <IconComp {...props} />;
}

// Fallback rendered in the hero slot when heroImageUrl is missing. Picks
// the first action's Lucide icon so the placeholder still carries
// category-relevant context (Utensils for eat, Eye for see, etc.); falls
// back to a generic ImageOff icon when actions are empty too.
function HeroPlaceholder({ actions, label }: { actions: PlaceCardAction[]; label: string }) {
  const firstIcon = actions[0]?.icon;
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/60"
      role="img"
      aria-label={`${label} — image coming soon`}
      data-testid="place-card-hero-placeholder"
    >
      {firstIcon ? (
        <DynamicIcon name={firstIcon} size={40} className="text-muted-foreground/60" />
      ) : (
        <ImageOff size={40} className="text-muted-foreground/60" />
      )}
    </div>
  );
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function PlaceCard({
  id: _id,
  name,
  description: _description,
  heroImageUrl,
  distanceKm,
  wishes: _wishes,
  actions,
  onPress,
}: PlaceCardProps) {
  const { i18n } = useTranslation();
  const displayName = pickLocale(name, i18n.language as Locale);
  const distanceLabel = distanceKm !== undefined ? formatDistance(distanceKm) : null;

  return (
    <motion.div
      whileTap={{ scale: onPress ? 0.97 : 1 }}
      transition={{ duration: 0.15 }}
      className="motion-reduce:transform-none"
    >
      <Card
        className={cn("overflow-hidden", onPress && "cursor-pointer")}
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
        {/* 16:9 hero */}
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {heroImageUrl ? (
            <img
              src={heroImageUrl}
              alt={displayName}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <HeroPlaceholder actions={actions} label={displayName} />
          )}
          {distanceLabel && (
            <Badge
              variant="secondary"
              className="absolute left-2 top-2"
              aria-label={`${distanceLabel} away`}
            >
              {distanceLabel}
            </Badge>
          )}
        </div>

        <CardContent className="px-3 pt-3 pb-0">
          <h3
            className="font-display text-lg leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {displayName}
          </h3>
        </CardContent>

        {actions.length > 0 && (
          <div
            className="flex gap-2 overflow-x-auto snap-x snap-mandatory px-3 py-3 min-h-[56px] items-center"
            aria-label="Action chips"
          >
            {actions.map((action) => (
              <Badge
                key={action.slug}
                variant="outline"
                className="shrink-0 snap-start flex items-center gap-1.5 px-3 py-1.5 cursor-default"
              >
                <DynamicIcon name={action.icon} size={14} aria-hidden="true" />
                <span>{action.slug}</span>
              </Badge>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
