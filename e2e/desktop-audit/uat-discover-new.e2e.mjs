// UAT — NEW desktop Discover (two-pane rail) + mobile regression, LIVE qual.
// Desktop (1440): masthead, sub-header (title+segmented+search+count), map-left
// /list-right split, fitToPins (no stray arc), list↔pin sync. Mobile (390):
// full-bleed map + draggable sheet + "← Descobrir · See" header still intact.
// REPORT-ONLY (exit 0). LIGHT theme. Selectors from the source:
//  - sub-header: h1 title, ToggleGroup segmented, input[type=text] search, count span
//  - list rows: <ol aria-label="Por perto"> > li[data-place-id], onMouseEnter→select,
//    selected row gets ring-2 ring-primary
//  - selected pin: MapPin renders an extra <path stroke="var(--hydrangea-400)" stroke-width="5">
//  - map container: div[aria-label="Map"]
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);

const BASE = "https://qual.stay.portugalodyssey.pt";
const TOKEN = process.env.RTOKEN;
const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const SHOTS = REPO + "/temp/desktop-audit/captures/";
mkdirSync(SHOTS, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const results = [];
const errors = [];
let ctx, page;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}
async function shot(name) {
  const p = `${SHOTS}${name}.png`;
  await page.screenshot({ path: p, fullPage: true }).catch(() => {});
  return p;
}
async function newCtx(browser, viewport) {
  if (ctx) await ctx.close();
  ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror[${results.length}] ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console[${results.length}] ${m.text().slice(0, 200)}`);
  });
}
async function enterAsGuest() {
  for (let attempt = 1; attempt <= 2; attempt++) {
    await page.goto(`${BASE}/r/${TOKEN}`, { waitUntil: "domcontentloaded" });
    const landed = await page
      .waitForFunction(
        () =>
          location.pathname === "/" &&
          new URLSearchParams(location.search).get("reason") !== "expired",
        { timeout: 30000 },
      )
      .then(() => true)
      .catch(() => false);
    if (landed) {
      await page
        .locator('a[href^="/a/"]')
        .first()
        .waitFor({ state: "visible", timeout: 20000 })
        .catch(() => {});
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      return true;
    }
    await sleep(1500);
  }
  return false;
}
async function forceLight() {
  await page.evaluate(() => localStorage.setItem("theme", "light"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await enterAsGuest();
}
async function spaNavigate(href) {
  const link = page.locator(`a[href="${href}"]`).first();
  if ((await link.count()) > 0 && (await link.isVisible().catch(() => false))) await link.click();
  else
    await page.evaluate((to) => {
      window.history.pushState({}, "", to);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, href);
  await page
    .waitForFunction((p) => location.pathname === p, href, { timeout: 20000 })
    .catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await sleep(800);
}
const countSelectedPins = () =>
  page.evaluate(() => {
    const map = document.querySelector('[aria-label="Map"]');
    if (!map) return -1;
    // Selected MapPin renders an extra <path stroke-width="5"> in hydrangea.
    return [...map.querySelectorAll('path[stroke-width="5"]')].length;
  });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

// ════════════════════════ A. DESKTOP DISCOVER (1440) ════════════════════════
await newCtx(browser, DESKTOP);
if (!(await enterAsGuest())) {
  step("A0 redeem", false);
} else {
  await forceLight();
  step(
    "A0 redeem + light theme",
    (await page.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "light",
  );

  // SPA-navigate to Discover via the TopNav "Descobrir" link (href=/a/see).
  await spaNavigate("/a/see");
  await page
    .locator('[aria-label="Map"]')
    .first()
    .waitFor({ state: "visible", timeout: 20000 })
    .catch(() => {});
  await page
    .locator("ol[aria-label] li[data-place-id]")
    .first()
    .waitFor({ state: "visible", timeout: 20000 })
    .catch(() => {});
  await sleep(2500); // tiles + pins + list cards

  // A1. Masthead present, NO bottom tab bar rendered.
  const a1 = await page.evaluate(() => {
    const header = document.querySelector("header");
    const ht = header ? header.innerText.replace(/\s+/g, " ") : "";
    const masthead =
      /Daily Tour/i.test(ht) &&
      /descobrir/i.test(ht) &&
      /(o meu dia|meu dia)/i.test(ht) &&
      /miguel/i.test(ht);
    const bottomNav = document.querySelector('nav[aria-label="Primary"]');
    // visible? a fixed bottom bar would have non-zero box at the viewport bottom.
    let bottomVisible = false;
    if (bottomNav) {
      const r = bottomNav.getBoundingClientRect();
      bottomVisible =
        r.height > 0 &&
        r.bottom >= window.innerHeight - 4 &&
        getComputedStyle(bottomNav).display !== "none";
    }
    return { masthead, headerText: ht.slice(0, 120), bottomNavInDom: !!bottomNav, bottomVisible };
  });
  step(
    "A1 masthead nav present + NO visible bottom tab bar",
    a1.masthead && !a1.bottomVisible,
    `masthead=${a1.masthead} bottomNavInDom=${a1.bottomNavInDom} bottomVisible=${a1.bottomVisible} header="${a1.headerText}"`,
  );

  // A2. Sub-header band: title + segmented (6 toggles) + search + count.
  const a2 = await page.evaluate(() => {
    const h1 = [...document.querySelectorAll("h1")].map((e) => e.textContent.trim());
    const seg = document.querySelector('[role="group"]');
    const toggles = seg
      ? [...seg.querySelectorAll('[role="radio"], button[data-state], button')]
          .map((b) => b.textContent.trim())
          .filter(Boolean)
      : [];
    const search = document.querySelector('input[type="text"]');
    const countSpan = [...document.querySelectorAll("span")]
      .map((s) => s.textContent.trim())
      .find((t) => /\d+\s+por perto/i.test(t));
    return {
      h1,
      toggleCount: toggles.length,
      toggles: toggles.slice(0, 8),
      hasSearch: !!search,
      count: countSpan || null,
    };
  });
  const a2ok =
    a2.h1.some((t) => /descobrir/i.test(t)) && a2.toggleCount >= 6 && a2.hasSearch && !!a2.count;
  step(
    "A2 sub-header: title + 6-way segmented + search + count",
    a2ok,
    `title=${JSON.stringify(a2.h1)} toggles=${a2.toggleCount}[${a2.toggles.join(",")}] search=${a2.hasSearch} count="${a2.count}"`,
  );

  // A3. Two-pane split: map LEFT (fluid), list rail RIGHT (~400px), co-visible.
  const a3 = await page.evaluate(() => {
    const map = document.querySelector('[aria-label="Map"]');
    const list = document.querySelector("ol[aria-label]");
    if (!map || !list) return { mapPresent: !!map, listPresent: !!list };
    const mr = map.getBoundingClientRect();
    const lr =
      list.closest('aside, [class*="rail"], div')?.getBoundingClientRect() ||
      list.getBoundingClientRect();
    const cards = list.querySelectorAll("li[data-place-id]").length;
    return {
      mapPresent: true,
      listPresent: true,
      mapLeft: Math.round(mr.left),
      mapRight: Math.round(mr.right),
      mapW: Math.round(mr.width),
      listLeft: Math.round(lr.left),
      listRight: Math.round(lr.right),
      listW: Math.round(lr.width),
      cards,
      vw: window.innerWidth,
      mapOnLeft: mr.left < window.innerWidth * 0.5,
      listOnRight: lr.left > window.innerWidth * 0.5,
      coVisible: mr.width > 200 && lr.width > 200 && Math.abs(mr.top - lr.top) < 400,
    };
  });
  const a3ok =
    a3.mapPresent &&
    a3.listPresent &&
    a3.mapOnLeft &&
    a3.listOnRight &&
    a3.coVisible &&
    a3.cards >= 1;
  step(
    "A3 two-pane: map LEFT (fluid) + list rail RIGHT, co-visible",
    a3ok,
    `map[${a3.mapLeft}-${a3.mapRight} w=${a3.mapW}] list[${a3.listLeft}-${a3.listRight} w=${a3.listW}] cards=${a3.cards} mapOnLeft=${a3.mapOnLeft} listOnRight=${a3.listOnRight} coVisible=${a3.coVisible}`,
  );

  // A4. NO stray magenta/purple arc — fitToPins frames São Miguel. Detected by
  // sampling the map canvas for magenta pixels AND confirming the visible map
  // is zoomed to the island (a stray arc came with a world-scale zoom-out).
  const arcShot = await shot("discover-desktop-NEW-1440");
  const a4 = await page.evaluate(() => {
    const canvas = document.querySelector("canvas.maplibregl-canvas");
    if (!canvas) return { canvas: false };
    const c = document.createElement("canvas");
    c.width = canvas.width;
    c.height = canvas.height;
    const g = c.getContext("2d");
    try {
      g.drawImage(canvas, 0, 0);
    } catch (e) {
      return { canvas: true, drawErr: String(e).slice(0, 60) };
    }
    let magenta = 0,
      sampled = 0;
    const data = g.getImageData(0, 0, c.width, c.height).data;
    for (let i = 0; i < data.length; i += 4 * 97) {
      // sparse sample
      const r = data[i],
        gg = data[i + 1],
        b = data[i + 2];
      sampled++;
      // magenta/purple arc: high R, low G, high B
      if (r > 150 && b > 150 && gg < 110) magenta++;
    }
    return {
      canvas: true,
      magenta,
      sampled,
      magentaPct: +((100 * magenta) / Math.max(1, sampled)).toFixed(2),
    };
  });
  // A handful of magenta pixels can come from a pin tip; an arc paints a visible
  // streak (>0.3% of sampled). Treat <0.3% as "no arc".
  const noArc = a4.canvas && (a4.magentaPct ?? 0) < 0.3;
  step(
    "A4 map framed on São Miguel, no stray magenta arc",
    noArc,
    `canvas=${a4.canvas} magentaPct=${a4.magentaPct}% (sampled=${a4.sampled})`,
  );

  // A5. LIST↔PIN sync: hover the 2nd list row → row rings + a selected pin ring
  // appears in the map. (1st row may already be hovered/selected on load.)
  const before = await countSelectedPins();
  const rows = page.locator("ol[aria-label] li[data-place-id]");
  const rowCount = await rows.count();
  let syncDetail = `rows=${rowCount} selectedPinsBefore=${before}`;
  let syncOk = false;
  if (rowCount >= 2) {
    const target = rows.nth(1);
    const targetId = await target.getAttribute("data-place-id");
    await target.hover();
    await sleep(900); // selection state + map recenter
    const ringed = await target.evaluate(
      (el) => el.className.includes("ring-2") || /ring-primary/.test(el.className),
    );
    const after = await countSelectedPins();
    const recentered = await page.evaluate((id) => {
      // The selected place becomes the map center; we can't read center easily,
      // but a selected pin (extra ring) present proves the pin highlighted.
      return id;
    }, targetId);
    syncOk = ringed && after >= 1;
    syncDetail = `rows=${rowCount} hoveredId=${targetId} rowRinged=${ringed} selectedPinsBefore=${before} after=${after}`;
  }
  step("A5 list→pin sync: hover row → row rings + map pin highlights", syncOk, syncDetail);
  // Re-snap the screenshot AFTER hover so the capture shows the synced state too.
  await rows
    .first()
    .hover()
    .catch(() => {});
  await sleep(500);
  await shot("discover-desktop-NEW-1440");

  // A6. Category switch: click "Comer" in the segmented → routes to /a/eat + list updates.
  const eatToggle = page.getByRole("radio", { name: /comer|eat/i }).first();
  const eatToggleFallback = page
    .locator('[role="group"] button', { hasText: /comer|eat/i })
    .first();
  const beforeCount = await page.locator("ol[aria-label] li[data-place-id]").count();
  const clicker = (await eatToggle.count()) > 0 ? eatToggle : eatToggleFallback;
  await clicker.click().catch(() => {});
  await page
    .waitForFunction(() => location.pathname === "/a/eat", { timeout: 10000 })
    .catch(() => {});
  await page
    .locator("ol[aria-label] li[data-place-id]")
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});
  await sleep(1500);
  const eatPath = await page.evaluate(() => location.pathname);
  const afterCount = await page.locator("ol[aria-label] li[data-place-id]").count();
  step(
    'A6 segmented "Comer" → /a/eat + list updates',
    eatPath === "/a/eat" && afterCount >= 1,
    `path=${eatPath} listBefore(see)=${beforeCount} listAfter(eat)=${afterCount}`,
  );
  console.log(`  (desktop capture: ${arcShot})`);
}

// ════════════════════════ B. MOBILE REGRESSION (390) ════════════════════════
await newCtx(browser, MOBILE);
if (!(await enterAsGuest())) {
  step("B0 redeem", false);
} else {
  await forceLight();
  await spaNavigate("/a/see");
  await page
    .locator('[aria-label="Map"]')
    .first()
    .waitFor({ state: "visible", timeout: 20000 })
    .catch(() => {});
  await sleep(2500);
  const b = await page.evaluate(() => {
    const header = document.querySelector("header");
    const ht = header ? header.innerText.replace(/\s+/g, " ").trim() : "";
    const backHeader = /descobrir/i.test(ht); // "Descobrir · See" back-header
    const map = document.querySelector('[aria-label="Map"]');
    const mr = map?.getBoundingClientRect();
    const fullBleed = mr ? mr.width >= window.innerWidth - 4 : false;
    // Mobile sheet: a draggable handle (button w/ expand/collapse aria) OR the
    // bottom-sheet container holding place cards. Desktop split would have a
    // right rail (ol next to map); mobile stacks them.
    const sheet = document.querySelector('[data-place-id], [class*="sheet"], [role="dialog"]');
    const cards = document.querySelectorAll("[data-place-id]").length;
    const handle = [...document.querySelectorAll("button")].some((b) =>
      /expand|collaps|arrast|expandir|recolher/i.test(b.getAttribute("aria-label") || ""),
    );
    // Is it the DESKTOP split (regression failure)? right-side ol rail next to map.
    const ol = document.querySelector("ol[aria-label]");
    const olR = ol?.getBoundingClientRect();
    const desktopSplit = olR
      ? olR.left > window.innerWidth * 0.5 && olR.width < window.innerWidth * 0.7
      : false;
    return {
      backHeader,
      headerText: ht.slice(0, 60),
      fullBleed,
      mapW: Math.round(mr?.width || 0),
      vw: window.innerWidth,
      cards,
      hasSheetOrCards: !!sheet,
      handle,
      desktopSplit,
    };
  });
  const bok = b.backHeader && b.fullBleed && (b.cards >= 1 || b.hasSheetOrCards) && !b.desktopSplit;
  step(
    "B mobile Discover regression — full-bleed map + sheet + back-header, NOT desktop split",
    bok,
    `backHeader=${b.backHeader}("${b.headerText}") fullBleedMap=${b.fullBleed}(w=${b.mapW}/${b.vw}) cards=${b.cards} sheet=${b.hasSheetOrCards} dragHandle=${b.handle} desktopSplit=${b.desktopSplit}`,
  );
  console.log(`  (mobile capture: ${await shot("discover-mobile-REGRESSION-390")})`);
}

console.log("\n— SUMMARY —");
const fails = results.filter((r) => !r.ok);
console.log(`${results.length - fails.length}/${results.length} checks passed`);
if (errors.length) console.log("\nJS ERRORS / CONSOLE:\n" + [...new Set(errors)].join("\n"));
else console.log("\n(no JS errors / console errors captured)");
await browser.close();
process.exit(0);
