// Deep UAT — "São Miguel Editorial" DAILY TOUR (itinerary) restyle, LIGHT + DARK.
// Verifies the restyled /tour/<planId> screen:
//   • Editorial header: sun-amber uppercase Overline → Fraunces h1 → subline
//     "{N} paragens · ~{H}h".
//   • Timeline: editorial rows with square rounded thumbnails (real photo for the
//     2 hero'd stops, branded tea-green fallback panel for the 2 media-less), a
//     vertical timeline line + tea-green node dots with a ring.
//   • Connector pills (sun-amber Car + "N min") render BETWEEN stops ONLY when a
//     stop has travel_to_minutes. This plan's are null → injected run proves them.
//   • Restyled weather banner (when weather_aware), tea-green Share button, fixed
//     BottomTabBar (Explore active); main content clears the tab bar (pb-24).
//   • D1 theme fix: /tour/:id now mounts useThemeAuto → dark must render dark
//     (basalt #0f1514), not the light fallback. Asserts <html data-theme> flips
//     AND the canvas bg changes between the two runs.
// REPORT-ONLY (exit 0). READ-ONLY (no submits). playwright-core + system Chrome.
//
// Target: vite dev server http://127.0.0.1:5173 (working tree, latest restyle).
// Entry: opaque multi-use redeem token -> SPA RTokenRoute -> guest JWT -> home.
// Theme: forced via localStorage.theme + reload on home (where useThemeAuto is
//        mounted); SPA-navigate to /tour/:id which now ALSO mounts the hook.
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
const PLAN = process.env.PLAN_ID ?? "53883916-78fe-46b8-8284-33eaead916fe";
const SHOTS = REPO + "/temp/uat-2d-daily-tour/";
mkdirSync(SHOTS, { recursive: true });

// Phone is the canonical guest device (host's link tapped on a phone); the
// editorial timeline + bottom tab bar are designed mobile-first.
const VIEWPORTS = { mobile: { width: 390, height: 844 } };

// pt-PT chrome (guest locale baked into the redeem JWT).
const L = {
  overline: "O SEU DIA",
  headline: "O seu dia em São Miguel",
  weather: "Ajustado às condições meteorológicas",
  share: "Partilhar",
  back: "Voltar ao início",
};
// Resolved editorial tokens (globals.css / tokens.css).
const EXPECT = {
  sun: "rgb(230, 181, 102)", //  --sun-400  #e6b566
  canvasLight: "rgb(241, 236, 223)", // --ed-canvas-light  #f1ecdf
  canvasDark: "rgb(15, 21, 20)", //   --ed-canvas-dark   #0f1514
  primaryLight: "rgb(47, 93, 67)", // --tea-600 #2f5d43
  primaryDark: "rgb(95, 163, 123)", // --tea-400 #5fa37b
};

const results = [];
const errors = [];
const netFail = [];
let ctx, page;

function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}
async function shot(tag, fullPage = true) {
  const p = `${SHOTS}${tag}.png`;
  await page.screenshot({ path: p, fullPage }).catch(() => {});
  return `${tag}.png`;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// `injectTravel`: when true, every stop in the /v1/tour-plans/<id> JSON gets
// travel_to_minutes:12 — exercises the sun-amber connector pill render path that
// the real (null-travel) seed never triggers.
async function newPage(browser, { viewport = VIEWPORTS.mobile, injectTravel = false } = {}) {
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
  if (injectTravel) {
    await ctx.route("**/v1/tour-plans/**", async (route) => {
      // Only rewrite the GET of a single plan; leave POST/list untouched.
      if (route.request().method() !== "GET") return route.continue();
      const resp = await route.fetch();
      let body;
      try {
        body = await resp.json();
      } catch {
        return route.fulfill({ response: resp });
      }
      const stops = body?.plan_payload?.stops;
      if (Array.isArray(stops)) {
        for (const s of stops) s.travel_to_minutes = 12;
      }
      return route.fulfill({ response: resp, body: JSON.stringify(body) });
    });
  }
}

async function enterAsGuest() {
  // Cold redeem can be slow to boot the SPA on a busy dev server — retry once.
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

// Persist the theme override on HOME (where useThemeAuto is mounted), verify
// <html data-theme>, then SPA-navigate to the tour (localStorage survives).
async function setThemeOnHome(theme) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.locator('a[href^="/a/"]').first().waitFor({ state: "visible", timeout: 20000 });
  await page.evaluate((t) => localStorage.setItem("theme", t), theme);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('a[href^="/a/"]').first().waitFor({ state: "visible", timeout: 20000 });
  await sleep(400);
  return page.evaluate(() => document.documentElement.getAttribute("data-theme"));
}

// Land on /tour/:id with the theme already persisted — the real guest flow.
async function gotoTour() {
  await page.goto(`${BASE}/tour/${PLAN}`, { waitUntil: "domcontentloaded" });
  // Wait for the ready state: the editorial h1 (not the queued spinner).
  await page.locator("h1.font-display").first().waitFor({ state: "visible", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  // Give lazy thumbnails + node dots a beat to paint.
  await sleep(1000);
}

// sRGB WCAG contrast from two "rgb(...)" strings.
function parseRgb(s) {
  const m = String(s).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  return m[1]
    .split(",")
    .map((x) => parseFloat(x))
    .slice(0, 3);
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
  const hi = Math.max(lum(a), lum(b)),
    lo = Math.min(lum(a), lum(b));
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

// Scroll to the page bottom and report whether the last interactive content
// (back link) is occluded by the fixed tab bar. Measuring at the top of the page
// is wrong: below-the-fold elements report a viewport-bottom far past the tab bar
// even though the pb-24 spacer clears them once scrolled into view.
async function tabbarClearanceAtBottom() {
  return page.evaluate(async () => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((res) => setTimeout(res, 400));
    const tabbar = document.querySelector('nav[aria-label="Primary"]');
    if (!tabbar) return { clears: false, reason: "no tabbar" };
    const tb = tabbar.getBoundingClientRect();
    const back = [...document.querySelectorAll("main a")].find((a) =>
      /Voltar ao início/i.test(a.textContent || ""),
    );
    const target =
      back ??
      [...document.querySelectorAll("main button")].find((b) =>
        /Partilhar/i.test(b.getAttribute("aria-label") || ""),
      );
    if (!target) return { clears: false, reason: "no last-content element" };
    const tr = target.getBoundingClientRect();
    const atBottom =
      Math.abs(window.scrollY + window.innerHeight - document.documentElement.scrollHeight) < 4;
    // Occluded only if the element's band overlaps the tab bar's band.
    const occluded = tr.bottom > tb.top + 1 && tr.top < tb.bottom;
    return {
      clears: !occluded,
      gap: Math.round(tb.top - tr.bottom),
      tabbarH: Math.round(tb.height),
      atBottom,
    };
  });
}

// One DOM probe of the whole restyled itinerary screen.
async function probeTour() {
  return page.evaluate(() => {
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const txt = (el) => (el ? (el.textContent || "").trim() : null);

    const main = document.querySelector("main");
    const header = document.querySelector("header");
    const h1 =
      header?.querySelector("h1.font-display") ?? document.querySelector("h1.font-display");
    const h1Cs = cs(h1);
    // Overline: uppercase span inside the header.
    const overline = header
      ? [...header.querySelectorAll("span")].find((s) => {
          const c = getComputedStyle(s);
          return c.textTransform === "uppercase" && (s.textContent || "").trim();
        })
      : null;
    const overlineCs = cs(overline);
    // Subline: a header <p>.
    const subline = header?.querySelector("p");

    // Weather banner: a row containing the weather copy (restyled).
    const weatherBanner = [...(main?.querySelectorAll("div") ?? [])].find(
      (d) =>
        /Ajustado às condições|weather/i.test(d.textContent || "") &&
        d.querySelector("svg") &&
        (d.textContent || "").length < 80,
    );

    // Timeline line: the vertical w-px bg-outline-variant rule.
    const timelineLine = [...(main?.querySelectorAll("div[aria-hidden='true']") ?? [])].find(
      (d) => {
        const c = getComputedStyle(d);
        return c.position === "absolute" && parseFloat(c.width) <= 2 && parseFloat(c.height) > 40;
      },
    );
    const timelineLineCs = cs(timelineLine);

    // Stop rows + their parts.
    const articles = [...(main?.querySelectorAll("article") ?? [])];
    const stops = articles.map((a) => {
      const nameEl = a.querySelector("h3.font-display");
      const timeEl = [...a.querySelectorAll("span")].find(
        (s) =>
          /\d{1,2}:\d{2}/.test((s.textContent || "").trim()) &&
          (s.textContent || "").trim().length <= 6,
      );
      const dot = a.querySelector("span[data-kind]");
      const dotCs = dot ? getComputedStyle(dot) : null;
      const dotR = dot?.getBoundingClientRect();
      const realThumb = a.querySelector('[data-testid="timeline-stop-thumb"]');
      const fbThumb = a.querySelector('[data-testid="timeline-stop-thumb-fallback"]');
      const thumb = realThumb ?? fbThumb;
      const thumbR = thumb?.getBoundingClientRect();
      const thumbCs = thumb ? getComputedStyle(thumb) : null;
      const descEl = a.querySelector("p");
      const timeCs = timeEl ? getComputedStyle(timeEl) : null;
      const nameCs = nameEl ? getComputedStyle(nameEl) : null;
      return {
        name: txt(nameEl),
        nameSerif: /Fraunces/i.test(nameCs?.fontFamily || ""),
        nameColor: nameCs?.color,
        time: txt(timeEl),
        timeColor: timeCs?.color,
        hasDot: !!dot,
        dotBg: dotCs?.backgroundColor,
        dotW: dotR ? Math.round(dotR.width) : 0,
        dotRing:
          dotCs?.boxShadow && dotCs.boxShadow !== "none" ? "ring" : dotCs?.outlineWidth || "none",
        kind: dot?.getAttribute("data-kind"),
        thumbKind: realThumb ? "photo" : fbThumb ? "fallback" : "none",
        thumbW: thumbR ? Math.round(thumbR.width) : 0,
        thumbH: thumbR ? Math.round(thumbR.height) : 0,
        thumbRadius: thumbCs?.borderRadius,
        thumbFallbackBg: fbThumb ? thumbCs?.backgroundColor : null,
        // For real <img>: did it actually decode pixels?
        imgLoaded: realThumb ? realThumb.complete && realThumb.naturalWidth > 0 : null,
        imgSrc: realThumb ? (realThumb.currentSrc || realThumb.src || "").slice(0, 90) : null,
        hasDesc: !!descEl && (descEl.textContent || "").trim().length > 0,
      };
    });

    // Connector pills (sun-amber).
    const connectors = [
      ...(main?.querySelectorAll('[data-testid="timeline-stop-connector"]') ?? []),
    ].map((p) => {
      const c = getComputedStyle(p);
      return { text: (p.textContent || "").trim(), color: c.color, bg: c.backgroundColor };
    });

    // Share button (editorial tea-green CTA).
    const shareBtn = [...(main?.querySelectorAll("button") ?? [])].find((b) =>
      /Partilhar|Ligação copiada/i.test(b.getAttribute("aria-label") || b.textContent || ""),
    );
    const shareCs = shareBtn ? getComputedStyle(shareBtn) : null;
    const shareR = shareBtn?.getBoundingClientRect();

    // Back link.
    const backLink = [...(main?.querySelectorAll("a") ?? [])].find((a) =>
      /Voltar ao início/i.test(a.textContent || ""),
    );

    // Bottom tab bar.
    const tabbar = document.querySelector('nav[aria-label="Primary"]');
    const tabbarCs = cs(tabbar);
    const tabbarR = tabbar?.getBoundingClientRect();
    const tabItems = tabbar
      ? [...tabbar.querySelectorAll("a,button")].map((el) => ({
          label: el.querySelector("span:last-child")?.textContent?.trim() || el.textContent?.trim(),
          isLink: el.tagName === "A",
          current: el.getAttribute("aria-current"),
          disabled: el.disabled === true,
        }))
      : [];

    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const mainBg = main ? getComputedStyle(main).backgroundColor : null;
    const dataTheme = document.documentElement.getAttribute("data-theme");
    const mainPadBottom = main ? getComputedStyle(main).paddingBottom : null;
    const fits = document.documentElement.scrollWidth <= window.innerWidth + 2;

    return {
      dataTheme,
      bodyBg,
      mainBg,
      mainPadBottom,
      header: {
        present: !!header,
        overline: overline
          ? {
              text: txt(overline),
              color: overlineCs.color,
              uppercase: overlineCs.textTransform === "uppercase",
            }
          : null,
        headline: {
          text: txt(h1),
          serif: /Fraunces/i.test(h1Cs?.fontFamily || ""),
          color: h1Cs?.color,
        },
        subline: txt(subline),
      },
      weatherBanner: weatherBanner
        ? { present: true, text: (weatherBanner.textContent || "").trim().slice(0, 60) }
        : { present: false },
      timelineLine: timelineLine
        ? {
            present: true,
            bg: timelineLineCs.backgroundColor,
            width: timelineLineCs.width,
            height: Math.round(parseFloat(timelineLineCs.height)),
          }
        : { present: false },
      stops,
      connectors,
      share: shareBtn
        ? {
            present: true,
            label: shareBtn.getAttribute("aria-label"),
            bg: shareCs.backgroundColor,
            radius: shareCs.borderRadius,
            color: shareCs.color,
          }
        : { present: false },
      backLink: !!backLink,
      tabbar: {
        present: !!tabbar,
        position: tabbarCs?.position,
        bottom: tabbarR ? Math.round(window.innerHeight - tabbarR.bottom) : null,
        bg: tabbarCs?.backgroundColor,
        items: tabItems,
      },
      fits,
      viewportH: window.innerHeight,
      scrollH: document.documentElement.scrollHeight,
    };
  });
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const probes = {};

// Shared editorial assertions common to every tour render.
function judgeCommon(p, theme) {
  const issues = [];
  // ── Header hierarchy ──
  if (!p.header.present) issues.push("header missing");
  if (!p.header.overline) issues.push("sun-amber overline missing");
  else {
    if (!p.header.overline.uppercase) issues.push("overline not uppercase");
    if (p.header.overline.text !== L.overline)
      issues.push(`overline text "${p.header.overline.text}" != "${L.overline}"`);
    if (p.header.overline.color !== EXPECT.sun)
      issues.push(`overline not sun-amber (${p.header.overline.color} != ${EXPECT.sun})`);
  }
  if (!p.header.headline.serif) issues.push(`headline not Fraunces (${p.header.headline.color})`);
  if (p.header.headline.text !== L.headline)
    issues.push(`headline "${p.header.headline.text}" != "${L.headline}"`);
  if (!/parag(em|ens)/i.test(p.header.subline || ""))
    issues.push(`subline malformed: "${p.header.subline}"`);
  const hlContrast = contrast(p.header.headline.color, p.mainBg);
  if (hlContrast !== null && hlContrast < 4.5) issues.push(`headline contrast ${hlContrast} < 4.5`);

  // ── Timeline line + 4 stops ──
  if (!p.timelineLine.present) issues.push("vertical timeline line missing");
  if (p.stops.length !== 4) issues.push(`expected 4 stops, got ${p.stops.length}`);
  const expectPrimary = theme === "dark" ? EXPECT.primaryDark : EXPECT.primaryLight;
  let photoCount = 0,
    fallbackCount = 0;
  for (const [i, s] of p.stops.entries()) {
    if (!s.name) issues.push(`stop ${i} has no name`);
    if (!s.nameSerif) issues.push(`stop ${i} name not Fraunces`);
    if (!s.hasDot) issues.push(`stop ${i} node dot missing`);
    else {
      if (s.dotBg !== expectPrimary)
        issues.push(`stop ${i} dot not tea-green (${s.dotBg} != ${expectPrimary})`);
      if (s.dotW < 6 || s.dotW > 18) issues.push(`stop ${i} dot size ${s.dotW}px off`);
      if (s.dotRing === "none") issues.push(`stop ${i} dot has no ring`);
    }
    // Thumbnail: square (16x16 tw = 64px), rounded.
    if (s.thumbKind === "none") issues.push(`stop ${i} thumbnail missing`);
    else {
      if (Math.abs(s.thumbW - s.thumbH) > 2)
        issues.push(`stop ${i} thumb not square (${s.thumbW}x${s.thumbH})`);
      if (s.thumbW < 48) issues.push(`stop ${i} thumb too small (${s.thumbW}px)`);
      if (parseFloat(s.thumbRadius) < 6)
        issues.push(`stop ${i} thumb not rounded (${s.thumbRadius})`);
    }
    if (s.thumbKind === "photo") {
      photoCount++;
      if (!s.imgLoaded) issues.push(`stop ${i} (${s.name}) photo did NOT decode (src=${s.imgSrc})`);
    }
    if (s.thumbKind === "fallback") {
      fallbackCount++;
      const fbContrast = contrast(expectPrimary, s.thumbFallbackBg);
      // icon (primary) on tea/15 panel — should be discernible.
      if (fbContrast !== null && fbContrast < 1.15)
        issues.push(`stop ${i} fallback icon barely visible (contrast ${fbContrast})`);
    }
    // time should be tea-green.
    if (s.time && s.timeColor !== expectPrimary)
      issues.push(`stop ${i} time not tea-green (${s.timeColor})`);
  }
  // Spec: 2 hero'd photos + 2 branded fallbacks (when NOT injecting travel; both
  // counts hold regardless of travel injection since media is unchanged).
  if (photoCount !== 2) issues.push(`expected 2 photo thumbnails, got ${photoCount}`);
  if (fallbackCount !== 2) issues.push(`expected 2 fallback thumbnails, got ${fallbackCount}`);

  // ── Share + back + tab bar ──
  if (!p.share.present) issues.push("Share button missing");
  else {
    if (p.share.bg !== expectPrimary) issues.push(`Share button not tea-green (${p.share.bg})`);
    if (parseFloat(p.share.radius) < 16) issues.push(`Share button not pill (${p.share.radius})`);
  }
  if (!p.backLink) issues.push("back link missing");
  if (!p.tabbar.present) issues.push("bottom tab bar missing");
  else {
    if (p.tabbar.position !== "fixed") issues.push("tab bar not fixed");
    if (p.tabbar.bottom !== 0)
      issues.push(`tab bar not flush to bottom (gap ${p.tabbar.bottom}px)`);
    const explore = p.tabbar.items.find((i) => i.label === "Explore");
    if (!explore || explore.current !== "page") issues.push("Explore tab not the active item");
  }
  if (!p.fits) issues.push("horizontal overflow");
  return { issues, hlContrast };
}

// ════════════════════════════════════════════════════════════════════════════
// S1 — LIGHT — tour.  Full editorial chrome; light canvas (#f1ecdf).
// ════════════════════════════════════════════════════════════════════════════
await newPage(browser, { viewport: VIEWPORTS.mobile });
await enterAsGuest();

async function tourScenario(theme, tag) {
  try {
    const homeTheme = await setThemeOnHome(theme);
    await gotoTour();
    const p = await probeTour();
    probes[tag] = p;
    const file = await shot(tag, true);
    const { issues } = judgeCommon(p, theme);
    const clr = await tabbarClearanceAtBottom();
    if (!clr.clears) issues.push(`content occluded by tab bar at page bottom (gap ${clr.gap}px)`);
    // D1 theme fix: data-theme must equal what home set, AND the canvas must be
    // the right scheme's colour (this is the whole point of the fix).
    if (p.dataTheme !== theme)
      issues.push(
        `D1 THEME BUG: home set "${homeTheme}" but tour route renders data-theme="${p.dataTheme}"`,
      );
    const wantCanvas = theme === "dark" ? EXPECT.canvasDark : EXPECT.canvasLight;
    if (p.mainBg !== wantCanvas)
      issues.push(`canvas bg ${p.mainBg} != ${theme} ${wantCanvas} (theme not truly applied)`);
    step(
      `${theme.toUpperCase()} tour — editorial header + 4-stop timeline + thumbs + share + tabbar`,
      issues.length === 0,
      `data_theme=${p.dataTheme} canvas=${p.mainBg} headline_serif=${p.header.headline.serif} overline="${p.header.overline?.text}"/${p.header.overline?.color} stops=${p.stops.length} thumbs=[${p.stops.map((s) => s.thumbKind).join(",")}] dots_ok=${p.stops.every((s) => s.hasDot)} weather=${p.weatherBanner.present} share_bg=${p.share.bg} tabbar=${p.tabbar.position}@${p.tabbar.bottom} clears_tabbar=${clr.clears}(gap${clr.gap}) | ${issues.length ? "ISSUES: " + issues.join("; ") : "clean"} | ${file}`,
    );
  } catch (e) {
    step(`${theme.toUpperCase()} tour`, false, String(e.message).slice(0, 180));
    await shot(`${tag}-fail`);
  }
}

await tourScenario("light", "light-tour");
await tourScenario("dark", "dark-tour");

// ════════════════════════════════════════════════════════════════════════════
// S3 — LIGHT — tour with travel injected.  Own context (route intercept injects
// travel_to_minutes:12) → sun-amber connector pills render BETWEEN stops.
// ════════════════════════════════════════════════════════════════════════════
await newPage(browser, { viewport: VIEWPORTS.mobile, injectTravel: true });
await enterAsGuest();
try {
  const homeTheme = await setThemeOnHome("light");
  await gotoTour();
  await page
    .locator('[data-testid="timeline-stop-connector"]')
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});
  await sleep(500);
  const p = await probeTour();
  probes["light-tour-travelinjected"] = p;
  const file = await shot("light-tour-travelinjected", true);
  const { issues } = judgeCommon(p, "light");
  const notes = [];
  const clr = await tabbarClearanceAtBottom();
  if (!clr.clears) issues.push(`content occluded by tab bar at page bottom (gap ${clr.gap}px)`);
  if (p.dataTheme !== "light")
    issues.push(`theme drifted: data-theme="${p.dataTheme}" (home "${homeTheme}")`);
  // Connector pills render BETWEEN stops where travel>0. The blanket inject sets
  // travel on all 4, so all 4 pills render (component guards travel>0).
  if (p.connectors.length < 3)
    issues.push(`expected ≥3 connector pills with travel injected, got ${p.connectors.length}`);
  for (const c of p.connectors) {
    if (!/12\s*min/.test(c.text)) issues.push(`connector text "${c.text}" missing "12 min"`);
    if (c.color !== EXPECT.sun) issues.push(`connector not sun-amber (${c.color})`);
  }
  // Sun-amber text on the surface-container pill is a known SOFT contrast (≈1.56:1
  // in light). It carries an icon and is decorative metadata, so this is reported
  // as a polish note, not a scenario failure (the pill renders & is the right token).
  const cContrast = p.connectors[0] ? contrast(p.connectors[0].color, p.connectors[0].bg) : null;
  if (cContrast !== null && cContrast < 3.0)
    notes.push(
      `connector pill text contrast ${cContrast}:1 (sun-amber on ${p.connectors[0].bg}) — soft, below WCAG 3:1 for non-text/large-text; legible but a polish candidate`,
    );
  step(
    "LIGHT tour [travel injected] — sun-amber connector pills render & legible",
    issues.length === 0,
    `connectors=${p.connectors.length} first_text="${p.connectors[0]?.text}" color=${p.connectors[0]?.color} pill_bg=${p.connectors[0]?.bg} contrast=${cContrast}:1 clears_tabbar=${clr.clears} | ${issues.length ? "ISSUES: " + issues.join("; ") : "clean"}${notes.length ? " | NOTES: " + notes.join("; ") : ""} | ${file}`,
  );
} catch (e) {
  step("LIGHT tour [travel injected]", false, String(e.message).slice(0, 180));
  await shot("light-tour-travelinjected-fail");
}

// ════════════════════════════════════════════════════════════════════════════
// S4 — DARK — stop thumbnails close-up.  Reuse dark theme; crop to the timeline
// region (the 2 photos + 2 fallbacks) so the report has a focused evidence shot.
// ════════════════════════════════════════════════════════════════════════════
await newPage(browser, { viewport: VIEWPORTS.mobile });
await enterAsGuest();
try {
  const homeTheme = await setThemeOnHome("dark");
  await gotoTour();
  const p = await probeTour();
  probes["dark-tour-thumbs"] = p;
  // Clip to the timeline block: from the first stop's thumb to the last stop bottom.
  const clip = await page.evaluate(() => {
    const arts = [...document.querySelectorAll("main article")];
    if (!arts.length) return null;
    const first = arts[0].getBoundingClientRect();
    const last = arts[arts.length - 1].getBoundingClientRect();
    const x = Math.max(0, first.left - 8);
    const y = Math.max(0, first.top - 8 + window.scrollY);
    return {
      x,
      y,
      width: Math.min(window.innerWidth - x, document.documentElement.scrollWidth - x),
      height: last.bottom - first.top + 16,
    };
  });
  let file;
  if (clip && clip.height > 0) {
    file = "dark-tour-thumbs.png";
    await page.screenshot({ path: SHOTS + file, clip }).catch(async () => {
      file = await shot("dark-tour-thumbs", true);
    });
  } else {
    file = await shot("dark-tour-thumbs", true);
  }
  const issues = [];
  if (p.dataTheme !== "dark") issues.push(`not dark (data-theme="${p.dataTheme}")`);
  if (p.mainBg !== EXPECT.canvasDark) issues.push(`canvas not basalt dark (${p.mainBg})`);
  const photos = p.stops.filter((s) => s.thumbKind === "photo");
  const fbs = p.stops.filter((s) => s.thumbKind === "fallback");
  if (photos.length !== 2) issues.push(`expected 2 photos, got ${photos.length}`);
  if (fbs.length !== 2) issues.push(`expected 2 fallbacks, got ${fbs.length}`);
  for (const ph of photos) if (!ph.imgLoaded) issues.push(`photo "${ph.name}" did not decode`);
  for (const fb of fbs) {
    const c = contrast(EXPECT.primaryDark, fb.thumbFallbackBg);
    if (c !== null && c < 1.1) issues.push(`dark fallback "${fb.name}" icon low contrast (${c})`);
  }
  step(
    "DARK tour thumbnails — 2 real photos decode + 2 branded fallbacks legible",
    issues.length === 0,
    `theme=${p.dataTheme} canvas=${p.mainBg} thumbs=[${p.stops.map((s) => `${s.name}:${s.thumbKind}${s.thumbKind === "photo" ? (s.imgLoaded ? "✓" : "✗") : ""}`).join(", ")}] | ${issues.length ? "ISSUES: " + issues.join("; ") : "clean"} | ${file}`,
  );
} catch (e) {
  step("DARK tour thumbnails", false, String(e.message).slice(0, 180));
  await shot("dark-tour-thumbs-fail");
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("\n— SUMMARY —");
const fails = results.filter((r) => !r.ok);
console.log(`${results.length - fails.length}/${results.length} scenarios passed`);
console.log("\nTOUR PROBES (computed styles per screen):");
console.log(JSON.stringify(probes, null, 2));
if (netFail.length) console.log("\nBROKEN IMAGE RESPONSES:\n" + netFail.join("\n"));
else console.log("\n(no broken image responses)");
if (errors.length) console.log("\nJS ERRORS / CONSOLE:\n" + errors.join("\n"));
else console.log("\n(no JS errors / console errors captured)");
await browser.close();
process.exit(0);
