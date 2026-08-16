// Focused screenshot UAT — editorial BackLink ("← Voltar ao início") on the
// Daily Tour screen, LIGHT + DARK. Confirms the bare-Unicode "←" + underlined
// text link was replaced by a lucide ArrowLeft <svg> + tea-green label, NO
// underline, centered under the "Partilhar" (Share) button.
//
// Session is IN-MEMORY (no persistence) → we do NOT hard-reload onto /tour.
// Proven flow (reused from temp/uat-2d-daily-tour): redeem token -> home ->
// set localStorage.theme on home (where useThemeAuto mounts) -> SPA goto /tour.
// REPORT-ONLY (exit 0), READ-ONLY (no submits). playwright-core + system Chrome.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const TOKEN = process.env.RTOKEN;
const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const PLAN = process.env.PLAN_ID ?? "53883916-78fe-46b8-8284-33eaead916fe";
const SHOTS = REPO + "/temp/uat-backlink/";
mkdirSync(SHOTS, { recursive: true });

// Phone is the canonical guest device; the editorial screen is mobile-first.
const VIEWPORT = { width: 390, height: 844 };
const EXPECT = {
  primaryLight: "rgb(47, 93, 67)", // --tea-600 #2f5d43
  primaryDark: "rgb(95, 163, 123)", // --tea-400 #5fa37b
};

const results = [];
const errors = [];
let ctx, page;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function newPage(browser) {
  if (ctx) await ctx.close();
  ctx = await browser.newContext({ viewport: VIEWPORT });
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror[${results.length}]: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console[${results.length}]: ${m.text().slice(0, 220)}`);
  });
  page.on("response", (resp) => {
    if (resp.status() >= 500)
      errors.push(
        `HTTP ${resp.status()} [${results.length}] ${resp.request().method()} ${resp.url().slice(0, 140)}`,
      );
  });
}

async function enterAsGuest() {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await page.goto(`${BASE}/r/${TOKEN}`, { waitUntil: "domcontentloaded" });
      await page
        .waitForFunction(() => location.pathname === "/", { timeout: 30000 })
        .catch(() => {});
      await page.locator('a[href^="/a/"]').first().waitFor({ state: "visible", timeout: 20000 });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      return;
    } catch (e) {
      if (attempt === 2) throw e;
      await sleep(1500);
    }
  }
}

// Persist theme on HOME (where useThemeAuto mounts), verify <html data-theme>,
// then SPA-navigate to the tour — localStorage + in-memory session survive.
async function setThemeOnHome(theme) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.locator('a[href^="/a/"]').first().waitFor({ state: "visible", timeout: 20000 });
  await page.evaluate((t) => localStorage.setItem("theme", t), theme);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('a[href^="/a/"]').first().waitFor({ state: "visible", timeout: 20000 });
  await sleep(400);
  return page.evaluate(() => document.documentElement.getAttribute("data-theme"));
}

async function gotoTour() {
  await page.goto(`${BASE}/tour/${PLAN}`, { waitUntil: "domcontentloaded" });
  await page.locator("h1.font-display").first().waitFor({ state: "visible", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await sleep(800);
}

// Probe the Share button + BackLink: geometry (centering), the BackLink's
// computed text-decoration-line + color, the lucide <svg> arrow, and that the
// label reads "Voltar ao início" with NO bare "←" glyph.
async function probeBackLink() {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    const share = [...(main?.querySelectorAll("button") ?? [])].find((b) =>
      /Partilhar|Ligação copiada/i.test(b.getAttribute("aria-label") || b.textContent || ""),
    );
    const back = [...(main?.querySelectorAll("a") ?? [])].find((a) =>
      /Voltar ao início/i.test(a.textContent || ""),
    );
    if (!back) return { found: false, shareFound: !!share };
    const cs = getComputedStyle(back);
    const r = back.getBoundingClientRect();
    const svg = back.querySelector("svg");
    const svgR = svg?.getBoundingClientRect();
    const label = (back.textContent || "").trim();
    const shareR = share?.getBoundingClientRect();
    // Centering: link's horizontal centre vs viewport centre, and vs share centre.
    const linkCx = r.left + r.width / 2;
    const vpCx = window.innerWidth / 2;
    const shareCx = shareR ? shareR.left + shareR.width / 2 : null;
    return {
      found: true,
      shareFound: !!share,
      href: back.getAttribute("href"),
      label,
      hasBareArrowGlyph: /←|←/.test(label), // must be FALSE
      svg: svg
        ? {
            present: true,
            tag: svg.tagName.toLowerCase(),
            w: svgR ? Math.round(svgR.width) : 0,
            h: svgR ? Math.round(svgR.height) : 0,
            // lucide marks its icons with class "lucide" + per-icon class.
            cls: svg.getAttribute("class") || "",
            ariaHidden: svg.getAttribute("aria-hidden"),
          }
        : { present: false },
      color: cs.color,
      textDecorationLine: cs.textDecorationLine,
      textDecoration: cs.textDecoration,
      fontWeight: cs.fontWeight,
      display: cs.display,
      // centering deltas (px)
      linkCenterDx: Math.round(linkCx - vpCx),
      vsShareDx: shareCx !== null ? Math.round(linkCx - shareCx) : null,
      belowShare: shareR ? Math.round(r.top - shareR.bottom) : null, // >0 => below
      rect: {
        top: Math.round(r.top + window.scrollY),
        left: Math.round(r.left),
        w: Math.round(r.width),
        h: Math.round(r.height),
      },
      shareRect: shareR
        ? {
            top: Math.round(shareR.top + window.scrollY),
            left: Math.round(shareR.left),
            w: Math.round(shareR.width),
            h: Math.round(shareR.height),
          }
        : null,
      dataTheme: document.documentElement.getAttribute("data-theme"),
    };
  });
}

// Tight clip around the Share button + BackLink, scrolled into view.
async function clipShareAndBack() {
  return page.evaluate(async () => {
    const main = document.querySelector("main");
    const back = [...(main?.querySelectorAll("a") ?? [])].find((a) =>
      /Voltar ao início/i.test(a.textContent || ""),
    );
    if (back) back.scrollIntoView({ block: "center" });
    await new Promise((res) => setTimeout(res, 350));
    const share = [...(main?.querySelectorAll("button") ?? [])].find((b) =>
      /Partilhar|Ligação copiada/i.test(b.getAttribute("aria-label") || b.textContent || ""),
    );
    const b = back?.getBoundingClientRect();
    const s = share?.getBoundingClientRect();
    if (!b || !s) return null;
    const top = Math.max(0, Math.min(s.top, b.top) - 24);
    const bottom = Math.min(window.innerHeight, Math.max(s.bottom, b.bottom) + 24);
    return { x: 0, y: top, width: window.innerWidth, height: bottom - top };
  });
}

async function captureTheme(browser, theme, file) {
  await newPage(browser);
  await enterAsGuest();
  const homeTheme = await setThemeOnHome(theme);
  await gotoTour();
  const probe = await probeBackLink();
  const clip = await clipShareAndBack();
  if (clip && clip.height > 8) {
    await page
      .screenshot({ path: SHOTS + file, clip })
      .catch(() => page.screenshot({ path: SHOTS + file }));
  } else {
    await page.screenshot({ path: SHOTS + file });
  }
  const wantPrimary = theme === "dark" ? EXPECT.primaryDark : EXPECT.primaryLight;
  const issues = [];
  if (homeTheme !== theme)
    issues.push(`home set theme="${homeTheme}" != requested "${theme}" (session/theme drift)`);
  if (probe.dataTheme !== theme) issues.push(`tour data-theme="${probe.dataTheme}" != "${theme}"`);
  if (!probe.found) {
    issues.push(`BackLink NOT found (share found=${probe.shareFound})`);
    step(`${theme.toUpperCase()} BackLink`, false, `${issues.join("; ")} | ${file}`);
    return probe;
  }
  if (!probe.svg.present || probe.svg.tag !== "svg") issues.push("lucide ArrowLeft <svg> missing");
  if (probe.hasBareArrowGlyph)
    issues.push(`label still contains a bare "←" glyph: "${probe.label}"`);
  if (!/Voltar ao início/.test(probe.label))
    issues.push(`label "${probe.label}" != "Voltar ao início"`);
  if (probe.textDecorationLine !== "none")
    issues.push(`text-decoration-line="${probe.textDecorationLine}" (expected none)`);
  if (probe.color !== wantPrimary) issues.push(`color ${probe.color} != tea-green ${wantPrimary}`);
  if (Math.abs(probe.linkCenterDx) > 4)
    issues.push(`not h-centered in viewport (dx ${probe.linkCenterDx}px)`);
  if (probe.vsShareDx !== null && Math.abs(probe.vsShareDx) > 4)
    issues.push(`not centered under Share (dx ${probe.vsShareDx}px)`);
  if (probe.belowShare !== null && probe.belowShare <= 0)
    issues.push(`not below Share (gap ${probe.belowShare}px)`);
  step(
    `${theme.toUpperCase()} BackLink — lucide arrow + tea-green, no underline, centered under Share`,
    issues.length === 0,
    `label="${probe.label}" svg=${probe.svg.tag}@${probe.svg.w}x${probe.svg.h}(${probe.svg.cls}) color=${probe.color} text-decoration-line=${probe.textDecorationLine} weight=${probe.fontWeight} bareArrow=${probe.hasBareArrowGlyph} centerDx=${probe.linkCenterDx}px vsShareDx=${probe.vsShareDx}px belowShare=${probe.belowShare}px theme=${probe.dataTheme} | ${issues.length ? "ISSUES: " + issues.join("; ") : "clean"} | ${file}`,
  );
  return probe;
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const probes = {};
try {
  probes.light = await captureTheme(browser, "light", "backlink-light.png");
} catch (e) {
  step("LIGHT BackLink", false, String(e.message).slice(0, 180));
}
try {
  probes.dark = await captureTheme(browser, "dark", "backlink-dark.png");
} catch (e) {
  step("DARK BackLink", false, String(e.message).slice(0, 180));
}

console.log("\n— SUMMARY —");
const fails = results.filter((r) => !r.ok);
console.log(`${results.length - fails.length}/${results.length} scenarios passed`);
console.log("\nBACKLINK PROBES:");
console.log(JSON.stringify(probes, null, 2));
if (errors.length) console.log("\nJS ERRORS / CONSOLE:\n" + errors.join("\n"));
else console.log("\n(no JS errors / console errors captured)");
await browser.close();
process.exit(0);
