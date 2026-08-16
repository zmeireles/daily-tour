// Re-capture desktop Home after the host's-picks data fix. Verify "Escolhas do
// anfitrião" now shows photographed landmarks (real Commons heroes), not the
// green map-pin fallback. CAPTURE-ONLY (exit 0), LIGHT theme, desktop 1440.
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
    note(`  redeem attempt ${attempt} failed, retrying`);
    await sleep(1500);
  }
  return false;
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
ctx = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 2 });
page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(`pageerror[${log.length}] ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console[${log.length}] ${m.text().slice(0, 220)}`);
});

if (!(await enterAsGuest())) {
  note("!! could not redeem");
  await browser.close();
  process.exit(0);
}
// Force LIGHT theme (reload drops in-memory session → re-redeem; theme persists).
await page.evaluate(() => localStorage.setItem("theme", "light"));
await page.reload({ waitUntil: "domcontentloaded" });
await enterAsGuest();
note(
  `  theme -> data-theme=${await page.evaluate(() => document.documentElement.getAttribute("data-theme"))}`,
);

// Wait for the picks section + its hero images to load.
await page
  .getByText(/Escolhas do anfitrião/i)
  .first()
  .waitFor({ state: "visible", timeout: 15000 })
  .catch(() => {});
await page
  .locator('a[href^="/p/"] img')
  .first()
  .waitFor({ state: "visible", timeout: 15000 })
  .catch(() => {});
await sleep(2500); // let all hero images decode

// Probe the host's-picks cards: each /p/ card → real <img> hero vs branded
// fallback (data-testid="place-card-hero-placeholder"), + the readable name.
const probe = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('a[href^="/p/"]')];
  return cards.map((a) => {
    const img = a.querySelector("img");
    const placeholder = a.querySelector('[data-testid="place-card-hero-placeholder"]');
    const name = a.querySelector("h3, h2, .font-display") || a;
    return {
      href: a.getAttribute("href"),
      name: (name.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60),
      realHero: img ? img.complete && img.naturalWidth > 0 : false,
      heroSrc: (img?.currentSrc || img?.src || "").slice(0, 110),
      brandedFallback: !!placeholder,
    };
  });
});
note(`  picks (${probe.length}): ${JSON.stringify(probe, null, 0)}`);
const photographed = probe.filter((p) => p.realHero && !p.brandedFallback).length;
const fallbacks = probe.filter((p) => p.brandedFallback).length;
note(`  SUMMARY: photographed=${photographed} fallback=${fallbacks} total=${probe.length}`);

note(`  captured: ${await shot("home-desktop-PICKS-1440")}`);

console.log("\n— CAPTURE LOG —");
console.log(log.join("\n"));
if (errors.length) console.log("\nJS ERRORS / CONSOLE:\n" + [...new Set(errors)].join("\n"));
else console.log("\n(no JS errors / console errors captured)");
await browser.close();
process.exit(0);
