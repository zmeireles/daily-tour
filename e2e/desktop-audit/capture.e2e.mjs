// DESKTOP + TABLET capture run — 5 guest-app screens on LIVE qual.
// CAPTURE-ONLY (exit 0): no pass/fail gating; full-page PNGs + a findings log.
// Doctrine: in-memory guest session — redeem ONCE via /r/<token>, then move
// between screens by CLIENT-SIDE SPA navigation (clicks / history.pushState),
// NEVER goto/reload an authed route. If we land on /?reason=expired, re-redeem.
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
const TABLET = { width: 834, height: 1112 };

const log = [];
const errors = [];
let ctx, page;
const note = (m) => {
  log.push(m);
  console.log(m);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(name) {
  const p = `${SHOTS}${name}.png`;
  await page
    .screenshot({ path: p, fullPage: true })
    .catch((e) => note(`  ! shot ${name} failed: ${e.message}`));
  return p;
}

async function newCtx(browser, viewport) {
  if (ctx) await ctx.close();
  ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror[${log.length}] ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console[${log.length}] ${m.text().slice(0, 220)}`);
  });
}

async function setViewport(viewport) {
  await page.setViewportSize(viewport);
  await sleep(600); // let layout settle
}

// Redeem once -> authed home. Retries the /r/ URL once on a cold-BFF 500.
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
      note(`  redeemed (attempt ${attempt})`);
      return true;
    }
    note(`  redeem attempt ${attempt} did not land on authed home, retrying`);
    await sleep(1500);
  }
  return false;
}

// True session loss is ONLY a bounce to /?reason=expired. (The action grid
// exists only on home, so it is NOT a session-liveness signal on /a/*, /p/*,
// /chat, /tour/new — checking for it caused false re-redeems that clobbered nav.)
async function sessionExpired() {
  const path = await page.evaluate(() => location.pathname).catch(() => "/");
  const reason = await page
    .evaluate(() => new URLSearchParams(location.search).get("reason"))
    .catch(() => null);
  return path === "/" && reason === "expired";
}

// Client-side SPA navigation: prefer clicking a real in-app link; fall back to
// driving the router via the SPA's own navigate (pushState + popstate) so we
// never do a full doc nav that would drop the in-memory session. If the screen
// bounces to /?reason=expired, re-redeem then SPA-navigate to the target again.
async function spaNavigate(href, { waitFor } = {}) {
  const go = async () => {
    const link = page.locator(`a[href="${href}"]`).first();
    if ((await link.count()) > 0 && (await link.isVisible().catch(() => false))) {
      await link.click();
    } else {
      await page.evaluate((to) => {
        window.history.pushState({}, "", to);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }, href);
    }
    await page
      .waitForFunction((p) => location.pathname === p, href, { timeout: 20000 })
      .catch(() => {});
  };
  await go();
  if (await sessionExpired()) {
    note(`  ! session expired navigating to ${href} — re-redeeming then retrying`);
    await enterAsGuest();
    await go();
  }
  if (waitFor)
    await page
      .locator(waitFor)
      .first()
      .waitFor({ state: "visible", timeout: 25000 })
      .catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await sleep(800);
  const landed = await page.evaluate(() => location.pathname).catch(() => "?");
  if (landed !== href) note(`  ! WARN: requested ${href} but landed on ${landed}`);
}

async function forceLightTheme() {
  await page.evaluate(() => localStorage.setItem("theme", "light"));
  await page.reload({ waitUntil: "domcontentloaded" });
  // reload drops the in-memory session — re-redeem, theme now persisted in localStorage.
  await enterAsGuest();
  const applied = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  note(`  theme forced -> data-theme=${applied}`);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

// ── Per-viewport pass. Redeem fresh in a clean context so the in-memory session
//    is guaranteed live, then SPA-navigate the 5 screens. ──────────────────────
async function runViewport(vp, tag) {
  note(`\n=== VIEWPORT ${tag} (${vp.width}x${vp.height}) ===`);
  await newCtx(browser, vp);

  // 1. HOME (also forces light theme on first home mount)
  if (!(await enterAsGuest())) {
    note("  !! could not redeem — aborting this viewport");
    return;
  }
  await forceLightTheme();
  await page
    .locator('[class*="aspect-[4/5]"] img, a[href^="/a/"]')
    .first()
    .waitFor({ state: "visible", timeout: 12000 })
    .catch(() => {});
  await sleep(1000);
  note(`  HOME captured: ${await shot(`home-${tag}`)}`);

  // 2. DISCOVER /a/see — click the "See" tile in the ActionGrid.
  await page.evaluate(() => window.scrollTo(0, 0));
  await spaNavigate("/a/see", { waitFor: ".maplibregl-canvas" });
  await sleep(1800); // map tiles + sheet list
  note(
    `  DISCOVER(see) captured @ ${await page.evaluate(() => location.pathname)}: ${await shot(`discover-see-${tag}`)}`,
  );

  // 3. PLACE DETAIL /p/<Lagoa do Fogo> — try clicking a sheet ribbon card first.
  const PLACE = "c0000001-0000-4000-a000-000000000002";
  let onDetail = false;
  const card = page.locator(`a[href="/p/${PLACE}"], [data-place-id="${PLACE}"]`).first();
  if ((await card.count()) > 0) {
    const pressable =
      (await card
        .getByRole("button")
        .count()
        .catch(() => 0)) > 0
        ? card.getByRole("button").first()
        : card;
    await pressable.click().catch(() => {});
    onDetail = await page
      .waitForFunction((p) => location.pathname === p, `/p/${PLACE}`, { timeout: 8000 })
      .then(() => true)
      .catch(() => false);
  }
  if (!onDetail) await spaNavigate(`/p/${PLACE}`, { waitFor: "h1.font-display" });
  await page
    .locator("h1.font-display")
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});
  await sleep(1200);
  note(
    `  PLACE DETAIL captured @ ${await page.evaluate(() => location.pathname)}: ${await shot(`place-detail-${tag}`)}`,
  );

  // 4. DAILY TOUR /tour/new — real LLM generation, 10-40s.
  await spaNavigate("/tour/new");
  // Wait for the multi-stop timeline. The loading state shows a spinner/skeleton;
  // the ready state renders a "A day around"/"Um dia" heading + multiple stop
  // entries. Poll up to ~70s; bail early once a timeline heading appears.
  let tourReady = false;
  for (let i = 0; i < 28; i++) {
    const probe = await page
      .evaluate(() => {
        const txt = document.body.innerText || "";
        const headings = [...document.querySelectorAll("h1, h2, h3")].map((h) =>
          h.textContent.trim(),
        );
        return {
          title: /A day around|um dia|à volta de|day around/i.test(txt),
          loading: /a gerar|a planear|generating|a preparar|a criar|a montar|loading/i.test(txt),
          listItems: document.querySelectorAll('ol li, [class*="timeline"] li, article').length,
          headings: headings.slice(0, 6),
        };
      })
      .catch(() => ({}));
    if (probe.title && !probe.loading) {
      tourReady = true;
      break;
    }
    await sleep(2500);
  }
  await sleep(1500);
  note(
    `  DAILY TOUR captured (ready=${tourReady}) @ ${await page.evaluate(() => location.pathname)}: ${await shot(`tour-${tag}`)}`,
  );

  // 5. CHAT /chat — host "Miguel".
  await spaNavigate("/chat");
  await sleep(1500);
  note(
    `  CHAT captured @ ${await page.evaluate(() => location.pathname)}: ${await shot(`chat-${tag}`)}`,
  );
}

await runViewport(DESKTOP, "desktop-1440");
await runViewport(TABLET, "tablet-834");

// ── Extra: /a/eat cleanup-verification shot at desktop 1440 only. Confirm the
//    14 businesses now render the branded "photo coming soon" fallback panel,
//    NOT a stock photo and NOT a broken image. ─────────────────────────────────
note("\n=== CLEANUP VERIFY /a/eat (desktop 1440) ===");
await newCtx(browser, DESKTOP);
const eatImgFails = [];
page.on("response", (resp) => {
  if (resp.request().resourceType() === "image" && resp.status() >= 400)
    eatImgFails.push(`${resp.status()} ${resp.url().slice(0, 120)}`);
});
if (await enterAsGuest()) {
  await forceLightTheme();
  await spaNavigate("/a/eat", { waitFor: ".maplibregl-canvas" });
  await sleep(2200);
  // Probe the place cards: count branded fallbacks vs real <img> heroes, and any
  // broken images. The fallback carries data-testid="place-card-hero-placeholder".
  const probe = await page.evaluate(() => {
    const placeholders = document.querySelectorAll(
      '[data-testid="place-card-hero-placeholder"]',
    ).length;
    const imgs = [
      ...document.querySelectorAll('[data-place-id] img, li a[href^="/p/"] img, article img'),
    ];
    const realHeroes = imgs.filter((i) => i.complete && i.naturalWidth > 0).length;
    const brokenImgs = imgs.filter((i) => i.complete && i.naturalWidth === 0).length;
    const srcs = imgs
      .map((i) => (i.currentSrc || i.src || "").slice(0, 90))
      .filter(Boolean)
      .slice(0, 8);
    const unsplash = srcs.filter((s) => /unsplash/i.test(s)).length;
    return { placeholders, realHeroes, brokenImgs, unsplash, sampleSrcs: srcs };
  });
  note(
    `  /a/eat probe: brandedFallbacks=${probe.placeholders} realHeroes=${probe.realHeroes} brokenImgs=${probe.brokenImgs} unsplashSrcs=${probe.unsplash}`,
  );
  note(`  /a/eat sample img srcs: ${JSON.stringify(probe.sampleSrcs)}`);
  note(
    `  /a/eat 4xx/5xx image responses: ${eatImgFails.length ? eatImgFails.join(" | ") : "none"}`,
  );
  note(`  CLEANUP shot: ${await shot("discover-eat-desktop-1440")}`);
} else {
  note("  !! could not redeem for /a/eat cleanup verification");
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("\n— CAPTURE LOG —");
console.log(log.join("\n"));
if (errors.length) console.log("\nJS ERRORS / CONSOLE:\n" + [...new Set(errors)].join("\n"));
else console.log("\n(no JS errors / console errors captured)");
await browser.close();
process.exit(0);
