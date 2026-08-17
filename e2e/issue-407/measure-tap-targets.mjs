// #407 — locale switcher tap-target size on a phone, measured against a real
// deployment, in all four shipped locales.
//
// Two surfaces, because they are DIFFERENT components and only one of them is
// what #407 tabulated:
//   · the AUTHENTICATED guest app bar  → components/locale-switcher.tsx (codes
//     below `lg`); this is the "first phone screen" #407 measured at ~42×32.
//   · the PUBLIC landing               → features/public-landing/locale-switcher.tsx
//     (full words, `flex-wrap`); measured too, so a fix to one is not reported
//     as covering the other.
//
// #407's real tension is that padding the targets out to 44px risks giving back
// the #382 overflow it came from. So every row also carries page overflow and
// per-element clipping: a target that reaches 44px by pushing "Español" off the
// screen is a worse bug than the one being fixed.
//
// Usage:
//   RTOKEN="$(make qual-token | grep -oE '[^/]+$')" node e2e/issue-407/measure-tap-targets.mjs
//
// Exits non-zero when any target is under TARGET_PX in BOTH dimensions, or when
// anything clips — so it is a gate, not just a report. Refuses to measure (also
// non-zero) if the switcher is absent, since an empty page has no small targets
// and no overflow and would otherwise read as a clean pass.

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);

const BASE = process.env.BASE_URL ?? "https://qual.stay.portugalodyssey.pt";
const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const TOKEN = process.env.RTOKEN;
const OUT = join(REPO, "temp/issue-407");
mkdirSync(OUT, { recursive: true });

if (!TOKEN) {
  console.error("RTOKEN is not set. Mint one with `make qual-token`.");
  process.exit(2);
}

// 320 is the narrowest supported phone and where the brand lockup already wraps
// to three lines, so it is the width with least headroom for bigger targets.
const WIDTHS = [320, 360, 390, 414];
const LOCALES = ["en", "pt-PT", "fr", "es"];
// The HIG/Material target. WCAG 2.5.8 AA is 24px and was already met — this is
// the ergonomic target, so a miss is a defect but not an a11y failure.
const TARGET_PX = 44;

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

const seed = await browser.newContext({ viewport: { width: 390, height: 844 } });
const seedPage = await seed.newPage();
await seedPage.goto(`${BASE}/r/${TOKEN}`, { waitUntil: "networkidle", timeout: 45000 });
await seedPage.waitForTimeout(1500);
const authed = await seedPage.evaluate(
  () => !!document.querySelector('[role="group"][aria-label="Language switcher"]'),
);
if (!authed) {
  console.error(
    `ABORT: no authenticated switcher on ${seedPage.url()} — every row below would be vacuous.`,
  );
  await browser.close();
  process.exit(1);
}
console.log(`✓ authenticated on ${BASE} — guest switcher present\n`);
const storageState = await seed.storageState();
await seed.close();

// Both surfaces expose a role=group, under different accessible names.
const SURFACES = [
  { name: "guest app bar", group: "Language switcher", path: (l) => `/?lng=${l}`, authed: true },
  { name: "landing", group: "Language", path: (l) => `/?lng=${l}`, authed: false },
];

const rows = [];
let failures = 0;

for (const surface of SURFACES) {
  for (const width of WIDTHS) {
    for (const locale of LOCALES) {
      const ctx = await browser.newContext({
        viewport: { width, height: 844 },
        // The landing must be measured WITHOUT the session, or redemption state
        // sends it to the authenticated tree and it silently measures the other
        // component under the other name.
        ...(surface.authed ? { storageState } : {}),
      });
      const page = await ctx.newPage();
      await page.goto(`${BASE}${surface.path(locale)}`, {
        waitUntil: "networkidle",
        timeout: 45000,
      });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);

      const m = await page.evaluate(
        ({ groupLabel }) => {
          const de = document.documentElement;
          const group = document.querySelector(`[role="group"][aria-label="${groupLabel}"]`);
          if (!group) return { present: false, buttons: [], overflow: 0, viewport: innerWidth };
          const buttons = [...group.querySelectorAll("button")].map((b) => {
            const r = b.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            return {
              label: b.innerText.trim().replace(/\s+/g, " ").slice(0, 14),
              w: +r.width.toFixed(1),
              h: +r.height.toFixed(1),
              left: +r.left.toFixed(1),
              right: +r.right.toFixed(1),
              // Size is not reach. A 44×44 box that something else covers is
              // not a tap target, and a `display:none` switcher collapses every
              // box to 0×0 at the origin — no overflow, nothing clipped.
              hittable:
                r.width > 0 && r.height > 0 && !!b.contains(document.elementFromPoint(cx, cy)),
            };
          });
          return {
            present: true,
            buttons,
            overflow: de.scrollWidth - de.clientWidth,
            viewport: innerWidth,
          };
        },
        { groupLabel: surface.group },
      );

      if (!m.present || m.buttons.length !== 4) {
        console.error(
          `✗ ${surface.name} ${locale} @${width}: expected 4 buttons, found ` +
            `${m.present ? m.buttons.length : "no switcher"} — refusing to report a clean row.`,
        );
        await ctx.close();
        await browser.close();
        process.exit(1);
      }

      // "Too small" means small in BOTH dimensions — #407 asks for ≥44 in at
      // least one, ideally both — so track the two separately rather than
      // collapsing them into one verdict.
      const bothSmall = m.buttons.filter((b) => b.w < TARGET_PX && b.h < TARGET_PX);
      const anySmall = m.buttons.filter((b) => b.w < TARGET_PX || b.h < TARGET_PX);
      const clipped = m.buttons.filter((b) => b.left < -0.5 || b.right > m.viewport + 0.5);
      const unreachable = m.buttons.filter((b) => !b.hittable);
      const bad = bothSmall.length > 0 || clipped.length > 0 || unreachable.length > 0;
      if (bad) failures++;

      const flags = [
        bothSmall.length ? `⚠ ${bothSmall.length} under ${TARGET_PX}px BOTH ways` : "",
        anySmall.length && !bothSmall.length ? `· ${anySmall.length} under on one axis` : "",
        clipped.length ? `🔴 ${clipped.length} CLIPPED` : "",
        unreachable.length ? `🔴 ${unreachable.length} unreachable` : "",
      ]
        .filter(Boolean)
        .join("  ");

      console.log(
        `${surface.name.padEnd(13)} ${locale.padEnd(6)} @${String(width).padEnd(4)} ` +
          `overflow=${String(m.overflow).padStart(3)}  ` +
          `[${m.buttons.map((b) => `${b.label}=${b.w}×${b.h}`).join(" ")}]  ${flags}`,
      );
      rows.push({ surface: surface.name, width, locale, ...m });
      await ctx.close();
    }
  }
}

await browser.close();
writeFileSync(join(OUT, "tap-targets.json"), JSON.stringify(rows, null, 2));

console.log(`\n— SUMMARY (${BASE}) —`);
console.log(`${rows.length} cells measured · ${failures} failing`);
console.log(`evidence → ${join(OUT, "tap-targets.json")}`);
if (failures > 0) {
  console.log(`\nFAIL: ${failures} cell(s) have a target under ${TARGET_PX}px in both dimensions,`);
  console.log(`or something clipped/unreachable. See rows flagged above.`);
  process.exit(1);
}
console.log(`\nPASS: every target reaches ${TARGET_PX}px on at least one axis, nothing clipped.`);
