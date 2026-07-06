import * as React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Globe, Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  type ContentLocale,
  type FieldTranslation,
  LOCALE_SUFFIX,
} from "@/lib/i18n/use-field-translation";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type TranslateKind = "prose" | "proper_name";

const ALL_LOCALES: ContentLocale[] = ["en", "pt-PT", "es"];

export interface TranslatableFieldProps {
  /** Field-name stem shared by every locale, e.g. `name` → `name_en`/`name_pt`/`name_es`. */
  namePrefix: string;
  /** The locale of the currently-active tab — this field edits `${namePrefix}_${suffix}`. */
  locale: ContentLocale;
  /** The locale the owner authors in; the globe translate-from source. */
  sourceLocale: ContentLocale;
  label: string;
  /** Textarea instead of a single-line input. */
  multiline?: boolean;
  /** When set, shows a `value.length / maxLength` counter. Display-only; never blocks Save. */
  maxLength?: number;
  required?: boolean;
  placeholder?: string;
  /** Translation kind passed to the API. `proper_name` for name fields, else `prose`. */
  kind?: TranslateKind;
  /** The shared translation controller returned by `useFieldTranslation`. */
  translation: FieldTranslation;
}

/**
 * A single locale-tab field with an inline machine-translation affordance.
 *
 * - Globe icon-button (shown only on non-source locales) fills the field from the
 *   source locale. Empty target → translate immediately; non-empty target → confirm
 *   via AlertDialog first (suggest, never silently overwrite).
 * - After an overwrite the prior value is restorable via an "undo" toast action.
 * - Shows an "auto-translated" badge, and an amber "source changed" hint when the
 *   source has been edited since the last translation.
 * - Manual edits clear the auto-translated/out-of-sync flags.
 */
export function TranslatableField({
  namePrefix,
  locale,
  sourceLocale,
  label,
  multiline = false,
  maxLength,
  required = false,
  placeholder,
  kind = "prose",
  translation,
}: TranslatableFieldProps) {
  const { t } = useTranslation("admin");
  const { control, getValues, setValue } = useFormContext();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const fieldName = `${namePrefix}_${LOCALE_SUFFIX[locale]}`;
  const showTranslate = locale !== sourceLocale;
  const st = translation.status(namePrefix, locale);

  async function runTranslate() {
    await translation.translateField(namePrefix, [locale], kind);
  }

  function onGlobeClick() {
    const current = getValues(fieldName);
    if (typeof current === "string" && current.trim()) {
      // Non-empty target: suggest, don't silently overwrite.
      setConfirmOpen(true);
    } else {
      void runTranslate();
    }
  }

  async function onConfirmOverwrite() {
    setConfirmOpen(false);
    const prior = getValues(fieldName);
    const ok = await translation.translateField(namePrefix, [locale], kind);
    if (!ok) return;
    // Offer a one-tap undo restoring the value we just replaced.
    toast.success(t("translate.toast_done"), {
      action: {
        label: t("translate.undo"),
        onClick: () => {
          setValue(fieldName, prior ?? "", { shouldDirty: true });
          translation._notifyEdit(namePrefix, locale);
        },
      },
    });
  }

  return (
    <FormField
      control={control}
      name={fieldName}
      render={({ field }) => {
        const value = typeof field.value === "string" ? field.value : "";
        return (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>
                {label}
                {required ? <span className="ml-0.5 text-destructive">*</span> : null}
              </FormLabel>
              <div className="flex items-center gap-2">
                {st.autoTranslated ? (
                  <Badge variant="secondary" className="gap-1">
                    <Languages aria-hidden />
                    {t("translate.auto_badge")}
                  </Badge>
                ) : null}
                {showTranslate ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label={t("translate.field")}
                          disabled={st.translating}
                          onClick={onGlobeClick}
                        >
                          {st.translating ? (
                            <Loader2 className="animate-spin" aria-hidden />
                          ) : (
                            <Globe aria-hidden />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t("translate.field")}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : null}
              </div>
            </div>

            <FormControl>
              {multiline ? (
                <Textarea
                  {...field}
                  value={value}
                  placeholder={placeholder}
                  maxLength={maxLength}
                  disabled={st.translating}
                  onChange={(e) => {
                    field.onChange(e);
                    translation._notifyEdit(namePrefix, locale);
                  }}
                />
              ) : (
                <Input
                  {...field}
                  value={value}
                  placeholder={placeholder}
                  maxLength={maxLength}
                  disabled={st.translating}
                  onChange={(e) => {
                    field.onChange(e);
                    translation._notifyEdit(namePrefix, locale);
                  }}
                />
              )}
            </FormControl>

            {st.outOfSync ? (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                {t("translate.out_of_sync")}
              </p>
            ) : null}

            {typeof maxLength === "number" ? (
              <p className={cn("text-right text-xs text-muted-foreground")}>
                {value.length} / {maxLength}
              </p>
            ) : null}

            <FormMessage />

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("translate.overwrite_title")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("translate.overwrite_body")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("translate.overwrite_cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={onConfirmOverwrite}>
                    {t("translate.overwrite_confirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </FormItem>
        );
      }}
    />
  );
}

export interface TranslateAllButtonProps {
  translation: FieldTranslation;
  fields: Array<{ namePrefix: string; kind?: TranslateKind }>;
  className?: string;
}

/**
 * Bulk-translate button: fills every empty target cell across `fields` from the
 * source locale. Disabled while any of those fields is mid-translation.
 */
export function TranslateAllButton({ translation, fields, className }: TranslateAllButtonProps) {
  const { t } = useTranslation("admin");
  const anyTranslating = fields.some(({ namePrefix }) =>
    ALL_LOCALES.some((loc) => translation.status(namePrefix, loc).translating),
  );

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      disabled={anyTranslating}
      onClick={() => void translation.translateAll(fields)}
    >
      {anyTranslating ? (
        <Loader2 className="animate-spin" aria-hidden />
      ) : (
        <Languages aria-hidden />
      )}
      {t("translate.all")}
    </Button>
  );
}
