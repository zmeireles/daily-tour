// Deep UAT — LIVE Daily Tour "qual" deployment (real TLS). Plan-007.
// REPORT-ONLY (exit 0): collects every finding; screenshots to temp/uat-plan007/.
// Uses playwright-core from the repo pnpm store + system Chrome.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { isSameOrigin } from "../lib/same-origin.mjs";

const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);

const APEX = "https://qual.stay.portugalodyssey.pt";
const AUTH = "https://auth.qual.stay.portugalodyssey.pt";
const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const SHOTS = REPO + "/temp/uat-plan007/";
mkdirSync(SHOTS, { recursive: true });

const AKPW = readFileSync(SHOTS + ".akpw", "utf8").trim();

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
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
// Scenario A — Owner login + backoffice access (PRIMARY)
// ============================================================================
await newPage(browser, VIEWPORTS.desktop);
try {
  // 1. Navigate to /admin → expect redirect to Authentik.
  await page.goto(APEX + "/admin", { waitUntil: "domcontentloaded" });
  // SPA boots then signinRedirect() pushes to Authentik. Wait for the host switch.
  await page.waitForURL(/auth\.qual\.stay\.portugalodyssey\.pt/, { timeout: 30000 });
  const onAuth = isSameOrigin(page.url(), AUTH);
  step("A1 /admin redirects to Authentik login", onAuth, page.url().split("?")[0]);
  await shot("A1-authentik-login");

  // 2. Log in as akadmin / <password>.
  // Authentik stage 1 (identification): visible uidField; a hidden password
  // input also exists in the DOM, so target inputs precisely / by visibility.
  const userField = page.locator('input[name="uidField"]').first();
  await userField.waitFor({ state: "visible", timeout: 20000 });
  await userField.fill("akadmin");
  await page
    .getByRole("button", { name: /^log in$/i })
    .first()
    .click();

  // Stage 2 (password): the web component re-renders, so let it settle, then
  // fill the VISIBLE password input and VERIFY the value landed before
  // submitting (the re-render can otherwise drop a too-early fill → empty submit).
  const pwField = page.locator('input[type="password"]:visible').first();
  await pwField.waitFor({ state: "visible", timeout: 20000 });
  await sleep(1200);
  await pwField.click();
  await pwField.fill(AKPW);
  await sleep(300);
  let filledLen = await pwField.evaluate((e) => e.value.length).catch(() => 0);
  if (filledLen === 0) {
    // retry once
    await pwField.fill(AKPW);
    await sleep(400);
    filledLen = await pwField.evaluate((e) => e.value.length).catch(() => 0);
  }
  await shot("A2-password-stage");
  // Stage-2 submit is labelled "Continue".
  await page
    .getByRole("button", { name: /continue|log in|sign in/i })
    .first()
    .click();

  // 3. Expect callback to /admin/callback then backoffice (NOT 403/forbidden).
  // The Authentik redirect doc-navigates to /admin/callback; the callback route
  // then CLIENT-side replaces to /admin (no doc load event), so poll the host
  // switch back to the apex rather than waiting for a navigation 'load'.
  await page.waitForFunction(
    () => location.host.endsWith("portugalodyssey.pt") && location.pathname.startsWith("/admin"),
    { timeout: 40000 },
  );
  // Let oidc-client finish the callback + the BFF authorize + nav to /admin.
  await sleep(2500);
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  const url3 = page.url();
  const bodyText =
    (await page
      .locator("body")
      .innerText()
      .catch(() => "")) || "";
  const forbidden = /403|forbidden|not authoriz|unauthor/i.test(bodyText);
  step(
    "A3 callback lands in backoffice (no 403/forbidden)",
    url3.includes("/admin") && !forbidden,
    url3.split("?")[0],
  );
  await shot("A3-after-callback");

  // 4. Navigate to /admin/places → list of real Azores places renders.
  await page.goto(APEX + "/admin/places", { waitUntil: "domcontentloaded" });
  // Wait for the places table to populate (BFF /v1/places authorised by groups claim).
  const table = page.locator("table");
  await table.waitFor({ state: "visible", timeout: 30000 });
  const rowCount = await page.locator("table tbody tr").count();
  // Grab a few visible place names for evidence.
  const names = await page
    .locator("table tbody tr td:first-child")
    .allInnerTexts()
    .catch(() => []);
  const sampleNames = names
    .slice(0, 5)
    .map((n) => n.trim())
    .filter(Boolean);
  step(
    "A4 /admin/places lists real Azores places",
    rowCount > 0,
    `${rowCount} rows; e.g. ${sampleNames.join(", ").slice(0, 120)}`,
  );
  await shot("A4-places-list");

  // 5. Reversible edit: Hide one place → "Hidden" badge → Show to revert.
  // Pick the FIRST place that is currently NOT hidden (its visibility cell has a Hide button).
  let toggleDetail = "";
  let toggleOk = false;
  try {
    const hideBtns = page.getByRole("button", { name: /Toggle guest visibility for/i });
    const btnCount = await hideBtns.count();
    if (btnCount === 0) {
      // No visibility toggle rendered — the "Guests" column shows "—". This
      // happens when no guesthouse is loaded for the owner (catalog.guesthouse
      // empty on qual → useGuesthouses() empty → gh undefined → VisibilityToggle
      // renders a dash, never a Hide/Show button). Data gap, not a UI defect.
      const dashCells = await page.locator("table tbody tr td:nth-child(4)").allInnerTexts();
      throw new Error(
        `no visibility toggle button rendered (Guests column all "—"; sample=${JSON.stringify(dashCells.slice(0, 3))}) — likely empty catalog.guesthouse seed`,
      );
    }
    const targetBtn = hideBtns.first();
    await targetBtn.waitFor({ state: "visible", timeout: 10000 });
    const targetRow = targetBtn.locator("xpath=ancestor::tr");
    const placeName = (await targetRow.locator("td:first-child").innerText()).trim();
    const labelBefore = (await targetBtn.innerText()).trim(); // "Hide" or "Show"

    // Capture network for the toggle PATCH/PUT.
    let toggleStatus = null;
    const onResp = (resp) => {
      const u = resp.url();
      if (
        /\/v1\/guesthouses\//.test(u) &&
        ["PATCH", "PUT", "POST"].includes(resp.request().method())
      ) {
        toggleStatus = resp.status();
      }
    };
    page.on("response", onResp);

    // Click HIDE (label should be "Hide" if not currently hidden).
    await targetBtn.click();
    // Wait for "Hidden" badge to appear in that row.
    const hiddenBadge = targetRow.getByText(/^Hidden$/i);
    await hiddenBadge.waitFor({ state: "visible", timeout: 15000 });
    await shot("A5a-hidden-badge");
    const hideStatus = toggleStatus;

    // Click SHOW to revert.
    const showBtn = targetRow.getByRole("button", { name: /Toggle guest visibility for/i });
    await showBtn.click();
    // Wait for the Hidden badge to disappear.
    await hiddenBadge.waitFor({ state: "hidden", timeout: 15000 });
    await shot("A5b-reverted");
    page.off("response", onResp);

    toggleOk = true;
    toggleDetail = `place="${placeName}" labelBefore="${labelBefore}" hide_net_status=${hideStatus} revert_ok=true`;
  } catch (e) {
    toggleDetail = `toggle error: ${String(e.message).slice(0, 140)}`;
    await shot("A5-toggle-fail");
  }
  // Secondary finding: do NOT fail the login path on the toggle. Record separately.
  step("A5 (secondary) Hide→Show visibility toggle persists", toggleOk, toggleDetail);
} catch (e) {
  step("A (login path)", false, String(e.message).slice(0, 200));
  await shot("A-fail");
}

// ============================================================================
// Scenario B — Guest-entry collision (CONFIRM KNOWN BUG)
// Cold doc-navigation to /r/<token> is expected to hit the BFF (raw JSON).
// ============================================================================
await newPage(browser, VIEWPORTS.mobile);
try {
  const tok = mintToken();
  let docStatus = null;
  let docCt = null;
  page.on("response", (resp) => {
    if (resp.url() === `${APEX}/r/${tok}` && resp.request().resourceType() === "document") {
      docStatus = resp.status();
      docCt = resp.headers()["content-type"] || null;
    }
  });
  await page.goto(`${APEX}/r/${tok}`, { waitUntil: "domcontentloaded" });
  await sleep(1500);
  const visibleText =
    (await page
      .locator("body")
      .innerText()
      .catch(() => "")) || "";
  const looksLikeJson = /"jwt"\s*:/.test(visibleText) || (docCt || "").includes("application/json");
  // SPA booted? The app shell has React root / known UI; raw JSON has none of that.
  const hasAppRoot =
    (await page.locator("#root, main").count()) > 0 &&
    /Daily Tour|Logging you in|Explore|Discover|host/i.test(visibleText);
  const bugConfirmed = looksLikeJson && !hasAppRoot;
  await shot("B-cold-r-token");
  step(
    "B cold /r/<token> serves raw JSON (SPA NOT booted) — bug confirmed",
    bugConfirmed,
    `doc_status=${docStatus} content-type=${docCt} body[0..60]="${visibleText.replace(/\s+/g, " ").slice(0, 60)}"`,
  );
} catch (e) {
  step("B cold /r/<token>", false, String(e.message).slice(0, 200));
  await shot("B-fail");
}

// ============================================================================
// Scenario C — Hero photos + attribution credit over TLS (mobile guest view)
// Establish guest session via approach (a): boot SPA, client-navigate to
// /r/<token> so r.$token.tsx mounts and exchanges the token via XHR (works),
// then visit /p/<id> place details.
// ============================================================================
const PLACES = [
  {
    id: "c0000001-0000-4000-a000-000000000002",
    label: "Lagoa do Fogo",
    author: /Samuel Fonseca 85/i,
    license: /CC BY-SA 3\.0/i,
  },
  {
    id: "c0000001-0000-4000-a000-000000000010",
    label: "Praia de Santa Bárbara",
    author: /JCNazza/i,
    license: /CC BY 3\.0/i,
  },
];

await newPage(browser, VIEWPORTS.mobile);
let sessionOk = false;
try {
  const tok = mintToken();
  // 1. Boot SPA at apex.
  await page.goto(APEX + "/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});

  // 2. Client-side navigate to /r/<token> using the SPA history (no doc nav).
  //    react-router's createBrowserRouter listens to history; we push + popstate.
  await page.evaluate((t) => {
    window.history.pushState({}, "", `/r/${t}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, tok);

  // r.$token route mounts → exchangeOpaqueToken (XHR /r/:token → {jwt}) → setSession
  // → navigate('/', replace). Wait until URL returns to "/" (success) and session set.
  await page
    .waitForFunction(() => location.pathname === "/" && !location.pathname.startsWith("/r/"), {
      timeout: 30000,
    })
    .catch(() => {});
  await sleep(1500);
  const path = await page.evaluate(() => location.pathname);
  // Heuristic: if exchange failed it navigates to /?reason=expired.
  const reason = await page.evaluate(() => new URLSearchParams(location.search).get("reason"));
  sessionOk = path === "/" && reason !== "expired";
  await shot("C0-session-established");
  step(
    "C0 guest session established via client-side /r/<token>",
    sessionOk,
    `path=${path} reason=${reason}`,
  );
} catch (e) {
  step("C0 guest session establish", false, String(e.message).slice(0, 200));
  await shot("C0-fail");
}

if (sessionOk) {
  for (const pl of PLACES) {
    try {
      // Client-side navigate to the place detail (keep the in-memory session).
      await page.evaluate((id) => {
        window.history.pushState({}, "", `/p/${id}`);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }, pl.id);

      // Wait for hero <img> and the attribution anchor to render.
      const hero = page.locator("main img").first();
      await hero.waitFor({ state: "visible", timeout: 30000 });
      // Wait for the hero to actually finish decoding before measuring.
      await page
        .waitForFunction(
          () => {
            const img = document.querySelector("main img");
            return img && img.complete && img.naturalWidth > 0;
          },
          { timeout: 30000 },
        )
        .catch(() => {});

      // Hero image network/decoded status.
      const heroInfo = await hero.evaluate((img) => ({
        src: img.currentSrc || img.src,
        complete: img.complete,
        nw: img.naturalWidth,
        nh: img.naturalHeight,
      }));
      const heroLoaded = heroInfo.complete && heroInfo.nw > 0;
      const heroHttps = heroInfo.src.startsWith("https://");
      const fromWikimedia = /upload\.wikimedia\.org/.test(heroInfo.src);

      // Attribution chip: anchor "© {author} · {license}".
      const chip = page.locator('main a[rel*="noopener"]').filter({ hasText: /©|©/ }).first();
      let chipText = "";
      let chipVisible = false;
      try {
        await chip.waitFor({ state: "visible", timeout: 10000 });
        chipText = (await chip.innerText()).trim();
        chipVisible = true;
      } catch {
        // fall back: any element bearing the author text
        chipText =
          (await page
            .locator("main")
            .innerText()
            .catch(() => "")) || "";
      }
      const authorOk = pl.author.test(chipText);
      const licenseOk = pl.license.test(chipText);

      const tag = `C-${pl.label.replace(/\s+/g, "-")}`;
      await shot(tag);

      const ok = heroLoaded && heroHttps && authorOk && licenseOk;
      step(
        `C ${pl.label} (/p/${pl.id.slice(0, 8)}) hero+credit`,
        ok,
        `hero_loaded=${heroLoaded} https=${heroHttps} wikimedia=${fromWikimedia} nw=${heroInfo.nw} chip="${(chipVisible ? chipText : "[author in body]").slice(0, 60)}" authorOk=${authorOk} licenseOk=${licenseOk}`,
      );
    } catch (e) {
      step(`C ${pl.label} hero+credit`, false, String(e.message).slice(0, 200));
      await shot(`C-${pl.label.replace(/\s+/g, "-")}-fail`);
    }
  }
} else {
  step("C place-detail checks", false, "SKIPPED — no guest session (C0 failed)");
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("\n— SUMMARY —");
const fails = results.filter((r) => !r.ok);
console.log(`${results.length - fails.length}/${results.length} steps passed`);
if (errors.length) console.log("\nJS ERRORS / CONSOLE:\n" + errors.join("\n"));
await browser.close();
process.exit(0);
