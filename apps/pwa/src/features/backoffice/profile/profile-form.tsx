import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpsertProfile, type OwnerProfile } from "./use-profile";
import { MediaUploader, type UploadedAsset } from "@/features/backoffice/places/media-uploader";
import { Button } from "@/components/ui/button";

const FormSchema = z.object({
  bio_en: z.string().default(""),
  bio_pt: z.string().default(""),
  photo: z.string().default(""),
  phone: z.string().max(32).default(""),
  call_enabled: z.boolean().default(false),
  dm_in_app: z.boolean().default(true),
  dm_telegram: z.boolean().default(false),
  dm_whatsapp_link: z.boolean().default(false),
  dm_whatsapp_cloud: z.boolean().default(false),
  email: z.string().default(""),
});

type FormValues = z.infer<typeof FormSchema>;

interface Props {
  initialData?: OwnerProfile | null;
}

const TABS = ["en", "pt-PT"] as const;
type Tab = (typeof TABS)[number];

function toDefaults(profile: OwnerProfile | null | undefined): FormValues {
  if (!profile) {
    return {
      bio_en: "",
      bio_pt: "",
      photo: "",
      phone: "",
      call_enabled: false,
      dm_in_app: true,
      dm_telegram: false,
      dm_whatsapp_link: false,
      dm_whatsapp_cloud: false,
      email: "",
    };
  }
  return {
    bio_en: profile.bio?.["en"] ?? "",
    bio_pt: profile.bio?.["pt-PT"] ?? "",
    photo: profile.photo ?? "",
    phone: profile.phone ?? "",
    call_enabled: profile.call_enabled,
    dm_in_app: profile.dm_channels?.in_app ?? true,
    dm_telegram: profile.dm_channels?.telegram ?? false,
    dm_whatsapp_link: profile.dm_channels?.whatsapp_link ?? false,
    dm_whatsapp_cloud: profile.dm_channels?.whatsapp_cloud ?? false,
    email: profile.email ?? "",
  };
}

export function ProfileForm({ initialData }: Props) {
  const { t } = useTranslation("admin");
  const [activeTab, setActiveTab] = useState<Tab>("en");
  const upsertMutation = useUpsertProfile();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: toDefaults(initialData),
  });

  // The profile has a single photo; take the first uploaded asset and keep its
  // id in the form. An existing photo (seeded from initialData) is preserved
  // until a new upload replaces it.
  const photo = watch("photo");
  const handlePhotoUploaded = (assets: UploadedAsset[]) => {
    setValue("photo", assets[0]?.assetId ?? "", { shouldDirty: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    await upsertMutation.mutateAsync({
      bio: { en: values.bio_en, "pt-PT": values.bio_pt },
      photo: values.photo || undefined,
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
  });

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-xl font-semibold">{t("profile.title", "Owner Profile")}</h1>

      {upsertMutation.isSuccess && (
        <p className="text-sm text-green-600">{t("profile.form.saved", "Saved.")}</p>
      )}
      {upsertMutation.error && (
        <p className="text-sm text-destructive" role="alert">
          {upsertMutation.error instanceof Error ? upsertMutation.error.message : "Save failed"}
        </p>
      )}

      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-5">
        {/* Bio i18n tabs */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-1 border-b">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium -mb-px transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "en"
                  ? t("profile.form.tabs.en", "English")
                  : t("profile.form.tabs.pt_PT", "Portuguese")}
              </button>
            ))}
          </div>
          <div className={activeTab === "en" ? "" : "hidden"}>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{t("profile.form.bio", "Bio")} (EN)</span>
              <textarea
                {...register("bio_en")}
                rows={3}
                className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </label>
          </div>
          <div className={activeTab === "pt-PT" ? "" : "hidden"}>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{t("profile.form.bio", "Bio")} (PT)</span>
              <textarea
                {...register("bio_pt")}
                rows={3}
                className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </label>
          </div>
        </div>

        {/* Contact */}
        <fieldset className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("profile.form.phone", "Phone")}</span>
            <input
              {...register("phone")}
              className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("profile.form.email", "Email")}</span>
            <input
              {...register("email")}
              type="email"
              className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.email && (
              <span className="text-xs text-destructive">{errors.email.message}</span>
            )}
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t("profile.form.photo", "Photo")}</span>
            <MediaUploader
              label={t("places.form.media.upload_hint", "Drag & drop a photo or click to select")}
              onUploaded={handlePhotoUploaded}
            />
            {photo && (
              <p className="text-xs text-muted-foreground font-mono break-all">{photo}</p>
            )}
          </div>
        </fieldset>

        {/* Contact options */}
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium mb-1">
            {t("profile.form.contact_options", "Contact options")}
          </legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("call_enabled")} className="rounded" />
            <span>{t("profile.form.call_enabled", "Allow calls")}</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("dm_in_app")} className="rounded" />
            <span>{t("profile.form.dm_in_app", "In-app messages")}</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("dm_telegram")} className="rounded" />
            <span>{t("profile.form.dm_telegram", "Telegram")}</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("dm_whatsapp_link")} className="rounded" />
            <span>{t("profile.form.dm_whatsapp_link", "WhatsApp (link)")}</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("dm_whatsapp_cloud")} className="rounded" />
            <span>{t("profile.form.dm_whatsapp_cloud", "WhatsApp (Cloud API)")}</span>
          </label>
        </fieldset>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting || upsertMutation.isPending}>
            {isSubmitting || upsertMutation.isPending ? "Saving…" : t("profile.form.save", "Save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
