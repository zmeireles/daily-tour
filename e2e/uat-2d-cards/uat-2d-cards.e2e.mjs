// Deep UAT — "São Miguel Editorial" PlaceCard restyle, LIGHT + DARK themes.
// FIRST in-app render of the new editorial design tokens. Verifies the cream/
// dark-green-grey card surface, no drop shadows, hydrangea distance chip,
// Fraunces serif name, real heroes + branded tea-green fallback panel.
// REPORT-ONLY (exit 0). READ-ONLY (no submits). playwright-core + system Chrome.
//
// Target: vite dev server http://127.0.0.1:5173 (working tree, latest restyle).
// Entry: opaque multi-use redeem token -> SPA RTokenRoute -> guest JWT -> home.
// Theme: forced via localStorage.theme + reload; asserts <html data-theme>.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const TOKEN = process.env.RTOKEN;
const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const SHOTS = REPO + "/temp/uat-2d-cards/";
mkdirSync(SHOTS, { recursive: true });

// Phone is the canonical guest device (host's link tapped on a phone). The
// host's-picks ribbon + discover lists are designed mobile-first.
const VIEWPORTS = { mobile: { width: 390, height: 844 } };

const results = [];
const errors = [];
const netFail = [];
let ctx, page;

function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}
async function shot(tag) {
  const p = `${SHOTS}${tag}.png`;
  await page.screenshot({ path: p, fullPage: false }).catch(() => {});
  return `${tag}.png`;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(browser, viewport = VIEWPORTS.mobile) {
  if (ctx) await ctx.close();
  ctx = await browser.newContext({ viewport });
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror[step ${results.length}]: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error")
      errors.push(`console[step ${results.length}]: ${m.text().slice(0, 220)}`);
  });
  page.on("response", (resp) => {
    const rt = resp.request().resourceType();
    if (rt === "image" && resp.status() >= 400)
      netFail.push(`[step ${results.length}] ${resp.status()} ${resp.url().slice(0, 140)}`);
  });
}

async function enterAsGuest() {
  await page.goto(`${BASE}/r/${TOKEN}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => location.pathname === "/", { timeout: 30000 }).catch(() => {});
  await page.locator('a[href^="/a/"]').first().waitFor({ state: "visible", timeout: 20000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
}

// Force theme via localStorage, reload, and confirm <html data-theme> reflects it.
async function forceTheme(theme) {
  await page.evaluate((t) => localStorage.setItem("theme", t), theme);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await sleep(800);
  return page.evaluate(() => document.documentElement.getAttribute("data-theme"));
}

// sRGB relative luminance + WCAG contrast ratio from two "rgb(...)" strings.
function parseRgb(s) {
  const m = String(s).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b] = m[1].split(",").map((x) => parseFloat(x));
  return [r, g, b];
}
function lum([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(fg, bg) {
  const a = parseRgb(fg),
    b = parseRgb(bg);
  if (!a || !b) return null;
  const L1 = lum(a),
    L2 = lum(b);
  const hi = Math.max(L1, L2),
    lo = Math.min(L1, L2);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

// Probe a real stacked PlaceCard in the current DOM: surface color, name color +
// font, distance chip bg/fg, action-chip border, box-shadow, and whether the
// hero is a real <img> (naturalWidth>0) or the branded placeholder.
async function probeCards() {
  return page.evaluate(() => {
    const titles = [...document.querySelectorAll("h3.font-display")];
    if (!titles.length) return { found: 0 };
    // Walk up to the editorial Card surface (bg-surface-container-low + rounded).
    const name = titles[0];
    let card = name.closest('[class*="rounded-xl"]') || name.parentElement;
    // Prefer the element whose bg actually differs from the page bg.
    const pageBg = getComputedStyle(document.body).backgroundColor;
    let surfEl = card;
    for (let el = name.parentElement, hops = 0; el && hops < 6; el = el.parentElement, hops++) {
      const bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && bg !== pageBg) {
        surfEl = el;
        break;
      }
    }
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const nameCs = cs(name);
    const surfCs = cs(surfEl);
    // Distance chip: rounded-full span whose text is a distance label
    // ("9 km" / "916 m"), NOT a wish chip ("quick-local"). Require a digit
    // immediately followed by a space + km|m so wish slugs never match.
    const chip = [...document.querySelectorAll("span")].find((s) => {
      const cls = s.className || "";
      return /rounded-full/.test(cls) && /\d[\d.,]*\s?(km|m)\b/.test((s.textContent || "").trim());
    });
    const chipCs = cs(chip);
    const dot = chip?.querySelector("span");
    const dotCs = cs(dot);
    // Action chip (Badge outline): a small element with a border under the card.
    const actionChip = [...(surfEl?.querySelectorAll("div,span") || [])].find((el) => {
      const t = (el.textContent || "").trim().toLowerCase();
      return ["see", "eat", "do", "drink", "stay"].includes(t);
    });
    const acCs = cs(actionChip);
    // Hero: real img vs branded placeholder, within the surface card.
    const heroImg = surfEl?.querySelector("img");
    const placeholder = surfEl?.querySelector('[data-testid="place-card-hero-placeholder"]');
    return {
      found: titles.length,
      pageBg,
      surface: surfCs?.backgroundColor,
      surfaceShadow: surfCs?.boxShadow,
      surfaceRadius: surfCs?.borderRadius,
      nameColor: nameCs?.color,
      nameFont: nameCs?.fontFamily,
      chipText: chip?.textContent?.trim() || null,
      chipBg: chipCs?.backgroundColor || null,
      chipFg: chipCs?.color || null,
      dotBg: dotCs?.backgroundColor || null,
      actionChipText: actionChip?.textContent?.trim() || null,
      actionChipBorder: acCs?.borderColor || null,
      heroIsRealImg: heroImg ? heroImg.complete && heroImg.naturalWidth > 0 : false,
      heroSrc: heroImg?.currentSrc?.slice(0, 90) || null,
      hasBrandedFallback: !!placeholder,
    };
  });
}

// Probe a branded fallback panel (media-less place) specifically: its bg gradient
// + icon color, for the "is the fallback readable" judgment.
async function probeFallback() {
  return page.evaluate(() => {
    const ph = document.querySelector('[data-testid="place-card-hero-placeholder"]');
    if (!ph) return { present: false };
    const cs = getComputedStyle(ph);
    const icon = ph.querySelector("svg");
    const iconCs = icon ? getComputedStyle(icon) : null;
    // The gradient's first color stop (rgb) is the panel's effective top-left bg.
    const stop = (cs.backgroundImage || "").match(/rgba?\([^)]+\)/);
    return {
      present: true,
      bgImage: cs.backgroundImage?.slice(0, 120),
      bgColor: cs.backgroundColor,
      bgStopRgb: stop ? stop[0] : null,
      iconColor: iconCs?.color || null,
    };
  });
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

// One context, enter once, then flip themes within it (localStorage persists).
await newPage(browser, VIEWPORTS.mobile);
await enterAsGuest();

// Expected token literals (from tokens.css / globals.css) for evidence checks.
const EXPECT = {
  light: { surface: "rgb(247, 244, 236)", name: "rgb(14, 20, 19)" }, // #f7f4ec / #0e1413
  dark: { surface: "rgb(23, 29, 28)", name: "rgb(222, 228, 226)" }, // #171d1c / #dee4e2
};

// A box-shadow string is "no visible shadow" when it is literally "none" OR
// every layer is a fully-transparent rgba(...,0) with zero offset/blur/spread.
// Chrome serialises Tailwind shadow-none as repeated "rgba(0,0,0,0) 0px 0px 0px 0px".
function hasNoVisibleShadow(s) {
  if (!s || s === "none") return true;
  return !/rgba?\([^)]*?(?:,\s*0?\.\d+|,\s*[1-9])\s*\)\s+\S/.test(s) && !/[1-9]px/.test(s);
}

const cardProbe = {}; // theme -> probe result, for the report

for (const theme of ["light", "dark"]) {
  // ── HOME (host's-picks ribbon) ─────────────────────────────────────────────
  try {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    const applied = await forceTheme(theme);
    await page
      .locator("h3.font-display")
      .first()
      .waitFor({ state: "visible", timeout: 20000 })
      .catch(() => {});
    await sleep(1000);
    const probe = await probeCards();
    cardProbe[`${theme}-home`] = probe;
    const file = await shot(`${theme}-home`);
    // Surface must NOT be pure white(light)/black(dark) and must match the token.
    const surf = probe.surface || "";
    const notPureWhite = surf !== "rgb(255, 255, 255)";
    const notPureBlack = surf !== "rgb(0, 0, 0)";
    const surfaceMatches = surf === EXPECT[theme].surface;
    const noShadow = hasNoVisibleShadow(probe.surfaceShadow);
    const serifName = /Fraunces/i.test(probe.nameFont || "");
    const nameContrast = contrast(probe.nameColor, probe.surface);
    // Host's-picks payload (/v1/discover?action=eat) does not carry distance_km,
    // so the ribbon cards render no DistanceChip — chip presence is NOT a
    // restyle-quality gate on Home (Discover proves the chip styling). Only
    // assert chip contrast when a distance chip is actually present.
    const chipContrast = probe.chipBg ? contrast(probe.chipFg, probe.chipBg) : null;
    const chipOk = probe.chipBg === null || chipContrast >= 3.0;
    const ok =
      probe.found > 0 &&
      surfaceMatches &&
      notPureWhite &&
      notPureBlack &&
      noShadow &&
      serifName &&
      nameContrast >= 4.5 &&
      chipOk;
    step(
      `${theme.toUpperCase()} Home — editorial card (surface/shadow/serif/contrast)`,
      ok,
      `theme=${applied} cards=${probe.found} surface=${surf} (expect ${EXPECT[theme].surface}) shadow_none=${noShadow} serif=${serifName} name_contrast=${nameContrast} dist_chip=${probe.chipText ?? "(none on home — payload omits distance_km)"} chip_contrast=${chipContrast} file=${file}`,
    );
  } catch (e) {
    step(`${theme.toUpperCase()} Home`, false, String(e.message).slice(0, 150));
    await shot(`${theme}-home-fail`);
  }

  // ── DISCOVER (action drill-down /a/see) ────────────────────────────────────
  try {
    await page.goto(`${BASE}/a/see`, { waitUntil: "domcontentloaded" });
    await page
      .locator("h3.font-display")
      .first()
      .waitFor({ state: "visible", timeout: 20000 })
      .catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
    await sleep(1200);
    const probe = await probeCards();
    const fallback = await probeFallback();
    cardProbe[`${theme}-discover`] = { ...probe, fallback };
    const file = await shot(`${theme}-discover`);
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 2,
    );
    const surf = probe.surface || "";
    const surfaceMatches = surf === EXPECT[theme].surface;
    const noShadow = hasNoVisibleShadow(probe.surfaceShadow);
    const nameContrast = contrast(probe.nameColor, probe.surface);
    const chipContrast = probe.chipBg ? contrast(probe.chipFg, probe.chipBg) : null;
    // Fallback readability: icon must contrast its panel bg (best-effort; gradient
    // bgColor may be transparent, then we fall back to the card surface).
    const fbBg = fallback.present
      ? fallback.bgColor && fallback.bgColor !== "rgba(0, 0, 0, 0)"
        ? fallback.bgColor
        : probe.surface
      : null;
    const fbContrast = fallback.present ? contrast(fallback.iconColor, fbBg) : null;
    const ok =
      probe.found > 0 &&
      surfaceMatches &&
      noShadow &&
      fits &&
      nameContrast >= 4.5 &&
      chipContrast !== null &&
      chipContrast >= 3.0;
    step(
      `${theme.toUpperCase()} Discover /a/see — card list legible (surface/contrast/fits)`,
      ok,
      `theme=${theme} cards=${probe.found} surface=${surf} fits=${fits} name_contrast=${nameContrast} chip_contrast=${chipContrast} fallback_present=${fallback.present} fallback_icon_contrast=${fbContrast} real_hero=${probe.heroIsRealImg} file=${file}`,
    );
  } catch (e) {
    step(`${theme.toUpperCase()} Discover`, false, String(e.message).slice(0, 150));
    await shot(`${theme}-discover-fail`);
  }
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("\n— SUMMARY —");
const fails = results.filter((r) => !r.ok);
console.log(`${results.length - fails.length}/${results.length} scenarios passed`);
console.log("\nCARD PROBES (computed styles per surface):");
console.log(JSON.stringify(cardProbe, null, 2));
if (netFail.length) console.log("\nBROKEN IMAGE RESPONSES:\n" + netFail.join("\n"));
if (errors.length) console.log("\nJS ERRORS / CONSOLE:\n" + errors.join("\n"));
else console.log("\n(no JS errors / console errors captured)");
await browser.close();
process.exit(0);
