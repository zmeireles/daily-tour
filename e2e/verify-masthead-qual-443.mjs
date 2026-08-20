// Live verification of #443 (masthead nav-label wrapping fix) on qual, real
// Chrome, real webfonts, real data — NOT the CI Playwright layout guard, which
// runs against a local preview build with a stubbed API and bundled Chromium.
//
// Redeems the guest link ONCE (read-only, no reload of /r/), switches to
// pt-PT via the in-app switcher, then measures the masthead at 768 and 1280
// by RESIZING the same page (no re-navigation) — same discipline as
// apps/pwa/e2e/layout-overflow.spec.ts's measure(), reused here almost
// verbatim: await document.fonts.ready before any box read (a previous defect,
// fr@1024, was missed by measuring the fallback font), Range-based line
// counting (height alone hides a 2-line label under the 44px min-height
// floor), and hit-testing switcher buttons rather than trusting their rect.
//
// Exit 0 always — report-only, orchestrator triages.
import { createRequire } from "node:module";
import { mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ⚠️ THE REDEEM TOKEN IS NOT COMMITTED, AND MUST NOT BE. It is a live guest
// credential for qual — anyone holding it has a guest session — and it is
// short-lived (its lifetime tracks the reservation checkout), so a literal
// would rot even if it were safe to store.
//
//   make qual-token                       # prints https://…/r/<token>
//   DT_REDEEM_URL='https://…/r/<token>' node e2e/verify-masthead-qual-443.mjs
//
// ⚠️ THIS CHECK COMES BEFORE THE BROWSER RESOLUTION BELOW, deliberately. It was
// written after it, and an unrelated MODULE_NOT_FOUND then masked it entirely:
// running with no token reported a missing dependency, which sends you to
// `pnpm install` instead of to `make qual-token`. A guard that a louder,
// earlier failure can shadow is a guard that does not fire.
const REDEEM_URL = process.env.DT_REDEEM_URL;
if (!REDEEM_URL) {
  console.error(
    "DT_REDEEM_URL is required.\n" +
      "  Mint one:  make qual-token\n" +
      "  Then:      DT_REDEEM_URL='https://…/r/<token>' node e2e/verify-masthead-qual-443.mjs",
  );
  process.exit(2); // 2, not 1 — a config error must not read as a failed assertion
}

// playwright-core is NOT linked into any package's node_modules — pnpm keeps it
// in the store only, reachable through @playwright/test's own tree. So it must
// be found by path, and the path carries the version. Globbing the store keeps
// this working across a bump; a pinned `playwright-core@1.60.0` would break at
// the next one with a "cannot find module" that reads like a missing dep.
function resolvePlaywrightCore() {
  const store = `${REPO}/node_modules/.pnpm`;
  const hit = readdirSync(store).find((d) => d.startsWith("playwright-core@"));
  if (!hit) {
    console.error(
      `playwright-core not found under ${store}.\n` +
        "  Run `pnpm install` at the repo root, then retry.",
    );
    process.exit(2);
  }
  return require(`${store}/${hit}/node_modules/playwright-core`);
}
const { chromium } = resolvePlaywrightCore();

const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const SHOTS = `${REPO}/temp/uat/`;
mkdirSync(SHOTS, { recursive: true });

const WIDTHS = [768, 1280];
const HEIGHT = 900;

const results = [];
function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const consoleErrors = [];
const pageErrors = [];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({
  viewport: { width: WIDTHS[0], height: HEIGHT },
  ignoreHTTPSErrors: false,
});
const page = await ctx.newPage();
page.on("pageerror", (e) => pageErrors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 220));
});

// ── Redeem ONCE ────────────────────────────────────────────────────────────
let redeemOk = false;
try {
  await page.goto(REDEEM_URL, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector('header nav[aria-label="Primary"]', { timeout: 20000 });
  const landed = page.url();
  redeemOk = !landed.includes("/r/");
  step("redeem → authenticated Home", redeemOk, `landed at ${landed}`);
} catch (e) {
  step("redeem → authenticated Home", false, e.message.slice(0, 200));
}

// ── Switch to pt-PT via the masthead switcher ───────────────────────────────
let localeSwitched = false;
if (redeemOk) {
  try {
    const group = page.locator('header [role="group"][aria-label="Language switcher"]');
    await group.waitFor({ state: "visible", timeout: 10000 });
    const ptButton = group.getByRole("button", { name: /Portugu/i });
    await ptButton.click();
    await page.waitForTimeout(600); // i18n.changeLanguage + re-render
    const navText = await page
      .locator('header nav[aria-label="Primary"]')
      .innerText()
      .catch(() => "");
    // Case-insensitive: the Overline component applies CSS text-transform:
    // uppercase, so innerText renders "DESCOBRIR" — the DOM/i18n string is
    // still "Descobrir", the visual case is a styling choice, not the check.
    localeSwitched =
      /descobrir/i.test(navText) &&
      /o meu dia/i.test(navText) &&
      /falar com o miguel/i.test(navText);
    step(
      "locale switcher actually changed nav labels to pt-PT",
      localeSwitched,
      `nav text: "${navText.replace(/\n/g, " | ")}"`,
    );
  } catch (e) {
    step("locale switcher actually changed nav labels to pt-PT", false, e.message.slice(0, 200));
  }
} else {
  step("locale switcher actually changed nav labels to pt-PT", false, "skipped — redeem failed");
}

// ── Per-width measurement (resize only, no reload) ──────────────────────────
async function measure() {
  return page.evaluate(async () => {
    // Load-bearing: measuring before the webfont applies reports the
    // fallback font's narrower metrics — systematically optimistic.
    await document.fonts.ready;

    const header = document.querySelector("header");
    const headerNav = document.querySelector('header nav[aria-label="Primary"]');
    const group = document.querySelector('header [role="group"][aria-label="Language switcher"]');

    const navItems = headerNav
      ? [...headerNav.querySelectorAll("a")].map((a) => {
          const span =
            [...a.querySelectorAll("span")]
              .filter((s) => !s.hasAttribute("aria-hidden"))
              .sort(
                (x, y) => (y.textContent ?? "").trim().length - (x.textContent ?? "").trim().length,
              )[0] ?? a;
          const range = document.createRange();
          range.selectNodeContents(span);
          const lh = parseFloat(getComputedStyle(span).lineHeight);
          const rectLines = range.getClientRects().length;
          const heightLines = Number.isFinite(lh)
            ? Math.round(span.getBoundingClientRect().height / lh)
            : 0;
          return {
            text: a.innerText.replace(/\s+/g, " ").trim(),
            height: +a.getBoundingClientRect().height.toFixed(1),
            lines: Math.max(rectLines, heightLines),
            lineMethod: `max(range=${rectLines}, height/lineHeight=${heightLines})`,
          };
        })
      : [];

    const switcherButtons = group
      ? [...group.querySelectorAll("button")].map((b) => {
          const r = b.getBoundingClientRect();
          const visibleSpan = [...b.querySelectorAll("span")].find(
            (s) => s.getBoundingClientRect().width > 1,
          );
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const hitEl = document.elementFromPoint(cx, cy);
          return {
            label: (visibleSpan?.textContent ?? b.innerText).trim(),
            width: +r.width.toFixed(1),
            height: +r.height.toFixed(1),
            hittable: r.width > 0 && r.height > 0 && !!b.contains(hitEl),
          };
        })
      : [];

    // Left-edge clipping — negative `left` does NOT grow scrollWidth, so this
    // must be an explicit per-element rect check, not a page-overflow check.
    const clipped = header
      ? [...header.querySelectorAll("*")]
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && r.height > 0 && r.left < -0.5)
          .map(({ el, r }) => ({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent ?? "").trim().slice(0, 40),
            left: +r.left.toFixed(1),
          }))
      : [];

    // Free space AS LITERALLY SPECIFIED: nav.clientWidth minus the sum of its
    // OWN children's offsetWidth minus the gaps between them. This is
    // structurally ~0 whenever nav has no intrinsic width of its own (it's a
    // plain flex item, shrink-to-fit) — its box always hugs its rendered
    // children exactly, comfortable or already-squeezed alike, so it cannot
    // distinguish "packed exactly" from "about to wrap". Reported as asked,
    // but see rowHeadroom below for the number that actually answers that.
    let freeSpace = null;
    if (headerNav) {
      const children = [...headerNav.children];
      const sumWidth = children.reduce((s, c) => s + c.offsetWidth, 0);
      const gapPx = parseFloat(getComputedStyle(headerNav).columnGap || "0") || 0;
      const totalGap = gapPx * Math.max(0, children.length - 1);
      freeSpace = +(headerNav.clientWidth - sumWidth - totalGap).toFixed(1);
    }

    // Row headroom: the OUTER header row (brand + nav + right cluster) is a
    // `justify-between` flex row; nav is the only shrinkable child (comment
    // in desktop-top-nav.tsx). So the margin before nav gets squeezed below
    // its natural single-line width is the row's own slack: row.clientWidth
    // minus the sum of ALL THREE children's current offsetWidth minus the
    // gaps between them. While nav is still single-line (as measured above),
    // this is the number comparable to the engineer's "+16.8px @768".
    let rowHeadroom = null;
    const row = headerNav?.parentElement ?? null;
    if (row) {
      const children = [...row.children];
      const sumWidth = children.reduce((s, c) => s + c.offsetWidth, 0);
      const gapPx = parseFloat(getComputedStyle(row).columnGap || "0") || 0;
      const totalGap = gapPx * Math.max(0, children.length - 1);
      rowHeadroom = +(row.clientWidth - sumWidth - totalGap).toFixed(1);
    }

    return {
      masthead: !!headerNav,
      viewport: window.innerWidth,
      navItems,
      switcherButtons,
      clipped,
      freeSpace,
      rowHeadroom,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

const table = [];
for (const width of WIDTHS) {
  await page.setViewportSize({ width, height: HEIGHT });
  await page.waitForTimeout(300); // reflow settle after resize, no navigation
  let m;
  try {
    m = await measure();
  } catch (e) {
    step(`measure @${width}`, false, e.message.slice(0, 200));
    continue;
  }
  await page.screenshot({ path: `${SHOTS}masthead-443-${width}.png` }).catch(() => {});

  const worstLines = m.navItems.length ? Math.max(...m.navItems.map((i) => i.lines)) : null;
  const worstHeight = m.navItems.length ? Math.max(...m.navItems.map((i) => i.height)) : null;
  const allSingleLine = m.navItems.length > 0 && m.navItems.every((i) => i.lines === 1);
  const allUnder44 = m.navItems.length > 0 && m.navItems.every((i) => i.height <= 44);
  const allHittable =
    m.switcherButtons.length > 0 && m.switcherButtons.every((b) => b.hittable && b.width >= 8);
  const noClipping = m.clipped.length === 0;

  const pass = m.masthead && allSingleLine && allUnder44 && allHittable && noClipping;

  table.push({
    width,
    masthead: m.masthead,
    worstLines,
    worstHeight,
    freeSpace: m.freeSpace,
    rowHeadroom: m.rowHeadroom,
    clipped: m.clipped,
    switcherButtons: m.switcherButtons,
    navItems: m.navItems,
    pass,
  });

  step(
    `@${width}: masthead present`,
    m.masthead,
    m.masthead ? "" : "header nav[aria-label=Primary] not found — this width is NOT desktop tree",
  );
  step(
    `@${width}: every nav item single-line, ≤44px`,
    allSingleLine && allUnder44,
    m.navItems.map((i) => `"${i.text}"=${i.lines}L/${i.height}px`).join("; "),
  );
  step(
    `@${width}: every locale button hittable, width≥8px`,
    allHittable,
    m.switcherButtons.map((b) => `${b.label}=${b.width}×${b.height} hit=${b.hittable}`).join("; "),
  );
  step(
    `@${width}: no header element with negative left`,
    noClipping,
    m.clipped.length ? JSON.stringify(m.clipped) : "none",
  );
  step(
    `@${width}: free space in nav row`,
    true,
    `nav-internal=${m.freeSpace}px (tautologically ~0, see comment) · row-headroom=${m.rowHeadroom}px (page overflow ${m.pageOverflow}px)`,
  );
}

// ── Summary ──────────────────────────────────────────────────────────────
console.log("\n— MEASUREMENT TABLE —");
for (const row of table) {
  console.log(
    `${row.width}px  masthead=${row.masthead}  worstLines=${row.worstLines}  worstHeight=${row.worstHeight}px  navFreeSpace=${row.freeSpace}px  rowHeadroom=${row.rowHeadroom}px  clipped=${row.clipped.length}  pass=${row.pass}`,
  );
}

console.log("\n— SUMMARY —");
const fails = results.filter((r) => !r.ok);
console.log(`${results.length - fails.length}/${results.length} checks passed`);
if (fails.length) {
  console.log("FAILURES:");
  for (const f of fails) console.log(`  ✗ ${f.name} — ${f.detail}`);
}

const overallPass =
  redeemOk && localeSwitched && table.length === WIDTHS.length && table.every((r) => r.pass);
console.log(`\nOVERALL: ${overallPass ? "PASS" : "FAIL"}`);

if (consoleErrors.length) {
  console.log(
    "\nCONSOLE ERRORS (see SKILL memory: MapLibre AJAXError(0)/ERR_ABORTED on superseded tiles is benign):",
  );
  console.log(consoleErrors.join("\n"));
}
if (pageErrors.length) {
  console.log("\nPAGE ERRORS:");
  console.log(pageErrors.join("\n"));
}

console.log(`\nScreenshots: ${SHOTS}masthead-443-768.png, ${SHOTS}masthead-443-1280.png`);

await browser.close();
process.exit(0);
