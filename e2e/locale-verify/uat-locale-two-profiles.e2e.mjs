// Post-deploy verification for the locale-negotiation batch (#400 / #403 / #404).
//
// ⚠️ READ THIS BEFORE CHANGING IT — the protocol is the point, not the code.
//
// This bug has now shipped "fixed and green" three times (#383 -> #388 -> the
// first cut of #403). Every one of those was verified by something structurally
// unable to observe the failure. The three traps, all real, all hit:
//
//   1. A single-entry language list. `changeLanguage('pt')` produces ['pt'] and
//      negotiates fine. Real Chrome sends ["pt-BR","pt","en-US","en"] and takes
//      a different path entirely. This spec uses real list shapes.
//   2. A clean browser profile. The detector caches to localStorage and reads
//      that cache BEFORE navigator, so a profile poisoned during the broken
//      period stayed English no matter how correct the negotiation became.
//      Verifying only on a fresh context reads as "fixed" while real returning
//      guests are still broken. EVERY case here therefore runs TWICE.
//   3. Asserting on storage instead of on what the guest sees. A resolved
//      language proves nothing if the bundle did not load. Every case asserts
//      the rendered tagline.
//
// Exits NON-ZERO on failure. A verification that cannot report failure is the
// exact thing this file exists to stop.
//
// Usage: node temp/locale-verify/uat-locale-two-profiles.e2e.mjs
//        BASE_URL=... CHROME_BIN=... to override.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);

const BASE = process.env.BASE_URL ?? "https://qual.stay.portugalodyssey.pt";
const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const OUT = REPO + "/temp/locale-verify/";
mkdirSync(OUT, { recursive: true });

// The rendered copy per shipped locale, read from the locale files rather than
// invented. Asserting on these is what makes "the bundle actually loaded" part
// of the claim instead of an assumption.
const TAGLINE = {
  en: "São Miguel · Açores · Where you stay, what you'll love",
  "pt-PT": "São Miguel · Açores · Onde fica, o que vai adorar",
  fr: "São Miguel · Açores · Où vous séjournez, ce que vous allez adorer",
  es: "São Miguel · Azores · Donde te alojas, lo que amarás",
};

// The storage key the app reads AFTER the poisoned-cache fix. If this spec ever
// starts reading `i18nextLng` again it is reading a key nothing writes, which
// returns null for every locale and looks exactly like a clean pass.
const LNG_KEY = "i18nextLng.v2";
const LEGACY_KEY = "i18nextLng";

// Real Chrome list shapes. Chrome appends en-US,en to almost every list — that
// appended `en` is what defeated the fix for two releases, so it belongs here.
const CASES = [
  { name: "pt-PT", langs: ["pt-PT", "pt", "en-US", "en"], expect: "pt-PT" },
  { name: "pt", langs: ["pt", "en-US", "en"], expect: "pt-PT" },
  { name: "pt-BR", langs: ["pt-BR", "pt", "en-US", "en"], expect: "pt-PT" },
  { name: "es-MX", langs: ["es-MX", "en-US", "en"], expect: "es" },
  { name: "fr-CA", langs: ["fr-CA", "en-US", "en"], expect: "fr" },
  { name: "en-US", langs: ["en-US", "en"], expect: "en" },
  { name: "de", langs: ["de-DE", "de", "en-US", "en"], expect: "en" },
  // Preference order must survive: this guest reads French before English.
  { name: "de-then-fr", langs: ["de", "fr", "en"], expect: "fr" },
];

const results = [];
const evidence = [];
function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

// ── Control 0: the assertions can distinguish the locales at all ────────────
// If two taglines were ever identical, every case asserting the wrong one would
// still pass. Fail loudly rather than silently prove nothing.
{
  const values = Object.values(TAGLINE);
  step(
    "C0 the four taglines are distinct (vacuity control)",
    new Set(values).size === values.length,
    `${values.length} strings, ${new Set(values).size} unique`,
  );
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

async function measure({ langs, profile }) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: langs[0],
    extraHTTPHeaders: { "Accept-Language": langs.join(",") },
  });

  // Override navigator.languages: the Accept-Language header alone does not
  // change what the in-page detector reads, and the detector is the thing
  // under test.
  await ctx.addInitScript((ls) => {
    Object.defineProperty(navigator, "languages", { value: ls, configurable: true });
    Object.defineProperty(navigator, "language", { value: ls[0], configurable: true });
  }, langs);

  if (profile === "poisoned") {
    // Exactly what a mis-negotiated visit during the broken period left behind.
    await ctx.addInitScript((k) => {
      try {
        localStorage.setItem(k, "en");
      } catch {
        /* storage blocked — the case below will show it */
      }
    }, LEGACY_KEY);
  }

  const page = await ctx.newPage();
  try {
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(900);
    const info = await page.evaluate(
      ({ lngKey, legacyKey }) => ({
        navigatorLanguages: [...navigator.languages],
        htmlLang: document.documentElement.lang,
        resolved: localStorage.getItem(lngKey),
        legacy: localStorage.getItem(legacyKey),
        text: document.body.innerText,
      }),
      { lngKey: LNG_KEY, legacyKey: LEGACY_KEY },
    );
    return { info, page, ctx };
  } catch (e) {
    await ctx.close();
    throw e;
  }
}

// ── Group A: every case, on BOTH profile states ────────────────────────────
for (const c of CASES) {
  for (const profile of ["clean", "poisoned"]) {
    const label = `A ${c.name} [${profile}] -> ${c.expect}`;
    try {
      const { info, page, ctx } = await measure({ langs: c.langs, profile });
      const wantTagline = TAGLINE[c.expect];
      const renderedOk = info.text.includes(wantTagline);
      const storageOk = info.resolved === c.expect;
      // The lang attribute is an OUTPUT of negotiation and must follow it.
      const langAttrOk = info.htmlLang === c.expect;

      evidence.push({ case: c.name, profile, expect: c.expect, ...info, text: undefined });
      step(
        label,
        renderedOk && storageOk && langAttrOk,
        `rendered=${renderedOk} ${LNG_KEY}=${info.resolved} htmlLang=${info.htmlLang}` +
          (renderedOk ? "" : ` | got first line: "${info.text.split("\n").filter(Boolean)[0]}"`),
      );
      await page.screenshot({ path: `${OUT}locale-${c.name}-${profile}.png` }).catch(() => {});
      await ctx.close();
    } catch (e) {
      step(label, false, e.message.slice(0, 160));
    }
  }
}

// ── Control 1: the poisoned profile really is poisoned ─────────────────────
// Without this, "poisoned" could silently be a no-op — the seeding could fail
// and all 8 poisoned cases would pass for the wrong reason, which is precisely
// the failure mode this whole file guards against.
{
  const label = "C1 the poisoned seed actually lands in localStorage";
  try {
    const { info, ctx } = await measure({
      langs: ["pt-BR", "pt", "en-US", "en"],
      profile: "poisoned",
    });
    step(
      label,
      info.legacy === "en",
      `${LEGACY_KEY}=${info.legacy} (must be "en", else the poisoned runs prove nothing)`,
    );
    await ctx.close();
  } catch (e) {
    step(label, false, e.message.slice(0, 160));
  }
}

// ── Group B: layout — overflow AND left-clip ───────────────────────────────
// A `scrollWidth === clientWidth` check is blind to an element hanging off the
// LEFT edge, because a negative offset does not grow scrollWidth. #400's review
// found exactly that on the landing switcher at 320px, and this group
// reproduces it live.
//
// ⚠️ SCOPE — do NOT read a green 768/834 row here as evidence on #405.
// This group loads `/` UNAUTHENTICATED, which is the public landing and its own
// switcher. #405 is about the AUTHENTICATED guest home, which mounts a
// different component (`DesktopTopNav`) and is where the 191px overflow at 768
// was measured. Covering it needs a redeemed token (`make qual-token`), which
// this read-only spec deliberately does not mint. The widths above 640 are kept
// only so a regression on the landing at tablet sizes would still surface.
for (const width of [320, 360, 390, 414, 768, 834, 960]) {
  const label = `B ${width}px — no overflow, every locale button fully on-screen`;
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(700);
    const m = await page.evaluate(() => {
      const de = document.documentElement;
      const buttons = [...document.querySelectorAll("button")]
        .filter((b) =>
          /^(EN|PT|FR|ES|English|Português|Français|Español)$/i.test(b.innerText.trim()),
        )
        .map((b) => {
          const r = b.getBoundingClientRect();
          return {
            label: b.innerText.trim(),
            left: +r.left.toFixed(1),
            right: +r.right.toFixed(1),
            w: +r.width.toFixed(1),
          };
        });
      return {
        overflow: de.scrollWidth - de.clientWidth,
        viewport: window.innerWidth,
        buttons,
      };
    });
    const offscreen = m.buttons.filter((b) => b.left < 0 || b.right > m.viewport + 1);
    step(
      label,
      m.overflow <= 1 && offscreen.length === 0 && m.buttons.length > 0,
      `overflow=${m.overflow}px buttons=${m.buttons.length}` +
        (offscreen.length ? ` OFFSCREEN=${JSON.stringify(offscreen)}` : ""),
    );
    await page.screenshot({ path: `${OUT}layout-${width}.png` }).catch(() => {});
  } catch (e) {
    step(label, false, e.message.slice(0, 160));
  } finally {
    await ctx.close();
  }
}

writeFileSync(`${OUT}evidence.json`, JSON.stringify(evidence, null, 2));

console.log("\n— SUMMARY —");
const fails = results.filter((r) => !r.ok);
console.log(`${results.length - fails.length}/${results.length} passed`);
if (fails.length) {
  console.log("FAILURES:");
  for (const f of fails) console.log(`  ✗ ${f.name} — ${f.detail}`);
}
await browser.close();
process.exit(fails.length ? 1 : 0);
