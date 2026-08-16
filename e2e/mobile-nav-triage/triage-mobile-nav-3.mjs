// Triage part 3 — settle two claims independently:
//  (A) Does a genuine a[href*="/p/"] exist on /a/eat at 390×844 (peek AND
//      expanded)? Census every anchor on the page.
//  (B) Thumb-tap grid: touchscreen.tap() at points spread over the VISIBLE card
//      surface (hero top / hero centre / card centre / title / chips / bottom),
//      with the consent banner UP (first-visit state) and DISMISSED.
//      Records which points navigate — i.e. what a real thumb actually gets.
// Read-only. No writes, no created records.
import { readdirSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const pnpmDir = resolve(repoRoot, "node_modules/.pnpm");
const pwPkg = readdirSync(pnpmDir).find((d) => d.startsWith("playwright-core@"));
const { chromium } = (
  await import(`file://${resolve(pnpmDir, pwPkg, "node_modules/playwright-core/index.js")}`)
).default;

const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const BASE = process.env.BASE_URL ?? "https://qual.stay.portugalodyssey.pt";
const GUEST_TOKEN = process.env.RTOKEN;
const OUT = resolve(repoRoot, "temp/mobile-nav-triage");
mkdirSync(OUT, { recursive: true });
const LOG = resolve(OUT, "log3.txt");
writeFileSync(LOG, `# mobile-nav triage part 3 ${new Date().toISOString()}\n`);
const MOBILE = { width: 390, height: 844 };

function log(s) {
  console.log(s);
  appendFileSync(LOG, `${s}\n`);
}
const shot = (page, n) => page.screenshot({ path: resolve(OUT, `${n}.png`) }).catch(() => {});

async function guestOnEat(browser) {
  const ctx = await browser.newContext({
    viewport: MOBILE,
    locale: "pt-PT",
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  for (let i = 0; i < 3; i++) {
    await page
      .goto(`${BASE}/r/${GUEST_TOKEN}`, { waitUntil: "domcontentloaded", timeout: 45000 })
      .catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);
    if (!/\/r\/|reason=expired/.test(page.url())) break;
  }
  await page.locator('a[href*="/a/eat"]').first().click();
  await page.waitForURL(/\/a\/eat/, { timeout: 20000 });
  await page.waitForTimeout(3500);
  return { ctx, page };
}

// Every anchor on the page + how place cards are actually wired.
const anchorCensus = (page) =>
  page.evaluate(() => {
    const anchors = [...document.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    const card =
      document.querySelector("[data-place-id]") ??
      document.querySelector('[role="button"]:has(h3)');
    return {
      placeAnchors: document.querySelectorAll('a[href*="/p/"]').length,
      allAnchors: anchors,
      anchorsInsideCards: [
        ...document.querySelectorAll("[data-place-id] a, [role='button'] a"),
      ].map((a) => a.getAttribute("href")),
      cardTag: card?.tagName ?? null,
      cardHasAnchorAncestor: card ? !!card.closest("a") : null,
      pressableRole:
        card?.querySelector('[role="button"]')?.getAttribute("role") ??
        card?.getAttribute("role") ??
        null,
    };
  });

// Geometry of the first card + the consent banner.
const geom = (page) =>
  page.evaluate(() => {
    const card =
      document.querySelector("[data-place-id]") ??
      document.querySelector('[role="button"]:has(h3)');
    if (!card) return null;
    const r = card.getBoundingClientRect();
    const h3 = card.querySelector("h3");
    const hr = h3?.getBoundingClientRect();
    const hero = card.querySelector("img, [data-testid='place-card-hero-placeholder']");
    const her = hero?.getBoundingClientRect();
    const chips = card.querySelector('[aria-label="Action chips"]');
    const cr = chips?.getBoundingClientRect();
    const banner = [...document.querySelectorAll("div")].find(
      (d) =>
        d.className &&
        String(d.className).includes("fixed bottom-0") &&
        String(d.className).includes("z-50"),
    );
    const br = banner?.getBoundingClientRect();
    const box = (x) => (x ? { y: Math.round(x.y), h: Math.round(x.height) } : null);
    return {
      name: h3?.textContent ?? null,
      card: {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      },
      hero: box(her),
      title: box(hr),
      chips: box(cr),
      banner: br ? box(br) : null,
      vpH: innerHeight,
    };
  });

// Tap one absolute point; report whether the SPA navigated, and what was hit.
async function tapAt(page, x, y) {
  await page.evaluate(() => {
    window.__hit = null;
    document.addEventListener(
      "pointerdown",
      (e) => {
        const t = e.target;
        window.__hit = `${t.tagName}${t.closest?.("[data-place-id]") || t.closest?.("[role='button']") ? " [in-card]" : " [outside-card]"}`;
      },
      { capture: true, once: true },
    );
  });
  await page.touchscreen.tap(x, y);
  await page.waitForURL(/\/p\//, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(600);
  const hit = await page.evaluate(() => window.__hit).catch(() => null);
  const navigated = /\/p\//.test(page.url());
  return { navigated, hit };
}

// Back to /a/eat without a reload (in-memory guest session must survive).
async function backToEat(page) {
  await page.goBack();
  await page.waitForURL(/\/a\/eat/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);
  return (
    /\/a\/eat/.test(page.url()) &&
    (await page.locator("[data-place-id], [role='button']:has(h3)").count()) > 0
  );
}

const browser = await chromium.launch({ executablePath: CHROME });
const rows = [];
try {
  const { ctx, page } = await guestOnEat(browser);

  // ── (A) anchor census, peek then expanded ────────────────────────────────
  const peekCensus = await anchorCensus(page);
  log(
    `A1 peek   — place anchors a[href*="/p/"] = ${peekCensus.placeAnchors}; anchors inside cards = ${JSON.stringify(peekCensus.anchorsInsideCards)}`,
  );
  log(`A1 peek   — all <a> hrefs on page: ${JSON.stringify(peekCensus.allAnchors)}`);
  log(
    `A1 peek   — card=${peekCensus.cardTag} anchorAncestor=${peekCensus.cardHasAnchorAncestor} pressableRole=${peekCensus.pressableRole}`,
  );

  await page
    .locator("button.cursor-grab")
    .first()
    .click()
    .catch(() => {});
  await page.waitForTimeout(1500);
  const expCensus = await anchorCensus(page);
  log(
    `A2 expand — place anchors a[href*="/p/"] = ${expCensus.placeAnchors}; all <a> hrefs: ${JSON.stringify(expCensus.allAnchors)}`,
  );
  await shot(page, "A2-expanded-census");
  await page
    .locator("button.cursor-grab")
    .first()
    .click()
    .catch(() => {}); // back to peek
  await page.waitForTimeout(1200);

  // ── (B) thumb-tap grid, banner UP ────────────────────────────────────────
  for (const phase of ["banner-up", "banner-dismissed"]) {
    if (phase === "banner-dismissed") {
      await page
        .getByRole("button", { name: /recusar|decline/i })
        .first()
        .click({ timeout: 8000 })
        .catch(() => {});
      await page.waitForTimeout(1000);
    }
    const g = await geom(page);
    log(
      `\n── ${phase} — card box ${JSON.stringify(g.card)} hero=${JSON.stringify(g.hero)} title=${JSON.stringify(g.title)} chips=${JSON.stringify(g.chips)} banner=${JSON.stringify(g.banner)} vpH=${g.vpH}`,
    );
    await shot(page, `B-${phase}-start`);
    const cx = g.card.x + Math.round(g.card.w / 2);
    const points = [
      ["hero-top", cx, g.hero.y + 25],
      ["hero-centre", cx, g.hero.y + Math.round(g.hero.h / 2)],
      ["card-centre", cx, g.card.y + Math.round(g.card.h / 2)],
      ["title-text", cx, g.title.y + Math.round(g.title.h / 2)],
      ["chips-row", cx, g.chips ? g.chips.y + Math.round(g.chips.h / 2) : g.card.y + g.card.h - 30],
      ["card-bottom-edge", cx, g.card.y + g.card.h - 8],
    ];
    for (const [label, x, y] of points) {
      const covered = g.banner ? y >= g.banner.y : false;
      const { navigated, hit } = await tapAt(page, x, y);
      rows.push({ phase, label, x, y, covered, navigated, hit });
      log(
        `   tap ${label.padEnd(17)} (${x},${y})${covered ? " [under banner]" : "              "} → ${navigated ? "NAV /p/" : "no-nav"} hit=${hit}`,
      );
      if (navigated) {
        const back = await backToEat(page);
        if (!back) {
          log("   ! could not return to /a/eat with a live session — aborting grid");
          break;
        }
        if (phase === "banner-dismissed") {
          // consent choice persists in the same context; nothing to redo
        }
      }
    }
  }
  await ctx.close();
} finally {
  await browser.close();
}

log("\n──────── TAP GRID SUMMARY ────────");
for (const phase of ["banner-up", "banner-dismissed"]) {
  const r = rows.filter((x) => x.phase === phase);
  log(
    `${phase}: ${r.filter((x) => x.navigated).length}/${r.length} tap points navigated — ` +
      r.map((x) => `${x.label}:${x.navigated ? "NAV" : "✗"}`).join(" "),
  );
}
writeFileSync(resolve(OUT, "tap-grid.json"), JSON.stringify(rows, null, 2));
