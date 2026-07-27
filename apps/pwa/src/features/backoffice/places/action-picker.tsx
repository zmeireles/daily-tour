import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ActionTaxonomyEntry, PlaceActionTag } from "./use-places";

interface Props {
  taxonomy: ActionTaxonomyEntry[];
  value: PlaceActionTag[];
  onChange: (next: PlaceActionTag[]) => void;
  /** Content locale to label with; falls back to en, then the raw slug. */
  locale: string;
  disabled?: boolean;
}

/** Seeded labels carry en + pt-PT only, so es/fr fall back to en rather than a slug. */
function label(i18n: Record<string, string>, locale: string, slug: string): string {
  return i18n[locale] ?? i18n.en ?? slug;
}

/**
 * Action + wish picker for a place.
 *
 * Two levels, because the data model gives no choice: discovery reaches a place only
 * through place_action_wish, whose wish_id is NOT NULL — an action with no wish cannot
 * be stored. So picking "Eat" alone is not a valid state, and the UI says so inline
 * rather than letting the save fail with a schema error.
 *
 * Plain buttons with aria-pressed instead of a radix primitive: portal-based controls
 * don't toggle under jsdom, and this needs to stay unit-testable (same reasoning as
 * the native <select> in place-form).
 */
export function ActionPicker({ taxonomy, value, onChange, locale, disabled }: Props) {
  const { t } = useTranslation("admin");

  const selectedFor = (slug: string) => value.find((v) => v.action_slug === slug);

  function toggleAction(slug: string) {
    if (selectedFor(slug)) {
      onChange(value.filter((v) => v.action_slug !== slug));
    } else {
      // Added with no wishes yet — deliberately an incomplete state the user must
      // resolve; the inline hint below marks it.
      onChange([...value, { action_slug: slug, wish_slugs: [] }]);
    }
  }

  function toggleWish(actionSlug: string, wishSlug: string) {
    onChange(
      value.map((entry) => {
        if (entry.action_slug !== actionSlug) return entry;
        const has = entry.wish_slugs.includes(wishSlug);
        return {
          ...entry,
          wish_slugs: has
            ? entry.wish_slugs.filter((w) => w !== wishSlug)
            : [...entry.wish_slugs, wishSlug],
        };
      }),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {t(
          "places.form.actions.help",
          "Choose how guests will find this place, then at least one detail for each.",
        )}
      </p>

      <div className="flex flex-wrap gap-2">
        {taxonomy.map((action) => {
          const selected = !!selectedFor(action.slug);
          // An action with no wishes can never satisfy the ≥1-wish rule, so
          // selecting it would block Save with a per-item error that has nowhere
          // to render. Unreachable with the current seed (every action has 6
          // wishes), but cheap insurance against a silent dead end.
          const unusable = action.wishes.length === 0;
          return (
            <button
              key={action.slug}
              type="button"
              disabled={disabled || (unusable && !selected)}
              aria-pressed={selected}
              onClick={() => toggleAction(action.slug)}
              className={cn(
                "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-foreground hover:bg-accent",
              )}
            >
              {label(action.label_i18n, locale, action.slug)}
            </button>
          );
        })}
      </div>

      {taxonomy
        .filter((action) => selectedFor(action.slug))
        .map((action) => {
          const entry = selectedFor(action.slug)!;
          const actionLabel = label(action.label_i18n, locale, action.slug);
          return (
            <fieldset key={action.slug} className="rounded-md border border-input p-3">
              <legend className="px-1 text-sm font-medium">{actionLabel}</legend>

              {action.wishes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("places.form.actions.noWishes", "No options available for this category yet.")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {action.wishes.map((wish) => {
                    const on = entry.wish_slugs.includes(wish.slug);
                    return (
                      <button
                        key={wish.slug}
                        type="button"
                        disabled={disabled}
                        aria-pressed={on}
                        onClick={() => toggleWish(action.slug, wish.slug)}
                        className={cn(
                          "min-h-11 rounded-md border px-3 py-2 text-sm transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                          on
                            ? "border-primary bg-accent text-accent-foreground"
                            : "border-input bg-background text-foreground hover:bg-accent",
                        )}
                      >
                        {label(wish.label_i18n, locale, wish.slug)}
                      </button>
                    );
                  })}
                </div>
              )}

              {entry.wish_slugs.length === 0 && action.wishes.length > 0 && (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {t("places.form.actions.needWish", {
                    defaultValue: "Pick at least one option for {{action}}.",
                    action: actionLabel,
                  })}
                </p>
              )}
            </fieldset>
          );
        })}
    </div>
  );
}
