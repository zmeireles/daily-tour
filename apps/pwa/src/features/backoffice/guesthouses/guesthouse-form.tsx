import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown } from "lucide-react";
import { useCreateGuesthouse, useUpdateGuesthouse, type GuesthouseRow } from "./use-guesthouses";
import { MediaUploader, type UploadedAsset } from "@/features/backoffice/places/media-uploader";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

// Guesthouse media is an array of media-svc asset UUIDs; resolve each to the
// same-origin display route so the editor shows + preserves existing media.
function toUploadedAssets(media: string[] | undefined): UploadedAsset[] {
  return (media ?? []).map((id) => ({ assetId: id, previewUrl: `/v1/media/${id}`, name: id }));
}

const FormSchema = z.object({
  name_en: z.string().min(1, "Required"),
  name_pt: z.string().default(""),
  slug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "lowercase kebab-case slug"),
  address: z.string().min(1, "Required"),
  geom_lat: z.coerce.number().min(-90).max(90),
  geom_lng: z.coerce.number().min(-180).max(180),
});

type FormValues = z.infer<typeof FormSchema>;

interface Props {
  initialData?: GuesthouseRow;
  id?: string;
}

const TABS = ["en", "pt-PT"] as const;
type Tab = (typeof TABS)[number];

export function GuesthouseForm({ initialData, id }: Props) {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("en");

  const createMutation = useCreateGuesthouse();
  const updateMutation = useUpdateGuesthouse(id ?? "");
  const isEdit = !!id;
  const [mediaAssets, setMediaAssets] = useState<UploadedAsset[]>(() =>
    toUploadedAssets(initialData?.media),
  );
  const hero = mediaAssets[0];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: initialData
      ? {
          name_en: initialData.name["en"] ?? "",
          name_pt: initialData.name["pt-PT"] ?? "",
          slug: initialData.slug,
          address: initialData.address,
          geom_lat: initialData.geom_lat,
          geom_lng: initialData.geom_lng,
        }
      : { geom_lat: 37.75, geom_lng: -25.67 },
  });

  const onSubmit = handleSubmit(async (values) => {
    const body = {
      name: { en: values.name_en, "pt-PT": values.name_pt },
      slug: values.slug,
      address: values.address,
      geom_lat: values.geom_lat,
      geom_lng: values.geom_lng,
      media: mediaAssets.map((a) => a.assetId),
    };
    if (isEdit) {
      await updateMutation.mutateAsync(body);
    } else {
      await createMutation.mutateAsync(body);
    }
    void navigate("/admin/guesthouses");
  });

  const mutationError = isEdit ? updateMutation.error : createMutation.error;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {isEdit
            ? t("guesthouses.edit", "Edit Guesthouse")
            : t("guesthouses.new", "New Guesthouse")}
        </h1>
        <Button variant="outline" size="sm" onClick={() => void navigate("/admin/guesthouses")}>
          {t("guesthouses.form.cancel", "Cancel")}
        </Button>
      </div>

      {mutationError && (
        <p className="text-sm text-destructive" role="alert">
          {mutationError instanceof Error ? mutationError.message : "Save failed"}
        </p>
      )}

      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-5">
        {/* i18n name tabs */}
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
                  ? t("guesthouses.form.tabs.en", "English")
                  : t("guesthouses.form.tabs.pt_PT", "Portuguese")}
              </button>
            ))}
          </div>
          <div className={activeTab === "en" ? "" : "hidden"}>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{t("guesthouses.form.name", "Name")} (EN)</span>
              <input
                {...register("name_en")}
                className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.name_en && (
                <span className="text-xs text-destructive">{errors.name_en.message}</span>
              )}
            </label>
          </div>
          <div className={activeTab === "pt-PT" ? "" : "hidden"}>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{t("guesthouses.form.name", "Name")} (PT)</span>
              <input
                {...register("name_pt")}
                className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
          </div>
        </div>

        {/* Slug — hidden under "Advanced" collapsible */}
        <Collapsible defaultOpen={!!initialData?.slug}>
          <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
            {t("guesthouses.form.advanced", "Advanced")}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{t("guesthouses.form.slug", "Slug")}</span>
              <input
                {...register("slug")}
                placeholder="my-guesthouse"
                className="rounded-md border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.slug && (
                <span className="text-xs text-destructive">{errors.slug.message}</span>
              )}
            </label>
          </CollapsibleContent>
        </Collapsible>

        {/* Location */}
        <fieldset className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("guesthouses.form.address", "Address")}</span>
            <input
              {...register("address")}
              className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.address && (
              <span className="text-xs text-destructive">{errors.address.message}</span>
            )}
          </label>
          <p className="text-xs text-muted-foreground">
            {t(
              "guesthouses.form.map_placeholder",
              "Map picker deferred to Phase 2 — use numeric inputs for now.",
            )}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                {t("guesthouses.form.latitude", "Latitude")}
              </span>
              <input
                type="number"
                step="0.000001"
                {...register("geom_lat")}
                className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.geom_lat && (
                <span className="text-xs text-destructive">{errors.geom_lat.message}</span>
              )}
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                {t("guesthouses.form.longitude", "Longitude")}
              </span>
              <input
                type="number"
                step="0.000001"
                {...register("geom_lng")}
                className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.geom_lng && (
                <span className="text-xs text-destructive">{errors.geom_lng.message}</span>
              )}
            </label>
          </div>
        </fieldset>

        {/* Hero photo (media[0]) */}
        <fieldset className="flex flex-col gap-2">
          <span className="text-sm font-medium">{t("guesthouses.form.hero", "Hero photo")}</span>
          {hero && (
            <img
              src={hero.previewUrl}
              alt={t("guesthouses.form.hero_alt", "Guesthouse hero")}
              className="aspect-video w-full max-w-md rounded-md border object-cover"
            />
          )}
          <MediaUploader
            label={t("places.form.media.upload_hint", "Drag & drop a photo or click to select")}
            initialAssets={mediaAssets}
            onUploaded={setMediaAssets}
          />
        </fieldset>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : t("guesthouses.form.save", "Save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void navigate("/admin/guesthouses")}
          >
            {t("guesthouses.form.cancel", "Cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
