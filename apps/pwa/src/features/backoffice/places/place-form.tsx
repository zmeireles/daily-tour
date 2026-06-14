import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreatePlace, useUpdatePlace, type PlaceRow, type PlaceHoursEntry } from "./use-places";
import { MediaUploader, type UploadedAsset } from "./media-uploader";
import { Button } from "@/components/ui/button";

const FormSchema = z.object({
  name_en: z.string().min(1, "Required"),
  name_pt: z.string().default(""),
  description_en: z.string().min(1, "Required"),
  description_pt: z.string().default(""),
  address: z.string().min(1, "Required"),
  geom_lat: z.coerce.number().min(-90).max(90),
  geom_lng: z.coerce.number().min(-180).max(180),
  status: z.enum(["draft", "owner_approved", "published", "archived"]),
  is_hosts_pick: z.boolean().default(false),
  contact_phone: z.string().default(""),
  contact_email: z.string().default(""),
  contact_website: z.string().default(""),
  // One row per DAY_ROWS entry (display order), kept as free-text HH:MM. Only
  // rows with both open+close set are emitted to the schema's hours[] on submit.
  hours: z.array(z.object({ open: z.string().default(""), close: z.string().default("") })),
  // "" maps to null (year-round) on submit; "summer"/"winter" pass through.
  season: z.enum(["", "summer", "winter"]).default(""),
});

type FormValues = z.infer<typeof FormSchema>;

interface Props {
  initialData?: PlaceRow;
  id?: string;
}

const TABS = ["en", "pt-PT"] as const;
type Tab = (typeof TABS)[number];

// Weekly hours editor: one row per day in Mon→Sun display order, each mapped to
// the schema's dow integer (JS convention: 0=Sunday … 6=Saturday). The row
// index is the array index in FormValues.hours; dow is what gets persisted.
const DAY_ROWS = [
  { dow: 1, key: "mon" },
  { dow: 2, key: "tue" },
  { dow: 3, key: "wed" },
  { dow: 4, key: "thu" },
  { dow: 5, key: "fri" },
  { dow: 6, key: "sat" },
  { dow: 0, key: "sun" },
] as const;

// Project persisted hours[] onto the 7 display rows, matching on dow so order
// of the source array doesn't matter. Missing days become empty rows.
function hoursToRows(hours?: PlaceHoursEntry[]): FormValues["hours"] {
  return DAY_ROWS.map((day) => {
    const match = (hours ?? []).find((h) => h.dow === day.dow);
    return { open: match?.open ?? "", close: match?.close ?? "" };
  });
}

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
  const [activeTab, setActiveTab] = useState<Tab>("en");
  const [mediaAssets, setMediaAssets] = useState<UploadedAsset[]>(() =>
    toUploadedAssets(initialData?.media),
  );

  const createMutation = useCreatePlace();
  const updateMutation = useUpdatePlace(id ?? "");
  const isEdit = !!id;

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
          description_en: initialData.description["en"] ?? "",
          description_pt: initialData.description["pt-PT"] ?? "",
          address: initialData.address,
          geom_lat: initialData.geom_lat,
          geom_lng: initialData.geom_lng,
          status: initialData.status as FormValues["status"],
          is_hosts_pick: initialData.is_hosts_pick,
          contact_phone: initialData.contacts?.phone ?? "",
          contact_email: initialData.contacts?.email ?? "",
          contact_website: initialData.contacts?.website ?? "",
          hours: hoursToRows(initialData.hours),
          season: initialData.season ?? "",
        }
      : {
          status: "draft",
          is_hosts_pick: false,
          geom_lat: 37.75,
          geom_lng: -25.67,
          contact_phone: "",
          contact_email: "",
          contact_website: "",
          hours: hoursToRows(),
          season: "",
        },
  });

  const onSubmit = handleSubmit(async (values) => {
    // Contacts: omit empty optional fields (the schema's phone/email/website
    // reject "" — they validate as phone/email/url). Preserve any pre-existing
    // social[] verbatim since this form doesn't edit it yet.
    const contacts: PlaceRow["contacts"] = {
      social: initialData?.contacts?.social ?? [],
    };
    if (values.contact_phone.trim()) contacts.phone = values.contact_phone.trim();
    if (values.contact_email.trim()) contacts.email = values.contact_email.trim();
    if (values.contact_website.trim()) contacts.website = values.contact_website.trim();

    // Hours: emit only days where both open and close are filled, mapping the
    // display-row index back to its dow integer.
    const hours = DAY_ROWS.map((day, i) => ({
      dow: day.dow,
      open: (values.hours[i]?.open ?? "").trim(),
      close: (values.hours[i]?.close ?? "").trim(),
    })).filter((h) => h.open !== "" && h.close !== "");

    const body = {
      name: { en: values.name_en, "pt-PT": values.name_pt },
      description: { en: values.description_en, "pt-PT": values.description_pt },
      address: values.address,
      geom_lat: values.geom_lat,
      geom_lng: values.geom_lng,
      status: values.status,
      is_hosts_pick: values.is_hosts_pick,
      contacts,
      hours,
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
  });

  const mutationError = isEdit ? updateMutation.error : createMutation.error;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {isEdit ? t("places.edit", "Edit Place") : t("places.new", "New Place")}
        </h1>
        <Button variant="outline" size="sm" onClick={() => void navigate("/admin/places")}>
          {t("places.form.cancel", "Cancel")}
        </Button>
      </div>

      {mutationError && (
        <p className="text-sm text-destructive" role="alert">
          {mutationError instanceof Error ? mutationError.message : "Save failed"}
        </p>
      )}

      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-5">
        {/* i18n tabs */}
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
                  ? t("places.form.tabs.en", "English")
                  : t("places.form.tabs.pt_PT", "Portuguese")}
              </button>
            ))}
          </div>

          <div className={activeTab === "en" ? "" : "hidden"}>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{t("places.form.name", "Name")} (EN)</span>
              <input
                {...register("name_en")}
                className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.name_en && (
                <span className="text-xs text-destructive">{errors.name_en.message}</span>
              )}
            </label>
            <label className="flex flex-col gap-1 mt-3">
              <span className="text-sm font-medium">
                {t("places.form.description", "Description")} (EN)
              </span>
              <textarea
                {...register("description_en")}
                rows={3}
                className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              {errors.description_en && (
                <span className="text-xs text-destructive">{errors.description_en.message}</span>
              )}
            </label>
          </div>

          <div className={activeTab === "pt-PT" ? "" : "hidden"}>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{t("places.form.name", "Name")} (PT)</span>
              <input
                {...register("name_pt")}
                className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="flex flex-col gap-1 mt-3">
              <span className="text-sm font-medium">
                {t("places.form.description", "Description")} (PT)
              </span>
              <textarea
                {...register("description_pt")}
                rows={3}
                className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </label>
          </div>
        </div>

        {/* Location & address */}
        <fieldset className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("places.form.address", "Address")}</span>
            <input
              {...register("address")}
              className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.address && (
              <span className="text-xs text-destructive">{errors.address.message}</span>
            )}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{t("places.form.latitude", "Latitude")}</span>
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
              <span className="text-sm font-medium">{t("places.form.longitude", "Longitude")}</span>
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

        {/* Status & hosts pick */}
        <fieldset className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("places.form.status", "Status")}</span>
            <select
              {...register("status")}
              className="rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="draft">draft</option>
              <option value="owner_approved">owner_approved</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("is_hosts_pick")} className="rounded" />
            <span>{t("places.form.is_hosts_pick", "Host's Pick")}</span>
          </label>
        </fieldset>

        {/* Contacts */}
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium">
            {t("places.form.contacts.title", "Contacts")}
          </legend>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("places.form.contacts.phone", "Phone")}</span>
            <input
              type="tel"
              {...register("contact_phone")}
              placeholder="+351912345678"
              className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("places.form.contacts.email", "Email")}</span>
            <input
              type="email"
              {...register("contact_email")}
              className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {t("places.form.contacts.website", "Website")}
            </span>
            <input
              type="url"
              {...register("contact_website")}
              placeholder="https://"
              className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
        </fieldset>

        {/* Opening hours */}
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">{t("places.form.hours.title", "Hours")}</legend>
          <p className="text-xs text-muted-foreground">
            {t(
              "places.form.hours.hint",
              "Leave a day blank if closed. Fill both times to save it.",
            )}
          </p>
          <div className="flex flex-col gap-2">
            {DAY_ROWS.map((day, i) => (
              <div key={day.key} className="grid grid-cols-[5rem_1fr_1fr] items-center gap-2">
                <span className="text-sm font-medium">
                  {t(`places.form.hours.days.${day.key}`, day.key)}
                </span>
                <input
                  type="time"
                  aria-label={t(`places.form.hours.open_for`, {
                    day: t(`places.form.hours.days.${day.key}`, day.key),
                    defaultValue: "Opening time",
                  })}
                  {...register(`hours.${i}.open` as const)}
                  className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="time"
                  aria-label={t(`places.form.hours.close_for`, {
                    day: t(`places.form.hours.days.${day.key}`, day.key),
                    defaultValue: "Closing time",
                  })}
                  {...register(`hours.${i}.close` as const)}
                  className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            ))}
          </div>
        </fieldset>

        {/* Season */}
        <fieldset className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t("places.form.season.title", "Season")}</span>
            <select
              {...register("season")}
              className="rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t("places.form.season.all_year", "All year")}</option>
              <option value="summer">{t("places.form.season.summer", "Summer only")}</option>
              <option value="winter">{t("places.form.season.winter", "Winter only")}</option>
            </select>
          </label>
        </fieldset>

        {/* Media */}
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">{t("places.form.media.title", "Media")}</legend>
          <MediaUploader
            label={t("places.form.media.upload_hint", "Drag & drop images or click to select")}
            initialAssets={mediaAssets}
            onUploaded={setMediaAssets}
          />
        </fieldset>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : t("places.form.save", "Save")}
          </Button>
          <Button type="button" variant="outline" onClick={() => void navigate("/admin/places")}>
            {t("places.form.cancel", "Cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
