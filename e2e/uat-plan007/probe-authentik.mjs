import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);
import { readFileSync } from "node:fs";
const AKPW = readFileSync(REPO + "/temp/uat-plan007/.akpw", "utf8").trim();
const APEX = "https://qual.stay.portugalodyssey.pt";

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(APEX + "/admin", { waitUntil: "domcontentloaded" });
await page.waitForURL(/auth\./, { timeout: 30000 });
await sleep(2000);

// Stage 1: identification — list all inputs (pierces shadow roots).
const stage1Inputs = await page.locator("input").evaluateAll((els) =>
  els.map((e) => ({
    name: e.name,
    type: e.type,
    placeholder: e.placeholder,
    autocomplete: e.autocomplete,
    visible: !!(e.offsetWidth || e.offsetHeight),
  })),
);
console.log("STAGE1 inputs:", JSON.stringify(stage1Inputs));
const stage1Btns = await page
  .getByRole("button")
  .evaluateAll((els) => els.map((e) => e.innerText.trim()).filter(Boolean));
console.log("STAGE1 buttons:", JSON.stringify(stage1Btns));

// Fill username via the visible text input, submit.
const u = page.locator('input[name="uidField"]').first();
await u.fill("akadmin");
await page
  .getByRole("button", { name: /log in|continue/i })
  .first()
  .click();
await sleep(2500);

const stage2Inputs = await page.locator("input").evaluateAll((els) =>
  els.map((e) => ({
    name: e.name,
    type: e.type,
    placeholder: e.placeholder,
    autocomplete: e.autocomplete,
    visible: !!(e.offsetWidth || e.offsetHeight),
  })),
);
console.log("STAGE2 inputs:", JSON.stringify(stage2Inputs));
const stage2Btns = await page
  .getByRole("button")
  .evaluateAll((els) => els.map((e) => e.innerText.trim()).filter(Boolean));
console.log("STAGE2 buttons:", JSON.stringify(stage2Btns));

// Try filling the visible password field precisely.
const pw = page.locator('input[type="password"]:visible').first();
console.log("visible pw count:", await page.locator('input[type="password"]:visible').count());
await pw.fill(AKPW);
await sleep(300);
const filledLen = await pw.evaluate((e) => e.value.length);
console.log("password filled length:", filledLen);
await page.screenshot({ path: REPO + "/temp/uat-plan007/probe-pw-filled.png" });
// Submit
await page
  .getByRole("button", { name: /log in|continue|sign in/i })
  .first()
  .click();
await sleep(4000);
console.log("AFTER SUBMIT url:", page.url());
const body = (
  await page
    .locator("body")
    .innerText()
    .catch(() => "")
)
  .replace(/\s+/g, " ")
  .slice(0, 300);
console.log("AFTER SUBMIT body[0..300]:", body);
await page.screenshot({ path: REPO + "/temp/uat-plan007/probe-after-submit.png" });
await browser.close();
