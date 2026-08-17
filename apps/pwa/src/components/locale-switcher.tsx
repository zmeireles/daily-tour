import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// The visible label narrows to an ISO 639-1 code below `xl`. Four translated
// language *words* ("English Português Français Español") are wider than a
// 390px phone once the brand lockup takes its share of the app bar, so the row
// overflowed by 36px and clipped "Español" off the right edge — Spanish being
// a shipped guest locale, unreachable without discovering a sideways scroll
// (#382). Codes are the same in every language, so they are not translated.
//
// The breakpoint is `xl`, not `sm`, because this component serves BOTH the
// mobile app bar and the desktop masthead, and the masthead is the tighter of
// the two. `ResponsiveScreen` engages desktop at `md` (768) for Home, but the
// masthead needs ~1004px to lay out with full words — so between 768 and 1023
// it overflowed and put "Español", then "Français", off-screen entirely. iPad
// portrait is 768–834, so Spanish was unreachable on an iPad even after #382
// fixed the phone (#405).
//
// It moved `lg` → `xl` for #417 (owner's call, option 1). Full words are the
// single largest consumer of masthead width: the right cluster measured 437.3px
// at 1024, and the nav — the only flex child that shrinks — was left 321.7px,
// which is less than the longer locales need on one line. Overflow read 0 the
// whole time because a packed row spends pressure on WRAPPING instead, so every
// locale had nav labels on two lines from 768 up to and including 1280, hidden
// behind the links' `min-h-[44px]`.
//
// Codes are recognisable in any language, so carrying them to 1279 costs the
// reader nothing that a truncated or wrapped word would not cost more.
//
// A dropdown was the obvious alternative and is the wrong shape here: the user
// who needs this control is precisely the one who cannot read the current UI
// language, and a row of codes is recognisable in any language while a button
// labelled "Idioma" is not. Compaction keeps all four visible; a menu would
// have hidden three of them behind a word the reader may not know.
const LOCALES = [
  ["en", "EN"],
  ["pt-PT", "PT"],
  ["fr", "FR"],
  ["es", "ES"],
] as const;

export function LocaleSwitcher() {
  const { t, i18n } = useTranslation("home");

  return (
    <div className="flex gap-1" role="group" aria-label="Language switcher">
      {LOCALES.map(([locale, code]) => (
        <button
          key={locale}
          type="button"
          onClick={() => void i18n.changeLanguage(locale)}
          className={cn(
            // 44px in BOTH dimensions on the MOBILE tree (#407). Compacting the
            // labels for #382 had left these at ~41–43 wide by 32 tall: still
            // past WCAG 2.5.8's 24px, but well short of the HIG/Material target
            // on the guest's first screen.
            //
            // `min-w-11` rather than more `px`, so the number in the class names
            // the target instead of hiding it in padding arithmetic that the
            // next label-width change silently invalidates.
            //
            // ⚠️ REVERTED AT `md`, NOT `lg`, AND THAT BOUNDARY IS MEASURED. Home
            // engages the desktop masthead at `md` (768), and 768–1023 is the
            // band where the masthead is tightest — #405 cleared it with 3px of
            // margin in French. The row costs ~8px, and carrying it into that
            // band moved `en@768` from a one-line nav label to two: overflow
            // stayed 0 throughout, because pressure there is spent on wrap depth
            // rather than overflow. So this stops where the mobile tree stops.
            //
            // The cost is that a tablet keeps ~41×32 targets while its masthead
            // is that constrained. Recorded on #417, which owns giving that band
            // real width back; raising these is a second claim on the same px.
            "min-w-11 rounded px-3 py-3 text-sm transition-colors md:min-w-0 md:py-1.5",
            i18n.language === locale
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={i18n.language === locale}
        >
          <span className="xl:hidden">{code}</span>
          {/* Kept in the accessible name at every width rather than swapped out:
              below `xl` the button announces "PT Português", so the visible
              text is a subset of the accessible name (WCAG 2.5.3 Label in
              Name). An aria-label of "Português" over a visible "PT" would
              read fine to a screen reader and break voice control. */}
          <span className="sr-only xl:not-sr-only">{t(`locale.${locale}`)}</span>
        </button>
      ))}
    </div>
  );
}
