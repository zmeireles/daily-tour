// Triage part 4 — the thumb-tap grid AFTER consent is answered (part 3 phase 2
// crashed because a bottom-edge tap landed on the banner's own button, which
// dismissed the banner mid-grid — itself a finding).
// Read-only. Consent choice is localStorage in a throwaway context.
import { readdirSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const pnpmDir = resolve(repoRoot, "node_modules/.pnpm");
const pwPkg = readdirSync(pnpmDir).find((d) => d.startsWith("playwright-core@"));
const { chromium } = (
  await import(`file://${resolve(pnpmDir, pwPkg, "node_modules/playwright-core/index.js")}`)
).default;

const BASE = "https://qual.stay.portugalodyssey.pt";
const GUEST_TOKEN = process.env.RTOKEN;
const OUT = resolve(repoRoot, "temp/mobile-nav-triage");
mkdirSync(OUT, { recursive: true });
const LOG = resolve(OUT, "log4.txt");
writeFileSync(LOG, `# mobile-nav triage part 4 ${new Date().toISOString()}\n`);
const MOBILE = { width: 390, height: 844 };

function log(s) {
  console.log(s);
  appendFileSync(LOG, `${s}\n`);
}
const shot = (page, n) => page.screenshot({ path: resolve(OUT, `${n}.png`) }).catch(() => {});

const geom = (page) =>
  page.evaluate(() => {
    const card = document.querySelector("[data-place-id]");
    if (!card) {
      return {
        none: true,
        url: location.pathname,
        cards: document.querySelectorAll("[data-place-id]").length,
        roleBtns: document.querySelectorAll('[role="button"]').length,
        bodyText: document.body.innerText.slice(0, 200),
      };
    }
    const r = card.getBoundingClientRect();
    const hr = card.querySelector("h3")?.getBoundingClientRect();
    const her = card
      .querySelector("img, [data-testid='place-card-hero-placeholder']")
      ?.getBoundingClientRect();
    const cr = card.querySelector('[aria-label="Action chips"]')?.getBoundingClientRect();
    const banner = [...document.querySelectorAll("div")].find(
      (d) =>
        d.className &&
        String(d.className).includes("fixed bottom-0") &&
        String(d.className).includes("z-50"),
    );
    const box = (x) => (x ? { y: Math.round(x.y), h: Math.round(x.height) } : null);
    return {
      none: false,
      name: card.querySelector("h3")?.textContent ?? null,
      card: {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      },
      hero: box(her),
      title: box(hr),
      chips: box(cr),
      banner: banner ? box(banner.getBoundingClientRect()) : null,
    };
  });

async function tapAt(page, x, y) {
  await page.evaluate(() => {
    window.__hit = null;
    document.addEventListener(
      "pointerdown",
      (e) => {
        const t = e.target;
        window.__hit = `${t.tagName}${t.closest?.("[data-place-id]") ? " [in-card]" : " [outside-card]"}`;
      },
      { capture: true, once: true },
    );
  });
  await page.touchscreen.tap(x, y);
  await page.waitForURL(/\/p\//, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(600);
  return {
    navigated: /\/p\//.test(page.url()),
    hit: await page.evaluate(() => window.__hit).catch(() => null),
  };
}

const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome-stable" });
const rows = [];
try {
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
  // Census of "Recusar" buttons on HOME — part 4 first tried to dismiss consent
  // here and Playwright reported the banner's own text column intercepting the
  // click, which implies a second, buried Recusar underneath the banner.
  const homeDecline = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")].filter((b) =>
      /recusar|decline/i.test(b.textContent || ""),
    );
    return btns.map((b) => {
      const r = b.getBoundingClientRect();
      const inBanner = !!b.closest("div.fixed.bottom-0");
      const top = document.elementFromPoint(
        Math.round(r.left + r.width / 2),
        Math.round(r.top + r.height / 2),
      );
      return {
        inBanner,
        box: {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        },
        reachable: top ? b.contains(top) || b === top : false,
        topAtCentre: top ? `${top.tagName}.${(top.className || "").toString().slice(0, 30)}` : null,
      };
    });
  });
  log(`HOME "Recusar" buttons: ${JSON.stringify(homeDecline)}`);
  await shot(page, "B2-home-consent");

  await page.locator('a[href*="/a/eat"]').first().click();
  await page.waitForURL(/\/a\/eat/, { timeout: 20000 });
  await page.waitForTimeout(3500);
  // Answer consent scoped to the banner itself, so the grid runs on a clean sheet.
  await page
    .locator("div.fixed.bottom-0")
    .getByRole("button", { name: /recusar|decline/i })
    .first()
    .click({ timeout: 10000 });
  await page.waitForTimeout(1200);

  const g = await geom(page);
  if (g.none) {
    await shot(page, "B2-NO-CARD");
    log(`no card: ${JSON.stringify(g)}`);
  } else {
    log(
      `banner-dismissed — card ${JSON.stringify(g.card)} hero=${JSON.stringify(g.hero)} title=${JSON.stringify(g.title)} chips=${JSON.stringify(g.chips)} banner=${g.banner ? JSON.stringify(g.banner) : "GONE"}`,
    );
    await shot(page, "B2-banner-dismissed-start");
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
      const { navigated, hit } = await tapAt(page, x, y);
      rows.push({ label, x, y, navigated, hit });
      log(
        `   tap ${label.padEnd(17)} (${x},${y}) → ${navigated ? "NAV /p/" : "no-nav"} hit=${hit}`,
      );
      if (navigated) {
        await page.goBack();
        await page.waitForURL(/\/a\/eat/, { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2500);
        if (!(await page.locator("[data-place-id]").count())) {
          log("   ! lost the card list after goBack — stopping grid");
          break;
        }
      }
    }
  }
  await ctx.close();
} finally {
  await browser.close();
}
log(
  `\n${rows.filter((r) => r.navigated).length}/${rows.length} tap points navigated (banner dismissed): ` +
    rows.map((r) => `${r.label}:${r.navigated ? "NAV" : "✗"}`).join(" "),
);
writeFileSync(resolve(OUT, "tap-grid-dismissed.json"), JSON.stringify(rows, null, 2));
