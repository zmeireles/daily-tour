// Submit the Daily Tour intake form (SANCTIONED guest action) and capture the
// POST-SUBMIT multi-stop TIMELINE (/tour/<planId>, "ready" state) at desktop +
// tablet. Real LLM generation on qual. CAPTURE-ONLY (exit 0), LIGHT theme.
//
// Intake (apps/pwa/src/features/tour/intake-form.tsx): wish chips are
// role="checkbox" buttons w/ visible labels; submit is type="submit".
// On success _authed.tour.new.tsx navigate(`/tour/${plan.id}`); the timeline
// route (_authed.tour.$planId.tsx) shows a role="status" spinner while queued,
// then a font-display headline + DailyTourTimeline when status==="ready".
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
const TABLET = { width: 834, height: 1112 };

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
async function newCtx(browser, viewport) {
  if (ctx) await ctx.close();
  ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror[${log.length}] ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console[${log.length}] ${m.text().slice(0, 220)}`);
  });
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
async function forceLightTheme() {
  await page.evaluate(() => localStorage.setItem("theme", "light"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await enterAsGuest(); // reload drops in-memory session; theme now persisted
  const applied = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  note(`  theme -> data-theme=${applied}`);
}
async function spaNavigate(href) {
  const link = page.locator(`a[href="${href}"]`).first();
  if ((await link.count()) > 0 && (await link.isVisible().catch(() => false))) await link.click();
  else
    await page.evaluate((to) => {
      window.history.pushState({}, "", to);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, href);
  await page
    .waitForFunction((p) => location.pathname === p, href, { timeout: 20000 })
    .catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await sleep(700);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

// Submit the intake ONCE on desktop, ride the resulting /tour/<planId> to the
// ready timeline, capture desktop; then resize to tablet and re-capture the same
// plan URL via SPA-nav (no second LLM call needed — same plan id renders ready).
async function run() {
  await newCtx(browser, DESKTOP);
  if (!(await enterAsGuest())) {
    note("!! could not redeem — abort");
    return;
  }
  await forceLightTheme();
  await spaNavigate("/tour/new");
  note(`  on intake @ ${await page.evaluate(() => location.pathname)}`);

  // Select wish chips "Ver" (see) + "Comer" (eat) — role=checkbox buttons.
  for (const label of [/^Ver$/i, /^Comer$/i]) {
    const chip = page.getByRole("checkbox", { name: label }).first();
    if ((await chip.count()) > 0) {
      await chip.click();
      note(`  selected chip ${label}`);
    } else note(`  ! chip ${label} not found`);
  }
  // Duration "3 horas" + transport "Carro" are the defaults; leave as-is.

  // Submit. Capture the plan id from the URL it navigates to.
  const submit = page.getByRole("button", { name: /planear o meu dia|plan my day/i }).first();
  await submit.click();
  note("  submitted intake form");

  // Wait to leave /tour/new -> /tour/<planId>.
  const navigated = await page
    .waitForFunction(
      () => /^\/tour\/[^/]+$/.test(location.pathname) && location.pathname !== "/tour/new",
      { timeout: 30000 },
    )
    .then(() => true)
    .catch(() => false);
  const planPath = await page.evaluate(() => location.pathname);
  note(`  navigated=${navigated} planPath=${planPath}`);
  if (!navigated) {
    // Form stayed mounted -> submit failed. Capture whatever shows + bail.
    const errAlert =
      (await page
        .locator('[role="alert"]')
        .innerText()
        .catch(() => "")) || "";
    note(`  ! submit did not navigate (stayed on intake). alert="${errAlert.slice(0, 120)}"`);
    note(`  captured intake-error state: ${await shot("tour-timeline-desktop-1440")}`);
    return { ok: false, planPath: null };
  }

  // Wait for the READY timeline: spinner (role=status) clears AND the editorial
  // font-display headline + at least one timeline stop renders. Poll up to ~90s.
  let ready = false;
  let stateNote = "";
  for (let i = 0; i < 36; i++) {
    const probe = await page
      .evaluate(() => {
        const spinner = document.querySelector('[role="status"].animate-spin, [aria-busy="true"]');
        const headline = document.querySelector("h1.font-display");
        const failure =
          /tente novamente|não foi possível|try again|something went wrong|demorou demasiado/i.test(
            document.body.innerText || "",
          );
        // Timeline stops: daily-tour-timeline renders list items / time labels.
        const stops = document.querySelectorAll(
          'ol li, [class*="timeline"] li, li, article',
        ).length;
        return {
          hasSpinner: !!spinner,
          hasHeadline: !!headline,
          headlineText: headline?.textContent?.trim() || null,
          failure,
          stops,
        };
      })
      .catch(() => ({}));
    stateNote = `spinner=${probe.hasSpinner} headline=${probe.hasHeadline} stops=${probe.stops} failure=${probe.failure}`;
    if (probe.failure) {
      note(`  ! generation failure state shown — ${stateNote}`);
      break;
    }
    if (probe.hasHeadline && !probe.hasSpinner && probe.stops >= 1) {
      ready = true;
      break;
    }
    await sleep(2500);
  }
  await sleep(1500);
  note(`  desktop timeline ready=${ready} (${stateNote}) @ ${planPath}`);
  note(`  DESKTOP captured: ${await shot("tour-timeline-desktop-1440")}`);

  // Tablet: resize, re-render the SAME plan URL via SPA-nav (no new LLM call).
  await page.setViewportSize(TABLET);
  await sleep(600);
  await spaNavigate(planPath);
  // It may briefly re-fetch; wait for the ready headline again (cached → fast).
  for (let i = 0; i < 16; i++) {
    const r = await page
      .evaluate(() => {
        const spinner = document.querySelector('[role="status"].animate-spin, [aria-busy="true"]');
        const headline = document.querySelector("h1.font-display");
        return { hasSpinner: !!spinner, hasHeadline: !!headline };
      })
      .catch(() => ({}));
    if (r.hasHeadline && !r.hasSpinner) break;
    await sleep(2000);
  }
  await sleep(1500);
  note(`  tablet @ ${await page.evaluate(() => location.pathname)}`);
  note(`  TABLET captured: ${await shot("tour-timeline-tablet-834")}`);
  return { ok: ready, planPath };
}

const result = await run();

console.log("\n— CAPTURE LOG —");
console.log(log.join("\n"));
console.log("\nRESULT: " + JSON.stringify(result));
if (errors.length) console.log("\nJS ERRORS / CONSOLE:\n" + [...new Set(errors)].join("\n"));
else console.log("\n(no JS errors / console errors captured)");
await browser.close();
process.exit(0);
