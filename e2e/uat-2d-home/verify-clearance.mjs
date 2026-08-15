// Focused re-check: does the fixed BottomTabBar OCCLUDE content at the bottom?
// Correct method: scroll the real viewport to the document bottom, then compare
// the last interactive card's viewport-relative rect against the fixed nav's
// viewport-relative rect. Both in the SAME (viewport) coordinate space now.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);
const BASE = "http://127.0.0.1:5173";
const TOKEN = process.env.RTOKEN;
const CHROME = "/usr/bin/google-chrome-stable";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(`${BASE}/r/${TOKEN}`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => location.pathname === "/", { timeout: 30000 }).catch(() => {});
await page.locator('a[href="/chat"]').first().waitFor({ state: "visible", timeout: 20000 });

for (const theme of ["light", "dark"]) {
  await page.evaluate((t) => localStorage.setItem("theme", t), theme);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
  await sleep(800);
  // Scroll all the way down.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(600);
  const r = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Primary"]');
    const chat = document.querySelector('a[href="/chat"]');
    const nr = nav.getBoundingClientRect();
    const cr = chat.getBoundingClientRect();
    // Is the chat card's centre point covered by the nav? Use elementFromPoint.
    const cx = cr.left + cr.width / 2;
    const cy = cr.top + cr.height / 2;
    const topEl = document.elementFromPoint(cx, cy);
    const chatVisibleAtCentre = chat.contains(topEl) || topEl === chat;
    // Gap between chat card bottom and nav top (viewport coords). >=0 means clear.
    const gap = Math.round(nr.top - cr.bottom);
    return {
      navTop: Math.round(nr.top),
      navBottom: Math.round(nr.bottom),
      chatTop: Math.round(cr.top),
      chatBottom: Math.round(cr.bottom),
      viewportH: window.innerHeight,
      gapChatToNav: gap,
      chatFullyVisible: cr.bottom <= nr.top,
      chatCentreNotOccluded: chatVisibleAtCentre,
      mainPadBottom: getComputedStyle(document.querySelector("main")).paddingBottom,
      docScrollH: document.body.scrollHeight,
    };
  });
  await page.screenshot({
    path: `${REPO}/temp/uat-2d-home/${theme}-scrolled-bottom.png`,
    fullPage: false,
  });
  console.log(`[${theme}] ${JSON.stringify(r)}`);
  const verdict =
    r.chatFullyVisible && r.chatCentreNotOccluded
      ? "PASS — last card fully visible above the fixed nav"
      : "FAIL — last card occluded by nav";
  console.log(`[${theme}] ${verdict}`);
}
await browser.close();
