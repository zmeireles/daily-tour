// #382 baseline, v2 — corrects a methodology gap found in v1: guest-home
// locale is NOT purely browser-negotiated. r.$token.tsx applies the
// reservation's stored `claims.locale` via i18n.changeLanguage() on redeem,
// which overrides browser Accept-Language/locale for the guest session. Both
// v1 tokens came from the SAME "furthest-checkout" reservation (deterministic
// pick in mint-guest-token.sh), so both landed on pt-PT regardless of the
// context's browser locale — a false negative on the "en" row, not a bug.
//
// Fix: redeem ONCE, then use the in-page switcher (a direct
// i18n.changeLanguage(locale) call, independent of the JWT-locale bootstrap
// check) to drive both EN and PT-PT states from the same authenticated
// session. Read-only; the switcher click is a same-page state change only.
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
const TOKEN = process.env.RTOKEN; // team-lead-provided, spare
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { guestHome: {}, aEat: {} };

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
const ctx = await browser.newContext({ viewport: MOBILE });
const page = await ctx.newPage();

await page.goto(`${BASE}/r/${TOKEN}`, { waitUntil: "domcontentloaded", timeout: 30000 });
const landed = await page
  .waitForFunction(
    () =>
      location.pathname === "/" && new URLSearchParams(location.search).get("reason") !== "expired",
    { timeout: 30000 },
  )
  .then(() => true)
  .catch(() => false);
console.log(`redeem landed=${landed} url=${page.url()}`);
await page
  .locator('a[href^="/a/"]')
  .first()
  .waitFor({ state: "visible", timeout: 20000 })
  .catch(() => {});
await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
await sleep(1200);
console.log(
  "reservation-default i18nextLng=",
  await page.evaluate(() => localStorage.getItem("i18nextLng")),
);

for (const [label, locale] of [
  ["English", "en"],
  ["Português", "pt-PT"],
]) {
  const btn = page.getByRole("button", { name: label }).first();
  if ((await btn.count()) > 0) {
    await btn.click();
    await sleep(600);
  } else {
    console.log(`! switcher button "${label}" not found`);
  }
  const active = await page.evaluate(() => localStorage.getItem("i18nextLng"));
  const widths = await measureWidths(page);
  const switcher = await measureSwitcher(page, "Language switcher");
  out.guestHome[locale] = { active, widths, switcher };
  console.log(`[guestHome ${locale}] active=${active} widths=${JSON.stringify(widths)}`);
  console.log(`[guestHome ${locale}] switcher=${JSON.stringify(switcher)}`);
  await page
    .screenshot({ path: `${SHOTS}s382-v2-guest-home-${locale}.png`, fullPage: true })
    .catch(() => {});

  await page
    .goto(`${BASE}/a/eat`, { waitUntil: "networkidle", timeout: 30000 })
    .catch((e) => console.log(`/a/eat goto err: ${e.message}`));
  await sleep(1000);
  const eatWidths = await measureWidths(page);
  out.aEat[locale] = eatWidths;
  console.log(`[/a/eat ${locale}] widths=${JSON.stringify(eatWidths)} (control — expect 390=390)`);
  await page.screenshot({ path: `${SHOTS}s382-v2-a-eat-${locale}.png` }).catch(() => {});

  // back to home for the next locale's switcher click
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
  await sleep(800);
}

writeFileSync(`${SHOTS}s382-v2-measurements.json`, JSON.stringify(out, null, 2));
console.log("\n— DONE — full JSON at s382-v2-measurements.json —");
await ctx.close();
await browser.close();
process.exit(0);
