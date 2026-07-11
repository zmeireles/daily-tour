import { useEffect, useState } from "react";
import { useNavigate, useBlocker } from "react-router";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown } from "lucide-react";
import { useCreateGuesthouse, useUpdateGuesthouse, type GuesthouseRow } from "./use-guesthouses";
import { MediaUploader, type UploadedAsset } from "@/features/backoffice/places/media-uploader";
import { LocationPicker } from "@/features/backoffice/location-picker";
import { StatusBadge } from "@/features/backoffice/status";
import {
  CONTENT_LOCALES,
  type ContentLocale,
  contentLocaleTabKey,
  zodContentFields,
  buildI18nText,
  i18nTextToFields,
} from "@/features/backoffice/shared/form-locale-config";
import {
  useFieldTranslation,
  type UseFieldTranslationOptions,
} from "@/lib/i18n/use-field-translation";
import { TranslatableField, TranslateAllButton } from "@/components/ui/translatable-field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
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

// Hosts author in Portuguese; the machine-translate helper fills en/es from PT.
const SOURCE_LOCALE: ContentLocale = "pt-PT";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

// Derive a kebab-case slug from a display name: strip diacritics, lowercase,
// collapse non-alphanumerics to single hyphens. Used when the owner leaves the
// (advanced) slug blank so create still satisfies catalog-svc's required slug.
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// zodContentFields returns an index-signature shape; assert the concrete keys so
// noUncheckedIndexedAccess doesn't taint each access with `| undefined`.
type ContentTriple<P extends string> = Record<`${P}_en` | `${P}_pt` | `${P}_es`, z.ZodString>;
const nameFields = zodContentFields("name") as ContentTriple<"name">;

const FormSchema = z.object({
  // Name reuses the shared en/pt/es defs; en stays required (min 1).
  name_en: nameFields.name_en.min(1, "Required"),
  name_pt: nameFields.name_pt,
  name_es: nameFields.name_es,
  // Slug is optional in the form (auto-generated from the name on submit); when
  // the owner does type one it must be kebab-case. Blank is allowed.
  slug: z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || SLUG_RE.test(v), { message: "lowercase kebab-case slug" }),
  address: z.string().min(1, "Required"),
  geom_lat: z.coerce.number().min(-90).max(90),
  geom_lng: z.coerce.number().min(-180).max(180),
  status: z.enum(["active", "archived"]),
  // Optional: a blank input coerces to undefined rather than 0 (Number("") === 0
  // would otherwise fail .positive()); rooms is nullable at the API.
  rooms: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().positive().optional(),
  ),
});

type FormValues = z.infer<typeof FormSchema>;

interface Props {
  initialData?: GuesthouseRow;
  id?: string;
}

// Native <select> styled to match the shared Input (radix Select is portal-based
// and doesn't toggle under jsdom); keeps the status control testable + localizable.
const selectClassName =
  "flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

// Guesthouse media is an array of media-svc asset UUIDs; resolve each to the
// same-origin display route so the editor shows + preserves existing media.
function toUploadedAssets(media: string[] | undefined): UploadedAsset[] {
  return (media ?? []).map((id) => ({ assetId: id, previewUrl: `/v1/media/${id}`, name: id }));
}

export function GuesthouseForm({ initialData, id }: Props) {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const [activeLocale, setActiveLocale] = useState<ContentLocale>(SOURCE_LOCALE);
  const [mediaAssets, setMediaAssets] = useState<UploadedAsset[]>(() =>
    toUploadedAssets(initialData?.media),
  );

  const createMutation = useCreateGuesthouse();
  const updateMutation = useUpdateGuesthouse(id ?? "");
  const isEdit = !!id;

  const nameDefaults = i18nTextToFields(initialData?.name, "name");

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name_en: nameDefaults.name_en,
      name_pt: nameDefaults.name_pt,
      name_es: nameDefaults.name_es,
      slug: initialData?.slug ?? "",
      address: initialData?.address ?? "",
      geom_lat: initialData?.geom_lat ?? 37.75,
      geom_lng: initialData?.geom_lng ?? -25.67,
      status: initialData?.status === "archived" ? "archived" : "active",
      rooms: initialData?.rooms ?? undefined,
    },
  });

  const {
    formState: { isSubmitting, isDirty },
  } = form;

  const translation = useFieldTranslation({
    setValue: form.setValue as UseFieldTranslationOptions["setValue"],
    getValues: form.getValues,
    sourceLocale: SOURCE_LOCALE,
  });

  // Unsaved-changes guard: block in-app navigation while the form is dirty and
  // not mid-save, and warn on browser unload (refresh / tab close).
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !isSubmitting && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const onSubmit = form.handleSubmit(
    async (values) => {
      // Auto-generate the slug from the name when the owner left it blank so the
      // create still satisfies catalog-svc's required kebab-case slug.
      const slug =
        values.slug.trim() || slugify(values.name_en || values.name_pt || values.name_es);

      const body = {
        name: buildI18nText(
          { name_en: values.name_en, name_pt: values.name_pt, name_es: values.name_es },
          "name",
        ),
        slug,
        address: values.address,
        geom_lat: values.geom_lat,
        geom_lng: values.geom_lng,
        media: mediaAssets.map((a) => a.assetId),
        status: values.status,
        rooms: values.rooms ?? null,
      };
      if (isEdit) {
        await updateMutation.mutateAsync(body);
      } else {
        await createMutation.mutateAsync(body);
      }
      void navigate("/admin/guesthouses");
    },
    (errors) => {
      // Surface a required-field error even if the offending locale tab is hidden.
      if (errors.name_en) setActiveLocale("en");
    },
  );

  const mutationError = isEdit ? updateMutation.error : createMutation.error;
  const heading = isEdit
    ? t("guesthouses.edit", "Edit Guesthouse")
    : t("guesthouses.new", "New Guesthouse");

  return (
    <Form {...form}>
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <h1 className="text-xl font-semibold">{heading}</h1>

        {mutationError && (
          <p className="text-sm text-destructive" role="alert">
            {mutationError instanceof Error ? mutationError.message : "Save failed"}
          </p>
        )}

        <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-6">
          {/* Identidade — localized name across en/pt-PT/es */}
          <Card>
            <CardHeader>
              <CardTitle>{t("guesthouses.form.sections.identity", "Identity")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div role="tablist" className="flex gap-1 border-b">
                {CONTENT_LOCALES.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    role="tab"
                    aria-selected={activeLocale === loc}
                    onClick={() => setActiveLocale(loc)}
                    className={`-mb-px px-4 py-2 text-sm font-medium transition-colors ${
                      activeLocale === loc
                        ? "border-b-2 border-primary text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t(`guesthouses.form.tabs.${contentLocaleTabKey(loc)}`)}
                  </button>
                ))}
              </div>

              <TranslatableField
                namePrefix="name"
                locale={activeLocale}
                sourceLocale={SOURCE_LOCALE}
                label={t("guesthouses.form.name", "Name")}
                required={activeLocale === "en"}
                kind="proper_name"
                maxLength={120}
                translation={translation}
              />
            </CardContent>
          </Card>

          {/* Localização — address + assisted map picker; raw lat/lng behind a
              collapsible (they stay the RHF/zod source of truth) */}
          <Card>
            <CardHeader>
              <CardTitle>{t("guesthouses.form.sections.location", "Location")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("guesthouses.form.address", "Address")}
                      <span className="ml-0.5 text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <LocationPicker
                lat={Number(form.watch("geom_lat"))}
                lng={Number(form.watch("geom_lng"))}
                onConfirm={({ lat, lng }) => {
                  form.setValue("geom_lat", lat, { shouldDirty: true });
                  form.setValue("geom_lng", lng, { shouldDirty: true });
                }}
              />
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  <span>{t("location.manual_toggle", "Enter coordinates manually")}</span>
                  <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="geom_lat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("guesthouses.form.latitude", "Latitude")}</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.000001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="geom_lng"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("guesthouses.form.longitude", "Longitude")}</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.000001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Estado — lifecycle status (with live badge) + room count */}
          <Card>
            <CardHeader>
              <CardTitle>{t("guesthouses.form.sections.status", "Status")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("guesthouses.form.status", "Status")}</FormLabel>
                    <div className="flex items-center gap-3">
                      <FormControl>
                        <select {...field} className={selectClassName}>
                          <option value="active">{t("status.guesthouse.active", "Active")}</option>
                          <option value="archived">
                            {t("status.guesthouse.archived", "Archived")}
                          </option>
                        </select>
                      </FormControl>
                      <StatusBadge kind="guesthouse" value={field.value} />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("guesthouses.form.rooms", "Rooms")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="1"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Multimédia — dropzone + thumbnail preview grid (from MediaUploader) */}
          <Card>
            <CardHeader>
              <CardTitle>{t("guesthouses.form.sections.media", "Media")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <MediaUploader
                label={t(
                  "guesthouses.form.media.upload_hint",
                  "Drag & drop images or click to select",
                )}
                initialAssets={mediaAssets}
                onUploaded={setMediaAssets}
              />
              <p className="text-xs text-muted-foreground">
                {t("guesthouses.form.media.hint", "JPG, PNG or WebP · up to 5 MB each")}
              </p>
            </CardContent>
          </Card>

          {/* Avançado — slug (auto-generated; editable), collapsed by default */}
          <Card>
            <CardHeader>
              <CardTitle>{t("guesthouses.form.advanced", "Advanced")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Collapsible defaultOpen={!!initialData?.slug}>
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  <span>{t("guesthouses.form.slug", "Slug")}</span>
                  <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("guesthouses.form.slug", "Slug")}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="my-guesthouse" className="font-mono" />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          {t(
                            "guesthouses.form.slug_hint",
                            "Auto-generated from the name. Leave blank to derive it.",
                          )}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Sticky save bar — pins to the content column (safe-area padding
              clears the home bar); Translate-all fills en/es from the PT name */}
          <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <TranslateAllButton
              translation={translation}
              fields={[{ namePrefix: "name", kind: "proper_name" }]}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="touch"
                onClick={() => void navigate("/admin/guesthouses")}
              >
                {t("guesthouses.form.cancel", "Cancel")}
              </Button>
              <Button type="submit" size="touch" disabled={isSubmitting}>
                {isSubmitting
                  ? t("guesthouses.form.saving", "Saving…")
                  : t("guesthouses.form.save", "Save")}
              </Button>
            </div>
          </div>
        </form>
      </div>

      <AlertDialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("guesthouses.form.unsaved.title", "Discard unsaved changes?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "guesthouses.form.unsaved.body",
                "You have unsaved changes. If you leave now, they'll be lost.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>
              {t("guesthouses.form.unsaved.stay", "Stay")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => blocker.proceed?.()}>
              {t("guesthouses.form.unsaved.leave", "Leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
