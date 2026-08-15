import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);
const BASE = "http://127.0.0.1:5173",
  TOKEN = process.env.RTOKEN;
const PLAN = "53883916-78fe-46b8-8284-33eaead916fe";
const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const OUT = REPO + "/temp/uat-backlink/";
require("node:fs").mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
for (const theme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
  await page.goto(`${BASE}/r/${TOKEN}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.goto(`${BASE}/tour/${PLAN}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => {
    const back = [...document.querySelectorAll("a")].find(
      (a) =>
        a.getAttribute("href") === "/" &&
        a.querySelector("svg") &&
        /voltar|back|início/i.test(a.textContent || ""),
    );
    return {
      path: location.pathname,
      theme: document.documentElement.getAttribute("data-theme"),
      backText: back?.textContent?.trim() ?? null,
      hasIcon: !!back?.querySelector("svg"),
      underline: back ? getComputedStyle(back).textDecorationLine : null,
    };
  });
  console.log(`[${theme}]`, JSON.stringify(info));
  await page.screenshot({ path: `${OUT}tour-${theme}.png`, fullPage: true }).catch(() => {});
  await ctx.close();
}
await browser.close();
