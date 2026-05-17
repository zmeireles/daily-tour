import { useTranslation } from "react-i18next";

export function Hero() {
  const { t } = useTranslation();
  return (
    <section className="relative py-20 px-6 text-center overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-72 opacity-10 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, var(--tea-500), transparent)" }}
        aria-hidden="true"
      />
      <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center gap-5">
        <h1
          className="text-5xl sm:text-6xl font-bold text-foreground tracking-tight leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("public_landing.hero.title", "Daily Tour")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-md">
          {t(
            "public_landing.hero.tagline",
            "São Miguel · Açores · Where you stay, what you'll love",
          )}
        </p>
      </div>
    </section>
  );
}
