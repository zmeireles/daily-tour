import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User } from "lucide-react";

import { useUpsertProfile, type OwnerProfile } from "./use-profile";
import {
  CONTENT_LOCALES,
  type ContentLocale,
  contentLocaleTabKey,
  buildI18nText,
  i18nTextToFields,
  zodContentFields,
} from "@/features/backoffice/shared/form-locale-config";
import { useFieldTranslation } from "@/lib/i18n/use-field-translation";
import { TranslatableField } from "@/components/ui/translatable-field";
import { MediaUploader, type UploadedAsset } from "@/features/backoffice/places/media-uploader";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Bio is the only per-locale field; cap it so the profile card stays scannable.
const BIO_MAX = 600;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Restore literal keys — zodContentFields types its computed-key return as an
// index signature, which would erase the boolean fields' types on z.infer.
type BioShape = { bio_en: z.ZodString; bio_pt: z.ZodString; bio_es: z.ZodString };

const FormSchema = z.object({
  ...(zodContentFields("bio") as BioShape),
  photo: z.string(),
  phone: z.string().max(32, "Phone number is too long"),
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || EMAIL_RE.test(v), { message: "Enter a valid email address" }),
  call_enabled: z.boolean(),
  dm_in_app: z.boolean(),
  dm_telegram: z.boolean(),
  dm_whatsapp_link: z.boolean(),
  dm_whatsapp_cloud: z.boolean(),
});

type FormValues = z.infer<typeof FormSchema>;

interface Props {
  initialData?: OwnerProfile | null;
}

function toDefaults(profile: OwnerProfile | null | undefined): FormValues {
  const bio = i18nTextToFields(profile?.bio ?? undefined, "bio");
  return {
    bio_en: bio.bio_en ?? "",
    bio_pt: bio.bio_pt ?? "",
    bio_es: bio.bio_es ?? "",
    photo: profile?.photo ?? "",
    phone: profile?.phone ?? "",
    email: profile?.email ?? "",
    call_enabled: profile?.call_enabled ?? false,
    dm_in_app: profile?.dm_channels?.in_app ?? true,
    dm_telegram: profile?.dm_channels?.telegram ?? false,
    dm_whatsapp_link: profile?.dm_channels?.whatsapp_link ?? false,
    dm_whatsapp_cloud: profile?.dm_channels?.whatsapp_cloud ?? false,
  };
}

type ContactSwitchName =
  | "call_enabled"
  | "dm_in_app"
  | "dm_telegram"
  | "dm_whatsapp_link"
  | "dm_whatsapp_cloud";

export function ProfileForm({ initialData }: Props) {
  const { t } = useTranslation("admin");
  // PT is the host language + translation source, so it opens active.
  const [activeLocale, setActiveLocale] = useState<ContentLocale>("pt-PT");
  const upsertMutation = useUpsertProfile();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: toDefaults(initialData),
  });
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { isDirty, isSubmitting },
  } = form;

  // PT→{EN,ES} auto-translation, wired to the per-field globe in TranslatableField.
  const translation = useFieldTranslation({
    setValue: (name, value, opts) => setValue(name as keyof FormValues, value, opts),
    getValues: (name) => getValues(name as keyof FormValues) as string,
    sourceLocale: "pt-PT",
  });

  // The profile has a single photo; keep the first uploaded asset's id in the form.
  const photo = watch("photo");
  const handlePhotoUploaded = (assets: UploadedAsset[]) => {
    setValue("photo", assets[0]?.assetId ?? "", { shouldDirty: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    await upsertMutation.mutateAsync({
      bio: buildI18nText(
        { bio_en: values.bio_en, bio_pt: values.bio_pt, bio_es: values.bio_es },
        "bio",
      ),
      // "" is the owner having removed their photo — send null so the server
      // clears it. `undefined` would mean "leave unchanged", which is why the
      // photo could never be removed (dt-tests #35).
      photo: values.photo === "" ? null : values.photo,
      phone: values.phone || undefined,
      call_enabled: values.call_enabled,
      dm_channels: {
        in_app: values.dm_in_app,
        telegram: values.dm_telegram,
        whatsapp_link: values.dm_whatsapp_link,
        whatsapp_cloud: values.dm_whatsapp_cloud,
      },
      email: values.email || undefined,
    });
    // Clear the dirty state so the "unsaved changes" bar doesn't linger next to
    // the "Saved." banner after a successful upsert.
    reset(values);
  });

  const contactSwitches: Array<{ name: ContactSwitchName; label: string; help: string }> = [
    {
      name: "call_enabled",
      label: t("profile.form.call_enabled", "Allow calls"),
      help: t("profile.form.call_enabled_help", "Guests can call your phone number."),
    },
    {
      name: "dm_in_app",
      label: t("profile.form.dm_in_app", "In-app messages"),
      help: t("profile.form.dm_in_app_help", "Guests message you inside the app."),
    },
    {
      name: "dm_telegram",
      label: t("profile.form.dm_telegram", "Telegram"),
      help: t("profile.form.dm_telegram_help", "Guests are handed off to your Telegram."),
    },
    {
      name: "dm_whatsapp_link",
      label: t("profile.form.dm_whatsapp_link", "WhatsApp (link)"),
      help: t("profile.form.dm_whatsapp_link_help", "Opens a WhatsApp chat with you."),
    },
    {
      name: "dm_whatsapp_cloud",
      label: t("profile.form.dm_whatsapp_cloud", "WhatsApp Business"),
      help: t(
        "profile.form.dm_whatsapp_cloud_help",
        "Replies arrive in your WhatsApp Business inbox.",
      ),
    },
  ];

  const isSaving = isSubmitting || upsertMutation.isPending;

  return (
    <Form {...form}>
      {/* noValidate: defer to zod + FormMessage instead of native browser bubbles. */}
      <form noValidate onSubmit={(e) => void onSubmit(e)}>
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">{t("profile.title", "Owner Profile")}</h1>
            <p className="text-sm text-muted-foreground">
              {initialData
                ? t("profile.form.subtitle_edit", "Update how guests see and reach you.")
                : t("profile.form.subtitle_new", "Set up the profile guests will see.")}
            </p>
          </div>

          {upsertMutation.isSuccess && (
            <p className="text-sm text-green-600">{t("profile.form.saved", "Saved.")}</p>
          )}
          {upsertMutation.error && (
            <p className="text-sm text-destructive" role="alert">
              {upsertMutation.error instanceof Error ? upsertMutation.error.message : "Save failed"}
            </p>
          )}

          {/* Bio — the only per-locale field */}
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.form.bio", "Bio")}</CardTitle>
              <CardDescription>
                {t(
                  "profile.form.bio_hint",
                  "Write in Portuguese, then use the globe to translate into English and Spanish.",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeLocale} onValueChange={(v) => setActiveLocale(v as ContentLocale)}>
                <TabsList>
                  {CONTENT_LOCALES.map((loc) => (
                    <TabsTrigger key={loc} value={loc}>
                      {t(`profile.form.tabs.${contentLocaleTabKey(loc)}`)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {CONTENT_LOCALES.map((loc) => (
                  <TabsContent key={loc} value={loc}>
                    <TranslatableField
                      namePrefix="bio"
                      locale={loc}
                      sourceLocale="pt-PT"
                      label={t("profile.form.bio", "Bio")}
                      multiline
                      kind="prose"
                      maxLength={BIO_MAX}
                      placeholder={t(
                        "profile.form.bio_placeholder",
                        "Introduce yourself to guests in 2–3 sentences…",
                      )}
                      translation={translation}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Language-invariant fields — rendered once, shared across every locale */}
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.form.common_section", "Common to all languages")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <FormField
                control={control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("profile.form.phone", "Phone")}</FormLabel>
                    <FormControl>
                      <Input type="tel" inputMode="tel" autoComplete="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("profile.form.email", "Email")}</FormLabel>
                    <FormControl>
                      <Input type="email" inputMode="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Avatar */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">{t("profile.form.photo", "Photo")}</span>
                <div className="flex items-start gap-4">
                  {photo ? (
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <img
                        src={`/v1/media/${photo}`}
                        alt={t("profile.form.photo_alt", "Owner avatar")}
                        className="h-20 w-20 rounded-full border object-cover"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive hover:text-destructive"
                        onClick={() => setValue("photo", "", { shouldDirty: true })}
                      >
                        {t("profile.form.photo_remove", "Remove")}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-dashed text-muted-foreground">
                      <User aria-hidden />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <MediaUploader
                      label={t(
                        "profile.form.photo_hint",
                        "Tap to choose from your camera or gallery",
                      )}
                      onChange={handlePhotoUploaded}
                    />
                  </div>
                </div>
              </div>

              {/* Contact options */}
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-sm font-medium">
                  {t("profile.form.contact_options", "Contact options")}
                </legend>
                {contactSwitches.map((sw) => (
                  <FormField
                    key={sw.name}
                    control={control}
                    name={sw.name}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between gap-4 space-y-0 rounded-lg border p-3">
                        <div className="space-y-0.5 pr-2">
                          <FormLabel className="text-sm">{sw.label}</FormLabel>
                          <FormDescription className="text-xs">{sw.help}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </fieldset>
            </CardContent>
          </Card>

          {/* Sticky Save bar */}
          <div className="sticky bottom-0 z-10 mt-2 flex items-center justify-end gap-3 border-t bg-background/95 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
            {isDirty && (
              <span className="mr-auto text-xs text-muted-foreground">
                {t("profile.form.unsaved", "Unsaved changes")}
              </span>
            )}
            <Button type="submit" size="touch" disabled={!isDirty || isSaving}>
              {isSaving ? t("profile.form.saving", "Saving…") : t("profile.form.save", "Save")}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
