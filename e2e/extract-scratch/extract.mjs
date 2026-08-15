// Public-listing extractor for Miguel's own guesthouse listings.
// Real Chrome via playwright-core. Captures gallery photo URLs (highest-res),
// title/description/location/coords/capacity/amenities, full-page screenshot.
// Read-only: no logins, no captcha bypass. Blocked => record + move on.
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "/usr/bin/google-chrome-stable";
const OUT = "/media/jmeireles/ssd3/my-projects/daily-tour/temp/miguel-photos";
mkdirSync(OUT, { recursive: true });

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const LISTINGS = [
  {
    slug: "the-escape",
    name: "The Escape",
    url: "https://www.airbnb.com/rooms/983252547193347145",
    kind: "airbnb",
  },
  {
    slug: "the-view",
    name: "The View",
    url: "https://www.airbnb.com/rooms/34995876",
    kind: "airbnb",
  },
  {
    slug: "the-view-point",
    name: "The View Point",
    url: "https://www.airbnb.com/rooms/983284485446555038",
    kind: "airbnb",
  },
  {
    slug: "the-place",
    name: "The Place",
    url: "https://www.booking.com/hotel/pt/the-place.html",
    kind: "booking",
  },
];

const log = (...a) => console.log(...a);

// Upgrade an a0.muscache.com picture URL to its highest-res variant.
function maxResMuscache(u) {
  if (!u) return u;
  // muscache image URLs end with /original/... or /im/pictures/...?im_w=720 etc.
  // Drop sizing query params and force the large policy where present.
  let url = u;
  // Strip all sizing/quality query params to get the original/highest-res asset.
  url = url.replace(/[?&]im_w=\d+/g, "");
  url = url.replace(/[?&]aki_policy=[a-z_]+/g, "");
  url = url.replace(/[?&]width=\d+/g, "");
  url = url.replace(/[?&]height=\d+/g, "");
  url = url.replace(/[?&]quality=\d+/g, "");
  url = url.replace(/[?&]auto=[a-z]+/g, "");
  url = url.replace(/&+/g, "&").replace(/[?&]$/, "");
  return url;
}

// Recursively walk a JSON tree collecting muscache image URLs.
function collectMuscacheUrls(node, set) {
  if (node == null) return;
  if (typeof node === "string") {
    if (
      /https?:\/\/a0\.muscache\.com\/[^"' )]+\.(jpe?g|png|webp)/i.test(node) ||
      /https?:\/\/a0\.muscache\.com\/im\/pictures\//i.test(node) ||
      /https?:\/\/a0\.muscache\.com\/pictures\//i.test(node)
    ) {
      set.add(node);
    }
    return;
  }
  if (Array.isArray(node)) {
    for (const v of node) collectMuscacheUrls(v, set);
    return;
  }
  if (typeof node === "object") {
    for (const k of Object.keys(node)) collectMuscacheUrls(node[k], set);
  }
}

// Find first value for any of the given keys, deep.
function deepFind(node, keyMatcher, valTest, found = { v: undefined }) {
  if (found.v !== undefined || node == null) return found.v;
  if (Array.isArray(node)) {
    for (const v of node) {
      deepFind(v, keyMatcher, valTest, found);
      if (found.v !== undefined) break;
    }
    return found.v;
  }
  if (typeof node === "object") {
    for (const k of Object.keys(node)) {
      if (keyMatcher(k) && valTest(node[k])) {
        found.v = node[k];
        return found.v;
      }
      deepFind(node[k], keyMatcher, valTest, found);
      if (found.v !== undefined) break;
    }
  }
  return found.v;
}

async function acceptConsent(page) {
  const selectors = [
    'button:has-text("Accept all")',
    'button:has-text("Only necessary")',
    'button:has-text("Accept")',
    'button:has-text("Aceitar")',
    'button:has-text("OK")',
    'button:has-text("I agree")',
    '[data-testid="accept-btn"]',
    "#onetrust-accept-btn-handler",
    'button[aria-label*="Accept"]',
    'button[aria-label*="Aceitar"]',
    '[role="dialog"] button:has-text("OK")',
  ];
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1200 })) {
        await el.click({ timeout: 2000 });
        await page.waitForTimeout(600);
        return true;
      }
    } catch {
      /* not present */
    }
  }
  return false;
}

function detectBlock(html, title) {
  const t = (title || "").toLowerCase();
  const h = (html || "").slice(0, 5000).toLowerCase();
  if (
    t.includes("access denied") ||
    t.includes("forbidden") ||
    t.includes("robot") ||
    t.includes("captcha")
  )
    return true;
  if (h.includes("px-captcha") || h.includes("are you a human") || h.includes("unusual traffic"))
    return true;
  if (h.includes("access to this page has been denied")) return true;
  return false;
}

async function scrollGallery(page) {
  // Trigger lazy-loaded images by scrolling through the page.
  await page.evaluate(async () => {
    await new Promise((res) => {
      let y = 0;
      const t = setInterval(() => {
        window.scrollBy(0, 900);
        y += 900;
        if (y >= document.body.scrollHeight + 2000) {
          clearInterval(t);
          res();
        }
      }, 120);
    });
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
}

async function extractAirbnb(page) {
  const out = { photoUrls: [] };
  // 1) Pull the deferred-state JSON blobs (most reliable source).
  const jsonText = await page.evaluate(() => {
    const ids = ["data-deferred-state-0", "data-deferred-state", "data-injector-instances"];
    const out = [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && el.textContent) out.push(el.textContent);
    }
    // also any application/json scripts
    for (const s of document.querySelectorAll('script[type="application/json"]')) {
      if (s.textContent && s.textContent.length > 200) out.push(s.textContent);
    }
    return out;
  });

  const imgSet = new Set();
  let parsed = null;
  for (const txt of jsonText) {
    try {
      const j = JSON.parse(txt);
      collectMuscacheUrls(j, imgSet);
      if (!parsed && JSON.stringify(j).includes("muscache")) parsed = j;
    } catch {
      /* not JSON */
    }
  }

  // 2) Also collect from rendered <img>/<picture> DOM (gallery thumbnails).
  const domImgs = await page.evaluate(() => {
    const urls = new Set();
    for (const img of document.querySelectorAll("img")) {
      const cand = img.currentSrc || img.src;
      if (cand && /a0\.muscache\.com/.test(cand)) urls.add(cand);
      const ss = img.getAttribute("srcset");
      if (ss)
        ss.split(",").forEach((p) => {
          const u = p.trim().split(" ")[0];
          if (/a0\.muscache\.com/.test(u)) urls.add(u);
        });
    }
    for (const src of document.querySelectorAll("source")) {
      const ss = src.getAttribute("srcset");
      if (ss)
        ss.split(",").forEach((p) => {
          const u = p.trim().split(" ")[0];
          if (/a0\.muscache\.com/.test(u)) urls.add(u);
        });
    }
    return [...urls];
  });
  domImgs.forEach((u) => imgSet.add(u));

  // Filter to listing photos (im/pictures or /pictures/ paths; drop tiny avatars/icons).
  const photos = [...imgSet]
    .map(maxResMuscache)
    // Keep only the listing-gallery photo paths: /im/pictures/miso|hosting/Hosting-<id>/...
    // and the older /im/pictures/<uuid>.jpg form. Reject the bare legacy
    // /pictures/<uuid>.jpg (shared host/building badge, not a gallery photo).
    .filter((u) => /\/im\/pictures\//i.test(u))
    .filter(
      (u) =>
        !/profile|user|avatar|icon|\/map|svg|PlatformAssets|Review-AI|AirbnbPlatformAssets|hosting-logo/i.test(
          u,
        ),
    );
  out.photoUrls = [...new Set(photos)];

  // 3) Metadata from DOM (role-based / semantic), with JSON fallbacks.
  out.title = await page.title();
  const h1 = await page
    .locator("h1")
    .first()
    .textContent()
    .catch(() => null);
  if (h1) out.titleH1 = h1.trim();

  // OpenGraph + meta fallbacks.
  const meta = await page.evaluate(() => {
    const g = (p) =>
      document.querySelector(`meta[property="${p}"]`)?.content ||
      document.querySelector(`meta[name="${p}"]`)?.content ||
      null;
    return {
      ogTitle: g("og:title"),
      ogDesc: g("og:description"),
      desc: g("description"),
      ogImage: g("og:image"),
    };
  });
  out.ogTitle = meta.ogTitle;
  out.ogDescription = meta.ogDescription || meta.ogDesc;

  // Coords: meta tags or deep search of JSON state.
  const metaCoords = await page.evaluate(() => {
    const lat = document.querySelector(
      'meta[property="airbedandbreakfast:location:latitude"], meta[property="place:location:latitude"]',
    )?.content;
    const lng = document.querySelector(
      'meta[property="airbedandbreakfast:location:longitude"], meta[property="place:location:longitude"]',
    )?.content;
    return { lat: lat || null, lng: lng || null };
  });
  out.lat = metaCoords.lat;
  out.lng = metaCoords.lng;
  if (parsed && (!out.lat || !out.lng)) {
    const lat = deepFind(
      parsed,
      (k) => /^lat(itude)?$/i.test(k),
      (v) => typeof v === "number" && Math.abs(v) > 1 && Math.abs(v) < 90,
    );
    const lng = deepFind(
      parsed,
      (k) => /^(lng|lon|longitude)$/i.test(k),
      (v) => typeof v === "number" && Math.abs(v) > 1 && Math.abs(v) < 180,
    );
    if (lat != null) out.lat = String(lat);
    if (lng != null) out.lng = String(lng);
  }

  // Description: from JSON sectionedDescription or og:description; plus visible text.
  let desc = null;
  if (parsed) {
    desc = deepFind(
      parsed,
      (k) => /^(htmlDescription|description)$/i.test(k),
      (v) =>
        (typeof v === "string" && v.length > 80) ||
        (v && typeof v === "object" && typeof v.htmlText === "string"),
    );
    if (desc && typeof desc === "object") desc = desc.htmlText;
  }
  if (!desc) {
    desc = await page.evaluate(() => {
      const el =
        document.querySelector('[data-section-id="DESCRIPTION_DEFAULT"]') ||
        document.querySelector('div[data-testid="pdp-description"]');
      return el ? el.innerText : null;
    });
  }
  out.description = desc
    ? desc
        .replace(/<br\s*\/?>/g, "\n")
        .replace(/<[^>]+>/g, "")
        .trim()
    : out.ogDescription || null;

  // Location: pick the SHORTEST clean "<City>, <Region>, <Country>" line from the
  // LOCATION_DEFAULT section (never the "Where you'll be" heading nor the long
  // neighbourhood blurb). Also capture the neighbourhood description separately.
  const locData = await page.evaluate(() => {
    const sec = document.querySelector('[data-section-id="LOCATION_DEFAULT"]');
    if (!sec) return { location: null, neighbourhood: null };
    const texts = [...sec.querySelectorAll("h1,h2,h3,h4,div,span,a,p")]
      .map((e) => e.textContent?.trim())
      .filter(Boolean);
    const placeLines = texts.filter((t) =>
      /(Portugal|Açores|Azores|Ponta Delgada|São Miguel)/i.test(t),
    );
    // clean place line = names a place, no neighbourhood prose, short
    const clean = placeLines
      .filter(
        (t) => t.length < 70 && /,/.test(t) && !/neighbor|quiet|market|dining|gas station/i.test(t),
      )
      .sort((a, b) => a.length - b.length)[0];
    const blurb = placeLines.find((t) => /neighbor|quiet|market|dining/i.test(t)) || null;
    return { location: clean || null, neighbourhood: blurb };
  });
  out.location = locData.location;
  out.neighbourhood = locData.neighbourhood;
  if (parsed && !out.location) {
    const fromJson = deepFind(
      parsed,
      (k) => /^(localizedCity|localizedAddress|publicAddress|city)$/i.test(k),
      (v) => typeof v === "string" && v.length > 2,
    );
    if (fromJson) out.location = fromJson;
  }
  if (!out.location && out.ogTitle) {
    const m = out.ogTitle.match(/\bin\s+([A-ZÁÀÂÃ][\w\sãáàâéíóôú-]+?)\s*(·|$)/);
    if (m) out.location = m[1].trim();
  }

  // Capacity: parse overview text "x guests · y bedrooms · z beds · w baths".
  out.capacity = await page.evaluate(() => {
    const txt = document.body.innerText;
    const m = txt.match(
      /(\d+)\s+guests?[^]*?(\d+)\s+bedrooms?[^]*?(\d+)\s+beds?[^]*?([\d.]+)\s+bath/i,
    );
    if (m) return { guests: +m[1], bedrooms: +m[2], beds: +m[3], baths: m[4] };
    const parts = {};
    const g = txt.match(/(\d+)\s+guests?/i);
    if (g) parts.guests = +g[1];
    const b = txt.match(/(\d+)\s+bedrooms?/i);
    if (b) parts.bedrooms = +b[1];
    const bd = txt.match(/(\d+)\s+beds?/i);
    if (bd) parts.beds = +bd[1];
    const ba = txt.match(/([\d.]+)\s+bath/i);
    if (ba) parts.baths = ba[1];
    return Object.keys(parts).length ? parts : null;
  });

  // Amenities: the JSON deferred-state carries the COMPLETE list with availability
  // flags ({title, icon, available}). That's the canonical source; DOM preview is
  // only a thin fallback. Unavailable items are prefixed "Unavailable: ".
  let amenities = [];
  const allTexts = [];
  for (const txt of jsonText) {
    try {
      allTexts.push(JSON.parse(txt));
    } catch {
      /* skip */
    }
  }
  const aset = new Set();
  const collectAmen = (n) => {
    if (n == null) return;
    if (Array.isArray(n)) return n.forEach(collectAmen);
    if (typeof n === "object") {
      if (typeof n.title === "string" && n.icon && "available" in n && n.title.length < 70) {
        aset.add((n.available === false ? "Unavailable: " : "") + n.title);
      }
      for (const k of Object.keys(n)) collectAmen(n[k]);
    }
  };
  for (const j of allTexts) collectAmen(j);
  amenities = [...aset];
  if (amenities.length < 5) {
    amenities = await page.evaluate(() => {
      const sec = document.querySelector('[data-section-id="AMENITIES_DEFAULT"]');
      if (!sec) return [];
      return [...sec.querySelectorAll("div, span")]
        .map((e) => e.textContent?.trim())
        .filter((t) => t && t.length > 1 && t.length < 70);
    });
  }
  // Clean: drop UI chrome, dedup case-folded, collapse doubled labels.
  const seen = new Set();
  out.amenities = [];
  for (let a of amenities) {
    if (!a) continue;
    if (/^what this place offers$|^show all|^amenities$|^getting around$/i.test(a)) continue;
    a = a.replace(/^(?:Unavailable:\s*)?(.+?)\1$/, (m, p) =>
      m.startsWith("Unavailable") ? "Unavailable: " + p : p,
    );
    const key = a.toLowerCase().replace(/^unavailable:\s*/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.amenities.push(a);
  }
  out.amenities = out.amenities.slice(0, 80);

  return out;
}

async function extractBooking(page) {
  const out = { photoUrls: [] };
  // Booking gallery uses cf.bstatic.com / bstatic.com images.
  await scrollGallery(page);
  // Try to open the gallery grid for full set.
  try {
    const trigger = page
      .locator('[data-testid="gallery-thumbnail"], button:has-text("photos"), a:has-text("photos")')
      .first();
    if (await trigger.isVisible({ timeout: 1500 })) {
      await trigger.click({ timeout: 2000 });
      await page.waitForTimeout(1500);
    }
  } catch {
    /* no gallery trigger */
  }

  const imgs = await page.evaluate(() => {
    const urls = new Set();
    const grab = (u) => {
      if (u && /bstatic\.com/.test(u)) urls.add(u);
    };
    for (const img of document.querySelectorAll("img")) {
      grab(img.currentSrc);
      grab(img.src);
      const ss = img.getAttribute("srcset");
      if (ss) ss.split(",").forEach((p) => grab(p.trim().split(" ")[0]));
      grab(img.getAttribute("data-highres"));
    }
    // Mine the raw HTML for the FULL gallery — every hotel photo URL carries a
    // numeric id + required k= hash key; these appear in JSON/script even when
    // not yet rendered as <img>.
    const re =
      /https:\/\/cf\.bstatic\.com\/xdata\/images\/hotel\/[a-z0-9x]+\/\d+\.jpg\?k=[a-f0-9]+&o=[^"'\\ )]*/g;
    const html = document.documentElement.innerHTML.replace(/\\\//g, "/").replace(/\\u002F/g, "/");
    let m;
    while ((m = re.exec(html))) grab(m[0]);
    return [...urls];
  });
  // Keep only hotel-gallery photos, upgrade each to max1024x768, dedupe by numeric id.
  const byId = new Map();
  for (let u of imgs) {
    if (!/\/images\/hotel\//.test(u)) continue;
    u = u.replace(/\/(square\d+|max\d+x\d+|max\d+|\d+x\d+)\//, "/max1024x768/");
    const id = (u.match(/hotel\/[^/]+\/(\d+)\.jpg/) || [])[1];
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, u); // first (max1024x768) variant with valid k= key
  }
  out.photoUrls = [...byId.values()];

  out.title = await page.title();
  out.titleH1 = await page
    .locator('h2[class*="title"], h1, [data-testid="title"]')
    .first()
    .textContent()
    .catch(() => null);

  const meta = await page.evaluate(() => {
    const g = (p) =>
      document.querySelector(`meta[property="${p}"]`)?.content ||
      document.querySelector(`meta[name="${p}"]`)?.content ||
      null;
    return { ogTitle: g("og:title"), ogDesc: g("og:description"), desc: g("description") };
  });
  out.ogTitle = meta.ogTitle;
  out.ogDescription = meta.ogDesc || meta.desc;

  out.description = await page.evaluate(() => {
    const el = document.querySelector(
      '[data-testid="property-description"], #property_description_content, .hp_desc_main_content',
    );
    return el ? el.innerText.trim() : null;
  });
  if (!out.description) out.description = out.ogDescription;

  out.location = await page.evaluate(() => {
    const el = document.querySelector(
      '[data-testid="address"], .hp_address_subtitle, span[data-node_tt_id]',
    );
    if (el) return el.innerText.trim();
    // og:title tail or any element naming the locality
    const sub = [...document.querySelectorAll("span, div, p")]
      .map((e) => e.textContent?.trim())
      .find(
        (t) => t && /Ponta Delgada|São Miguel|Azores|Açores|Portugal/i.test(t) && t.length < 120,
      );
    return sub || null;
  });

  // Coords often in a map element data attr or a hotel JSON config.
  const coords = await page.evaluate(() => {
    const m = document.querySelector("[data-atlas-latlng]");
    if (m) {
      const [lat, lng] = m.getAttribute("data-atlas-latlng").split(",");
      return { lat, lng };
    }
    const html = document.documentElement.innerHTML;
    const lm =
      html.match(/"latitude":\s*(-?\d+\.\d+)/) ||
      html.match(/latitude['"]?\s*[:=]\s*['"]?(-?\d+\.\d+)/);
    const gm =
      html.match(/"longitude":\s*(-?\d+\.\d+)/) ||
      html.match(/longitude['"]?\s*[:=]\s*['"]?(-?\d+\.\d+)/);
    return { lat: lm ? lm[1] : null, lng: gm ? gm[1] : null };
  });
  out.lat = coords.lat;
  out.lng = coords.lng;

  out.capacity = await page.evaluate(() => {
    const txt = document.body.innerText;
    const g = txt.match(/(\d+)\s+guests?/i);
    const bd = txt.match(/(\d+)\s+bedrooms?/i);
    const bed = txt.match(/(\d+)\s+beds?/i);
    return { guests: g ? +g[1] : null, bedrooms: bd ? +bd[1] : null, beds: bed ? +bed[1] : null };
  });

  out.amenities = await page.evaluate(() => {
    const sel =
      '[data-testid="property-most-popular-facilities-wrapper"] li, .hotel-facilities-group li, [data-testid="facility-group-container"] li';
    return [
      ...new Set(
        [...document.querySelectorAll(sel)].map((e) => e.textContent?.trim()).filter(Boolean),
      ),
    ].slice(0, 80);
  });

  return out;
}

const summary = [];
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--no-sandbox", "--disable-blink-features=AutomationControlled", "--lang=en-US"],
});

for (const L of LISTINGS) {
  const rec = {
    name: L.name,
    url: L.url,
    blocked: false,
    title: null,
    description: null,
    location: null,
    neighbourhood: null,
    lat: null,
    lng: null,
    capacity: null,
    amenities: [],
    photoUrls: [],
  };
  const ctx = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    timezoneId: "Europe/Lisbon",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  const page = await ctx.newPage();
  let status = null;
  page.on("response", (r) => {
    if (r.url() === L.url || r.url().replace(/\/$/, "") === L.url.replace(/\/$/, ""))
      status = r.status();
  });

  try {
    log(`\n=== ${L.name} (${L.url}) ===`);
    const resp = await page.goto(L.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    if (resp) status = resp.status();
    log(`HTTP ${status}`);
    await acceptConsent(page);
    await page
      .waitForLoadState("networkidle", { timeout: 25000 })
      .catch(() => log("  (networkidle timeout — proceeding)"));
    await scrollGallery(page).catch(() => {});

    const html = await page.content();
    const title = await page.title();
    if ((status && status >= 400) || detectBlock(html, title)) {
      rec.blocked = true;
      rec.title = title;
      log(`  BLOCKED (status ${status}, title="${title}")`);
      await page
        .screenshot({ path: `${OUT}/${L.slug}-BLOCKED.png`, fullPage: true })
        .catch(() => {});
      summary.push({ slug: L.slug, blocked: true, photos: 0, status });
      await ctx.close();
      writeFileSync(
        `${OUT}/listings.json`,
        JSON.stringify(summary.map(() => null).filter(Boolean), null, 2),
      );
      continue;
    }

    const data = L.kind === "airbnb" ? await extractAirbnb(page) : await extractBooking(page);

    // Settle virtualized/lazy content for a representative full-page screenshot:
    // dismiss any lingering consent, slow-scroll to paint, return to top.
    // BOUNDED: a fixed number of steps + page.waitForTimeout (which respects the
    // page lifecycle) — never an unbounded in-page loop that can hang on a tall,
    // continuously-lazy-loading page like Booking.
    await acceptConsent(page).catch(() => {});
    const startH = await page.evaluate(() => document.body.scrollHeight).catch(() => 4000);
    const steps = Math.min(20, Math.ceil(startH / 600));
    for (let s = 0; s <= steps; s++) {
      await page.evaluate((y) => window.scrollTo(0, y), s * 600).catch(() => {});
      await page.waitForTimeout(200);
    }
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    await page.waitForTimeout(1000);
    rec.title = data.titleH1 || data.ogTitle || data.title || title;
    rec.description = data.description || null;
    // Strip Booking breadcrumb prefix ("HomeHotels...Ponta Delgada<title>") down to the locality.
    let loc = data.location || null;
    if (loc && /HomeHotels|vacation homes/i.test(loc)) {
      const m = loc.match(/(São Miguel[A-Za-zÀ-ú\s]*Ponta Delgada|Ponta Delgada)/i);
      loc = m
        ? m[1].replace(/([a-z])([A-Z])/g, "$1, $2")
        : "Ponta Delgada, São Miguel, Azores, Portugal";
    }
    rec.location = loc;
    rec.neighbourhood = data.neighbourhood || null;
    rec.lat = data.lat || null;
    rec.lng = data.lng || null;
    rec.capacity = data.capacity || null;
    rec.amenities = data.amenities || [];
    rec.photoUrls = data.photoUrls || [];

    await page
      .screenshot({ path: `${OUT}/${L.slug}.png`, fullPage: true })
      .catch((e) => log("  screenshot fail", e.message));
    log(`  title: ${rec.title}`);
    log(`  location: ${rec.location}`);
    log(`  coords: ${rec.lat}, ${rec.lng}`);
    log(`  capacity: ${JSON.stringify(rec.capacity)}`);
    log(`  amenities: ${rec.amenities.length}`);
    log(`  photoUrls: ${rec.photoUrls.length}`);
    summary.push({ slug: L.slug, blocked: false, photos: rec.photoUrls.length, status });
  } catch (e) {
    rec.blocked = true;
    rec.title = `ERROR: ${e.message.slice(0, 120)}`;
    log(`  ERROR: ${e.message.slice(0, 200)}`);
    await page.screenshot({ path: `${OUT}/${L.slug}-ERROR.png`, fullPage: true }).catch(() => {});
    summary.push({ slug: L.slug, blocked: true, photos: 0, error: e.message.slice(0, 120) });
  }

  // Append/rewrite the full listings.json after each listing.
  globalThis.__records = globalThis.__records || [];
  globalThis.__records.push(rec);
  writeFileSync(`${OUT}/listings.json`, JSON.stringify(globalThis.__records, null, 2));
  await ctx.close();
}

await browser.close();
log("\n— DONE —");
for (const s of summary)
  log(
    `  ${s.slug}: ${s.blocked ? "BLOCKED" : "ok"} · ${s.photos} photos · status ${s.status ?? "?"}`,
  );
log(`\nWrote ${OUT}/listings.json`);
