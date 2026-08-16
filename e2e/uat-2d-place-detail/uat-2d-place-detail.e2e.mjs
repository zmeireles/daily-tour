// Deep UAT — "São Miguel Editorial" PLACE DETAIL restyle, LIGHT + DARK.
// Verifies the restyled /p/<id> screen: 45vh full-bleed hero + bottom scrim,
// two glass circular overlay buttons (back top-left / bookmark stub top-right),
// attribution chip moved to bottom-left, tea-green overline → Fraunces name →
// hydrangea category chips, measured description, the conditional Details card
// (sun-amber best-season dot), 3 editorial action tiles, fixed bottom tab bar.
// REPORT-ONLY (exit 0). READ-ONLY (no submits). playwright-core + system Chrome.
//
// Target: vite dev server http://127.0.0.1:5173 (working tree, latest restyle).
// Entry: opaque multi-use redeem token -> SPA RTokenRoute -> guest JWT -> home.
// Theme: forced via localStorage.theme + reload; asserts <html data-theme>.
//
// NOTE on the Details card: the live seed has season=NULL / hours=[] for ALL
// places (seeds/places-sao-miguel.sql drops every seasonal flag), so the card
// never renders against real data — including Lagoa do Fogo, contrary to the
// spec's "season=summer is set". To still verify the RESTYLED card + sun-amber
// dot in both themes, Lagoa gets a second pass with a route intercept that
// injects season:"summer" into the /v1/places/<id> JSON. Those shots are tagged
// "-injected"; the seed gap is reported as a separate finding (not a card defect).
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
const SHOTS = REPO + "/temp/uat-2d-place-detail/";
mkdirSync(SHOTS, { recursive: true });

const PLACE = {
  lagoa: "c0000001-0000-4000-a000-000000000002", // Commons hero + attribution chip
  viewpoint: "c0000001-0000-4000-a000-000000000043", // self-hosted hero, is_hosts_pick
  tasquinha: "c0000001-0000-4000-a000-000000000029", // media-less -> branded fallback
};

// Phone is the canonical guest device (host's link tapped on a phone); the
// editorial hero (45vh full-bleed) + bottom tab bar are designed mobile-first.
const VIEWPORTS = { mobile: { width: 390, height: 844 } };

// pt-PT chrome (guest locale baked into the redeem JWT).
const L = {
  back: "Voltar",
  save: "Guardar — em breve",
  detailsTitle: "Detalhes",
  bestSeason: "Melhor época",
  navigate: "Navegar",
  call: "Ligar",
  message: "Mensagem",
};
const EXPECT_SUN = "rgb(230, 181, 102)"; // --sun-400 #e6b566

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

// `injectSeason` (optional): a place-id whose /v1/places/<id> JSON gets season
// patched to "summer" — exercises the Details-card render path past the seed gap.
async function newPage(browser, { viewport = VIEWPORTS.mobile, injectSeason = null } = {}) {
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
  if (injectSeason) {
    await ctx.route(`**/v1/places/${injectSeason}`, async (route) => {
      const resp = await route.fetch();
      let body;
      try {
        body = await resp.json();
      } catch {
        return route.fulfill({ response: resp });
      }
      body.season = "summer";
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

// Set the theme override on the HOME route (where useThemeAuto is mounted) so the
// persisted localStorage.theme is honoured, then verify <html data-theme>. We must
// be on / for the toggle to take — the place-detail route does NOT mount the hook
// (that's the bug this UAT documents). Returns the data-theme as seen ON HOME.
async function setThemeOnHome(theme) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.locator('a[href^="/a/"]').first().waitFor({ state: "visible", timeout: 20000 });
  await page.evaluate((t) => localStorage.setItem("theme", t), theme);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('a[href^="/a/"]').first().waitFor({ state: "visible", timeout: 20000 });
  await sleep(500);
  return page.evaluate(() => document.documentElement.getAttribute("data-theme"));
}

// Navigate into the place AFTER the override is persisted. SPA navigation keeps
// localStorage, so this is the real "land on /p/<id> with theme=X set" flow.
async function gotoPlace(id) {
  await page.goto(`${BASE}/p/${id}`, { waitUntil: "domcontentloaded" });
  await page.locator("h1.font-display").first().waitFor({ state: "visible", timeout: 20000 });
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
  await sleep(900);
}

// sRGB relative-luminance WCAG contrast from two "rgb(...)" strings.
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

// One DOM probe of the whole restyled screen — every editorial element + its
// computed styles, so the report is diagnosable from one run.
async function probeDetail() {
  return page.evaluate(
    ({ EXPECT_SUN }) => {
      const cs = (el) => (el ? getComputedStyle(el) : null);
      const txt = (el) => (el ? (el.textContent || "").trim() : null);

      // Hero region + scrim + glass buttons.
      const hero = document.querySelector('[role="region"]');
      const heroCs = cs(hero);
      const heroRect = hero?.getBoundingClientRect();
      const heroImg = hero?.querySelector("img");
      const placeholder = hero?.querySelector('[data-testid="place-hero-placeholder"]');
      const scrim = hero
        ? [...hero.querySelectorAll("div")].find((d) =>
            /gradient/.test(getComputedStyle(d).backgroundImage),
          )
        : null;
      // Glass buttons: round 40px buttons inside the hero.
      const glassBtns = hero
        ? [...hero.querySelectorAll("button")].map((b) => {
            const r = b.getBoundingClientRect();
            const c = getComputedStyle(b);
            return {
              label: b.getAttribute("aria-label"),
              disabled: b.disabled,
              w: Math.round(r.width),
              h: Math.round(r.height),
              left: Math.round(r.left),
              top: Math.round(r.top),
              bg: c.backgroundColor,
              radius: c.borderRadius,
              blur: c.backdropFilter || c.webkitBackdropFilter,
            };
          })
        : [];
      // Attribution chip: an <a> inside hero whose text starts with ©.
      const attrib = hero
        ? [...hero.querySelectorAll("a")].find((a) => /©/.test(a.textContent || ""))
        : null;
      const attribRect = attrib?.getBoundingClientRect();
      const attribCs = cs(attrib);

      // Editorial canvas header: overline span (uppercase) + h1 name + chip <li>s.
      const h1 = document.querySelector("h1.font-display");
      const h1Cs = cs(h1);
      const header = h1?.closest("header");
      const overline = header
        ? [...header.querySelectorAll("span")].find((s) => {
            const c = getComputedStyle(s);
            return c.textTransform === "uppercase" && (s.textContent || "").trim();
          })
        : null;
      const overlineCs = cs(overline);
      const chips = header ? [...header.querySelectorAll("li")] : [];
      const chip0 = chips[0];
      const chip0Cs = cs(chip0);

      // Description measured column.
      const descP = [...document.querySelectorAll("p")].find(
        (p) => (p.textContent || "").length > 40 && p.closest("main"),
      );
      const descCs = cs(descP);

      // Details card (conditional).
      const detailsCard = document.querySelector('[data-testid="place-details-card"]');
      const detailsCs = cs(detailsCard);
      // Sun-amber dot: a 8px round span whose bg is the sun token.
      let sunDot = null,
        sunDotBg = null,
        seasonText = null;
      if (detailsCard) {
        const dots = [...detailsCard.querySelectorAll("span")].filter((s) => {
          const c = getComputedStyle(s);
          return c.borderRadius.includes("9999px") || parseFloat(c.borderRadius) > 20;
        });
        // The dot is the tiny (≈8px) round span; its sibling carries the season text.
        for (const d of dots) {
          const r = d.getBoundingClientRect();
          if (r.width > 0 && r.width <= 12 && r.height <= 12) {
            sunDot = d;
            sunDotBg = getComputedStyle(d).backgroundColor;
            break;
          }
        }
        const seasonPill = [...detailsCard.querySelectorAll("span")].find((s) =>
          /summer|verão|winter|inverno/i.test(s.textContent || ""),
        );
        seasonText = seasonPill ? seasonPill.textContent.trim() : null;
      }

      // Action tiles: the 3 <a> tiles in the grid-cols-3 row.
      const tileGrid = [...document.querySelectorAll("main div")].find((d) =>
        /grid-cols-3/.test(d.className),
      );
      const tiles = tileGrid
        ? [...tileGrid.querySelectorAll("a")].map((a) => {
            const c = getComputedStyle(a);
            const svg = a.querySelector("svg");
            const span = a.querySelector("span");
            return {
              label: txt(span),
              border: c.borderColor,
              bg: c.backgroundColor,
              radius: c.borderRadius,
              iconColor: svg ? getComputedStyle(svg).color : null,
            };
          })
        : [];

      // Bottom tab bar.
      const tabbar = document.querySelector('nav[aria-label="Primary"]');
      const tabbarCs = cs(tabbar);
      const tabbarRect = tabbar?.getBoundingClientRect();
      const tabPosition = tabbarCs?.position;
      const tabItems = tabbar
        ? [...tabbar.querySelectorAll("a,button")].map((el) => ({
            label: el.querySelector("span:last-child")?.textContent?.trim(),
            isLink: el.tagName === "A",
            current: el.getAttribute("aria-current"),
            disabled: el.disabled === true,
            color: getComputedStyle(el).color,
          }))
        : [];

      const pageBg = getComputedStyle(document.body).backgroundColor;
      const mainEl = document.querySelector("main");
      const mainBg = mainEl ? getComputedStyle(mainEl).backgroundColor : null; // bg-surface canvas
      const dataTheme = document.documentElement.getAttribute("data-theme"); // null = unthemed route
      const mainPadBottom = mainEl ? getComputedStyle(mainEl).paddingBottom : null;
      const fits = document.documentElement.scrollWidth <= window.innerWidth + 2;

      return {
        pageBg,
        mainBg,
        dataTheme,
        hero: {
          present: !!hero,
          height: heroRect ? Math.round(heroRect.height) : 0,
          width: heroRect ? Math.round(heroRect.width) : 0,
          fullBleed: heroRect ? Math.round(heroRect.width) >= window.innerWidth - 2 : false,
          heroIsRealImg: heroImg ? heroImg.complete && heroImg.naturalWidth > 0 : false,
          heroSrc: heroImg?.currentSrc?.slice(0, 80) || null,
          hasPlaceholder: !!placeholder,
          hasScrim: !!scrim,
          nameOnImage: hero ? !!hero.querySelector("h1, h2, h3") : false,
        },
        glassBtns,
        attrib: attrib
          ? {
              text: attrib.textContent.trim().slice(0, 60),
              href: attrib.getAttribute("href"),
              left: Math.round(attribRect.left),
              bottom: Math.round(window.innerHeight - attribRect.bottom),
              insideHero: attribRect.top < (heroRect?.bottom ?? 0),
              color: attribCs?.color,
              bg: attribCs?.backgroundColor,
            }
          : null,
        overline: overline
          ? {
              text: overline.textContent.trim(),
              color: overlineCs.color,
              uppercase: overlineCs.textTransform === "uppercase",
            }
          : null,
        name: {
          text: txt(h1),
          font: h1Cs?.fontFamily,
          color: h1Cs?.color,
          serif: /Fraunces/i.test(h1Cs?.fontFamily || ""),
        },
        chips: {
          count: chips.length,
          first: txt(chip0),
          bg: chip0Cs?.backgroundColor,
          fg: chip0Cs?.color,
          border: chip0Cs?.borderColor,
          radius: chip0Cs?.borderRadius,
        },
        description: {
          present: !!descP,
          maxWidth: descCs?.maxWidth,
          color: descCs?.color,
        },
        details: detailsCard
          ? {
              present: true,
              bg: detailsCs.backgroundColor,
              radius: detailsCs.borderRadius,
              sunDotBg,
              sunDotMatches: sunDotBg === EXPECT_SUN,
              seasonText,
            }
          : { present: false },
        tiles,
        tabbar: {
          present: !!tabbar,
          position: tabPosition,
          bottom: tabbarRect ? Math.round(window.innerHeight - tabbarRect.bottom) : null,
          bg: tabbarCs?.backgroundColor,
          items: tabItems,
        },
        mainPadBottom,
        fits,
        viewportH: window.innerHeight,
      };
    },
    { EXPECT_SUN },
  );
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const probes = {}; // tag -> probe, for the report

// Shared assertions on the editorial chrome common to every place.
function judgeCommon(p, theme) {
  const issues = [];
  if (!p.hero.present) issues.push("hero region missing");
  if (p.hero.height < p.viewportH * 0.4 || p.hero.height > p.viewportH * 0.55)
    issues.push(`hero height ${p.hero.height}px not ~45vh of ${p.viewportH}`);
  if (!p.hero.fullBleed) issues.push("hero not full-bleed");
  if (!p.hero.hasScrim) issues.push("hero scrim missing");
  if (p.hero.nameOnImage) issues.push("place name still on the hero image");
  // Glass buttons: expect 2, ~40px, round, translucent.
  const backBtn = p.glassBtns.find((b) => b.label === L.back);
  const saveBtn = p.glassBtns.find((b) => b.label === L.save);
  if (!backBtn) issues.push(`back glass button (aria="${L.back}") missing`);
  else if (backBtn.w < 32 || backBtn.left > 80)
    issues.push("back button not a tappable top-left glass circle");
  if (!saveBtn) issues.push(`save glass button (aria="${L.save}") missing`);
  else if (!saveBtn.disabled) issues.push("save bookmark stub is not disabled");
  // Overline / name / chips hierarchy.
  if (!p.overline) issues.push("tea-green overline missing");
  else if (!p.overline.uppercase) issues.push("overline not uppercase");
  if (!p.name.serif) issues.push(`name not Fraunces serif (got ${p.name.font})`);
  const nameContrast = contrast(p.name.color, p.pageBg);
  if (nameContrast !== null && nameContrast < 4.5)
    issues.push(`name contrast ${nameContrast} < 4.5`);
  if (p.chips.count < 1) issues.push("no category chips");
  // Action tiles: 3 tiles, tea-green/tertiary icons.
  if (p.tiles.length !== 3) issues.push(`expected 3 action tiles, got ${p.tiles.length}`);
  const tileLabels = p.tiles.map((t) => t.label);
  for (const want of [L.navigate, L.call, L.message])
    if (!tileLabels.includes(want)) issues.push(`action tile "${want}" missing`);
  // Bottom tab bar: fixed, Explore active link + 3 disabled stubs.
  if (!p.tabbar.present) issues.push("bottom tab bar missing");
  else {
    if (p.tabbar.position !== "fixed") issues.push("tab bar not fixed");
    if (p.tabbar.bottom !== 0)
      issues.push(`tab bar not flush to bottom (gap ${p.tabbar.bottom}px)`);
    const explore = p.tabbar.items.find((i) => i.label === "Explore");
    if (!explore || !explore.isLink || explore.current !== "page")
      issues.push("Explore tab not the active link");
    const stubs = p.tabbar.items.filter((i) => i.label !== "Explore");
    if (stubs.some((s) => !s.disabled)) issues.push("a non-Explore tab is not a disabled stub");
  }
  if (!p.fits) issues.push("horizontal overflow");
  return { issues, nameContrast };
}

// ════════════════════════════════════════════════════════════════════════════
// S1 — LIGHT — Lagoa do Fogo (Commons hero + attribution).  Real seed (NO Details
// card; documents the seed gap) PLUS an injected-season pass for the card shot.
// ════════════════════════════════════════════════════════════════════════════
async function lagoaScenario(theme) {
  // (a) Real payload — full editorial chrome + attribution; assert NO Details card.
  // Reuses the shared authed context (redeemed once) — fewer cold SPA boots.
  try {
    const homeTheme = await setThemeOnHome(theme);
    await gotoPlace(PLACE.lagoa);
    const p = await probeDetail();
    probes[`${theme}-lagoa`] = p;
    const file = await shot(`${theme}-lagoa`, true);
    const { issues } = judgeCommon(p, theme);
    // Theme coherence: the place route must reflect the override the user set on home.
    if (p.dataTheme !== theme)
      issues.push(
        `THEME BUG: home set data-theme="${homeTheme}" but place route renders data-theme="${p.dataTheme}" (useThemeAuto not mounted on /p/:id)`,
      );
    if (!p.hero.heroIsRealImg) issues.push("Commons hero image not painted");
    if (!p.attrib) issues.push("attribution chip missing");
    else {
      if (p.attrib.bottom < 0 || p.attrib.left > 120 || !p.attrib.insideHero)
        issues.push(
          `attribution not at hero bottom-left (left=${p.attrib.left}, bottom=${p.attrib.bottom})`,
        );
      const attribContrast = contrast(p.attrib.color, p.attrib.bg);
      if (attribContrast !== null && attribContrast < 3.0)
        issues.push(`attribution contrast ${attribContrast} < 3.0`);
    }
    // Real seed has season=NULL -> card MUST be absent here (this is correct app behaviour).
    if (p.details.present) issues.push("Details card present on real Lagoa payload (unexpected)");
    step(
      `${theme.toUpperCase()} Lagoa do Fogo — hero+glass+attribution+overline+name+chips+tiles+tabbar`,
      issues.length === 0,
      `data_theme=${p.dataTheme} mainBg=${p.mainBg} hero=${p.hero.height}px real_img=${p.hero.heroIsRealImg} attrib="${p.attrib?.text}" overline="${p.overline?.text}" name_serif=${p.name.serif} chips=${p.chips.count} tiles=${p.tiles.map((t) => t.label).join("/")} tabbar_fixed=${p.tabbar.position} details_card=${p.details.present} | ${issues.length ? "ISSUES: " + issues.join("; ") : "clean"} | ${file}`,
    );
  } catch (e) {
    step(`${theme.toUpperCase()} Lagoa do Fogo`, false, String(e.message).slice(0, 160));
    await shot(`${theme}-lagoa-fail`);
  }
}

// Injected season=summer — exercise the RESTYLED Details card + sun-amber dot.
// Needs its own context (route intercept), so it re-redeems; run at the END.
async function lagoaDetailsCardInjected(theme) {
  await newPage(browser, { viewport: VIEWPORTS.mobile, injectSeason: PLACE.lagoa });
  await enterAsGuest();
  try {
    await setThemeOnHome(theme);
    await gotoPlace(PLACE.lagoa);
    await page
      .locator('[data-testid="place-details-card"]')
      .first()
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => {});
    await sleep(800);
    const p = await probeDetail();
    probes[`${theme}-lagoa-injected`] = p;
    const file = await shot(`${theme}-lagoa-detailscard-injected`, true);
    const issues = [];
    if (!p.details.present) issues.push("Details card did NOT render with injected season");
    else {
      if (!/summer/i.test(p.details.seasonText || ""))
        issues.push(`season text not "Summer" (got "${p.details.seasonText}")`);
      if (!p.details.sunDotMatches)
        issues.push(`sun dot bg ${p.details.sunDotBg} != ${EXPECT_SUN}`);
      // Card surface (surface-container-low) must differ from the main canvas
      // (bg-surface) so the card reads as a card. In a CORRECTLY-themed view these
      // are distinct (#f7f4ec vs #f1ecdf light); when the theme bug strips
      // data-theme this still holds via :root, so a clash here is a real defect.
      if (p.details.bg === p.mainBg)
        issues.push("Details card surface == main canvas (no card distinction)");
      const dotContrast = contrast(p.details.sunDotBg, p.details.bg);
      if (dotContrast !== null && dotContrast < 1.3)
        issues.push(`sun dot barely visible on card (contrast ${dotContrast})`);
    }
    step(
      `${theme.toUpperCase()} Lagoa Details card [season injected] — sun-amber dot + "Summer", readable`,
      issues.length === 0,
      `data_theme=${p.dataTheme} card=${p.details.present} season="${p.details.seasonText}" sun_dot=${p.details.sunDotBg} matches_token=${p.details.sunDotMatches} card_bg=${p.details.bg} main_canvas=${p.mainBg} | ${issues.length ? "ISSUES: " + issues.join("; ") : "clean"} | ${file}`,
    );
  } catch (e) {
    step(
      `${theme.toUpperCase()} Lagoa Details card [injected]`,
      false,
      String(e.message).slice(0, 160),
    );
    await shot(`${theme}-lagoa-detailscard-fail`);
  }
}

// Shared authed context for all NON-injected scenarios — redeem once, reuse.
await newPage(browser, { viewport: VIEWPORTS.mobile });
await enterAsGuest();

await lagoaScenario("light");
await lagoaScenario("dark");

// ════════════════════════════════════════════════════════════════════════════
// S3 — LIGHT — The View Point: self-hosted hero renders, NO Details card.
// ════════════════════════════════════════════════════════════════════════════
try {
  const homeTheme = await setThemeOnHome("light");
  await gotoPlace(PLACE.viewpoint);
  const p = await probeDetail();
  probes["light-viewpoint"] = p;
  const file = await shot("light-viewpoint", true);
  const { issues } = judgeCommon(p, "light");
  if (p.dataTheme !== "light")
    issues.push(`THEME BUG: place route data-theme="${p.dataTheme}" (home was "${homeTheme}")`);
  if (!p.hero.heroIsRealImg) issues.push("self-hosted hero image not painted");
  if (p.hero.heroSrc && !/the-view-point/.test(p.hero.heroSrc))
    issues.push(`hero src not the-view-point media (${p.hero.heroSrc})`);
  if (p.details.present) issues.push("Details card present (View Point has no season/hours)");
  if (p.attrib) issues.push("attribution chip present on self-hosted place (should be none)");
  step(
    "LIGHT The View Point — self-hosted hero renders, NO Details card",
    issues.length === 0,
    `data_theme=${p.dataTheme} hero=${p.hero.height}px real_img=${p.hero.heroIsRealImg} src=${p.hero.heroSrc} overline="${p.overline?.text}" chips=${p.chips.count} details_card=${p.details.present} attrib=${!!p.attrib} | ${issues.length ? "ISSUES: " + issues.join("; ") : "clean"} | ${file}`,
  );
} catch (e) {
  step("LIGHT The View Point", false, String(e.message).slice(0, 160));
  await shot("light-viewpoint-fail");
}

// ════════════════════════════════════════════════════════════════════════════
// S4 — DARK — Tasquinha Vieira: branded photo-less fallback hero, NO Details card.
// ════════════════════════════════════════════════════════════════════════════
try {
  const homeTheme = await setThemeOnHome("dark");
  await gotoPlace(PLACE.tasquinha);
  const p = await probeDetail();
  probes["dark-tasquinha"] = p;
  const file = await shot("dark-tasquinha", true);
  const { issues } = judgeCommon(p, "dark");
  if (p.dataTheme !== "dark")
    issues.push(
      `THEME BUG: place route data-theme="${p.dataTheme}" so DARK is not applied (home was "${homeTheme}")`,
    );
  if (!p.hero.hasPlaceholder) issues.push("branded photo-less fallback placeholder missing");
  if (p.hero.heroIsRealImg)
    issues.push("a real img rendered for a media-less place (expected fallback)");
  if (p.details.present) issues.push("Details card present (Tasquinha has no season/hours)");
  if (p.attrib) issues.push("attribution chip present on media-less place (should be none)");
  step(
    "DARK Tasquinha Vieira — branded photo-less fallback hero, NO Details card",
    issues.length === 0,
    `data_theme=${p.dataTheme} mainBg=${p.mainBg} hero=${p.hero.height}px placeholder=${p.hero.hasPlaceholder} real_img=${p.hero.heroIsRealImg} overline="${p.overline?.text}" chips=${p.chips.count} details_card=${p.details.present} | ${issues.length ? "ISSUES: " + issues.join("; ") : "clean"} | ${file}`,
  );
} catch (e) {
  step("DARK Tasquinha Vieira", false, String(e.message).slice(0, 160));
  await shot("dark-tasquinha-fail");
}

// ════════════════════════════════════════════════════════════════════════════
// S5/S6 — Injected-season Details card (LIGHT + DARK). Own context each (route
// intercept) — verifies the RESTYLED card + sun-amber dot past the seed gap.
// ════════════════════════════════════════════════════════════════════════════
await lagoaDetailsCardInjected("light");
await lagoaDetailsCardInjected("dark");

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("\n— SUMMARY —");
const fails = results.filter((r) => !r.ok);
console.log(`${results.length - fails.length}/${results.length} scenarios passed`);
console.log("\nDETAIL PROBES (computed styles per screen):");
console.log(JSON.stringify(probes, null, 2));
if (netFail.length) console.log("\nBROKEN IMAGE RESPONSES:\n" + netFail.join("\n"));
if (errors.length) console.log("\nJS ERRORS / CONSOLE:\n" + errors.join("\n"));
else console.log("\n(no JS errors / console errors captured)");
await browser.close();
process.exit(0);
