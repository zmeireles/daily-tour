// Targeted re-verify of D1: theme now applies on /p/:id after adding
// useThemeAuto() to the route. Reads <html data-theme> + body bg in dark vs
// light and screenshots both. Exit 0 always; read-only.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);
const BASE = "http://127.0.0.1:5173";
const TOKEN = process.env.RTOKEN;
const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const SHOTS = REPO + "/temp/uat-2d-place-detail/";
const LAGOA = "c0000001-0000-4000-a000-000000000002";
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

// Redeem -> home
await page.goto(`${BASE}/r/${TOKEN}`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

async function probe(theme) {
  await page.evaluate((t) => localStorage.setItem("theme", t), theme);
  await page.goto(`${BASE}/p/${LAGOA}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const dataTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.screenshot({ path: `${SHOTS}${theme}-lagoa-fixed.png` }).catch(() => {});
  return { theme, dataTheme, bodyBg };
}

const dark = await probe("dark");
const light = await probe("light");
console.log("DARK :", JSON.stringify(dark));
console.log("LIGHT:", JSON.stringify(light));
console.log(
  "RESULT:",
  dark.dataTheme === "dark" && light.dataTheme === "light" && dark.bodyBg !== light.bodyBg
    ? "PASS — theme now applies on /p/:id, dark != light"
    : "FAIL — theme still not applied correctly",
);
await browser.close();
