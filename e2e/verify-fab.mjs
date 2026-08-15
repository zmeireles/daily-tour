// Targeted re-verify: the locate-me FAB is no longer occluded by the peek sheet.
// Navigates /a/see, finds the FAB, hit-tests its center → must resolve to the
// FAB (or its child), not a sheet card. Exit 0 always; read-only.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);
const BASE = "http://127.0.0.1:5173";
const TOKEN = process.env.RTOKEN;
const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/r/${TOKEN}`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.goto(`${BASE}/a/see`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500); // map + sheet settle

const result = await page.evaluate(() => {
  const fab = document.querySelector(
    'button[aria-label*="localiza" i], button[aria-label*="locate" i]',
  );
  if (!fab) return { found: false };
  const r = fab.getBoundingClientRect();
  const cx = Math.round(r.left + r.width / 2);
  const cy = Math.round(r.top + r.height / 2);
  const hit = document.elementFromPoint(cx, cy);
  // Is the element at the FAB center the FAB itself or inside it?
  const reachable =
    hit === fab ||
    fab.contains(hit) ||
    (hit &&
      hit.closest('button[aria-label*="localiza" i], button[aria-label*="locate" i]') === fab);
  return {
    found: true,
    fabRect: { top: Math.round(r.top), bottom: Math.round(r.bottom), cx, cy },
    hitTag: hit?.tagName,
    hitAria:
      hit?.getAttribute?.("aria-label") ||
      hit?.closest?.("[data-place-id]")?.getAttribute?.("data-place-id") ||
      null,
    reachable,
  };
});
console.log(JSON.stringify(result, null, 2));
console.log(
  "RESULT:",
  result.reachable
    ? "PASS — FAB is hit-testable (not behind the sheet)"
    : "FAIL — FAB still occluded",
);
await browser.close();
