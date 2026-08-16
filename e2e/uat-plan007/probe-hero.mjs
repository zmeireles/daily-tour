import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);
const APEX = "https://qual.stay.portugalodyssey.pt";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mint = () =>
  execFileSync("bash", [REPO + "/temp/uat-plan007/mint-token.sh"], { encoding: "utf8" }).trim();

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const imgResponses = [];
page.on("response", (r) => {
  if (/upload\.wikimedia\.org/.test(r.url()))
    imgResponses.push({ status: r.status(), url: r.url().slice(0, 90) });
});
page.on("requestfailed", (r) => {
  if (/upload\.wikimedia\.org/.test(r.url()))
    imgResponses.push({ FAILED: r.failure()?.errorText, url: r.url().slice(0, 90) });
});

const tok = mint();
await page.goto(APEX + "/", { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
await page.evaluate((t) => {
  history.pushState({}, "", `/r/${t}`);
  dispatchEvent(new PopStateEvent("popstate"));
}, tok);
await page.waitForFunction(() => location.pathname === "/", { timeout: 30000 }).catch(() => {});
await sleep(1500);

const id = "c0000001-0000-4000-a000-000000000002";
await page.evaluate((i) => {
  history.pushState({}, "", `/p/${i}`);
  dispatchEvent(new PopStateEvent("popstate"));
}, id);
const hero = page.locator("main img").first();
await hero.waitFor({ state: "visible", timeout: 30000 });
// Explicitly wait for the image to finish decoding.
await page
  .waitForFunction(
    () => {
      const img = document.querySelector("main img");
      return img && img.complete && img.naturalWidth > 0;
    },
    { timeout: 30000 },
  )
  .catch(() => console.log("WARN: hero never reached naturalWidth>0"));
await sleep(500);
const info = await hero.evaluate((img) => ({
  src: img.currentSrc || img.src,
  complete: img.complete,
  nw: img.naturalWidth,
  nh: img.naturalHeight,
}));
console.log("HERO:", JSON.stringify(info));
console.log("WIKIMEDIA RESPONSES:", JSON.stringify(imgResponses, null, 0));
await page.screenshot({ path: REPO + "/temp/uat-plan007/probe-hero.png" });
await browser.close();
