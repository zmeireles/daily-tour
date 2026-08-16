// Capture the NEW desktop Home redesign on qual at desktop + tablet (LIGHT).
// Redeem once (in-memory session) then capture "/" at both widths. The desktop
// layout engages at >=768, so BOTH widths should show HomeDesktop, not the old
// stretched-mobile column. CAPTURE-ONLY (exit 0).
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

// Structural probe of the new desktop Home — checks the 5 expected items.
async function probeHome() {
  return page.evaluate(() => {
    const txt = document.body.innerText || "";
    const norm = (s) => s.replace(/\s+/g, " ").trim();
    const header = document.querySelector("header");
    const headerText = header ? norm(header.innerText) : "";
    // Masthead nav links (desktop): match by visible label.
    const navLabels = header
      ? [...header.querySelectorAll("a, button")].map((e) => norm(e.textContent)).filter(Boolean)
      : [];
    const hasDescobrir = /descobrir/i.test(headerText);
    const hasMeuDia = /o meu dia|meu dia/i.test(headerText);
    const hasFalarMiguel = /falar com o miguel|miguel/i.test(headerText);
    const hasLangSwitch = /\bEN\b/.test(headerText) && /\bPT\b/.test(headerText);
    // Bottom tab bar should be ABSENT on desktop.
    const bottomNav = document.querySelector('nav[aria-label="Primary"]');
    const bottomNavPresent = !!bottomNav;
    // Big masthead title + eyebrow.
    const h1 = document.querySelector("h1.font-display, main h1, h1");
    const h1cs = h1 ? getComputedStyle(h1) : null;
    const eyebrow = [...document.querySelectorAll("*")].find(
      (el) => /a mostrar em pt-pt/i.test(el.textContent || "") && el.children.length === 0,
    );
    // 6 section-opener cards: the /a/ links. Card = bordered box w/ icon+chevron+label.
    const actionLinks = [...document.querySelectorAll('a[href^="/a/"]')];
    const cards = actionLinks.map((a) => {
      const cs = getComputedStyle(a);
      const r = a.getBoundingClientRect();
      const hasIcon = !!a.querySelector("svg");
      const svgCount = a.querySelectorAll("svg").length;
      const hasBorder = cs.borderTopWidth !== "0px" || cs.borderRadius !== "0px";
      const label = norm(a.textContent);
      return {
        href: a.getAttribute("href"),
        w: Math.round(r.width),
        h: Math.round(r.height),
        aspectish: Math.abs(r.width - r.height) <= 4,
        hasIcon,
        svgCount,
        hasBorder,
        surface: cs.backgroundColor,
        label,
      };
    });
    // Two-column body: host's-picks grid + right rail with the two panels.
    const planPanel = document.querySelector('a[href="/tour/new"]');
    const chatPanel = document.querySelector('a[href="/chat"]');
    const planR = planPanel?.getBoundingClientRect();
    const picksLinks = [...document.querySelectorAll('a[href^="/p/"]')];
    // Right-rail detection: plan/chat panels sit in the right portion of the page.
    const planOnRight = planR ? planR.left > window.innerWidth * 0.5 : null;
    // Empty right void heuristic: rightmost content extent vs viewport width.
    const allRects = [...document.querySelectorAll("main *")]
      .map((e) => e.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);
    const maxRight = allRects.length ? Math.max(...allRects.map((r) => r.right)) : 0;
    const contentFillsWidth = maxRight >= window.innerWidth * 0.85;
    return {
      vw: window.innerWidth,
      header: {
        present: !!header,
        hasDescobrir,
        hasMeuDia,
        hasFalarMiguel,
        hasLangSwitch,
        navLabels: navLabels.slice(0, 12),
      },
      bottomNavPresent,
      title: {
        text: h1 ? norm(h1.textContent) : null,
        fontSize: h1cs?.fontSize || null,
        font: h1cs?.fontFamily || null,
        hasEyebrow: !!eyebrow,
        eyebrowText: eyebrow ? norm(eyebrow.textContent) : null,
      },
      cards: { count: cards.length, all: cards },
      twoCol: {
        planPresent: !!planPanel,
        chatPresent: !!chatPanel,
        planOnRight,
        picksCount: picksLinks.length,
        contentFillsWidth,
        maxRight: Math.round(maxRight),
      },
    };
  });
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

async function runViewport(vp, tag) {
  note(`\n=== ${tag} (${vp.width}x${vp.height}) ===`);
  await newCtx(browser, vp);
  if (!(await enterAsGuest())) {
    note("  !! could not redeem");
    return;
  }
  await forceLightTheme();
  await page
    .locator('a[href^="/a/"]')
    .first()
    .waitFor({ state: "visible", timeout: 12000 })
    .catch(() => {});
  await page
    .locator('a[href^="/p/"] img, [class*="aspect"] img')
    .first()
    .waitFor({ state: "visible", timeout: 10000 })
    .catch(() => {});
  await sleep(1200);
  const probe = await probeHome();
  note(`  probe: ${JSON.stringify(probe)}`);
  const file = tag === "desktop" ? "home-desktop-NEW-1440" : "home-tablet-NEW-834";
  note(`  captured: ${await shot(file)}`);
}

await runViewport(DESKTOP, "desktop");
await runViewport(TABLET, "tablet");

console.log("\n— CAPTURE LOG —");
console.log(log.join("\n"));
if (errors.length) console.log("\nJS ERRORS / CONSOLE:\n" + [...new Set(errors)].join("\n"));
else console.log("\n(no JS errors / console errors captured)");
await browser.close();
process.exit(0);
