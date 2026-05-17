import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { VoiceInputButton } from "./voice-input-button";

const WISH_ACTIONS = ["eat", "drink", "see", "do", "buy", "move"] as const;
const VEHICLES = ["car", "bike", "walking", "bus"] as const;
const DURATIONS = [1, 2, 3, 4, 6, 8] as const;

const IntakeSchema = z.object({
  wishes: z.array(z.string().min(1)).min(1, "Select at least one"),
  duration_hours: z.coerce.number().int().min(1).max(12),
  vehicle: z.enum(VEHICLES),
  free_text: z.string().max(1000).optional(),
});

export type IntakeFormData = z.infer<typeof IntakeSchema>;

interface IntakeFormProps {
  onSubmit: (data: IntakeFormData) => void | Promise<void>;
  submitting?: boolean;
}

export function IntakeForm({ onSubmit, submitting }: IntakeFormProps) {
  const { t } = useTranslation("home");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<IntakeFormData>({
    resolver: zodResolver(IntakeSchema),
    defaultValues: {
      wishes: [],
      duration_hours: 3,
      vehicle: "car",
      free_text: "",
    },
  });

  function appendVoiceTranscript(transcript: string) {
    const current = getValues("free_text") ?? "";
    setValue("free_text", current ? `${current} ${transcript}` : transcript, {
      shouldDirty: true,
    });
  }

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
      className="flex flex-col gap-6"
      noValidate
    >
      {/* Wishes multiselect */}
      <fieldset>
        <legend className="text-sm font-medium mb-2">{t("tour.new.wishes_label")}</legend>
        <Controller
          control={control}
          name="wishes"
          render={({ field }) => (
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={t("tour.new.wishes_label")}
            >
              {WISH_ACTIONS.map((action) => {
                const selected = field.value.includes(action);
                return (
                  <button
                    key={action}
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    onClick={() => {
                      const next = selected
                        ? field.value.filter((v) => v !== action)
                        : [...field.value, action];
                      field.onChange(next);
                    }}
                    className={[
                      "rounded-full px-3 py-1 text-sm border transition-colors",
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-accent",
                    ].join(" ")}
                  >
                    {t(`actions.${action}`)}
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.wishes && (
          <p className="text-destructive text-xs mt-1" role="alert">
            {errors.wishes.message}
          </p>
        )}
      </fieldset>

      {/* Duration */}
      <div>
        <label htmlFor="duration_hours" className="text-sm font-medium block mb-1">
          {t("tour.new.duration_label")}
        </label>
        <select
          id="duration_hours"
          {...register("duration_hours")}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {DURATIONS.map((d) => (
            <option key={d} value={d}>
              {t(`tour.new.durations.${d}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Vehicle */}
      <div>
        <label htmlFor="vehicle" className="text-sm font-medium block mb-1">
          {t("tour.new.vehicle_label")}
        </label>
        <select
          id="vehicle"
          {...register("vehicle")}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {VEHICLES.map((v) => (
            <option key={v} value={v}>
              {t(`tour.new.vehicles.${v}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Free text + voice */}
      <div>
        <label htmlFor="free_text" className="text-sm font-medium block mb-1">
          {t("tour.new.notes_label")}
        </label>
        <div className="flex gap-2 items-start">
          <textarea
            id="free_text"
            {...register("free_text")}
            placeholder={t("tour.new.notes_placeholder")}
            rows={3}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
          />
          <VoiceInputButton onTranscript={appendVoiceTranscript} disabled={submitting} />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
      >
        {t("tour.new.submit")}
      </button>
    </form>
  );
}
