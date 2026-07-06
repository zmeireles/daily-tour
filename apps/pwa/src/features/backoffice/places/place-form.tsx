import { useEffect, useState } from "react";
import { useNavigate, useBlocker } from "react-router";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreatePlace, useUpdatePlace, type PlaceRow } from "./use-places";
import { MediaUploader, type UploadedAsset } from "./media-uploader";
import { OpeningHoursEditor, hoursToRows, rowsToHours } from "./opening-hours-editor";
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
import { Switch } from "@/components/ui/switch";
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

// zodContentFields returns an index-signature shape ({ [x: string]: ZodString }).
// Assert the concrete keys once so noUncheckedIndexedAccess doesn't taint each
// access with `| undefined` and so z.infer keeps name_pt/name_es (spreading the
// raw index-signature shape into z.object drops those keys from the type).
type ContentTriple<P extends string> = Record<`${P}_en` | `${P}_pt` | `${P}_es`, z.ZodString>;
const nameFields = zodContentFields("name") as ContentTriple<"name">;
const descriptionFields = zodContentFields("description") as ContentTriple<"description">;

const FormSchema = z.object({
  // Content fields reuse the shared en/pt/es defs; en stays required (min 1).
  name_en: nameFields.name_en.min(1, "Required"),
  name_pt: nameFields.name_pt,
  name_es: nameFields.name_es,
  description_en: descriptionFields.description_en.min(1, "Required"),
  description_pt: descriptionFields.description_pt,
  description_es: descriptionFields.description_es,
  address: z.string().min(1, "Required"),
  geom_lat: z.coerce.number().min(-90).max(90),
  geom_lng: z.coerce.number().min(-180).max(180),
  status: z.enum(["draft", "owner_approved", "published", "archived"]),
  is_hosts_pick: z.boolean().default(false),
  contact_phone: z.string().default(""),
  contact_email: z.string().default(""),
  contact_website: z.string().default(""),
  // One row per DAY_ROWS entry (display order), kept as free-text HH:MM. Only
  // rows with both open+close set are emitted to the API's hours[] on submit.
  hours: z.array(z.object({ open: z.string().default(""), close: z.string().default("") })),
  // "" maps to null (year-round) on submit; "summer"/"winter" pass through.
  season: z.enum(["", "summer", "winter"]).default(""),
});

type FormValues = z.infer<typeof FormSchema>;

interface Props {
  initialData?: PlaceRow;
  id?: string;
}

// Native <select> styled to match the shared Input (radix Select is portal-based
// and doesn't toggle under jsdom — see the Switch note; a native select keeps the
// status/season controls testable and localizable).
const selectClassName =
  "flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

// Map a place's persisted media into the uploader's asset shape so the editor
// shows + preserves existing media (assetId carries it back into the save body).
function toUploadedAssets(media: PlaceRow["media"]): UploadedAsset[] {
  return (media ?? []).map((m) => ({
    assetId: m.id,
    previewUrl: m.url,
    name: m.url.split("/").pop() || m.id,
  }));
}

export function PlaceForm({ initialData, id }: Props) {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const [activeLocale, setActiveLocale] = useState<ContentLocale>(SOURCE_LOCALE);
  const [mediaAssets, setMediaAssets] = useState<UploadedAsset[]>(() =>
    toUploadedAssets(initialData?.media),
  );

  const createMutation = useCreatePlace();
  const updateMutation = useUpdatePlace(id ?? "");
  const isEdit = !!id;

  const nameDefaults = i18nTextToFields(initialData?.name, "name");
  const descriptionDefaults = i18nTextToFields(initialData?.description, "description");

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name_en: nameDefaults.name_en,
      name_pt: nameDefaults.name_pt,
      name_es: nameDefaults.name_es,
      description_en: descriptionDefaults.description_en,
      description_pt: descriptionDefaults.description_pt,
      description_es: descriptionDefaults.description_es,
      address: initialData?.address ?? "",
      geom_lat: initialData?.geom_lat ?? 37.75,
      geom_lng: initialData?.geom_lng ?? -25.67,
      status: (initialData?.status as FormValues["status"]) ?? "draft",
      is_hosts_pick: initialData?.is_hosts_pick ?? false,
      contact_phone: initialData?.contacts?.phone ?? "",
      contact_email: initialData?.contacts?.email ?? "",
      contact_website: initialData?.contacts?.website ?? "",
      hours: hoursToRows(initialData?.hours),
      season: initialData?.season ?? "",
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
      // Contacts: omit empty optional fields (the schema's phone/email/website
      // reject "" — they validate as phone/email/url). Preserve any pre-existing
      // social[] verbatim since this form doesn't edit it yet.
      const contacts: PlaceRow["contacts"] = {
        social: initialData?.contacts?.social ?? [],
      };
      if (values.contact_phone.trim()) contacts.phone = values.contact_phone.trim();
      if (values.contact_email.trim()) contacts.email = values.contact_email.trim();
      if (values.contact_website.trim()) contacts.website = values.contact_website.trim();

      const body = {
        name: buildI18nText(
          { name_en: values.name_en, name_pt: values.name_pt, name_es: values.name_es },
          "name",
        ),
        description: buildI18nText(
          {
            description_en: values.description_en,
            description_pt: values.description_pt,
            description_es: values.description_es,
          },
          "description",
        ),
        address: values.address,
        geom_lat: values.geom_lat,
        geom_lng: values.geom_lng,
        status: values.status,
        is_hosts_pick: values.is_hosts_pick,
        contacts,
        hours: rowsToHours(values.hours),
        season: values.season === "" ? null : values.season,
        guesthouse_scope: { all: true },
        source_kind: "manual",
        media: mediaAssets.map((a) => a.assetId),
      };
      if (isEdit) {
        await updateMutation.mutateAsync(body);
      } else {
        await createMutation.mutateAsync(body);
      }
      void navigate("/admin/places");
    },
    (errors) => {
      // Surface a required-field error even if the offending locale tab is hidden.
      if (errors.name_en ?? errors.description_en) setActiveLocale("en");
    },
  );

  const mutationError = isEdit ? updateMutation.error : createMutation.error;
  const heading = isEdit ? t("places.edit", "Edit Place") : t("places.new", "New Place");

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
          {/* Identidade — localized name + description across en/pt-PT/es */}
          <Card>
            <CardHeader>
              <CardTitle>{t("places.form.sections.identity", "Identity")}</CardTitle>
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
                    {t(`places.form.tabs.${contentLocaleTabKey(loc)}`)}
                  </button>
                ))}
              </div>

              <TranslatableField
                namePrefix="name"
                locale={activeLocale}
                sourceLocale={SOURCE_LOCALE}
                label={t("places.form.name", "Name")}
                required={activeLocale === "en"}
                kind="proper_name"
                maxLength={120}
                translation={translation}
              />
              <TranslatableField
                namePrefix="description"
                locale={activeLocale}
                sourceLocale={SOURCE_LOCALE}
                label={t("places.form.description", "Description")}
                required={activeLocale === "en"}
                multiline
                maxLength={2000}
                kind="prose"
                translation={translation}
              />
            </CardContent>
          </Card>

          {/* Localização — address + raw lat/lng (map picker is Slice 5) */}
          <Card>
            <CardHeader>
              <CardTitle>{t("places.form.sections.location", "Location")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("places.form.address", "Address")}
                      <span className="ml-0.5 text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="geom_lat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("places.form.latitude", "Latitude")}</FormLabel>
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
                      <FormLabel>{t("places.form.longitude", "Longitude")}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.000001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Estado e visibilidade — status + host's pick */}
          <Card>
            <CardHeader>
              <CardTitle>{t("places.form.sections.visibility", "Status & visibility")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("places.form.status", "Status")}</FormLabel>
                    <FormControl>
                      <select {...field} className={selectClassName}>
                        <option value="draft">{t("status.place.draft", "Draft")}</option>
                        <option value="owner_approved">
                          {t("status.place.owner_approved", "In review")}
                        </option>
                        <option value="published">
                          {t("status.place.published", "Published")}
                        </option>
                        <option value="archived">{t("status.place.archived", "Archived")}</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_hosts_pick"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-3 space-y-0">
                    <FormLabel className="font-normal">
                      {t("places.form.is_hosts_pick", "Host's Pick")}
                    </FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={(v) => field.onChange(v)} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Contactos */}
          <Card>
            <CardHeader>
              <CardTitle>{t("places.form.contacts.title", "Contacts")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("places.form.contacts.phone", "Phone")}</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+351912345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("places.form.contacts.email", "Email")}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("places.form.contacts.website", "Website")}</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Horário — per-day open/closed + 24h + copy-to-all, and season window */}
          <Card>
            <CardHeader>
              <CardTitle>{t("places.form.hours.title", "Opening hours")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <OpeningHoursEditor />
              <FormField
                control={form.control}
                name="season"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("places.form.season.title", "Season")}</FormLabel>
                    <FormControl>
                      <select {...field} className={selectClassName}>
                        <option value="">{t("places.form.season.all_year", "All year")}</option>
                        <option value="summer">
                          {t("places.form.season.summer", "Summer only")}
                        </option>
                        <option value="winter">
                          {t("places.form.season.winter", "Winter only")}
                        </option>
                      </select>
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
              <CardTitle>{t("places.form.media.title", "Media")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <MediaUploader
                label={t("places.form.media.upload_hint", "Drag & drop images or click to select")}
                initialAssets={mediaAssets}
                onUploaded={setMediaAssets}
              />
              <p className="text-xs text-muted-foreground">
                {t("places.form.media.hint", "JPG, PNG or WebP · up to 5 MB each")}
              </p>
            </CardContent>
          </Card>

          {/* Sticky save bar — pins to the content column (mobile bottom tab bar
              is suppressed on form routes; safe-area padding clears the home bar) */}
          <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <TranslateAllButton
              translation={translation}
              fields={[
                { namePrefix: "name", kind: "proper_name" },
                { namePrefix: "description", kind: "prose" },
              ]}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="touch"
                onClick={() => void navigate("/admin/places")}
              >
                {t("places.form.cancel", "Cancel")}
              </Button>
              <Button type="submit" size="touch" disabled={isSubmitting}>
                {isSubmitting ? t("places.form.saving", "Saving…") : t("places.form.save", "Save")}
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
              {t("places.form.unsaved.title", "Discard unsaved changes?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "places.form.unsaved.body",
                "You have unsaved changes. If you leave now, they'll be lost.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>
              {t("places.form.unsaved.stay", "Stay")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => blocker.proceed?.()}>
              {t("places.form.unsaved.leave", "Leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
