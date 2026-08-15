import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);
const BASE = "http://127.0.0.1:5173";
const TOKEN = process.env.RTOKEN;
const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/r/${TOKEN}`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => location.pathname === "/", { timeout: 30000 }).catch(() => {});
await page.locator('a[href^="/a/"]').first().waitFor({ state: "visible", timeout: 20000 });

const data = await page.evaluate(async () => {
  const jwt =
    JSON.parse(localStorage.getItem("dt-session") || "{}")?.state?.jwt ||
    JSON.parse(sessionStorage.getItem("dt-session") || "{}")?.state?.jwt;
  // Try discover for hosts-picks (action=eat) and the see list.
  const out = {};
  for (const action of ["eat", "see"]) {
    const r = await fetch(`/v1/discover?action=${action}`, {
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
    });
    out[action] = { status: r.status };
    if (r.ok) {
      const j = await r.json();
      const flat = (j.groups || []).flatMap((g) => g.places || g.items || []);
      out[action].sample = flat.slice(0, 3).map((p) => ({
        name: typeof p.name === "object" ? p.name.en || p.name["pt-PT"] : p.name,
        distance_km: p.distance_km,
        is_hosts_pick: p.is_hosts_pick,
        hero: !!p.hero_image_url,
        wishes: p.wishes,
      }));
      out[action].hostsPicksWithDistance = flat
        .filter((p) => p.is_hosts_pick)
        .map((p) => p.distance_km);
    }
  }
  // Also expose how the session is stored.
  out.storageKeys = Object.keys(localStorage);
  return out;
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
