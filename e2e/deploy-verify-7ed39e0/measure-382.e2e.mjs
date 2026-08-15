// #382 baseline measurement — read-only. Guest home + /a/eat control at
// 390x844, for en + pt-PT, plus public landing "/" logged-out for en + pt-PT.
// Reports scrollWidth/clientWidth + language-switcher group/button rects.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);

const BASE = "https://qual.stay.portugalodyssey.pt";
const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const SHOTS = REPO + "/temp/deploy-verify-7ed39e0/";
mkdirSync(SHOTS, { recursive: true });
const MOBILE = { width: 390, height: 844 };

const TOKENS = {
  en: "TTaCg0uuKtF-W-shdu-WtFPxicxoEoL6",
  "pt-PT": "Ue5QByQCPBZqgLXl8vjbfiZSA5HEP2lE",
};
const AL = { en: "en-US", "pt-PT": "pt-PT" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { guestHome: {}, aEat: {}, publicLanding: {} };

async function measureSwitcher(page, groupLabel) {
  return page.evaluate((label) => {
    const group = document.querySelector(`[role="group"][aria-label="${label}"]`);
    if (!group) return { found: false };
    const g = group.getBoundingClientRect();
    const buttons = [...group.querySelectorAll("button")].map((b) => {
      const r = b.getBoundingClientRect();
      return {
        text: b.textContent.trim(),
        left: r.left,
        right: r.right,
        width: r.width,
        top: r.top,
        bottom: r.bottom,
      };
    });
    return {
      found: true,
      group: { left: g.left, right: g.right, width: g.width, top: g.top, bottom: g.bottom },
      buttons,
    };
  }, groupLabel);
}
async function measureWidths(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

// ── guest home + /a/eat control, per locale ────────────────────────────────
for (const locale of ["en", "pt-PT"]) {
  const ctx = await browser.newContext({
    viewport: MOBILE,
    locale,
    extraHTTPHeaders: { "Accept-Language": AL[locale] },
  });
  const page = await ctx.newPage();
  const token = TOKENS[locale];
  await page.goto(`${BASE}/r/${token}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const landed = await page
    .waitForFunction(
      () =>
        location.pathname === "/" &&
        new URLSearchParams(location.search).get("reason") !== "expired",
      { timeout: 30000 },
    )
    .then(() => true)
    .catch(() => false);
  console.log(`[${locale}] redeem landed=${landed} url=${page.url()}`);
  await page
    .locator('a[href^="/a/"]')
    .first()
    .waitFor({ state: "visible", timeout: 20000 })
    .catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await sleep(1200);

  const widths = await measureWidths(page);
  const switcher = await measureSwitcher(page, "Language switcher");
  out.guestHome[locale] = {
    landed,
    widths,
    switcher,
    i18nextLng: await page.evaluate(() => localStorage.getItem("i18nextLng")),
  };
  console.log(`[guestHome ${locale}] widths=${JSON.stringify(widths)}`);
  console.log(`[guestHome ${locale}] switcher=${JSON.stringify(switcher)}`);
  await page
    .screenshot({ path: `${SHOTS}s382-guest-home-${locale}.png`, fullPage: true })
    .catch(() => {});

  // control: /a/eat, same session/context
  await page
    .goto(`${BASE}/a/eat`, { waitUntil: "networkidle", timeout: 30000 })
    .catch((e) => console.log(`/a/eat goto err: ${e.message}`));
  await sleep(1000);
  const eatWidths = await measureWidths(page);
  out.aEat[locale] = eatWidths;
  console.log(`[/a/eat ${locale}] widths=${JSON.stringify(eatWidths)} (control — expect 390=390)`);
  await page
    .screenshot({ path: `${SHOTS}s382-a-eat-${locale}.png`, fullPage: true })
    .catch(() => {});

  await ctx.close();
}

// ── public landing "/" logged out, per locale ──────────────────────────────
for (const locale of ["en", "pt-PT"]) {
  const ctx = await browser.newContext({
    viewport: MOBILE,
    locale,
    extraHTTPHeaders: { "Accept-Language": AL[locale] },
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
  await sleep(1000);
  const widths = await measureWidths(page);
  const switcher = await measureSwitcher(page, "Language");
  out.publicLanding[locale] = {
    widths,
    switcher,
    i18nextLng: await page.evaluate(() => localStorage.getItem("i18nextLng")),
  };
  console.log(`[publicLanding ${locale}] widths=${JSON.stringify(widths)}`);
  console.log(`[publicLanding ${locale}] switcher=${JSON.stringify(switcher)}`);
  await page
    .screenshot({ path: `${SHOTS}s382-public-landing-${locale}.png`, fullPage: true })
    .catch(() => {});
  await ctx.close();
}

writeFileSync(`${SHOTS}s382-measurements.json`, JSON.stringify(out, null, 2));
console.log("\n— DONE — full JSON at s382-measurements.json —");
await browser.close();
process.exit(0);
