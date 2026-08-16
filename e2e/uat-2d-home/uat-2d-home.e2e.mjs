// Focused visual UAT — "São Miguel Editorial" HOME restyle, LIGHT + DARK.
// Scrutinizes the FIRST in-app render of the overlay PlaceCard variant (host's-
// picks ribbon), plus BrandAppBar, Fraunces greeting, 6-card cream bento,
// the two premium cards (Plan my day / Message João), and the fixed BottomTabBar.
//
// REPORT-ONLY (exit 0). READ-ONLY (no submits). playwright-core + system Chrome.
// Target: vite dev server http://127.0.0.1:5173 (working tree, latest restyle).
// Entry: opaque multi-use redeem token -> RTokenRoute -> guest JWT -> authed home.
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
const SHOTS = REPO + "/temp/uat-2d-home/";
mkdirSync(SHOTS, { recursive: true });

// Phone is the canonical guest device (host's link tapped on a phone). The
// Home screen is designed mobile-first (ribbon peeks next card, 2-col bento).
const VIEWPORTS = { mobile: { width: 390, height: 844 } };

const results = [];
const errors = [];
const netFail = [];
let ctx, page;

function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}
async function shot(tag, fullPage = false) {
  const p = `${SHOTS}${tag}.png`;
  await page.screenshot({ path: p, fullPage }).catch(() => {});
  return `${tag}.png`;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(browser, viewport = VIEWPORTS.mobile) {
  if (ctx) await ctx.close();
  ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
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
  // Home renders the BrandAppBar logo + the bento /a/ links; wait for both.
  await page.locator('a[href^="/a/"]').first().waitFor({ state: "visible", timeout: 20000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
}

async function forceTheme(theme) {
  await page.evaluate((t) => localStorage.setItem("theme", t), theme);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await sleep(900);
  return page.evaluate(() => document.documentElement.getAttribute("data-theme"));
}

// ── colour math (sRGB relative luminance + WCAG contrast) ────────────────────
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

// ── BrandAppBar probe: logo loaded, wordmark + overline text/colour, switcher ──
async function probeAppBar() {
  return page.evaluate(() => {
    const header = document.querySelector("header");
    if (!header) return { present: false };
    const logo = header.querySelector('img[src="/logo.svg"]');
    const wordmark = header.querySelector(".font-display");
    const overline = [...header.querySelectorAll("*")].find((el) =>
      /são miguel/i.test(el.textContent || ""),
    );
    const switcher = header.querySelector('[role="group"][aria-label*="anguage"]');
    const switcherBtns = switcher
      ? [...switcher.querySelectorAll("button")].map((b) => ({
          label: b.textContent.trim(),
          pressed: b.getAttribute("aria-pressed"),
        }))
      : [];
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const hcs = cs(header);
    const wcs = cs(wordmark);
    const hRect = header.getBoundingClientRect();
    return {
      present: true,
      sticky: hcs.position,
      headerBg: hcs.backgroundColor,
      logoLoaded: logo ? logo.complete && logo.naturalWidth > 0 : false,
      logoW: logo?.naturalWidth ?? 0,
      wordmarkText: wordmark?.textContent?.trim() || null,
      wordmarkColor: wcs?.color || null,
      wordmarkFont: wcs?.fontFamily || null,
      overlineText: overline?.textContent?.trim().replace(/\s+/g, " ").slice(0, 40) || null,
      switcherBtns,
      headerBottom: Math.round(hRect.bottom),
    };
  });
}

// ── Greeting probe ────────────────────────────────────────────────────────────
async function probeGreeting() {
  return page.evaluate(() => {
    const h1 = document.querySelector("main h1.font-display, h1.font-display");
    const sub = h1?.nextElementSibling;
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const hcs = cs(h1);
    return {
      text: h1?.textContent?.trim() || null,
      color: hcs?.color || null,
      font: hcs?.fontFamily || null,
      fontSize: hcs?.fontSize || null,
      subText: sub?.textContent?.trim().slice(0, 60) || null,
    };
  });
}

// ── Overlay ribbon probe: every card's name colour, contrast over its gradient
//    bg, clip detection, real-hero vs branded-fallback, peek of next card. ─────
async function probeRibbon() {
  return page.evaluate(() => {
    // Overlay cards: portrait aspect-[4/5] pressable shells holding an h3.text-white.
    const cards = [...document.querySelectorAll('[class*="aspect-[4/5]"]')];
    const out = cards.map((card, i) => {
      const name = card.querySelector("h3.font-display");
      const grad = card.querySelector('[class*="bg-gradient-to-t"]');
      const img = card.querySelector("img");
      const placeholder = card.querySelector('[data-testid="place-card-hero-placeholder"]');
      const ncs = name ? getComputedStyle(name) : null;
      const gcs = grad ? getComputedStyle(grad) : null;
      // Name clip test: scrollHeight vs clientHeight on the h3, and whether the
      // name's box bottom is within the card box (not pushed out).
      const nRect = name?.getBoundingClientRect();
      const cRect = card.getBoundingClientRect();
      const clipped = name
        ? name.scrollWidth > name.clientWidth + 1 || name.scrollHeight > name.clientHeight + 1
        : false;
      return {
        i,
        nameText: name?.textContent?.trim() || null,
        nameColor: ncs?.color || null,
        nameFont: ncs?.fontFamily || null,
        gradientImage: gcs?.backgroundImage?.slice(0, 60) || null,
        realHero: img ? img.complete && img.naturalWidth > 0 : false,
        heroSrc: img?.currentSrc?.slice(0, 90) || null,
        brandedFallback: !!placeholder,
        clipped,
        nameWithinCard: nRect && cRect ? nRect.bottom <= cRect.bottom + 1 : null,
        cardW: Math.round(cRect.width),
        cardH: Math.round(cRect.height),
      };
    });
    // Peek: ribbon scroll container is wider than viewport (next card visible).
    const ribbon = cards[0]?.closest('[class*="overflow-x-auto"]');
    const peeks = ribbon ? ribbon.scrollWidth > ribbon.clientWidth + 4 : null;
    return { count: cards.length, cards: out, peeks };
  });
}

// ── Bento probe: 6 /a/ cards, each icon + uppercase label, surface colour. ────
async function probeBento() {
  return page.evaluate(() => {
    const grid = document.querySelector('[class*="grid-cols-2"]');
    const links = grid
      ? [...grid.querySelectorAll('a[href^="/a/"]')]
      : [...document.querySelectorAll('a[href^="/a/"]')];
    const pageBg = getComputedStyle(document.body).backgroundColor;
    const cells = links.map((a) => {
      const cs = getComputedStyle(a);
      const svg = a.querySelector("svg");
      const label = [...a.querySelectorAll("*")]
        .map((e) => e.textContent.trim())
        .filter(Boolean)
        .pop();
      const labelEl = [...a.querySelectorAll("*")].find(
        (e) => e.children.length === 0 && e.textContent.trim(),
      );
      const lcs = labelEl ? getComputedStyle(labelEl) : null;
      const iconCs = svg ? getComputedStyle(svg) : null;
      const r = a.getBoundingClientRect();
      return {
        href: a.getAttribute("href"),
        surface: cs.backgroundColor,
        square: Math.abs(r.width - r.height) <= 2,
        w: Math.round(r.width),
        h: Math.round(r.height),
        label,
        labelColor: lcs?.color || null,
        labelTransform: lcs?.textTransform || null,
        iconColor: iconCs?.color || null,
        hasIcon: !!svg,
      };
    });
    return { count: links.length, pageBg, cells };
  });
}

// ── Premium probe: both cards present, avatar "J", chevrons, surface/contrast. ─
async function probePremium() {
  return page.evaluate(() => {
    const plan = document.querySelector('a[href="/tour/new"]');
    const chat = document.querySelector('a[href="/chat"]');
    const grab = (a) => {
      if (!a) return null;
      const cs = getComputedStyle(a);
      const label = a.querySelector("span.font-medium, .font-medium");
      const lcs = label ? getComputedStyle(label) : null;
      const chevron = a.querySelector("svg.lucide-chevron-right, svg");
      const avatar = a.textContent.includes("J")
        ? [...a.querySelectorAll("*")].find((e) => e.textContent.trim() === "J")
        : null;
      return {
        present: true,
        surface: cs.backgroundColor,
        border: cs.borderColor,
        labelText: label?.textContent?.trim() || null,
        labelColor: lcs?.color || null,
        hasChevron: !!chevron,
        chevronCount: a.querySelectorAll("svg").length,
        hasAvatarJ: !!avatar,
      };
    };
    return { plan: grab(plan), chat: grab(chat) };
  });
}

// ── BottomTabBar probe: fixed bottom, explore active, content clears it. ───────
async function probeTabBar() {
  return page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Primary"]');
    if (!nav) return { present: false };
    const cs = getComputedStyle(nav);
    const r = nav.getBoundingClientRect();
    const explore = nav.querySelector('a[href="/"]');
    const exploreCs = explore ? getComputedStyle(explore) : null;
    const exploreActive = explore?.getAttribute("aria-current") === "page";
    const disabled = [...nav.querySelectorAll("button[disabled]")].map((b) =>
      b.getAttribute("aria-label"),
    );
    // Content clearance: main has pb-24 (96px); nav top should be >= last
    // premium card bottom (no overlap). Probe last premium link bottom.
    const lastCard = document.querySelector('a[href="/chat"]');
    const cardBottom = lastCard ? Math.round(lastCard.getBoundingClientRect().bottom) : null;
    const navTop = Math.round(r.top);
    return {
      present: true,
      position: cs.position,
      navTop,
      navBottom: Math.round(r.bottom),
      viewportH: window.innerHeight,
      atBottom: Math.round(r.bottom) >= window.innerHeight - 2,
      exploreActive,
      exploreColor: exploreCs?.color || null,
      disabledStubs: disabled,
      lastCardBottom: cardBottom,
      clears: cardBottom !== null ? cardBottom <= navTop + 2 : null,
    };
  });
}

const EXPECT = {
  light: { dataTheme: "light", white: "rgb(255, 255, 255)" },
  dark: { dataTheme: "dark", white: "rgb(255, 255, 255)" },
};

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
});

await newPage(browser, VIEWPORTS.mobile);
await enterAsGuest();

const probes = {}; // theme -> all probe results, dumped for the report

for (const theme of ["light", "dark"]) {
  const applied = await forceTheme(theme);
  await page
    .locator('a[href^="/a/"]')
    .first()
    .waitFor({ state: "visible", timeout: 20000 })
    .catch(() => {});
  // Give the host's-picks query + hero images time to settle.
  await page
    .locator('[class*="aspect-[4/5]"] img')
    .first()
    .waitFor({ state: "visible", timeout: 12000 })
    .catch(() => {});
  await sleep(1200);

  const appBar = await probeAppBar();
  const greeting = await probeGreeting();
  const ribbon = await probeRibbon();
  const bento = await probeBento();
  const premium = await probePremium();
  // Capture the two TOP screenshots (viewport) for theme before scrolling.
  const topShot = theme === "light" ? await shot("light-home-top", false) : null;
  // For DARK we want a ribbon-focused viewport shot; scroll ribbon into view.
  let ribbonShot = null;
  if (theme === "dark") {
    await page
      .locator('[class*="aspect-[4/5]"]')
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
    await sleep(400);
    ribbonShot = await shot("dark-home-ribbon", false);
  }
  // Full-page screenshot for both themes.
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);
  const fullShot = await shot(`${theme}-home`, true);
  // Tab bar needs the unscrolled (fixed) state — already at top.
  const tabBar = await probeTabBar();

  probes[theme] = {
    applied,
    appBar,
    greeting,
    ribbon,
    bento,
    premium,
    tabBar,
    shots: { topShot, ribbonShot, fullShot },
  };

  // ── ASSERTIONS ──────────────────────────────────────────────────────────────
  const T = theme.toUpperCase();

  // (theme applied)
  step(
    `${T} theme applied (<html data-theme>)`,
    applied === EXPECT[theme].dataTheme,
    `data-theme=${applied}`,
  );

  // (a) BrandAppBar
  const ab = appBar;
  const abOk =
    ab.present &&
    ab.logoLoaded &&
    ab.wordmarkText === "Daily Tour" &&
    /Fraunces/i.test(ab.wordmarkFont || "") &&
    /são miguel/i.test(ab.overlineText || "") &&
    ab.switcherBtns.length === 2 &&
    ab.sticky === "sticky";
  step(
    `${T} (a) BrandAppBar — logo+wordmark+overline+switcher`,
    abOk,
    `logo=${ab.logoLoaded}(${ab.logoW}px) wordmark="${ab.wordmarkText}" font=${/Fraunces/i.test(ab.wordmarkFont || "") ? "Fraunces" : ab.wordmarkFont} overline="${ab.overlineText}" switcher=[${ab.switcherBtns.map((b) => b.label + (b.pressed === "true" ? "*" : "")).join(",")}] sticky=${ab.sticky}`,
  );

  // Greeting
  const g = greeting;
  const gOk =
    /bem-vindo de volta/i.test(g.text || "") &&
    /Fraunces/i.test(g.font || "") &&
    parseInt(g.fontSize) >= 28;
  step(
    `${T} greeting — Fraunces hero + subline`,
    gOk,
    `text="${g.text}" font=${/Fraunces/i.test(g.font || "") ? "Fraunces" : g.font} size=${g.fontSize} sub="${g.subText}"`,
  );

  // (b) Overlay ribbon cards — white name readable over gradient, no clip.
  const rb = ribbon;
  const allWhite = rb.cards.every((c) => {
    const rgb = parseRgb(c.nameColor);
    return rgb && rgb[0] > 235 && rgb[1] > 235 && rgb[2] > 235;
  });
  const anyClipped = rb.cards.some((c) => c.clipped || c.nameWithinCard === false);
  const allSerif = rb.cards.every((c) => /Fraunces/i.test(c.nameFont || ""));
  const allHaveGradient = rb.cards.every((c) => /gradient/i.test(c.gradientImage || ""));
  // Contrast: white text over the dark gradient floor (from-black/80). We
  // approximate the gradient's effective bg at the text band as ~rgba(0,0,0,.8)
  // composited over the photo; the worst realistic case for white text is a
  // bright photo behind a 0.8 black veil ≈ rgb(51,51,51). Assert >= 4.5 there.
  const veil = "rgb(51, 51, 51)";
  const worstCaseContrast = rb.cards.length
    ? Math.min(...rb.cards.map((c) => contrast(c.nameColor, veil) ?? 0))
    : 0;
  const realHeroes = rb.cards.filter((c) => c.realHero).length;
  const fallbacks = rb.cards.filter((c) => c.brandedFallback).length;
  const ribbonOk =
    rb.count > 0 &&
    allWhite &&
    allSerif &&
    allHaveGradient &&
    !anyClipped &&
    worstCaseContrast >= 4.5;
  step(
    `${T} (b) overlay ribbon — white serif name readable over gradient, no clip`,
    ribbonOk,
    `cards=${rb.count} peeks=${rb.peeks} white=${allWhite} serif=${allSerif} gradient=${allHaveGradient} clipped=${anyClipped} worstContrast(over 0.8-black veil)=${worstCaseContrast} realHeroes=${realHeroes} fallbacks=${fallbacks} names=[${rb.cards.map((c) => '"' + (c.nameText || "?") + '"').join(",")}]`,
  );

  // (c) Bento — 6 even square cards, icon + label legible w/ good contrast.
  const bn = bento;
  const all6 = bn.count === 6;
  const allSquare = bn.cells.every((c) => c.square);
  const allHaveIcon = bn.cells.every((c) => c.hasIcon);
  const labelContrasts = bn.cells.map((c) => contrast(c.labelColor, c.surface));
  const minLabelContrast = labelContrasts.length
    ? Math.min(...labelContrasts.filter((x) => x !== null))
    : 0;
  const iconContrasts = bn.cells.map((c) => contrast(c.iconColor, c.surface));
  const minIconContrast = iconContrasts.length
    ? Math.min(...iconContrasts.filter((x) => x !== null))
    : 0;
  const surfNotPage = bn.cells.every((c) => c.surface !== bn.pageBg);
  const bentoOk =
    all6 && allSquare && allHaveIcon && minLabelContrast >= 3.0 && minIconContrast >= 3.0;
  step(
    `${T} (c) bento — 6 square cards, icon+label legible on surface`,
    bentoOk,
    `count=${bn.count} square=${allSquare} icons=${allHaveIcon} surfaceDiffersFromPage=${surfNotPage} minLabelContrast=${minLabelContrast} minIconContrast=${minIconContrast} labels=[${bn.cells.map((c) => c.label).join(",")}] surface=${bn.cells[0]?.surface}`,
  );

  // (d) Premium cards — both render, avatar J + chevrons, legible.
  const pr = premium;
  const planOk = pr.plan?.present && /planear/i.test(pr.plan.labelText || "") && pr.plan.hasChevron;
  const chatOk =
    pr.chat?.present &&
    /joão/i.test(pr.chat.labelText || "") &&
    pr.chat.hasAvatarJ &&
    pr.chat.hasChevron;
  const planLabelContrast = contrast(pr.plan?.labelColor, pr.plan?.surface);
  const chatLabelContrast = contrast(pr.chat?.labelColor, pr.chat?.surface);
  const premiumOk =
    planOk && chatOk && (planLabelContrast ?? 0) >= 4.5 && (chatLabelContrast ?? 0) >= 4.5;
  step(
    `${T} (d) premium cards — Plan my day + Message João (avatar+chevron)`,
    premiumOk,
    `plan="${pr.plan?.labelText}"(chevron=${pr.plan?.hasChevron},contrast=${planLabelContrast}) chat="${pr.chat?.labelText}"(avatarJ=${pr.chat?.hasAvatarJ},chevron=${pr.chat?.hasChevron},contrast=${chatLabelContrast})`,
  );

  // (e) BottomTabBar — fixed, explore active, content clears it.
  const tb = tabBar;
  const tabOk =
    tb.present &&
    tb.position === "fixed" &&
    tb.atBottom &&
    tb.exploreActive &&
    tb.disabledStubs.length === 3 &&
    tb.clears === true;
  step(
    `${T} (e) BottomTabBar — fixed bottom, explore active, content clears`,
    tabOk,
    `position=${tb.position} atBottom=${tb.atBottom} exploreActive=${tb.exploreActive} stubs=${tb.disabledStubs.length} navTop=${tb.navTop} lastCardBottom=${tb.lastCardBottom} clears=${tb.clears}`,
  );

  // (f) layout — no horizontal overflow.
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 2,
  );
  step(`${T} (f) no horizontal overflow`, fits, `fits=${fits}`);
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("\n— SUMMARY —");
const fails = results.filter((r) => !r.ok);
console.log(`${results.length - fails.length}/${results.length} checks passed`);
console.log("\nFULL PROBES (computed styles / geometry per theme):");
console.log(JSON.stringify(probes, null, 2));
if (netFail.length) console.log("\nBROKEN IMAGE RESPONSES:\n" + netFail.join("\n"));
else console.log("\n(no broken image responses)");
if (errors.length) console.log("\nJS ERRORS / CONSOLE:\n" + errors.join("\n"));
else console.log("\n(no JS errors / console errors captured)");
await browser.close();
process.exit(0);
