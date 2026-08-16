// Deep UAT — Daily Tour PWA guest experience, verifying the #250–#252 catalog seed
// renders end-to-end in a REAL browser (HTTP 200 ≠ render; screenshots are proof).
// REPORT-ONLY (exit 0). READ-ONLY (no form submits). playwright-core + system Chrome.
//
// Target: vite dev server http://127.0.0.1:5173 (serves working tree + public/media/).
// Entry: opaque multi-use redeem token → SPA RTokenRoute → guest JWT → authed pt-PT home.
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
const SHOTS = REPO + "/temp/uat-see-it-live/";
mkdirSync(SHOTS, { recursive: true });

// Ground-truth place ids resolved from /v1/discover (radius 100km, this guest).
const PLACE = {
  thePlace: "c0000001-0000-4000-a000-000000000040", // 6 self-hosted photos, hosts-pick
  theViewPoint: "c0000001-0000-4000-a000-000000000043", // 4 self-hosted photos, hosts-pick
  lagoaDoFogo: "c0000001-0000-4000-a000-000000000002", // Commons hero + attribution
  praiaSantaBarbara: "c0000001-0000-4000-a000-000000000010", // Commons hero + attribution (backup)
  tasquinhaVieira: "c0000001-0000-4000-a000-000000000029", // media-less → branded fallback
  gorreana: "c0000001-0000-4000-a000-000000000006", // media-less → branded fallback
};

const VIEWPORTS = {
  mobile: { width: 390, height: 844 }, // realistic device: guest taps host's link on phone
  desktop: { width: 1440, height: 900 },
};

const results = [];
const errors = [];
const netFail = []; // 4xx/5xx image responses across all scenarios
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
  // Track any image request that comes back broken (the silent killer a 200-on-/ hides).
  page.on("response", (resp) => {
    const rt = resp.request().resourceType();
    if (rt === "image" && resp.status() >= 400) {
      netFail.push(`[step ${results.length}] ${resp.status()} ${resp.url().slice(0, 140)}`);
    }
  });
}

// Redeem the multi-use token cold via document navigation → boots SPA, stores JWT,
// replaces to "/". Returns once the authed action grid is visible.
async function enterAsGuest() {
  await page.goto(`${BASE}/r/${TOKEN}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => location.pathname === "/", { timeout: 30000 }).catch(() => {});
  // Authed home discriminator: the /a/* action grid links.
  await page.locator('a[href^="/a/"]').first().waitFor({ state: "visible", timeout: 20000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
}

// Returns true if an <img> with the given src-substring is actually painted
// (naturalWidth>0 ⇒ decoded, not a broken/empty box).
async function imgRendered(srcPart) {
  return page
    .evaluate((part) => {
      const imgs = [...document.querySelectorAll("img")];
      const m = imgs.find((i) => i.currentSrc.includes(part) || i.src.includes(part));
      return m ? m.complete && m.naturalWidth > 0 : false;
    }, srcPart)
    .catch(() => false);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

// ════════════════════════════════════════════════════════════════════════════
// S1 — Cold guest entry: /r/<token> boots SPA, redeems, lands on authed pt-PT home.
// ════════════════════════════════════════════════════════════════════════════
await newPage(browser, VIEWPORTS.mobile);
try {
  await enterAsGuest();
  const path = await page.evaluate(() => location.pathname);
  const reason = await page.evaluate(() => new URLSearchParams(location.search).get("reason"));
  const body =
    (await page
      .locator("body")
      .innerText()
      .catch(() => "")) || "";
  const actionLinks = await page.locator('a[href^="/a/"]').count();
  const ptGreeting = /Bem-vindo de volta/i.test(body); // pt-PT chrome proof
  const expired = /link.*expirou|expired|ask your host/i.test(body);
  const ok = path === "/" && reason !== "expired" && actionLinks >= 6 && !expired && ptGreeting;
  await shot("s1-cold-entry-home");
  step(
    "S1 cold /r/<token> → authed pt-PT home (no error page)",
    ok,
    `path=${path} reason=${reason} action_links=${actionLinks} pt_greeting=${ptGreeting} expired=${expired}`,
  );
} catch (e) {
  step("S1 cold guest entry", false, String(e.message).slice(0, 150));
  await shot("s1-fail");
}

// ════════════════════════════════════════════════════════════════════════════
// S2 — Brand mark: the real logo (pin + tea-leaf) is present on the home surface.
// The authed home React tree renders text chrome only; the brand mark ships as the
// PWA icon set / favicon / logo.svg. We verify BOTH: (a) any rendered <img>/<svg>
// brand element in the DOM, and (b) that the brand assets load (favicon/logo.svg/
// apple-touch-icon are real PNG/SVG, not 404/placeholder). Reported honestly.
// ════════════════════════════════════════════════════════════════════════════
try {
  // (a) DOM scan for a brand logo element on the home.
  const domBrand = await page.evaluate(() => {
    const cand = [...document.querySelectorAll("img, svg")].filter((el) => {
      const s = (
        (el.getAttribute("src") || "") +
        " " +
        (el.getAttribute("alt") || "") +
        " " +
        (el.getAttribute("aria-label") || "") +
        " " +
        (el.className?.baseVal || el.className || "")
      ).toLowerCase();
      return /logo|brand|daily.?tour|tea|pin/.test(s);
    });
    return cand.map(
      (el) =>
        el.tagName +
        ":" +
        (el.getAttribute("src") || el.getAttribute("alt") || el.getAttribute("aria-label") || ""),
    );
  });
  // (b) Brand assets reachable + non-trivial (real image bytes).
  const assetCheck = await page.evaluate(async (base) => {
    const out = {};
    for (const a of [
      "/logo.svg",
      "/favicon.ico",
      "/apple-touch-icon-180x180.png",
      "/pwa-512x512.png",
    ]) {
      try {
        const r = await fetch(base + a, { cache: "no-store" });
        const buf = await r.arrayBuffer();
        out[a] = { status: r.status, bytes: buf.byteLength, ct: r.headers.get("content-type") };
      } catch (e) {
        out[a] = { status: "err", bytes: 0 };
      }
    }
    return out;
  }, BASE);
  const assetsOk = Object.values(assetCheck).every((v) => v.status === 200 && v.bytes > 200);
  // SVG sanity: logo.svg should actually be SVG markup.
  const logoSvgOk = await page.evaluate(async (base) => {
    const r = await fetch(base + "/logo.svg", { cache: "no-store" });
    const txt = await r.text();
    return r.status === 200 && /<svg[\s>]/i.test(txt);
  }, BASE);
  await shot("s2-brand-home");
  step(
    "S2 brand mark present (DOM logo and/or real brand assets load)",
    assetsOk && logoSvgOk,
    `dom_brand_els=${JSON.stringify(domBrand)} logo_svg_valid=${logoSvgOk} assets=${JSON.stringify(assetCheck)}`,
  );
} catch (e) {
  step("S2 brand mark", false, String(e.message).slice(0, 150));
  await shot("s2-fail");
}

// ════════════════════════════════════════════════════════════════════════════
// S3 — Discover renders: cycle See / Eat / Do / Drink; cards render, no broken layout.
// Expect roughly see≈19, eat≈11, do≈16, drink≈6 (the seed's ground-truth).
// Navigate via the home action grid (real user path), set radius to "entire island"
// is unnecessary — default guesthouse loc + ample radius already returns the set;
// we just read whatever the default view shows and count rendered place cards.
// ════════════════════════════════════════════════════════════════════════════
const discoverFindings = {};
for (const [slug, expectMin] of [
  ["see", 10],
  ["eat", 6],
  ["do", 8],
  ["drink", 3],
]) {
  try {
    // Direct SPA navigation to the action route (still the same client app/session).
    await page.goto(`${BASE}/a/${slug}`, { waitUntil: "domcontentloaded" });
    // Wait for either cards or an empty-state; give react-query time.
    await page
      .locator('h3.font-display, [data-testid="place-card-hero-placeholder"], img')
      .first()
      .waitFor({ state: "visible", timeout: 25000 })
      .catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
    await sleep(1200);
    // Count rendered place cards by their <h3> title (unique per card).
    const cardTitles = await page
      .locator("h3.font-display")
      .allInnerTexts()
      .catch(() => []);
    const cardCount = cardTitles.length;
    // No horizontal overflow (broken layout guard).
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 2,
    );
    // How many cards show a real hero img vs the branded placeholder?
    const heroImgs = await page.locator("h3.font-display").count(); // proxy not needed
    const placeholders = await page.locator('[data-testid="place-card-hero-placeholder"]').count();
    discoverFindings[slug] = { cardCount, placeholders, fits, sample: cardTitles.slice(0, 3) };
    await shot(`s3-discover-${slug}`);
    step(
      `S3 discover/${slug} renders cards (no broken layout)`,
      cardCount >= expectMin && fits,
      `cards=${cardCount} (expect≳${expectMin}) placeholders=${placeholders} fits=${fits} sample=${JSON.stringify(cardTitles.slice(0, 2))}`,
    );
  } catch (e) {
    step(`S3 discover/${slug}`, false, String(e.message).slice(0, 150));
    await shot(`s3-discover-${slug}-fail`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// S4 — Self-hosted hero (guesthouse): "The Place" (6 photos) + "The View Point" (4).
// PASS = real hero img painted (naturalWidth>0) AND gallery carousel present, NOT
// the branded fallback. Note presence of any hosts-pick badge.
// ════════════════════════════════════════════════════════════════════════════
for (const [name, id, count, firstSrc] of [
  ["The Place", PLACE.thePlace, 6, "/media/the-place/01.jpg"],
  ["The View Point", PLACE.theViewPoint, 4, "/media/the-view-point/01.jpg"],
]) {
  try {
    await page.goto(`${BASE}/p/${id}`, { waitUntil: "domcontentloaded" });
    // Hero img carries alt=<place name>; wait for it.
    await page
      .locator(`img[alt="${name}"]`)
      .first()
      .waitFor({ state: "visible", timeout: 20000 })
      .catch(() => {});
    await sleep(1000);
    const heroPainted = await imgRendered(firstSrc.split("/").pop());
    const fallbackShown =
      (await page.locator('[data-testid="place-hero-placeholder"]').count()) > 0;
    // Gallery: carousel renders when >1 image. Count <img> whose src is under /media/<slug>/.
    const slug = firstSrc.split("/")[2];
    const galleryImgs = await page
      .locator(`img[src*="/media/${slug}/"]`)
      .count()
      .catch(() => 0);
    // Hosts-pick badge — note if any badge/text indicating host's pick is present.
    const body =
      (await page
        .locator("body")
        .innerText()
        .catch(() => "")) || "";
    const hostsPickBadge =
      /anfitri|host.?s pick|escolha/i.test(body) ||
      (await page.locator('[data-testid*="hosts-pick"], [class*="hosts"]').count()) > 0;
    await shot(`s4-${slug}`);
    const ok = heroPainted && !fallbackShown && galleryImgs >= 2;
    step(
      `S4 self-hosted hero "${name}" (${count} photos) renders real gallery`,
      ok,
      `hero_painted=${heroPainted} fallback=${fallbackShown} media_imgs_in_dom=${galleryImgs} hosts_pick_badge=${hostsPickBadge}`,
    );
  } catch (e) {
    step(`S4 self-hosted hero "${name}"`, false, String(e.message).slice(0, 150));
    await shot(`s4-${name.replace(/\s+/g, "-")}-fail`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// S5 — Commons hero + attribution: "Lagoa do Fogo" — real scenic photo AND a
// visible credit chip (© author · license linking to source).
// ════════════════════════════════════════════════════════════════════════════
try {
  const name = "Lagoa do Fogo (Fire Lake)";
  await page.goto(`${BASE}/p/${PLACE.lagoaDoFogo}`, { waitUntil: "domcontentloaded" });
  await page
    .locator(`img[alt="${name}"]`)
    .first()
    .waitFor({ state: "visible", timeout: 20000 })
    .catch(() => {});
  await sleep(1500); // remote Commons fetch
  const heroPainted = await imgRendered("upload.wikimedia.org");
  const fallbackShown = (await page.locator('[data-testid="place-hero-placeholder"]').count()) > 0;
  // Attribution chip: an <a> to a wikimedia source whose text starts with ©.
  const attribLink = page.locator('a[href*="commons.wikimedia.org"]').first();
  const attribCount = await attribLink.count();
  const attribText = attribCount > 0 ? await attribLink.innerText().catch(() => "") : "";
  const attribOk = attribCount > 0 && /©/.test(attribText) && /CC|BY|SA|licen/i.test(attribText);
  await shot("s5-lagoa-do-fogo-attribution");
  step(
    "S5 Commons hero + attribution chip (Lagoa do Fogo)",
    heroPainted && !fallbackShown && attribOk,
    `hero_painted=${heroPainted} fallback=${fallbackShown} attrib="${attribText.replace(/\s+/g, " ").slice(0, 70)}"`,
  );
} catch (e) {
  step("S5 Commons hero + attribution", false, String(e.message).slice(0, 150));
  await shot("s5-fail");
}

// ════════════════════════════════════════════════════════════════════════════
// S6 — Photo-less fallback: media-less POI shows the branded "photo coming soon"
// tea-green panel (data-testid=place-hero-placeholder, MapPin), NO broken img,
// NO stock photo. Check "Tasquinha Vieira" and "Gorreana Tea Factory".
// ════════════════════════════════════════════════════════════════════════════
for (const [name, id] of [
  ["Tasquinha Vieira", PLACE.tasquinhaVieira],
  ["Gorreana Tea Factory", PLACE.gorreana],
]) {
  try {
    await page.goto(`${BASE}/p/${id}`, { waitUntil: "domcontentloaded" });
    await page
      .locator('[data-testid="place-hero-placeholder"]')
      .first()
      .waitFor({ state: "visible", timeout: 20000 })
      .catch(() => {});
    await sleep(800);
    const fallbackShown =
      (await page.locator('[data-testid="place-hero-placeholder"]').count()) > 0;
    // No hero <img> should be present at all in the hero region (no stock/broken img).
    const heroImgCount = await page
      .locator(`img[alt="${name}"]`)
      .count()
      .catch(() => 0);
    await shot(`s6-fallback-${id.slice(-2)}`);
    step(
      `S6 branded fallback for media-less "${name}" (no broken img)`,
      fallbackShown && heroImgCount === 0,
      `branded_fallback=${fallbackShown} hero_img_count=${heroImgCount}`,
    );
  } catch (e) {
    step(`S6 fallback "${name}"`, false, String(e.message).slice(0, 150));
    await shot(`s6-${name.replace(/\s+/g, "-")}-fail`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// S7 — Broken-image sweep: revisit each discover list; for every rendered hero
// <img>, assert naturalWidth>0; report any broken images and any mismatch
// (a placeholder where a photo was expected, or vice-versa). netFail captures
// 4xx/5xx image responses across the whole run.
// ════════════════════════════════════════════════════════════════════════════
try {
  const broken = [];
  for (const slug of ["see", "eat", "do", "drink"]) {
    await page.goto(`${BASE}/a/${slug}`, { waitUntil: "domcontentloaded" });
    await page
      .locator('h3.font-display, [data-testid="place-card-hero-placeholder"]')
      .first()
      .waitFor({ state: "visible", timeout: 20000 })
      .catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await sleep(1000);
    const bad = await page.evaluate(() => {
      return [...document.querySelectorAll("img")]
        .filter((i) => !i.complete || i.naturalWidth === 0)
        .map((i) => i.currentSrc || i.src)
        .slice(0, 20);
    });
    if (bad.length) broken.push(`${slug}: ${bad.join(" | ")}`);
    await shot(`s7-sweep-${slug}`);
  }
  const ok = broken.length === 0 && netFail.length === 0;
  step(
    "S7 no broken images across see/eat/do/drink lists",
    ok,
    ok
      ? "all rendered imgs decoded; no 4xx/5xx image responses"
      : `broken_imgs=${JSON.stringify(broken).slice(0, 300)} net_4xx5xx=${JSON.stringify(netFail).slice(0, 300)}`,
  );
} catch (e) {
  step("S7 broken-image sweep", false, String(e.message).slice(0, 150));
  await shot("s7-fail");
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("\n— SUMMARY —");
const fails = results.filter((r) => !r.ok);
console.log(`${results.length - fails.length}/${results.length} scenarios passed`);
console.log("DISCOVER FINDINGS: " + JSON.stringify(discoverFindings));
if (netFail.length) console.log("BROKEN IMAGE RESPONSES:\n" + netFail.join("\n"));
if (errors.length) console.log("\nJS ERRORS / CONSOLE:\n" + errors.join("\n"));
else console.log("\n(no JS errors / console errors captured)");
await browser.close();
process.exit(0);
