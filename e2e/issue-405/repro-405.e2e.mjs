// #405 — guest home overflows 768–959px; Español unreachable on iPad portrait.
//
// The AUTHENTICATED guest home, which is the surface the issue is about. The
// locale spec (e2e/locale-verify/) loads `/` unauthenticated and therefore
// renders the PUBLIC LANDING and its own switcher — its green rows at 768/834
// say nothing about this defect. Covering it needs a redeemed token.
//
// Usage:
//   RTOKEN="$(make qual-token | grep -oE '[^/]+$')" node e2e/issue-405/repro-405.e2e.mjs
//
// Exits non-zero when the defect is present, so it works as a gate as well as
// a repro. Prints a per-element breakdown so the fix targets the real culprit
// rather than the first plausible one.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);

const BASE = process.env.BASE_URL ?? "https://qual.stay.portugalodyssey.pt";
const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const TOKEN = process.env.RTOKEN;
const OUT = REPO + "/temp/issue-405/";
mkdirSync(OUT, { recursive: true });

if (!TOKEN) {
  console.error("RTOKEN is not set. Mint one with `make qual-token`.");
  process.exit(2);
}

// 768 and 834 are iPad portrait. 960 is where the issue reports it clears —
// included as a control: if 960 ever fails too, the diagnosis has moved.
const WIDTHS = [768, 800, 834, 900, 960, 1024, 1100, 1200, 1280];
// ⚠️ LOCALE IS A DIMENSION, not a detail. The compaction budget was computed
// against pt-PT, and French nav labels are wider (item widths 104/87/124 vs
// 102/58/119) — so a fix that measures clean in Portuguese can still overflow
// in French. Review caught exactly that: 20px at 768, in a shipped locale, on
// iPad portrait. `?lng=` is first in the detector order, so it wins outright.
const LOCALES = ["en", "pt-PT", "fr", "es"];
const LOCALE_LABELS = /^(EN|PT|FR|ES|English|Português|Français|Español)$/i;

const results = [];
const evidence = [];
function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

// One context redeems the token; the storage state is then reused so each
// width measures a warm, authenticated home rather than a redemption redirect.
const seed = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const seedPage = await seed.newPage();
await seedPage.goto(`${BASE}/r/${TOKEN}`, { waitUntil: "networkidle", timeout: 45000 });
await seedPage.waitForTimeout(1500);
const landedOn = seedPage.url();
const seedAuthed = await seedPage.evaluate(() => ({
  hasNav: !!document.querySelector('nav[aria-label="Primary"]'),
  bodyLen: document.body.innerText.trim().length,
}));
step(
  "redeemed the guest token and landed on the AUTHENTICATED app",
  !landedOn.includes("/r/") && !landedOn.includes("reason=expired") && seedAuthed.hasNav,
  `${landedOn} primaryNav=${seedAuthed.hasNav} bodyLen=${seedAuthed.bodyLen}`,
);
if (!seedAuthed.hasNav) {
  // Refuse to measure. Every width would render the public landing (which has
  // its own four locale buttons) or a blank page, and both report overflow 0 —
  // a clean pass that proves nothing. This exact failure cost a full cycle.
  console.error("\nABORT: not authenticated, so the widths below would measure the wrong surface.");
  await browser.close();
  process.exit(1);
}
const storageState = await seed.storageState();
await seed.close();

for (const { width, locale } of WIDTHS.flatMap((width) =>
  LOCALES.map((locale) => ({ width, locale })),
)) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, storageState });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/?lng=${locale}`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(900);

    const m = await page.evaluate((labelSrc) => {
      const re = new RegExp(labelSrc, "i");
      const de = document.documentElement;
      const box = (el) => {
        const r = el.getBoundingClientRect();
        return {
          label: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 24),
          left: +r.left.toFixed(1),
          right: +r.right.toFixed(1),
          w: +r.width.toFixed(1),
        };
      };
      // Select by the switcher's own group rather than by label text. The
      // buttons carry BOTH the visible code and an sr-only full word, so
      // `innerText` reads "PT Português" and an anchored label regex matches
      // nothing — which reported `buttons=0` and failed a working fix.
      const group = document.querySelector('[role="group"][aria-label="Language switcher"]');
      const buttons = group
        ? [...group.querySelectorAll("button")].map((b) => {
            const r = b.getBoundingClientRect();
            // ⚠️ Size and hit-test, not just position. Without these, a "fix"
            // that hides the switcher (display:none below lg) reports
            // authed=true, overflow=0, offscreen=0, buttons=4 — every rect
            // collapsed to 0×0 at the origin, so nothing is "off-screen" and
            // the spec passes. Demonstrated; this is the third false-pass path
            // found in this harness.
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const hit =
              r.width > 0 && r.height > 0 && b.contains(document.elementFromPoint(cx, cy));
            return { ...box(b), hit };
          })
        : [];
      void re;

      // What is actually consuming the row? Report the header's direct children
      // so the fix targets the real culprit.
      const header = document.querySelector("header");
      const headerKids = header ? [...header.querySelectorAll(":scope > div > *")].map(box) : [];

      // Widest element that exceeds the viewport, if any.
      let worst = null;
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > window.innerWidth + 1 || r.left < -1) {
          const over = Math.max(r.right - window.innerWidth, -r.left);
          if (!worst || over > worst.over) {
            worst = {
              ...box(el),
              tag: el.tagName.toLowerCase(),
              cls: (el.className || "").toString().slice(0, 70),
              over: +over.toFixed(1),
            };
          }
        }
      }

      return {
        overflow: de.scrollWidth - de.clientWidth,
        viewport: window.innerWidth,
        // Proves this is the authenticated masthead and not the public landing
        // (which carries its own four locale buttons) or a blank page.
        authed: !!document.querySelector('nav[aria-label="Primary"]'),
        buttons,
        headerKids,
        worst,
      };
    }, LOCALE_LABELS.source);

    const offscreen = m.buttons.filter((b) => b.left < 0 || b.right > m.viewport + 1);
    evidence.push({ width, locale, ...m, offscreen });

    const invisible = m.buttons.filter((b) => !b.hit || b.w < 8);
    const ok =
      m.authed &&
      m.overflow <= 1 &&
      offscreen.length === 0 &&
      invisible.length === 0 &&
      m.buttons.length === 4;
    step(
      `${width}px [${locale}] — overflow 0, all four buttons on-screen and hittable`,
      ok,
      `authed=${m.authed} overflow=${m.overflow}px buttons=${m.buttons.length}` +
        (offscreen.length ? ` OFFSCREEN=${offscreen.map((b) => b.label).join(",")}` : "") +
        (invisible.length
          ? ` NOT-HITTABLE=${invisible.map((b) => b.label || "?").join(",")}`
          : "") +
        (m.worst ? ` worst=<${m.worst.tag} class="${m.worst.cls}"> over by ${m.worst.over}px` : ""),
    );
    if (locale === "fr")
      await page.screenshot({ path: `${OUT}home-${width}-fr.png` }).catch(() => {});
  } catch (e) {
    step(`${width}px [${locale}]`, false, e.message.slice(0, 160));
  } finally {
    await ctx.close();
  }
}

// ── #405 secondary: the PUBLIC LANDING clips "English" off the LEFT at 320 ──
// Deliberately measured with a per-element bounding box, not page overflow: a
// negative `left` does not grow `scrollWidth`, so an overflow-only assertion
// reports a clean 0 here and always has.
for (const width of [320, 360, 390]) {
  const label = `landing ${width}px — no locale button hangs off either edge`;
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(700);
    const m = await page.evaluate(() => {
      const group = document.querySelector('[role="group"][aria-label="Language"]');
      const buttons = group
        ? [...group.querySelectorAll("button")].map((b) => {
            const r = b.getBoundingClientRect();
            return {
              label: b.innerText.trim(),
              left: +r.left.toFixed(1),
              right: +r.right.toFixed(1),
            };
          })
        : [];
      return { buttons, viewport: window.innerWidth, landing: !!group };
    });
    const out = m.buttons.filter((b) => b.left < -0.5 || b.right > m.viewport + 0.5);
    step(
      label,
      m.landing && m.buttons.length === 4 && out.length === 0,
      `landingSwitcher=${m.landing} buttons=${m.buttons.length}` +
        (out.length ? ` OFFSCREEN=${JSON.stringify(out)}` : ""),
    );
    await page.screenshot({ path: `${OUT}landing-${width}.png` }).catch(() => {});
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
