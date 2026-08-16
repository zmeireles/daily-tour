// Focused visual UAT — editorial CHAT screen restyle, LIGHT + DARK (T-2.D / D1 fix).
// Scrutinizes: top app bar (back chevron + circular Avatar "M" + host name
// "Miguel" + "Online" status w/ green dot, NO bottom tab bar), the "Hoje" day
// separator, host (cream/surface-container-low, left) vs guest (tea-green/
// bg-primary, right) bubbles + HH:MM timestamps, and the input row (rounded pill
// + decorative mic + tea-green circular Send). Verifies D1: /chat now applies the
// stored/auto theme — dark must render BASALT, not the light fallback.
//
// REPORT-ONLY (exit 0). One sanctioned interaction: typing "Olá!" + clicking
// Send (the task explicitly sanctions this read/write of a tagged-ish greeting),
// gated on the chat-hub WS reaching "open". playwright-core + system Chrome.
// Target: vite dev server http://127.0.0.1:5173 (working tree). BFF proxied :28080.
// Entry: opaque multi-use redeem token -> RTokenRoute -> guest JWT -> /chat.
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
const SHOTS = REPO + "/temp/uat-2d-chat/";
mkdirSync(SHOTS, { recursive: true });

// Phone is the canonical guest device: a host's link tapped on a phone. The chat
// is a single-column messenger; max-w-lg caps it but the design target is mobile.
const VIEWPORTS = { mobile: { width: 390, height: 844 } };

const results = [];
const errors = [];
let ctx, page;

function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}
async function shot(tag, fullPage = false) {
  const p = `${SHOTS}${tag}.png`;
  await page.screenshot({ path: p, fullPage }).catch(() => {});
  return `${tag}.png`;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(browser, viewport = VIEWPORTS.mobile) {
  if (ctx) await ctx.close();
  ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror[step ${results.length}]: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error")
      errors.push(`console[step ${results.length}]: ${m.text().slice(0, 240)}`);
  });
}

async function enterAndOpenChat() {
  // Redeem -> home, then route to /chat (theme applied via useThemeAuto, D1).
  await page.goto(`${BASE}/r/${TOKEN}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => location.pathname === "/", { timeout: 30000 }).catch(() => {});
  await page.goto(`${BASE}/chat`, { waitUntil: "domcontentloaded" });
  // Header h1 ("Miguel") is the cheapest "chat mounted" signal.
  await page
    .locator("header h1")
    .first()
    .waitFor({ state: "visible", timeout: 20000 })
    .catch(() => {});
  // Seeded history is REST-hydrated (independent of WS). Wait for at least one
  // bubble to appear so screenshots show the conversation.
  await page
    .locator('[data-testid^="chat-bubble-"]')
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
  await sleep(800);
}

async function forceTheme(theme) {
  await page.evaluate((t) => localStorage.setItem("theme", t), theme);
  await page.goto(`${BASE}/chat`, { waitUntil: "domcontentloaded" });
  await page
    .locator("header h1")
    .first()
    .waitFor({ state: "visible", timeout: 20000 })
    .catch(() => {});
  await page
    .locator('[data-testid^="chat-bubble-"]')
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
  await sleep(900);
  return page.evaluate(() => document.documentElement.getAttribute("data-theme"));
}

// ── colour math (sRGB relative luminance + WCAG contrast) ────────────────────
function parseRgb(s) {
  const m = String(s).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b] = m[1].split(",").map((x) => parseFloat(x));
  return [r, g, b];
}
function lum([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(fg, bg) {
  const a = parseRgb(fg),
    b = parseRgb(bg);
  if (!a || !b) return null;
  const L1 = lum(a),
    L2 = lum(b);
  const hi = Math.max(L1, L2),
    lo = Math.min(L1, L2);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}
function isLight([r, g, b]) {
  return lum([r, g, b]) > 0.5;
}

// ── header probe: back chevron, avatar "M", host name "Miguel", Online + dot,
//    and proof that NO bottom tab bar exists on this screen. ────────────────────
async function probeHeader() {
  return page.evaluate(() => {
    const header = document.querySelector("header");
    if (!header) return { present: false };
    const back = header.querySelector("button[aria-label]");
    const backIcon = back?.querySelector("svg");
    const avatar = [...header.querySelectorAll("*")].find(
      (el) => el.children.length === 0 && el.textContent.trim() === "M" && el !== back,
    );
    const avatarBox = avatar?.closest("span,div") || avatar;
    const h1 = header.querySelector("h1");
    const onlineP = [...header.querySelectorAll("p")].find((p) =>
      /online/i.test(p.textContent || ""),
    );
    const dot = onlineP?.querySelector("span[class*='rounded-full']");
    const cs = (el) => (el ? getComputedStyle(el) : null);
    // Normalise any colour (incl. oklch) to rgb by round-tripping through a
    // canvas — getComputedStyle returns the authored oklch() for bg-green-500,
    // which a naive rgb()-only parser can't read.
    const toRgb = (col) => {
      if (!col) return null;
      try {
        const cv = document.createElement("canvas");
        cv.width = cv.height = 1;
        const cx = cv.getContext("2d");
        cx.fillStyle = "#000";
        cx.fillStyle = col;
        cx.fillRect(0, 0, 1, 1);
        const [r, g, b] = cx.getImageData(0, 0, 1, 1).data;
        return `rgb(${r}, ${g}, ${b})`;
      } catch {
        return col;
      }
    };
    const h1cs = cs(h1);
    const dotcs = cs(dot);
    const onlinecs = cs(onlineP);
    const hcs = cs(header);
    const avRect = avatarBox?.getBoundingClientRect();
    // Bottom tab bar must NOT be present on /chat.
    const tabBar = document.querySelector('nav[aria-label="Primary"]');
    return {
      present: true,
      headerBg: hcs.backgroundColor,
      hasBack: !!back && !!backIcon,
      backLabel: back?.getAttribute("aria-label") || null,
      avatarText: avatar?.textContent?.trim() || null,
      avatarRound: avatarBox
        ? parseFloat(cs(avatarBox).borderRadius) >= 12 || cs(avatarBox).borderRadius.includes("50")
        : false,
      avatarW: avRect ? Math.round(avRect.width) : null,
      avatarH: avRect ? Math.round(avRect.height) : null,
      avatarBg: avatarBox ? cs(avatarBox).backgroundColor : null,
      h1Text: h1?.textContent?.trim() || null,
      h1Color: h1cs?.color || null,
      h1Font: h1cs?.fontFamily || null,
      onlineText: onlineP?.textContent?.replace(/\s+/g, " ").trim() || null,
      onlineColor: onlinecs?.color || null,
      hasDot: !!dot,
      dotBg: toRgb(dotcs?.backgroundColor) || null,
      dotBgRaw: dotcs?.backgroundColor || null,
      tabBarPresent: !!tabBar,
      // Any stray "João" anywhere in the document is a regression.
      joaoAnywhere: /jo[aã]o/i.test(document.body.textContent || ""),
    };
  });
}

// ── day separator + bubbles + timestamps probe. ──────────────────────────────
async function probeConversation() {
  return page.evaluate(() => {
    const sep = document.querySelector('[data-testid="chat-day-separator"]');
    const sepSpan = sep?.querySelector("span");
    const them = [...document.querySelectorAll('[data-testid="chat-bubble-them"]')];
    const me = [...document.querySelectorAll('[data-testid="chat-bubble-me"]')];
    const timesThem = [...document.querySelectorAll('[data-testid="chat-time-them"]')];
    const timesMe = [...document.querySelectorAll('[data-testid="chat-time-me"]')];
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const pageBg = cs(document.body).backgroundColor;

    const describeBubble = (b) => {
      const bcs = cs(b);
      const wrap = b.parentElement; // flex items-end/items-start
      const wcs = cs(wrap);
      return {
        text: b.textContent.trim().slice(0, 40),
        bg: bcs.backgroundColor,
        color: bcs.color,
        radius: bcs.borderRadius,
        // side: items-end => right (guest/me), items-start => left (host/them)
        align: wcs.alignItems,
        left: Math.round(b.getBoundingClientRect().left),
        right: Math.round(b.getBoundingClientRect().right),
      };
    };
    const sepcs = cs(sepSpan);
    const timeText = (arr) => (arr[0] ? arr[0].textContent.trim() : null);
    const timeMatches = (arr) => arr.every((t) => /^\d{1,2}[:hH.]\d{2}/.test(t.textContent.trim()));
    return {
      separatorText: sepSpan?.textContent?.trim() || null,
      separatorColor: sepcs?.color || null,
      separatorBg: sepcs?.backgroundColor || null,
      separatorCount: document.querySelectorAll('[data-testid="chat-day-separator"]').length,
      themCount: them.length,
      meCount: me.length,
      host: them.map(describeBubble),
      guest: me.map(describeBubble),
      hostTimes: timesThem.map((t) => t.textContent.trim()),
      guestTimes: timesMe.map((t) => t.textContent.trim()),
      timesLookLikeHHMM:
        timeMatches(timesThem) && timeMatches(timesMe) && timesThem.length + timesMe.length > 0,
      sampleTime: timeText(timesThem) || timeText(timesMe),
      timeColor: cs(timesThem[0] || timesMe[0])?.color || null,
      viewportW: window.innerWidth,
      pageBg,
    };
  });
}

// ── input row probe: pill input, decorative mic, circular tea-green send. ──────
async function probeInput() {
  return page.evaluate(() => {
    const input = document.querySelector('form input[type="text"]');
    const mic = document.querySelector('[data-testid="chat-mic"]');
    const send = document.querySelector('form button[type="submit"]');
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const ics = cs(input);
    const scs = cs(send);
    const sendRect = send?.getBoundingClientRect();
    return {
      hasInput: !!input,
      inputRadius: ics?.borderRadius || null,
      inputBg: ics?.backgroundColor || null,
      inputDisabled: input?.disabled ?? null,
      placeholder: input?.getAttribute("placeholder") || null,
      hasMic: !!mic,
      hasSend: !!send,
      sendLabel: send?.getAttribute("aria-label") || null,
      sendBg: scs?.backgroundColor || null,
      sendRadius: scs?.borderRadius || null,
      sendDisabled: send?.disabled ?? null,
      sendCircular: sendRect
        ? Math.abs(sendRect.width - sendRect.height) <= 2 &&
          (parseFloat(scs.borderRadius) >= sendRect.width / 2 - 2 ||
            scs.borderRadius.includes("50") ||
            scs.borderRadius.includes("9999"))
        : false,
      sendW: sendRect ? Math.round(sendRect.width) : null,
      sendH: sendRect ? Math.round(sendRect.height) : null,
    };
  });
}

async function probeWs() {
  return page.evaluate(() => {
    // status text leaks via the connecting placeholder / input disabled state.
    const connecting = document.querySelector('[data-testid="chat-connecting"]');
    const input = document.querySelector('form input[type="text"]');
    return {
      connectingVisible: !!connecting,
      inputDisabled: input?.disabled ?? null,
    };
  });
}

const EXPECT = { light: "light", dark: "dark" };

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

await newPage(browser, VIEWPORTS.mobile);
await enterAndOpenChat();

const probes = {};

for (const theme of ["light", "dark"]) {
  const applied = await forceTheme(theme);
  await sleep(700);
  const T = theme.toUpperCase();

  const header = await probeHeader();
  const convo = await probeConversation();
  const input = await probeInput();
  const ws = await probeWs();

  // Full-page conversation screenshot.
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(250);
  const fullShot = await shot(`${theme}-chat`, true);

  probes[theme] = { applied, header, convo, input, ws, shots: { fullShot } };

  // ── (D1) theme applied + canvas actually changes ──────────────────────────
  step(
    `${T} (D1) theme applied (<html data-theme>)`,
    applied === EXPECT[theme],
    `data-theme=${applied} pageBg=${convo.pageBg} headerBg=${header.headerBg}`,
  );

  // (b) header — back chevron + avatar "M" + "Miguel" + green Online dot.
  const h = header;
  const hcontrast = contrast(h.h1Color, h.headerBg);
  const onlineContrast = contrast(h.onlineColor, h.headerBg);
  const dotRgb = parseRgb(h.dotBg);
  const dotIsGreen = dotRgb ? dotRgb[1] > dotRgb[0] && dotRgb[1] > dotRgb[2] : false;
  const headerOk =
    h.present &&
    h.hasBack &&
    h.avatarText === "M" &&
    h.avatarRound &&
    h.h1Text === "Miguel" &&
    /miguel/i.test(h.h1Text || "") &&
    /online/i.test(h.onlineText || "") &&
    h.hasDot &&
    dotIsGreen &&
    !h.tabBarPresent &&
    (hcontrast ?? 0) >= 4.5;
  step(
    `${T} (b) header — back + avatar "M" + "Miguel" + green Online dot, no tab bar`,
    headerOk,
    `back=${h.hasBack}(${h.backLabel}) avatar="${h.avatarText}"(round=${h.avatarRound},${h.avatarW}x${h.avatarH}) name="${h.h1Text}"(contrast=${hcontrast}) online="${h.onlineText}"(contrast=${onlineContrast}) dot=${h.hasDot}/green=${dotIsGreen}(${h.dotBg}) tabBar=${h.tabBarPresent} font=${/Fraunces/i.test(h.h1Font || "") ? "Fraunces" : h.h1Font}`,
  );

  // (b2) host name is Miguel, NOT João, anywhere on screen.
  step(
    `${T} host reads "Miguel" not "João" (no "João" anywhere)`,
    h.h1Text === "Miguel" && !h.joaoAnywhere,
    `h1="${h.h1Text}" joaoAnywhereInDoc=${h.joaoAnywhere}`,
  );

  // (d) day separator — single "Hoje", legible.
  const c = convo;
  const sepContrast = contrast(c.separatorColor, c.separatorBg);
  const sepOk =
    /hoje/i.test(c.separatorText || "") && c.separatorCount === 1 && (sepContrast ?? 0) >= 3.0;
  step(
    `${T} (d) day separator — single "Hoje", legible`,
    sepOk,
    `text="${c.separatorText}" count=${c.separatorCount} contrast=${sepContrast}`,
  );

  // (c) bubbles — 2 host (cream, left) + 1 guest (tea-green, right), timestamps.
  const hostAllLeft = c.host.every((b) => b.align === "flex-start");
  const guestAllRight = c.guest.every((b) => b.align === "flex-end");
  // Host bubble bg must read as a light/cream surface; guest must read as a
  // saturated tea-green (g channel dominant, mid luminance), distinct from host.
  const hostBg = c.host[0] ? parseRgb(c.host[0].bg) : null;
  const guestBg = c.guest[0] ? parseRgb(c.guest[0].bg) : null;
  const guestIsTeaGreen = guestBg ? guestBg[1] >= guestBg[0] && guestBg[1] >= guestBg[2] : false;
  const bubblesDiffer = hostBg && guestBg && c.host[0].bg !== c.guest[0].bg;
  const hostTextContrast = c.host[0] ? contrast(c.host[0].color, c.host[0].bg) : null;
  const guestTextContrast = c.guest[0] ? contrast(c.guest[0].color, c.guest[0].bg) : null;
  // Seed baseline = 2 host + 1 guest. Scenario 3's sanctioned send persists a
  // durable "Olá!" row, so a guest count >1 on a repeat run is expected, not a
  // defect — assert the baseline (>=2 host, >=1 guest) and that EVERY host is
  // cream/left and EVERY guest is tea-green/right.
  const allGuestTeaGreen = c.guest.every((b) => {
    const g = parseRgb(b.bg);
    return g && g[1] >= g[0] && g[1] >= g[2];
  });
  const bubblesOk =
    c.themCount >= 2 &&
    c.meCount >= 1 &&
    hostAllLeft &&
    guestAllRight &&
    allGuestTeaGreen &&
    bubblesDiffer &&
    c.timesLookLikeHHMM &&
    (hostTextContrast ?? 0) >= 4.5 &&
    (guestTextContrast ?? 0) >= 4.5;
  step(
    `${T} (c) bubbles — host(cream,left) + guest(tea-green,right) + HH:MM [seed: 2 host/1 guest]`,
    bubblesOk,
    `host=${c.themCount}(left=${hostAllLeft},bg=${c.host[0]?.bg},textContrast=${hostTextContrast}) guest=${c.meCount}(right=${guestAllRight},allTeaGreen=${allGuestTeaGreen},bg=${c.guest[0]?.bg},textContrast=${guestTextContrast}) differ=${bubblesDiffer} times=[${[...c.hostTimes, ...c.guestTimes].join(",")}] HHMM=${c.timesLookLikeHHMM}${c.meCount > 1 ? " (note: guest>1 = persisted UAT 'Olá!' sends, not a defect)" : ""}`,
  );

  // (e) input row — pill input + mic + circular tea-green send.
  const ip = input;
  const inputIsPill =
    ip.inputRadius && (parseFloat(ip.inputRadius) >= 16 || ip.inputRadius.includes("9999"));
  const sendBgRgb = parseRgb(ip.sendBg);
  const sendIsTeaGreen = sendBgRgb
    ? sendBgRgb[1] >= sendBgRgb[0] && sendBgRgb[1] >= sendBgRgb[2]
    : false;
  const inputOk =
    ip.hasInput &&
    inputIsPill &&
    ip.hasMic &&
    ip.hasSend &&
    /enviar|send/i.test(ip.sendLabel || "") &&
    ip.sendCircular &&
    sendIsTeaGreen;
  step(
    `${T} (e) input row — pill input + mic + circular tea-green Send`,
    inputOk,
    `input(pill=${inputIsPill},radius=${ip.inputRadius},bg=${ip.inputBg},disabled=${ip.inputDisabled}) mic=${ip.hasMic} send(label=${ip.sendLabel},circular=${ip.sendCircular}/${ip.sendW}x${ip.sendH},bg=${ip.sendBg},teaGreen=${sendIsTeaGreen},disabled=${ip.sendDisabled})`,
  );

  // (f) layout — no horizontal overflow.
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 2,
  );
  step(`${T} (f) no horizontal overflow`, fits, `fits=${fits}`);
}

// ── DARK input close-up (scenario 4) ─────────────────────────────────────────
{
  // We are currently in DARK (last loop iteration). Scroll the form into view
  // and shoot a tight crop of the input row.
  const formBox = await page
    .locator("form")
    .first()
    .boundingBox()
    .catch(() => null);
  if (formBox) {
    const pad = 8;
    await page.screenshot({
      path: `${SHOTS}dark-chat-input.png`,
      clip: {
        x: Math.max(0, formBox.x - pad),
        y: Math.max(0, formBox.y - pad),
        width: Math.min(390, formBox.width + pad * 2),
        height: formBox.height + pad * 2,
      },
    });
    step("DARK input close-up captured", true, "dark-chat-input.png");
  } else {
    step("DARK input close-up captured", false, "form bounding box not found");
  }
}

// ── LIGHT — send a message (scenario 3, sanctioned interaction) ──────────────
{
  const applied = await forceTheme("light");
  step("LIGHT (send) re-enter chat in light theme", applied === "light", `data-theme=${applied}`);

  const ws0 = await probeWs();
  const beforeMe = await page.locator('[data-testid="chat-bubble-me"]').count();

  // The input is disabled until the chat-hub WS reaches "open". Wait up to 12s.
  let wsOpen = false;
  for (let i = 0; i < 24; i++) {
    const w = await probeWs();
    if (w.inputDisabled === false) {
      wsOpen = true;
      break;
    }
    await sleep(500);
  }

  if (wsOpen) {
    const inputBox = page.locator('form input[type="text"]');
    await inputBox.click().catch(() => {});
    await inputBox.fill("Olá!").catch(() => {});
    await page
      .locator("form button[type=submit]")
      .click()
      .catch(() => {});
    // Optimistic "me" bubble appends synchronously on send.
    await page
      .locator('[data-testid="chat-bubble-me"]')
      .nth(beforeMe)
      .waitFor({ state: "visible", timeout: 6000 })
      .catch(() => {});
    await sleep(600);
    const afterMe = await page.locator('[data-testid="chat-bubble-me"]').count();
    const newBubble = await page.evaluate(() => {
      const me = [...document.querySelectorAll('[data-testid="chat-bubble-me"]')];
      const last = me[me.length - 1];
      if (!last) return null;
      const cs = getComputedStyle(last);
      const wrap = getComputedStyle(last.parentElement);
      return { text: last.textContent.trim(), bg: cs.backgroundColor, align: wrap.alignItems };
    });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(300);
    await shot("light-chat-sent", true);
    const appended = afterMe === beforeMe + 1;
    const greenRight = newBubble && /olá!/i.test(newBubble.text) && newBubble.align === "flex-end";
    step(
      'LIGHT (3) send "Olá!" appends a tea-green guest bubble (right)',
      appended && greenRight,
      `beforeMe=${beforeMe} afterMe=${afterMe} newBubble="${newBubble?.text}" align=${newBubble?.align} bg=${newBubble?.bg}`,
    );
  } else {
    // WS never opened — input stays disabled, send is impossible. This is the
    // chat-hub WS outage the brief warned about, NOT a restyle defect. Capture
    // the disabled-input state for evidence and report NOT AUTOMATED.
    await shot("light-chat-sent", true);
    step(
      'LIGHT (3) send "Olá!" — NOT AUTOMATED (chat-hub WS never reached "open")',
      false,
      `input stayed disabled (WS status != open); send is gated on WS — not a restyle defect. ws0.inputDisabled=${ws0.inputDisabled}`,
    );
  }
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("\n— SUMMARY —");
const fails = results.filter((r) => !r.ok);
console.log(`${results.length - fails.length}/${results.length} checks passed`);
console.log("\nFULL PROBES (computed styles / geometry per theme):");
console.log(JSON.stringify(probes, null, 2));
if (errors.length) console.log("\nJS ERRORS / CONSOLE:\n" + errors.join("\n"));
else console.log("\n(no JS errors / console errors captured)");
await browser.close();
process.exit(0);
