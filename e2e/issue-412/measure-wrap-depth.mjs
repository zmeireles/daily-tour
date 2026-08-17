// #412 — measure masthead nav wrap depth on DEPLOYED qual, per locale per width.
//
// Why this exists as a separate probe: `apps/pwa/e2e/layout-overflow.spec.ts`
// measures the LOCAL preview build and reports every nav item at 44px — including
// `fr@1024`, the value #414 pinned at 60 as a known residual. Both cannot be
// right, and "the guard is green" is not evidence when the guard may simply be
// measuring a different surface than the one the issue was written from.
//
// So this measures the same DOM property (`a.getBoundingClientRect().height`
// inside `header nav[aria-label="Primary"]`) against the real deployment, and
// additionally records the font actually in use — wrap depth is a function of
// text metrics, so a webfont that has not loaded at measurement time is the
// leading candidate for a local/qual divergence.
//
// Usage:
//   RTOKEN="$(make qual-token | grep -oE '[^/]+$')" node e2e/issue-412/measure-wrap-depth.mjs
//
// Exits non-zero if it could not measure the authenticated surface, so a broken
// run can never be mistaken for "no residual found".

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
// playwright-core is a transitive dep, so it has no root-level entry to resolve
// by name. Same explicit pnpm path the sibling probes use.
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);
const BASE = process.env.BASE_URL ?? "https://qual.stay.portugalodyssey.pt";
const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const TOKEN = process.env.RTOKEN;
const OUT = join(REPO, "temp/issue-412");
mkdirSync(OUT, { recursive: true });

if (!TOKEN) {
  console.error("RTOKEN is not set. Mint one with `make qual-token`.");
  process.exit(2);
}

// 1024 is the value under dispute. 768/834 (iPad portrait) and 1280 are the
// other widths #412 tabulates; 960 and 1100 bracket 1024 so a residual that has
// merely MOVED is visible rather than reported as absent.
const WIDTHS = [768, 834, 960, 1024, 1100, 1280];
const LOCALES = ["en", "pt-PT", "fr", "es"];
const ONE_LINE_MAX = 44;

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

const seed = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const seedPage = await seed.newPage();
await seedPage.goto(`${BASE}/r/${TOKEN}`, { waitUntil: "networkidle", timeout: 45000 });
await seedPage.waitForTimeout(1500);
const authed = await seedPage.evaluate(
  () => !!document.querySelector('header nav[aria-label="Primary"]'),
);
if (!authed) {
  // Refuse to measure. The public landing has no masthead nav at all, so every
  // width would report zero nav items — which reads exactly like "no residual".
  console.error(
    `ABORT: not authenticated (landed on ${seedPage.url()}). Every measurement below would be vacuous.`,
  );
  await browser.close();
  process.exit(1);
}
console.log(`✓ authenticated on ${BASE} — masthead nav present, measuring\n`);
const storageState = await seed.storageState();
await seed.close();

const rows = [];
for (const width of WIDTHS) {
  for (const locale of LOCALES) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, storageState });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/?lng=${locale}`, { waitUntil: "networkidle", timeout: 45000 });
    // Fonts settle AFTER networkidle for a webfont applied by CSS, and wrap
    // depth is a pure function of text metrics — so measuring before this
    // resolves is how the same page yields two different answers.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);

    const m = await page.evaluate(() => {
      const nav = document.querySelector('header nav[aria-label="Primary"]');
      // The three flex columns of the masthead row. Wrap depth is decided by
      // what is LEFT for the nav after the brand lockup and the right cluster
      // take their share, so comparing these three is what tells a real layout
      // difference from a measurement artefact.
      const row = nav?.parentElement;
      const columns = row
        ? [...row.children].map((el) => ({
            tag: el.tagName.toLowerCase(),
            label: (el.getAttribute("aria-label") ?? el.className.slice(0, 24)).trim(),
            width: +el.getBoundingClientRect().width.toFixed(1),
          }))
        : [];
      const items = nav
        ? [...nav.querySelectorAll("a")].map((a) => {
            const cs = getComputedStyle(a);
            return {
              text: a.innerText.replace(/\s+/g, " ").trim(),
              height: +a.getBoundingClientRect().height.toFixed(0),
              width: +a.getBoundingClientRect().width.toFixed(0),
              font: `${cs.fontFamily.split(",")[0].replace(/["']/g, "")} ${cs.fontSize}`,
              letterSpacing: cs.letterSpacing,
            };
          })
        : [];
      // ⚠️ HEIGHT CANNOT COUNT LINES HERE. The link carries `min-h-[44px]`, and
      // two lines of 14px `text-sm` measure ~40px — so a two-line label sits
      // INSIDE the 44px floor and reports the same height as a one-line one.
      // Only a third line pushes past it. That is why #412's own height table
      // reads 44/60 while its title says "pt/fr wrap two even at 1280": both
      // are true, and the height axis can only see the three-line case.
      //
      // A line box per rendered line is what actually counts lines, so measure
      // the label span's client rects.
      //
      // ⚠️ SELECT THE LABEL, NOT THE FIRST SPAN. `a.querySelector("span")`
      // returns the AVATAR on the chat item, which is `hidden` below `xl` and
      // therefore has ZERO client rects — so the line count came back [1,1,0]
      // and `Math.max` read 1, i.e. "nothing wraps", for the one item that
      // does. The avatar's fallback is a single character, so the label is the
      // non-aria-hidden span with the longest text.
      const labelSpan = (a) =>
        [...a.querySelectorAll("span")]
          .filter((s) => !s.hasAttribute("aria-hidden"))
          .sort((x, y) => y.textContent.trim().length - x.textContent.trim().length)[0] ?? a;
      // ⚠️ AND COUNT LINES OVER THE TEXT, NOT THE ELEMENT. The label span is a
      // FLEX ITEM, so it is block-level and `span.getClientRects()` returns
      // exactly ONE rect however many lines it holds. That version reported
      // "1 line, no residual" against a qual build measured at 60px / three
      // lines — a green that could not have gone red. A Range over the span's
      // contents yields one rect per LINE BOX, which is the actual count, and
      // height/line-height is kept as an independent cross-check.
      const countLines = (span) => {
        const range = document.createRange();
        range.selectNodeContents(span);
        const byRange = range.getClientRects().length;
        const lh = parseFloat(getComputedStyle(span).lineHeight);
        const byHeight = Number.isFinite(lh)
          ? Math.round(span.getBoundingClientRect().height / lh)
          : 0;
        return { byRange, byHeight, lines: Math.max(byRange, byHeight) };
      };
      const lines = nav
        ? [...nav.querySelectorAll("a")].map((a) => {
            const span = labelSpan(a);
            return { text: span.textContent.trim(), ...countLines(span) };
          })
        : [];
      const available = nav ? +nav.getBoundingClientRect().width.toFixed(1) : 0;

      return {
        items,
        columns,
        lines,
        available,
        fontsLoaded: document.fonts.status,
        // The layout width the masthead actually gets, versus the viewport it
        // was asked for. A classic (non-overlay) vertical scrollbar takes ~15px
        // out of the first and not the second — and 15px is enough to decide a
        // wrap at the threshold. A harness with no backend renders a short page,
        // gets no scrollbar, and therefore measures a WIDER masthead than any
        // real guest has.
        innerWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollbar: window.innerWidth - document.documentElement.clientWidth,
        pageHeight: document.documentElement.scrollHeight,
      };
    });

    if (m.items.length === 0) {
      console.error(`✗ ${locale} @${width}: NO nav items found — refusing to record a clean row.`);
      await ctx.close();
      await browser.close();
      process.exit(1);
    }

    const worst = Math.max(...m.items.map((i) => i.height));
    // A zero here is a MIS-SELECTION, not a one-line label — and it would read
    // as "nothing wraps". Refuse to record it.
    const blind = m.lines.filter((l) => l.lines === 0);
    const disagree = m.lines.filter((l) => l.byRange !== l.byHeight);
    if (blind.length > 0) {
      console.error(
        `✗ ${locale} @${width}: ${blind.length} label(s) measured ZERO line boxes ` +
          `(${blind.map((b) => JSON.stringify(b.text)).join(", ")}). The probe is measuring the ` +
          `wrong element — refusing to report a clean row.`,
      );
      await ctx.close();
      await browser.close();
      process.exit(1);
    }
    if (disagree.length > 0) {
      // Not fatal — a wrapped inline range and the box height can legitimately
      // round apart — but it must be visible rather than silently maxed away.
      console.log(
        `    ↳ note ${locale}@${width}: range/height line counts differ — ` +
          disagree.map((d) => `${JSON.stringify(d.text)} ${d.byRange}/${d.byHeight}`).join(", "),
      );
    }
    const maxLines = Math.max(...m.lines.map((l) => l.lines));
    const flag = maxLines > 1 ? ` ⚠ WRAPS ${maxLines} lines` : "";
    console.log(
      `${locale.padEnd(6)} @${String(width).padEnd(5)} worst=${String(worst).padStart(3)}px  ` +
        `layout=${m.clientWidth}px (scrollbar ${m.scrollbar}px, page ${m.pageHeight}px)  ` +
        `lines=[${m.lines.map((l) => l.lines).join(",")}] navW=${m.available}  ` +
        `[${m.items.map((i) => `${i.text}=${i.width}x${i.height}`).join(", ")}]  font=${m.items[0].font}` +
        `  fonts=${m.fontsLoaded}${flag}`,
    );
    rows.push({ width, locale, worst, maxLines, ...m });
    await ctx.close();
  }
}

await browser.close();
writeFileSync(join(OUT, "wrap-depth.json"), JSON.stringify(rows, null, 2));

const wrapping = rows.filter((r) => r.maxLines > 1);
console.log(`\n— SUMMARY (${BASE}) —`);
console.log(
  `${rows.length} cells measured · ${wrapping.length} have a label on more than one line`,
);
for (const r of wrapping)
  console.log(
    `  ⚠ ${r.locale} @${r.width} — ${r.lines
      .filter((l) => l.lines > 1)
      .map((l) => `${JSON.stringify(l.text)} on ${l.lines} lines`)
      .join("; ")} (height ${r.worst}px)`,
  );
if (wrapping.length === 0) {
  console.log("  no residual found — #412 does not reproduce on this build");
}
console.log(`evidence → ${join(OUT, "wrap-depth.json")}`);
