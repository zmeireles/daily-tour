// FINAL UAT — desktop Daily Tour 2-stage redesign + mobile regression. LIVE qual,
// PT-PT guest. SANCTIONED form submit. exit 0. LIGHT theme.
//  A. Intake (1440): masthead, "Planear o Seu Dia" title, two-pane (form LEFT +
//     editorial São Miguel imagery RIGHT), not a narrow mobile column.
//  B. Timeline (1440): LEFT rail (~300px) = day-summary header + numbered index
//     + timeline + pinned toolbar [Partilhar + VOLTAR]; RIGHT = edge-to-edge route
//     map with NUMBERED markers + tea-green route line; rail↔map hover sync; PT desc.
//  C. Mobile (390): single-column editorial timeline + Partilhar + Voltar + bottom
//     tab bar — NOT the rail/map split.
// Selectors verified from source (daily-tour-desktop, tour-itinerary-rail,
// tour-route-map, map-view, intake-form).
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
const MOBILE = { width: 390, height: 844 };
const results = [];
const errors = [];
let ctx, page;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}
async function shot(name) {
  const p = `${SHOTS}${name}.png`;
  await page.screenshot({ path: p, fullPage: true }).catch(() => {});
  return p;
}
async function newCtx(browser, viewport) {
  if (ctx) await ctx.close();
  ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror[${results.length}] ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console[${results.length}] ${m.text().slice(0, 200)}`);
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
const countSelectedPins = () =>
  page.evaluate(() => {
    const map = document.querySelector('[aria-label="Map"]');
    return map ? [...map.querySelectorAll('path[stroke-width="5"]')].length : -1;
  });

// Submit the intake → returns the plan path (or null). Waits for chip hydration.
async function submitIntake() {
  await page
    .getByRole("checkbox")
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});
  await sleep(500);
  for (const label of [/^Ver$/i, /^Comer$/i]) {
    const chip = page.getByRole("checkbox", { name: label }).first();
    if ((await chip.count()) > 0) await chip.click();
  }
  const checked = await page.locator('[role="checkbox"][aria-checked="true"]').count();
  await page
    .getByRole("button", { name: /planear o meu dia|plan my day/i })
    .first()
    .click();
  const navigated = await page
    .waitForFunction(
      () => /^\/tour\/[^/]+$/.test(location.pathname) && location.pathname !== "/tour/new",
      { timeout: 30000 },
    )
    .then(() => true)
    .catch(() => false);
  return { navigated, checked, planPath: await page.evaluate(() => location.pathname) };
}
// Wait for the ready timeline (spinner clears + a stop heading/marker renders).
async function waitTimelineReady() {
  for (let i = 0; i < 40; i++) {
    const p = await page
      .evaluate(() => {
        const spinner = document.querySelector('[role="status"].animate-spin, [aria-busy="true"]');
        const fail = /tente novamente|não foi possível|demorou demasiado/i.test(
          document.body.innerText || "",
        );
        const heading = document.querySelector("h1.font-display, h2.font-display");
        const map = document.querySelector('[aria-label="Map"]');
        const stops = document.querySelectorAll("ol li, ul li, article").length;
        return { spinner: !!spinner, fail, heading: !!heading, map: !!map, stops };
      })
      .catch(() => ({}));
    if (p.fail) return { ready: false, fail: true };
    if (p.heading && !p.spinner && p.stops >= 1) return { ready: true, fail: false };
    await sleep(2500);
  }
  return { ready: false, fail: false };
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

// ════════════ A. DESKTOP INTAKE (1440) ════════════
await newCtx(browser, DESKTOP);
if (!(await enterAsGuest())) {
  step("A0 redeem", false);
} else {
  await forceLight();
  await spaNavigate("/tour/new");
  await page
    .getByRole("checkbox")
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});
  await page
    .locator("img")
    .first()
    .waitFor({ state: "visible", timeout: 10000 })
    .catch(() => {});
  await sleep(1500);

  const a = await page.evaluate(() => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const header = document.querySelector("header");
    const ht = header ? norm(header.innerText) : "";
    const masthead = /Daily Tour/i.test(ht) && /(o meu dia|meu dia)/i.test(ht);
    // Active "O meu dia" nav (aria-current or active styling).
    const meuDiaActive =
      !!header &&
      [...header.querySelectorAll("a")].some(
        (a) =>
          /meu dia/i.test(a.textContent || "") &&
          (a.getAttribute("aria-current") || /font-medium|text-on-surface\b/.test(a.className)),
      );
    const bottomNav = document.querySelector('nav[aria-label="Primary"]');
    let bottomVisible = false;
    if (bottomNav) {
      const r = bottomNav.getBoundingClientRect();
      bottomVisible =
        r.height > 0 &&
        r.bottom >= window.innerHeight - 4 &&
        getComputedStyle(bottomNav).display !== "none";
    }
    const title = norm(
      [...document.querySelectorAll("h1")]
        .map((h) => h.textContent)
        .find((t) => /planear o seu dia|plan your day/i.test(t || "")),
    );
    // Two-pane: form (has the wish checkboxes) LEFT, imagery panel (a large img +
    // host line) RIGHT.
    const form = document.querySelector("form");
    const chips = document.querySelectorAll('[role="checkbox"]').length;
    const formR = form?.getBoundingClientRect();
    const imgs = [...document.querySelectorAll("main img, img")].map((i) => ({
      r: i.getBoundingClientRect(),
      loaded: i.complete && i.naturalWidth > 0,
      src: (i.currentSrc || i.src || "").slice(0, 80),
    }));
    const bigImg = imgs
      .filter((i) => i.r.width > 250 && i.r.height > 250 && i.loaded)
      .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)[0];
    const formOnLeft = formR ? formR.left < window.innerWidth * 0.5 : false;
    const imgOnRight = bigImg ? bigImg.r.left > window.innerWidth * 0.45 : false;
    const bodyText = norm(document.body.innerText);
    const hostLine = /miguel/i.test(bodyText);
    return {
      masthead,
      meuDiaActive,
      bottomVisible,
      bottomInDom: !!bottomNav,
      title,
      chips,
      formOnLeft,
      imgOnRight,
      bigImgSrc: bigImg?.src || null,
      bigImgWH: bigImg ? `${Math.round(bigImg.r.width)}x${Math.round(bigImg.r.height)}` : null,
      hostLine,
      vw: window.innerWidth,
      headerText: ht.slice(0, 100),
    };
  });
  step(
    "A1 masthead (O meu dia) + NO bottom tab bar",
    a.masthead && !a.bottomVisible,
    `masthead=${a.masthead} meuDiaActive=${a.meuDiaActive} bottomVisible=${a.bottomVisible} header="${a.headerText}"`,
  );
  step('A2 "Planear o Seu Dia" masthead title', !!a.title, `title="${a.title}"`);
  step(
    "A3 two-pane: form LEFT (chips) + editorial imagery RIGHT (photo + host line), not mobile column",
    a.chips >= 6 && a.formOnLeft && a.imgOnRight && a.hostLine,
    `chips=${a.chips} formOnLeft=${a.formOnLeft} imgOnRight=${a.imgOnRight}(${a.bigImgWH},${a.bigImgSrc}) hostLineMiguel=${a.hostLine}`,
  );
  console.log(`  (intake capture: ${await shot("tour-intake-desktop-NEW-1440")})`);

  // ════════════ B. DESKTOP TIMELINE (1440) ════════════
  const sub = await submitIntake();
  step(
    "B0 intake submitted → /tour/<id>",
    sub.navigated,
    `checked=${sub.checked} planPath=${sub.planPath}`,
  );
  if (sub.navigated) {
    const r = await waitTimelineReady();
    await page
      .locator('[aria-label="Map"]')
      .first()
      .waitFor({ state: "visible", timeout: 20000 })
      .catch(() => {});
    await sleep(2500);
    step("B-ready timeline generated", r.ready && !r.fail, `ready=${r.ready} fail=${r.fail}`);

    // B1. RAIL: day-summary header + numbered index + pinned toolbar [Partilhar + VOLTAR].
    const b1 = await page.evaluate(() => {
      const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
      const railHead = [...document.querySelectorAll("h2.font-display, h1.font-display")]
        .map((h) => norm(h.textContent))
        .find((t) => /são miguel|seu dia/i.test(t));
      const subline = norm(
        [...document.querySelectorAll("p")]
          .map((p) => p.textContent)
          .find((t) => /paragens|stops?|paragem/i.test(t || "")),
      );
      const indexNav = document.querySelector("nav[aria-label]");
      const indexBtns = indexNav ? [...indexNav.querySelectorAll("button")] : [];
      const numbered = indexBtns.filter((b) => /^\s*\d+/.test(b.textContent || "")).length;
      // Pinned toolbar at the rail foot: a container with border-t holding Partilhar + a Voltar link.
      const allText = norm(document.body.innerText);
      const partilhar = [...document.querySelectorAll("button, a")].some((e) =>
        /partilhar|share/i.test(e.textContent || ""),
      );
      // Voltar: BackLink to "/" with the back label.
      const voltar = [...document.querySelectorAll('a[href="/"], a, button')].some((e) =>
        /voltar|back/i.test(e.textContent || ""),
      );
      const voltarEl = [...document.querySelectorAll("a, button")].find((e) =>
        /voltar|voltar ao início|back/i.test(e.textContent || ""),
      );
      return {
        railHead,
        subline,
        indexNavPresent: !!indexNav,
        numbered,
        partilhar,
        voltar,
        voltarText: norm(voltarEl?.textContent),
      };
    });
    step(
      "B1 rail: day-summary header + numbered index",
      !!b1.railHead && b1.indexNavPresent && b1.numbered >= 1,
      `head="${b1.railHead}" subline="${b1.subline}" indexNav=${b1.indexNavPresent} numberedRows=${b1.numbered}`,
    );
    step(
      "B1b rail toolbar has Partilhar AND VOLTAR (the bug)",
      b1.partilhar && b1.voltar,
      `partilhar=${b1.partilhar} voltar=${b1.voltar} voltarText="${b1.voltarText}"`,
    );

    // B2. ROUTE MAP: edge-to-edge RIGHT, numbered markers + route line, framed on island.
    const b2 = await page.evaluate(() => {
      const map = document.querySelector('[aria-label="Map"]');
      if (!map) return { mapPresent: false };
      const mr = map.getBoundingClientRect();
      // Numbered markers: badge spans (bg basalt, small) holding a numeral.
      const badges = [...map.querySelectorAll("span")].filter(
        (s) => /^\d+$/.test((s.textContent || "").trim()) && s.getBoundingClientRect().width <= 24,
      );
      const numerals = badges.map((s) => s.textContent.trim());
      // Route line is a maplibre canvas layer (not DOM) — presence inferred from
      // a canvas + >=2 markers. We also check the map's style has the route layer
      // via a global if exposed; otherwise rely on markers+visual.
      const canvas = !!map.querySelector("canvas.maplibregl-canvas");
      return {
        mapPresent: true,
        mapLeft: Math.round(mr.left),
        mapRight: Math.round(mr.right),
        mapW: Math.round(mr.width),
        vw: window.innerWidth,
        mapOnRight: mr.right >= window.innerWidth - 4,
        markerCount: badges.length,
        numerals,
        canvas,
      };
    });
    const routeArcShot = await shot("tour-timeline-desktop-NEW-1440");
    step(
      "B2 route map RIGHT edge-to-edge + numbered markers (route line)",
      b2.mapPresent && b2.mapOnRight && b2.markerCount >= 2 && b2.canvas,
      `map[${b2.mapLeft}-${b2.mapRight}/${b2.vw}] onRight=${b2.mapOnRight} markers=${b2.markerCount} numerals=[${(b2.numerals || []).join(",")}] canvas=${b2.canvas}`,
    );

    // B3. SYNC: hover rail index button #2 → it goes aria-current + a selected pin appears.
    const before = await countSelectedPins();
    const idxButtons = page.locator("nav[aria-label] button");
    const idxCount = await idxButtons.count();
    let syncOk = false,
      syncDetail = `indexButtons=${idxCount} selectedPinsBefore=${before}`;
    if (idxCount >= 2) {
      const tgt = idxButtons.nth(1);
      await tgt.hover();
      await sleep(1000);
      const current = await tgt.getAttribute("aria-current");
      const after = await countSelectedPins();
      syncOk = current === "true" && after >= 1;
      syncDetail = `indexButtons=${idxCount} hoveredRow#2 aria-current=${current} selectedPinsBefore=${before} after=${after}`;
    }
    step("B3 rail↔map sync: hover stop → marker highlights", syncOk, syncDetail);

    // B4. PT descriptions.
    const b4 = await page.evaluate(() => {
      const txt = document.body.innerText || "";
      const pt = (
        txt.match(
          /\b(comece|continue|aproveite|visite|desfrute|termine|almoço|manhã|tarde|caminhada|passeio|seguida|antes|depois|local|paragem|próximo|hóspedes)\b/gi,
        ) || []
      ).length;
      const en = (
        txt.match(
          /\b(start the morning|continue the|enjoy|wrap up|sightseeing loop|short drive|before lunch)\b/gi,
        ) || []
      ).length;
      // Grab one stop description verbatim.
      const items = [...document.querySelectorAll("ol > li, ul > li, article")];
      const descs = items
        .map((li) => (li.innerText || "").replace(/\s+/g, " ").trim())
        .filter((t) => t.length > 40)
        .slice(0, 2);
      return { pt, en, descs };
    });
    step(
      "B4 stop descriptions in Portuguese",
      b4.pt >= 2 && b4.en === 0,
      `ptHits=${b4.pt} enHits=${b4.en} sample="${(b4.descs[0] || "").slice(0, 160)}"`,
    );
    console.log(`  (timeline capture: ${routeArcShot})`);
  }
}

// ════════════ C. MOBILE REGRESSION (390) ════════════
await newCtx(browser, MOBILE);
if (!(await enterAsGuest())) {
  step("C0 redeem", false);
} else {
  await forceLight();
  await spaNavigate("/tour/new");
  const sub = await submitIntake();
  let r = { ready: false, fail: false };
  if (sub.navigated) r = await waitTimelineReady();
  await sleep(2000);
  const c = await page.evaluate(() => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const headline = norm(
      [...document.querySelectorAll("h1.font-display, h1")]
        .map((h) => h.textContent)
        .find((t) => /são miguel|seu dia/i.test(t || "")),
    );
    const map = document.querySelector('[aria-label="Map"]'); // desktop route-map → regression FAIL if present
    const bottomNav = document.querySelector('nav[aria-label="Primary"]');
    const bottomVisible = bottomNav
      ? bottomNav.getBoundingClientRect().bottom >= window.innerHeight - 6
      : false;
    const allText = norm(document.body.innerText);
    const partilhar = /partilhar|share/i.test(allText);
    const voltar = /voltar|back/i.test(allText);
    const stops = document.querySelectorAll("ol li, ul li, article").length;
    // single column: main content width ~ viewport (max-w-lg centered ≤ 512), NOT a rail/map split.
    const main = document.querySelector("main");
    const mainW = main ? Math.round(main.getBoundingClientRect().width) : 0;
    return {
      headline,
      hasDesktopMap: !!map,
      bottomNavVisible: bottomVisible,
      partilhar,
      voltar,
      stops,
      mainW,
      vw: window.innerWidth,
    };
  });
  const cok =
    !!c.headline &&
    !c.hasDesktopMap &&
    c.bottomNavVisible &&
    c.partilhar &&
    c.voltar &&
    c.stops >= 1;
  step(
    "C mobile tour regression — single-column timeline + Partilhar + Voltar + bottom tab bar, NOT rail/map",
    cok,
    `ready=${r.ready} headline="${c.headline}" desktopMapPresent=${c.hasDesktopMap} bottomTabBar=${c.bottomNavVisible} partilhar=${c.partilhar} voltar=${c.voltar} stops=${c.stops} mainW=${c.mainW}/${c.vw}`,
  );
  console.log(`  (mobile capture: ${await shot("tour-mobile-REGRESSION-390")})`);
}

console.log("\n— SUMMARY —");
const fails = results.filter((r) => !r.ok);
console.log(`${results.length - fails.length}/${results.length} checks passed`);
if (errors.length) console.log("\nJS ERRORS:\n" + [...new Set(errors)].join("\n"));
else console.log("\n(no JS errors)");
await browser.close();
process.exit(0);
