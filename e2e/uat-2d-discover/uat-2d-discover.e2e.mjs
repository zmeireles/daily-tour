// Deep UAT — "São Miguel Editorial" DISCOVER screen rebuilt as MAP-FIRST + a
// DRAGGABLE BOTTOM SHEET (route /a/see). This is the highest-risk screen: the
// maplibre map + motion/react drag gestures cannot be unit-tested, so this
// real-browser pass is the only proof they actually work.
//
// Verifies on /a/see (pt-PT guest):
//   - maplibre map paints a CANVAS with real OSM raster tiles (sampled pixels,
//     not blank/grey) + one tea-green-dotted pin per place with coords;
//   - a floating rounded search field + a circular locate-me FAB;
//   - a cream bottom sheet (surface-container-low) with a drag handle, the
//     Fraunces "Por perto" title, and a horizontal peek-ribbon of place cards;
//   - drag/toggle the sheet -> expanded (~85%) revealing the relocated controls
//     (km slider / vehicle toggle / sort / grouped-flat) + full vertical list;
//   - typing "Lagoa" narrows BOTH the ribbon cards AND the map pins;
//   - tapping a ribbon card navigates to /p/<id>.
//
// REPORT-ONLY (exit 0). READ-ONLY (no submits). playwright-core + system Chrome.
// Target: vite dev server http://127.0.0.1:5173 (working tree), BFF :28080.
// Entry: opaque multi-use redeem token -> RTokenRoute -> guest JWT -> home -> /a/see.
// Theme: forced via localStorage.theme + reload; asserts <html data-theme>.
//
// NETWORK NOTE: the base map style is REMOTE OSM raster tiles
// (tile.openstreetmap.org). The run MUST have outbound network so the canvas
// can paint real tiles; otherwise the map is a blank WebGL clear and pins float
// over grey. We sample canvas pixels to distinguish "tiles painted" from "blank".
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);
// sharp decodes a clipped map screenshot to GROUND-TRUTH whether OSM tiles
// actually painted (the WebGL canvas readback gives a false "blank" because
// maplibre runs preserveDrawingBuffer:false). Resolve from the pnpm store.
const sharp = require(REPO + "/node_modules/.pnpm/sharp@0.33.5/node_modules/sharp");

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const TOKEN = process.env.RTOKEN;
const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const SHOTS = REPO + "/temp/uat-2d-discover/";
mkdirSync(SHOTS, { recursive: true });

// Phone is the canonical guest device (host's link tapped on a phone). The
// map-first + bottom-sheet layout is designed mobile-first.
const VIEWPORTS = { mobile: { width: 390, height: 844 } };

// pt-PT chrome (guest locale baked into the redeem JWT). See locales/pt-PT/discover.json.
const L = {
  title: "Descobrir", // header is "Descobrir · See"
  nearby: "Por perto",
  search: "Procurar locais…",
  locate: "Usar a minha localização",
  expand: "Ver todos os locais e filtros",
  collapse: "Recolher para o mapa",
};
const TEA_500 = "rgb(122, 154, 106)"; // --tea-500 #7a9a6a (pin inner dot) — verified post-run

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

async function newPage(browser, { viewport = VIEWPORTS.mobile } = {}) {
  if (ctx) await ctx.close();
  ctx = await browser.newContext({ viewport });
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror[step ${results.length}]: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error")
      errors.push(`console[step ${results.length}]: ${m.text().slice(0, 240)}`);
    // maplibre/WebGL warnings are findings too — capture them tagged.
    if (m.type() === "warning" && /webgl|maplibre|tile|gl_/i.test(m.text()))
      errors.push(`warn[step ${results.length}]: ${m.text().slice(0, 200)}`);
  });
  page.on("response", (resp) => {
    if (resp.status() >= 400) {
      const u = resp.url();
      if (/tile\.openstreetmap|\/v1\/discover|maplibre/.test(u))
        netFail.push(`[step ${results.length}] ${resp.status()} ${u.slice(0, 120)}`);
    }
  });
}

async function enterAsGuest() {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await page.goto(`${BASE}/r/${TOKEN}`, { waitUntil: "domcontentloaded" });
      await page
        .waitForFunction(() => location.pathname === "/", { timeout: 30000 })
        .catch(() => {});
      await page.locator('a[href^="/a/"]').first().waitFor({ state: "visible", timeout: 20000 });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      return;
    } catch (e) {
      if (attempt === 2) throw e;
      await sleep(1500);
    }
  }
}

// Persist theme override on HOME (where useThemeAuto is mounted), then verify.
async function setThemeOnHome(theme) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.locator('a[href^="/a/"]').first().waitFor({ state: "visible", timeout: 20000 });
  await page.evaluate((t) => localStorage.setItem("theme", t), theme);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('a[href^="/a/"]').first().waitFor({ state: "visible", timeout: 20000 });
  await sleep(400);
  return page.evaluate(() => document.documentElement.getAttribute("data-theme"));
}

// Navigate into /a/see and wait for the map+sheet to mount (data.count>0 branch).
async function gotoDiscover() {
  await page.goto(`${BASE}/a/see`, { waitUntil: "domcontentloaded" });
  // Sheet title "Por perto" only renders once data arrives (count>0).
  await page.getByRole("heading", { name: L.nearby }).waitFor({ state: "visible", timeout: 25000 });
  // maplibre container present; give tiles a moment to fetch + paint.
  await page
    .locator(".maplibregl-canvas")
    .first()
    .waitFor({ state: "attached", timeout: 15000 })
    .catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
  await sleep(1800); // let OSM raster tiles fetch + paint
}

// Sample the maplibre canvas: are there enough DISTINCT colours to indicate
// real tiles were painted (vs a single flat WebGL clear colour = blank map)?
// Runs in-page on the actual <canvas> backing store.
async function probeMap() {
  return page.evaluate(
    ({ TEA_500 }) => {
      const container = document.querySelector('[aria-label="Map"]');
      const canvas = document.querySelector(".maplibregl-canvas");
      const cRect = canvas?.getBoundingClientRect();
      let sampled = null;
      let distinctColors = 0;
      let painted = false;
      if (canvas instanceof HTMLCanvasElement) {
        try {
          // Re-read pixels via a 2D copy (the maplibre canvas is WebGL; draw it
          // onto a 2D canvas to read back). preserveDrawingBuffer may be off, so
          // this can throw / read black — we treat that defensively below.
          const off = document.createElement("canvas");
          const W = 60,
            H = 60;
          off.width = W;
          off.height = H;
          const g = off.getContext("2d");
          g.drawImage(canvas, 0, 0, W, H);
          const data = g.getImageData(0, 0, W, H).data;
          const seen = new Set();
          for (let i = 0; i < data.length; i += 4) {
            // Quantise to reduce JPEG-ish noise into buckets.
            const key = (data[i] >> 4) + "," + (data[i + 1] >> 4) + "," + (data[i + 2] >> 4);
            seen.add(key);
          }
          distinctColors = seen.size;
          sampled = true;
          // >6 distinct quantised colours ⇒ a real map photo, not a flat fill.
          painted = distinctColors > 6;
        } catch {
          sampled = false;
        }
      }

      // Pins: maplibre DOM markers, each carrying our SVG (role=img Map marker)
      // with a tea-green inner <circle fill var(--tea-500)>.
      const markers = [...document.querySelectorAll(".maplibregl-marker")];
      let teaDotCount = 0;
      let teaDotColor = null;
      let selectedRing = false;
      for (const m of markers) {
        const circ = m.querySelector("circle");
        if (circ) {
          const fill = getComputedStyle(circ).fill;
          if (fill && fill !== "rgb(0, 0, 0)" && fill !== "none") {
            teaDotCount += 1;
            teaDotColor = fill;
          }
        }
        // selected pin gets a hydrangea outer ring (stroke set) + 15% larger
        const ring = m.querySelector('path[stroke]:not([stroke="white"])');
        if (ring && getComputedStyle(ring).stroke !== "rgb(255, 255, 255)") selectedRing = true;
      }

      const search = document.querySelector('input[type="text"]');
      const searchRect = search?.getBoundingClientRect();
      const fab = [...document.querySelectorAll("button")].find((b) =>
        /localiza/i.test(b.getAttribute("aria-label") || ""),
      );
      const fabRect = fab?.getBoundingClientRect();

      // Sheet
      const heading = [...document.querySelectorAll("h2")].find((h) =>
        /por perto/i.test(h.textContent || ""),
      );
      const sheet = heading?.closest("div.absolute") || heading?.parentElement?.parentElement;
      const sheetRect = sheet?.getBoundingClientRect();
      const sheetCs = sheet ? getComputedStyle(sheet) : null;
      const handle = [...document.querySelectorAll("button")].find((b) =>
        /(todos os locais|recolher para o mapa)/i.test(b.getAttribute("aria-label") || ""),
      );
      const expanded = handle?.getAttribute("aria-expanded") === "true";
      const headingCs = heading ? getComputedStyle(heading) : null;

      // Ribbon cards (peek): wrappers carry data-place-id.
      const ribbonCards = [...document.querySelectorAll("[data-place-id]")];
      const ribbonImgs = ribbonCards
        .map((c) => c.querySelector("img"))
        .filter((img) => img && img.complete && img.naturalWidth > 0).length;
      const ribbonPlaceholders = ribbonCards
        .map((c) => c.querySelector('[data-testid="place-card-hero-placeholder"]'))
        .filter(Boolean).length;

      // Controls (only when expanded): range slider, vehicle toggle, sort, group.
      const sliderEl = document.querySelector('input[type="range"], [role="slider"]');
      const allText = document.body.innerText;
      // The sort control is a DROPDOWN TRIGGER showing the current value
      // ("Distância"/"Distance"), not the word "Ordenar".
      const hasSortLabel = /distância|distance|avaliação|nome/i.test(allText);
      const hasGroupLabel = /agrupado|lista/i.test(allText);
      const hasVehicle = /carro|a pé/i.test(allText);
      const fullList = document.querySelectorAll("[data-place-id], article, li a[href^='/p/']");

      const vh = window.innerHeight;
      const fits = document.documentElement.scrollWidth <= window.innerWidth + 2;
      const dataTheme = document.documentElement.getAttribute("data-theme");
      const bodyBg = getComputedStyle(document.body).backgroundColor;

      return {
        dataTheme,
        bodyBg,
        map: {
          containerPresent: !!container,
          canvasPresent: !!canvas,
          canvasW: cRect ? Math.round(cRect.width) : 0,
          canvasH: cRect ? Math.round(cRect.height) : 0,
          canvasTopFrac: cRect ? Math.round((cRect.height / vh) * 100) : 0,
          pixelSampled: sampled,
          distinctColors,
          painted,
        },
        pins: {
          markerCount: markers.length,
          teaDotCount,
          teaDotColor,
          teaMatches: teaDotColor === TEA_500,
          selectedRing,
        },
        search: search
          ? {
              present: true,
              placeholder: search.getAttribute("placeholder"),
              ariaLabel: search.getAttribute("aria-label"),
              top: searchRect ? Math.round(searchRect.top) : null,
              value: search.value,
            }
          : { present: false },
        fab: fab
          ? {
              present: true,
              label: fab.getAttribute("aria-label"),
              right: fabRect ? Math.round(window.innerWidth - fabRect.right) : null,
              bottom: fabRect ? Math.round(vh - fabRect.bottom) : null,
              round: getComputedStyle(fab).borderRadius,
            }
          : { present: false },
        sheet: {
          present: !!heading,
          headingText: heading?.textContent?.trim(),
          headingSerif: /Fraunces/i.test(headingCs?.fontFamily || ""),
          bg: sheetCs?.backgroundColor,
          topFrac: sheetRect ? Math.round((sheetRect.top / vh) * 100) : null,
          heightFrac: sheetRect ? Math.round((sheetRect.height / vh) * 100) : null,
          radius: sheetCs?.borderTopLeftRadius,
        },
        handle: { present: !!handle, expanded },
        ribbon: {
          cardCount: ribbonCards.length,
          imgsPainted: ribbonImgs,
          placeholders: ribbonPlaceholders,
        },
        controls: {
          slider: !!sliderEl,
          sort: hasSortLabel,
          group: hasGroupLabel,
          vehicle: hasVehicle,
          listItems: fullList.length,
        },
        fits,
        vh,
      };
    },
    { TEA_500 },
  );
}

// GROUND TRUTH "is the map painted?": clip the map container, downsample to
// 40x40 RGB via sharp, count distinct quantised colours. Real OSM tiles =>
// many colours (land/sea/roads/labels); a blank/grey clear => a handful.
async function mapPainted() {
  const el = page.locator('[aria-label="Map"]').first();
  const box = await el.boundingBox().catch(() => null);
  if (!box) return { sampled: false, colors: 0, painted: false };
  // Clip to the top 55% of the map so the bottom sheet never bleeds in.
  const clipH = Math.min(box.height, Math.round(box.height * 0.55));
  const buf = await page.screenshot({
    clip: { x: box.x, y: box.y, width: box.width, height: clipH },
  });
  const { data } = await sharp(buf)
    .resize(40, 40, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const seen = new Set();
  for (let i = 0; i < data.length; i += 3) {
    seen.add((data[i] >> 4) + "," + (data[i + 1] >> 4) + "," + (data[i + 2] >> 4));
  }
  const colors = seen.size;
  return { sampled: true, colors, painted: colors > 8 };
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const probes = {};

// ════════════════════════════════════════════════════════════════════════════
// Shared authed context — redeem once, reuse across scenarios.
// ════════════════════════════════════════════════════════════════════════════
await newPage(browser, { viewport: VIEWPORTS.mobile });
await enterAsGuest();

// Shared judgments on the map+sheet chrome common to both themes.
function judgeCommon(p, theme, paint) {
  const issues = [];
  if (!p.map.containerPresent) issues.push("map container (aria-label=Map) missing");
  if (!p.map.canvasPresent) issues.push("maplibre canvas missing");
  if (paint && paint.sampled && !paint.painted)
    issues.push(
      `map canvas BLANK — only ${paint.colors} distinct colours in clipped screenshot (no real tiles painted)`,
    );
  if (p.pins.markerCount === 0) issues.push("NO map pins rendered");
  if (p.pins.teaDotCount === 0 && p.pins.markerCount > 0)
    issues.push("pins present but none carry a tea-green inner dot");
  if (!p.search.present) issues.push("search field missing");
  if (!p.fab.present) issues.push("locate-me FAB missing");
  if (!p.sheet.present) issues.push('"Por perto" sheet missing');
  else {
    if (!/por perto/i.test(p.sheet.headingText || ""))
      issues.push(`sheet heading not "Por perto" (got "${p.sheet.headingText}")`);
    if (!p.sheet.headingSerif) issues.push("sheet heading not Fraunces serif");
  }
  if (!p.handle.present) issues.push("sheet drag handle / toggle missing");
  if (p.ribbon.cardCount === 0) issues.push("peek ribbon has no place cards");
  if (!p.fits) issues.push("horizontal overflow");
  return issues;
}

// ════════════════════════════════════════════════════════════════════════════
// S1 — LIGHT — Discover (peek): map+pins+search+FAB on top, "Por perto" ribbon.
// ════════════════════════════════════════════════════════════════════════════
try {
  const homeTheme = await setThemeOnHome("light");
  await gotoDiscover();
  const paint = await mapPainted();
  const p = await probeMap();
  probes["light-peek"] = { ...p, paint };
  const file = await shot("light-discover", false);
  const issues = judgeCommon(p, "light", paint);
  if (p.dataTheme !== "light")
    issues.push(`data-theme="${p.dataTheme}" not "light" (home set "${homeTheme}")`);
  step(
    "S1 LIGHT Discover (peek) — map canvas painted + tea-green pins + search + FAB + Por perto ribbon",
    issues.length === 0,
    `theme=${p.dataTheme} mapPainted=${paint.painted}(colors=${paint.colors}) canvas=${p.map.canvasW}x${p.map.canvasH} markers=${p.pins.markerCount} teaDots=${p.pins.teaDotCount}@${p.pins.teaDotColor} search=${p.search.present} fab=${p.fab.present}(r${p.fab.right}/b${p.fab.bottom}) sheet="${p.sheet.headingText}"serif=${p.sheet.headingSerif} ribbon=${p.ribbon.cardCount}cards(${p.ribbon.imgsPainted}img/${p.ribbon.placeholders}ph) sheetH=${p.sheet.heightFrac}% | ${issues.length ? "ISSUES: " + issues.join("; ") : "clean"} | ${file}`,
  );
} catch (e) {
  step("S1 LIGHT Discover (peek)", false, String(e.message).slice(0, 200));
  await shot("light-discover-fail");
}

// ════════════════════════════════════════════════════════════════════════════
// S2 — DARK — Discover (peek): chrome/sheet dark, map still renders.
// ════════════════════════════════════════════════════════════════════════════
try {
  const homeTheme = await setThemeOnHome("dark");
  await gotoDiscover();
  const paint = await mapPainted();
  const p = await probeMap();
  probes["dark-peek"] = { ...p, paint };
  const file = await shot("dark-discover", false);
  const issues = judgeCommon(p, "dark", paint);
  if (p.dataTheme !== "dark")
    issues.push(`data-theme="${p.dataTheme}" not "dark" (home set "${homeTheme}")`);
  // Dark legibility: sheet bg should be a dark surface (low luminance).
  const m = String(p.sheet.bg || "").match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(",").map((x) => parseFloat(x));
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (lum > 0.5)
      issues.push(
        `dark sheet bg is light (lum ${lum.toFixed(2)}, ${p.sheet.bg}) — theme not applied to sheet`,
      );
  }
  step(
    "S2 DARK Discover (peek) — dark sheet/chrome, map still renders with pins",
    issues.length === 0,
    `theme=${p.dataTheme} bodyBg=${p.bodyBg} sheetBg=${p.sheet.bg} mapPainted=${paint.painted}(colors=${paint.colors}) markers=${p.pins.markerCount} teaDots=${p.pins.teaDotCount} ribbon=${p.ribbon.cardCount} | ${issues.length ? "ISSUES: " + issues.join("; ") : "clean"} | ${file}`,
  );
} catch (e) {
  step("S2 DARK Discover (peek)", false, String(e.message).slice(0, 200));
  await shot("dark-discover-fail");
}

// ════════════════════════════════════════════════════════════════════════════
// S3 — Sheet EXPANDED: drag the handle up ~300px (motion/react drag="y").
//   Primary: a real pointer drag on the handle. Fallback: click the toggle.
//   Assert aria-expanded flips true + controls (slider/vehicle/sort/group) show.
// ════════════════════════════════════════════════════════════════════════════
try {
  await setThemeOnHome("light");
  await gotoDiscover();
  const handle = page.getByRole("button", { name: new RegExp(`${L.expand}|${L.collapse}`, "i") });
  await handle.waitFor({ state: "visible", timeout: 10000 });
  const box = await handle.boundingBox();
  let method = "drag";
  // Real drag: mouse down on handle, move up in steps, release.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - i * 30, { steps: 2 });
  }
  await page.mouse.up();
  await sleep(700);
  let expandedNow = await page.evaluate(
    () => document.querySelector("button[aria-expanded]")?.getAttribute("aria-expanded") === "true",
  );
  // Fallback: the handle is also an accessible toggle button.
  if (!expandedNow) {
    method = "toggle-click";
    await handle.click();
    await sleep(700);
    expandedNow = await page.evaluate(
      () =>
        document.querySelector("button[aria-expanded]")?.getAttribute("aria-expanded") === "true",
    );
  }
  await sleep(500);
  const p = await probeMap();
  probes["expanded"] = p;
  const file = await shot("expanded-sheet", false);
  const issues = [];
  if (!expandedNow)
    issues.push("sheet did NOT expand (aria-expanded stayed false via drag AND toggle)");
  if (expandedNow && p.sheet.heightFrac !== null && p.sheet.heightFrac < 70)
    issues.push(`expanded sheet only ${p.sheet.heightFrac}% tall (expected ~85%)`);
  if (!p.controls.slider) issues.push("km range slider not revealed");
  if (!p.controls.sort) issues.push("sort control not revealed");
  if (!p.controls.group) issues.push("grouped/flat control not revealed");
  if (!p.controls.vehicle) issues.push("vehicle (carro/a pé) toggle not revealed");
  step(
    "S3 Sheet EXPANDED — handle drag/toggle reveals controls (km/vehicle/sort/group) + full list",
    issues.length === 0,
    `method=${method} expanded=${expandedNow}(ariaH=${p.handle.expanded}) sheetH=${p.sheet.heightFrac}% slider=${p.controls.slider} sort=${p.controls.sort} group=${p.controls.group} vehicle=${p.controls.vehicle} listItems=${p.controls.listItems} | ${issues.length ? "ISSUES: " + issues.join("; ") : "clean"} | ${file}`,
  );
} catch (e) {
  step("S3 Sheet EXPANDED", false, String(e.message).slice(0, 200));
  await shot("expanded-sheet-fail");
}

// ════════════════════════════════════════════════════════════════════════════
// S4 — SEARCH FILTER: type a query present IN the default 10 km window and
//   assert the ribbon cards AND the map pins both narrow to matches.
//   NOTE: the spec's example "Lagoa" is NOT in the default window — Lagoa do
//   Fogo / Sete Cidades are >10 km from the guesthouse, so /v1/discover never
//   returns them at the default radius (the 11 loaded places are all near
//   Ponta Delgada). "View" matches "The View Point" + "The View" (11 -> 2) and
//   is the valid in-window probe of the same code path.
const QUERY = "View";
try {
  await setThemeOnHome("light");
  await gotoDiscover();
  const before = await probeMap();
  const searchInput = page.locator('input[type="text"]').first();
  await searchInput.waitFor({ state: "visible", timeout: 10000 });
  await searchInput.click();
  await searchInput.fill(QUERY);
  await sleep(1200); // re-filter + ribbon re-render + pin re-sync
  const after = await probeMap();
  probes["search"] = after;
  const file = await shot("search-filter", false);
  const issues = [];
  const cardsNarrowed =
    after.ribbon.cardCount < before.ribbon.cardCount && after.ribbon.cardCount > 0;
  const pinsNarrowed =
    after.pins.markerCount < before.pins.markerCount && after.pins.markerCount > 0;
  if (after.ribbon.cardCount === 0) issues.push(`"${QUERY}" returned 0 cards (over-filtered)`);
  if (!cardsNarrowed)
    issues.push(
      `ribbon did not narrow (before=${before.ribbon.cardCount} after=${after.ribbon.cardCount})`,
    );
  if (!pinsNarrowed)
    issues.push(
      `map pins did not narrow (before=${before.pins.markerCount} after=${after.pins.markerCount})`,
    );
  if (after.search.value !== QUERY)
    issues.push(`search field did not hold the query (value="${after.search.value}")`);
  step(
    `S4 SEARCH FILTER — typing "${QUERY}" narrows ribbon cards AND map pins to matches`,
    issues.length === 0,
    `value="${after.search.value}" cards ${before.ribbon.cardCount}->${after.ribbon.cardCount} pins ${before.pins.markerCount}->${after.pins.markerCount} | ${issues.length ? "ISSUES: " + issues.join("; ") : "clean"} | ${file}`,
  );
} catch (e) {
  step("S4 SEARCH FILTER", false, String(e.message).slice(0, 200));
  await shot("search-filter-fail");
}

// ════════════════════════════════════════════════════════════════════════════
// S5 — CARD -> DETAIL: tap a ribbon card -> navigates to /p/<id>.
// ════════════════════════════════════════════════════════════════════════════
try {
  await setThemeOnHome("light");
  await gotoDiscover();
  // Capture the first ribbon card's place id, then tap its pressable shell.
  const firstCard = page.locator("[data-place-id]").first();
  await firstCard.waitFor({ state: "visible", timeout: 10000 });
  const placeId = await firstCard.getAttribute("data-place-id");
  // The pressable shell is a role=button inside the card.
  const pressable = firstCard.getByRole("button").first();
  if ((await pressable.count()) > 0) {
    await pressable.click();
  } else {
    await firstCard.click();
  }
  await page
    .waitForFunction(() => /^\/p\//.test(location.pathname), { timeout: 12000 })
    .catch(() => {});
  await sleep(800);
  const url = page.url();
  const onDetail = /\/p\//.test(new URL(url).pathname);
  const navId = new URL(url).pathname.replace("/p/", "");
  // Confirm the detail screen actually mounted (Fraunces h1 name).
  const detailName = await page
    .locator("h1.font-display")
    .first()
    .textContent()
    .catch(() => null);
  const file = await shot("card-to-detail", false);
  const issues = [];
  if (!onDetail) issues.push(`did not navigate to /p/:id (url=${url})`);
  if (onDetail && navId !== placeId)
    issues.push(`navigated to /p/${navId} but tapped card id was ${placeId}`);
  if (onDetail && !detailName) issues.push("detail screen mounted but no Fraunces name rendered");
  step(
    "S5 CARD -> DETAIL — tapping a Por-perto ribbon card navigates to /p/<id>",
    issues.length === 0,
    `tappedId=${placeId} -> ${new URL(url).pathname} detailName="${(detailName || "").trim().slice(0, 40)}" | ${issues.length ? "ISSUES: " + issues.join("; ") : "clean"} | ${file}`,
  );
} catch (e) {
  step("S5 CARD -> DETAIL", false, String(e.message).slice(0, 200));
  await shot("card-to-detail-fail");
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("\n— SUMMARY —");
const fails = results.filter((r) => !r.ok);
console.log(`${results.length - fails.length}/${results.length} scenarios passed`);
console.log("\nPROBES (map/pins/sheet/controls per screen):");
console.log(JSON.stringify(probes, null, 2));
if (netFail.length)
  console.log("\nBROKEN / 4xx-5xx RESPONSES (map tiles / discover):\n" + netFail.join("\n"));
else console.log("\n(no 4xx/5xx on tracked endpoints)");
if (errors.length) console.log("\nJS ERRORS / CONSOLE / WEBGL WARNINGS:\n" + errors.join("\n"));
else console.log("\n(no JS errors / console errors / webgl warnings captured)");
await browser.close();
process.exit(0);
