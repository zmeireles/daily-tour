import { useTranslation } from "react-i18next";

export function OwnerPitch() {
  const { t } = useTranslation("public");
  return (
    <section className="py-10 px-6 max-w-xl mx-auto text-center flex flex-col gap-2">
      <p className="text-base text-foreground font-medium">
        {t(
          "owner_pitch.line1",
          "Every booking comes with your host's personal guide to São Miguel.",
        )}
      </p>
      <p className="text-base text-muted-foreground">
        {t("owner_pitch.line2", "Real places, honest recommendations, zero fuss.")}
      </p>
      <p className="text-base text-muted-foreground">
        {t("owner_pitch.line3", "Drop in as a guest. Walk out as a local.")}
      </p>
    </section>
  );
}
