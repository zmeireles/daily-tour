// Single-scenario re-verification — LIVE Daily Tour "qual" deployment (real TLS).
// Plan-007 guest cold-entry FIX: cold doc-navigation to /r/<token> must now
// boot the SPA and log the guest into the authed app (previously 200'd raw JSON).
// REPORT-ONLY (exit 0): screenshots to temp/uat-plan007/. playwright-core + system Chrome.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);

const APEX = "https://qual.stay.portugalodyssey.pt";
const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const SHOTS = REPO + "/temp/uat-plan007/";
mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = {
  mobile: { width: 390, height: 844 }, // a guest clicks the host's link on their phone
  desktop: { width: 1440, height: 900 },
};

const results = [];
const errors = [];
let ctx, page;

function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}
async function shot(tag) {
  await page.screenshot({ path: `${SHOTS}${tag}.png`, fullPage: false }).catch(() => {});
  return `${SHOTS}${tag}.png`;
}
async function newPage(browser, viewport = VIEWPORTS.desktop) {
  if (ctx) await ctx.close();
  ctx = await browser.newContext({ viewport, ignoreHTTPSErrors: false });
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror[step ${results.length}]: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error")
      errors.push(`console[step ${results.length}]: ${m.text().slice(0, 250)}`);
  });
}
function mintToken() {
  return execFileSync("bash", [SHOTS + "mint-token.sh"], { encoding: "utf8" }).trim();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

// ============================================================================
// Scenario G — Guest cold-entry: cold doc-nav to /r/<token> boots SPA + logs in.
// Mobile viewport (the realistic device for a shared host link). The browser is
// the ONLY consumer of this single-use token: mint fresh, then page.goto() — a
// genuine document navigation, NOT a client-side history push and NOT preloading
// "/" first.
// ============================================================================
await newPage(browser, VIEWPORTS.mobile);
try {
  const tok = mintToken();

  // Network capture: the document /r/<token>, the redemption XHR /v1/r/<token>,
  // and the authed home's /v1/discover call (the ONLY data call the home fires;
  // it carries Authorization: Bearer <guest jwt> from the in-memory session store
  // — that header's presence proves the session was stored, since the Zustand
  // store is in-memory-only/non-persisted, never in localStorage).
  let docStatus = null;
  let docCt = null;
  let xhrStatus = null;
  let xhrCt = null;
  let xhrIsXhr = false;
  let discoverStatus = null;
  let discoverCt = null;
  let discoverBearerLen = 0;
  page.on("response", (resp) => {
    const u = resp.url();
    const rt = resp.request().resourceType();
    if (u === `${APEX}/r/${tok}` && rt === "document") {
      docStatus = resp.status();
      docCt = resp.headers()["content-type"] || null;
    }
    if (u === `${APEX}/v1/r/${tok}`) {
      xhrStatus = resp.status();
      xhrCt = resp.headers()["content-type"] || null;
      xhrIsXhr = rt === "xhr" || rt === "fetch";
    }
    if (/\/v1\/discover\b/.test(u)) {
      discoverStatus = resp.status();
      discoverCt = resp.headers()["content-type"] || null;
      const auth = resp.request().headers()["authorization"] || "";
      discoverBearerLen = auth.replace(/^Bearer\s+/i, "").length;
    }
  });

  // ── COLD document navigation straight to /r/<token>. ──────────────────────
  await page.goto(`${APEX}/r/${tok}`, { waitUntil: "domcontentloaded" });

  // (1) The SPA must boot — NOT a raw-JSON document. The doc body of a JSON
  //     response would be a bare {"jwt":...}; the SPA mounts a React #root.
  await sleep(800);
  const earlyText =
    (await page
      .locator("body")
      .innerText()
      .catch(() => "")) || "";
  const docLooksLikeJson =
    /^\s*\{\s*"jwt"\s*:/.test(earlyText) || (docCt || "").includes("application/json");
  const hasReactRoot = (await page.locator("#root").count()) > 0;
  await shot("G1-spa-boot");
  step(
    "G1 cold /r/<token> boots the SPA (not raw JSON)",
    hasReactRoot && !docLooksLikeJson,
    `doc_status=${docStatus} doc_content-type=${docCt} react_root=${hasReactRoot} json_doc=${docLooksLikeJson}`,
  );

  // (2) r.$token.tsx runs exchangeOpaqueToken (XHR /v1/r/<token> → {jwt}),
  //     stores the session, navigate('/', replace). Wait for the URL to settle
  //     back to "/" without the expired reason.
  await page
    .waitForFunction(
      () =>
        location.pathname === "/" &&
        new URLSearchParams(location.search).get("reason") !== "expired",
      { timeout: 30000 },
    )
    .catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  const landedPath = await page.evaluate(() => location.pathname);
  const landedReason = await page.evaluate(() =>
    new URLSearchParams(location.search).get("reason"),
  );

  // (3) The redemption XHR must have been a real 200 application/json hitting
  //     /v1/r/<token>. (Session storage is proven separately, in G4, by the
  //     authed home's /v1/discover request carrying the Bearer JWT — the store
  //     is in-memory-only, so a localStorage probe would be meaningless.)
  const xhrOk = xhrStatus === 200 && (xhrCt || "").includes("application/json") && xhrIsXhr;
  step(
    "G2 token redeemed via XHR /v1/r/<token> → 200 {jwt}",
    xhrOk,
    `xhr_status=${xhrStatus} xhr_content-type=${xhrCt} is_xhr=${xhrIsXhr}`,
  );

  // (4) Authed surface renders — the action grid. The authed home renders
  //     <a href="/a/{eat,drink,see,do,buy,move}"> + a /chat link; the PUBLIC
  //     landing renders NONE of those (it shows Hero / OwnerPitch / SamplePlaces).
  //     That link set is the authed-vs-public discriminator. A "link expired"
  //     toast / data-testid="expired-message" is the failure mode.
  let actionHrefs = [];
  let authedOk = false;
  try {
    // Wait for at least one action link to appear.
    await page.locator('a[href^="/a/"]').first().waitFor({ state: "visible", timeout: 20000 });
    actionHrefs = await page
      .locator('a[href^="/a/"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    const hasChat = (await page.locator('a[href="/chat"]').count()) > 0;
    authedOk = actionHrefs.length >= 6 && hasChat;
  } catch {
    authedOk = false;
  }
  const bodyText =
    (await page
      .locator("body")
      .innerText()
      .catch(() => "")) || "";
  const expiredVisible =
    (await page.locator('[data-testid="expired-message"]').count()) > 0 ||
    /link (has )?expired|ask your host/i.test(bodyText);
  const onPublicLanding =
    /Daily Tour for owners|owner|book(ing)? availab/i.test(bodyText) && !authedOk;

  await shot("G3-authed-home");
  step(
    "G3 lands in the authed home (action grid renders; not public/expired)",
    authedOk && !expiredVisible && landedPath === "/" && landedReason !== "expired",
    `path=${landedPath} reason=${landedReason} action_links=${actionHrefs.length} (${actionHrefs.join(",")}) expired_visible=${expiredVisible} on_public_landing=${onPublicLanding}`,
  );

  // (5) Authed data call: the authed home's HostsPicksSection fires
  //     GET /v1/discover?action=eat with Authorization: Bearer <guest jwt>.
  //     It only fires when the in-memory session JWT exists — so a 200 with a
  //     non-empty Bearer header simultaneously proves (a) the session was
  //     stored and (b) the guest JWT authorises a real data call (no 401).
  //     Give react-query a moment to fire it.
  await sleep(3000);
  const discoverOk =
    discoverStatus === 200 &&
    (discoverCt || "").includes("application/json") &&
    discoverBearerLen > 20;
  step(
    "G4 authed /v1/discover succeeds with guest Bearer JWT (no 401) → session stored",
    discoverOk,
    `discover_status=${discoverStatus} content-type=${discoverCt} bearer_jwt_len=${discoverBearerLen}`,
  );
} catch (e) {
  step("G guest cold-entry", false, String(e.message).slice(0, 200));
  await shot("G-fail");
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("\n— SUMMARY —");
const fails = results.filter((r) => !r.ok);
console.log(`${results.length - fails.length}/${results.length} steps passed`);
if (errors.length) console.log("\nJS ERRORS / CONSOLE:\n" + errors.join("\n"));
else console.log("\n(no JS errors / console errors captured)");
await browser.close();
process.exit(0);
