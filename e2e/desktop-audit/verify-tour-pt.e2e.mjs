// Verify 2 backend fixes via a fresh tour generation (PT-PT guest), + a home
// cover-story glance. Desktop 1440, LIGHT. SANCTIONED form submit. exit 0.
//  FIX 1 (locale): stop descriptions in Portuguese, not English.
//  FIX 2 (relevance): stops are sightseeing/food landmarks, not Miguel's lodging.
//  B: first host's-pick is a larger ~2x2 featured cover card.
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
    .catch((e) => note(`! shot ${name}: ${e.message}`));
  return p;
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
      return true;
    }
    await sleep(1500);
  }
  return false;
}
async function forceLight() {
  await page.evaluate(() => localStorage.setItem("theme", "light"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await enterAsGuest();
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
  await sleep(800);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
ctx = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 2 });
page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(`pageerror[${log.length}] ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console[${log.length}] ${m.text().slice(0, 220)}`);
});

if (!(await enterAsGuest())) {
  note("!! could not redeem");
  await browser.close();
  process.exit(0);
}
await forceLight();
note(`theme=${await page.evaluate(() => document.documentElement.getAttribute("data-theme"))}`);

// ───────────────── B. HOME cover-story glance (do first, on home) ─────────────────
await page
  .locator('a[href^="/a/"]')
  .first()
  .waitFor({ state: "visible", timeout: 12000 })
  .catch(() => {});
await sleep(1500);
const cover = await page.evaluate(() => {
  // Host's-picks live under the "Escolhas do anfitrião" section. Find the picks
  // grid + measure the first card vs the rest (a cover spans ~2x the others).
  const heading = [...document.querySelectorAll("h2, h3")].find((h) =>
    /escolhas do anfitrião/i.test(h.textContent || ""),
  );
  let scope = heading ? heading.parentElement : document.querySelector("main");
  // Walk up until we find a container holding multiple card-like children.
  const grid =
    heading?.parentElement?.querySelector('[class*="grid"]') ||
    scope?.querySelector('[class*="grid"]') ||
    scope;
  const cards = grid
    ? [...grid.children]
        .map((c) => c.getBoundingClientRect())
        .filter((r) => r.width > 80 && r.height > 80)
    : [];
  if (cards.length < 2) {
    // fallback: any cards holding place names
    const named = [...document.querySelectorAll("main *")].filter(
      (e) =>
        /sete cidades|lagoa do fogo|furnas|salto do cabrito|caldeira|pico do carvão|mercado|quinta|cais 20|tony/i.test(
          e.textContent || "",
        ) && e.getBoundingClientRect().width > 120,
    );
    return {
      cardCount: cards.length,
      fallbackNamed: named.length,
      areas: cards.map((r) => Math.round(r.width * r.height)),
    };
  }
  const areas = cards.map((r) => Math.round(r.width * r.height));
  const first = areas[0];
  const restMax = Math.max(...areas.slice(1));
  return {
    cardCount: cards.length,
    firstArea: first,
    restMaxArea: restMax,
    firstW: Math.round(cards[0].width),
    firstH: Math.round(cards[0].height),
    restW: Math.round(cards[1].width),
    restH: Math.round(cards[1].height),
    ratio: +(first / Math.max(1, restMax)).toFixed(2),
    isCover: first >= restMax * 1.6, // ~2x2 vs 1x1 → ≥ ~1.6x area
  };
});
note(`B cover-story probe: ${JSON.stringify(cover)}`);
note(`B captured: ${await shot("home-desktop-COVER-1440")}`);

// ───────────────── A. Generate a tour + verify ─────────────────
await spaNavigate("/tour/new");
note(`on intake @ ${await page.evaluate(() => location.pathname)}`);
// Wait for the wish chips to mount before clicking (they render after the form
// hydrates; clicking too early submits an empty form -> "Select at least one").
await page
  .getByRole("checkbox")
  .first()
  .waitFor({ state: "visible", timeout: 15000 })
  .catch(() => {});
await sleep(600);
const chipCount = await page.getByRole("checkbox").count();
note(`intake chips present: ${chipCount}`);
for (const label of [/^Ver$/i, /^Comer$/i]) {
  const chip = page.getByRole("checkbox", { name: label }).first();
  if ((await chip.count()) > 0) {
    await chip.click();
    const checked = await chip.getAttribute("aria-checked");
    note(`selected chip ${label} (aria-checked=${checked})`);
  } else note(`! chip ${label} not found`);
}
// Confirm at least one chip is checked before submitting.
const checkedNow = await page.locator('[role="checkbox"][aria-checked="true"]').count();
note(`chips checked before submit: ${checkedNow}`);
await page
  .getByRole("button", { name: /planear o meu dia|plan my day/i })
  .first()
  .click();
note("submitted intake");
const navigated = await page
  .waitForFunction(
    () => /^\/tour\/[^/]+$/.test(location.pathname) && location.pathname !== "/tour/new",
    { timeout: 30000 },
  )
  .then(() => true)
  .catch(() => false);
const planPath = await page.evaluate(() => location.pathname);
note(`navigated=${navigated} planPath=${planPath}`);

let ready = false,
  failure = false,
  stateNote = "";
if (navigated) {
  for (let i = 0; i < 40; i++) {
    const probe = await page
      .evaluate(() => {
        const spinner = document.querySelector('[role="status"].animate-spin, [aria-busy="true"]');
        const headline = document.querySelector("h1.font-display");
        const fail =
          /tente novamente|não foi possível|try again|something went wrong|demorou demasiado/i.test(
            document.body.innerText || "",
          );
        const stops = document.querySelectorAll(
          'ol li, [class*="timeline"] li, li, article',
        ).length;
        return { hasSpinner: !!spinner, hasHeadline: !!headline, fail, stops };
      })
      .catch(() => ({}));
    stateNote = `spinner=${probe.hasSpinner} headline=${probe.hasHeadline} stops=${probe.stops} fail=${probe.fail}`;
    if (probe.fail) {
      failure = true;
      break;
    }
    if (probe.hasHeadline && !probe.hasSpinner && probe.stops >= 1) {
      ready = true;
      break;
    }
    await sleep(2500);
  }
}
await sleep(1500);
note(`tour ready=${ready} failure=${failure} (${stateNote}) @ ${planPath}`);

// Extract stop NAMES + DESCRIPTIONS from the rendered timeline for the verdicts.
const tour = await page.evaluate(() => {
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const headline = norm(document.querySelector("h1.font-display")?.textContent);
  const subline = norm(document.querySelector("h1.font-display")?.nextElementSibling?.textContent);
  // Timeline stops: each has a name (heading-ish, often bold/serif) + a time +
  // a description paragraph. Collect text blocks under the timeline list.
  const items = [...document.querySelectorAll('ol > li, [class*="timeline"] li, article')];
  const stops = items
    .map((li) => {
      const t = norm(li.innerText);
      // Heuristic split: first line ~ "Name HH:MM", rest = description.
      const nameMatch = t.match(/^(.+?)\s+(\d{1,2}:\d{2})/);
      const name = nameMatch
        ? nameMatch[1].trim()
        : norm(li.querySelector("h2,h3,strong,.font-display")?.textContent) || t.split("\n")[0];
      const time = nameMatch ? nameMatch[2] : null;
      const desc = nameMatch ? t.slice(nameMatch[0].length).trim() : t;
      return { name, time, desc: desc.slice(0, 220) };
    })
    .filter((s) => s.name && s.name.length < 80);
  return { headline, subline, stops, bodyText: norm(document.body.innerText).slice(0, 1500) };
});
note(`TOUR headline="${tour.headline}" subline="${tour.subline}"`);
note(`TOUR stops (${tour.stops.length}):`);
tour.stops.forEach((s, i) => note(`  [${i}] name="${s.name}" time=${s.time} desc="${s.desc}"`));

// FIX 1 verdict: Portuguese descriptions, not English.
const allDesc = tour.stops.map((s) => s.desc).join(" || ");
const ptHits = (
  allDesc.match(
    /\b(comece|continue|aproveite|visite|desfrute|termine|almoço|manhã|tarde|caminhada|passeio|seguida|antes|depois|local|paragem)\b/gi,
  ) || []
).length;
const enHits = (
  allDesc.match(
    /\b(start|continue|enjoy|visit|morning|afternoon|lunch|loop|sightseeing|drive|before|after|wrap up|spot)\b/gi,
  ) || []
).length;
note(`FIX1 locale: ptHits=${ptHits} enHits=${enHits}`);

// FIX 2 verdict: sightseeing/food landmarks, not lodging-listing names.
const lodgingNames = /the place|the escape|the view point|the view\b/i;
const lodgingStops = tour.stops.filter((s) => lodgingNames.test(s.name)).map((s) => s.name);
const landmarkHits = tour.stops
  .filter((s) =>
    /sete cidades|lagoa do fogo|furnas|salto do cabrito|caldeira|pico do carvão|miradouro|gorreana|caldeiras|restaurante|tasca|mercado|cha |chá |gruta|praia|jardim|terra nostra/i.test(
      s.name,
    ),
  )
  .map((s) => s.name);
note(
  `FIX2 relevance: lodgingStops=${JSON.stringify(lodgingStops)} landmarkHits=${JSON.stringify(landmarkHits)}`,
);

note(`A captured: ${await shot("tour-timeline-PT-VERIFY")}`);

console.log("\n— LOG —");
console.log(log.join("\n"));
console.log(
  "\nRESULT: " +
    JSON.stringify({
      ready,
      failure,
      planPath,
      stopCount: tour.stops.length,
      ptHits,
      enHits,
      lodgingStops,
      landmarkHits,
      cover,
    }),
);
if (errors.length) console.log("\nJS ERRORS:\n" + [...new Set(errors)].join("\n"));
else console.log("\n(no JS errors)");
await browser.close();
process.exit(0);
