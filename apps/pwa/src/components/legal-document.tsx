import { useTranslation } from "react-i18next";

type LegalSection = {
  title: string;
  body: string[];
};

// Renders a legal document (privacy / terms) from the `legal` i18n namespace.
// Content shape per doc key: { heading, updated, intro, sections[{title, body[]}], contact }.
// Kept generic so privacy.tsx and terms.tsx share one renderer and the pt-PT
// parity/linter checks cover the same structure in both locales.
export function LegalDocument({ docKey }: { docKey: "privacy" | "terms" }) {
  const { t } = useTranslation("legal");
  const sections = t(`${docKey}.sections`, { returnObjects: true }) as LegalSection[];

  return (
    <main className="mx-auto min-h-svh max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-semibold text-on-surface">
        {t(`${docKey}.heading`)}
      </h1>
      <p className="mt-2 text-xs text-on-surface-variant">{t(`${docKey}.updated`)}</p>
      <p className="mt-6 text-sm leading-relaxed text-on-surface-variant">{t(`${docKey}.intro`)}</p>

      {sections.map((section, i) => (
        <section key={i} className="mt-8">
          <h2 className="font-display text-lg font-semibold text-on-surface">{section.title}</h2>
          {section.body.map((paragraph, j) => (
            <p key={j} className="mt-3 text-sm leading-relaxed text-on-surface-variant">
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      <p className="mt-10 border-t border-outline-variant pt-6 text-sm leading-relaxed text-on-surface-variant">
        {t(`${docKey}.contact`)}
      </p>

      <nav className="mt-8 flex gap-4 text-sm">
        <a href="/" className="text-primary underline-offset-2 hover:underline">
          {t("nav.home")}
        </a>
        <a
          href={docKey === "privacy" ? "/terms" : "/privacy"}
          className="text-primary underline-offset-2 hover:underline"
        >
          {t(docKey === "privacy" ? "nav.terms" : "nav.privacy")}
        </a>
      </nav>
    </main>
  );
}
