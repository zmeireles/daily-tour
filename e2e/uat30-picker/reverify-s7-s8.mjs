// UAT #30 — re-verify S7/S8 (desktop + mobile) with the corrected card-link
// selector, against the SAME place created by the main run.
//
// Mutation rail: republishes and then re-archives ONLY the place this UAT created
// (ZZ-UAT30, id below). Touches nothing else. Ends with the DB proof.
import { readdirSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { isSameOrigin } from "../lib/same-origin.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const pnpmDir = resolve(repoRoot, "node_modules/.pnpm");
const pwPkg = readdirSync(pnpmDir).find((d) => d.startsWith("playwright-core@"));
const { chromium } = (
  await import(`file://${resolve(pnpmDir, pwPkg, "node_modules/playwright-core/index.js")}`)
).default;

const BASE = "https://qual.stay.portugalodyssey.pt";
const AUTHORITY = "https://auth.qual.stay.portugalodyssey.pt/application/o/owner-app/";
const CLIENT_ID = "owner-app-public";
const VPS = "root@77.37.86.126";
const OUT = resolve(repoRoot, "temp/uat30-picker");
const LOG = resolve(OUT, "log.txt");
mkdirSync(OUT, { recursive: true });

const PLACE_ID = "c1278d1f-5485-430a-bb96-ce6678cf58e7";
const TOKEN = "ZZ-UAT30";
const PLACE_NAME = `${TOKEN} Miradouro de Teste`;
const PLACE_DESC_PT = `${TOKEN} local de teste automatizado para a UAT #30. Seguro para arquivar.`;
const GUEST_URL = `${BASE}/r/${process.env.RTOKEN}`;

const AK_PW = readFileSync(resolve(repoRoot, "temp/qual-uat-secrets.env"), "utf8")
  .split("\n")
  .find((l) => l.startsWith("AKADMIN_PASSWORD="))
  ?.slice("AKADMIN_PASSWORD=".length)
  .trim();

const ts = () => new Date().toISOString();
const logLine = (s) => appendFileSync(LOG, `${s}\n`);
const results = [];
function step(name, verdict, detail = "") {
  results.push({ name, verdict, detail });
  const mark = verdict === true ? "✓ PASS" : verdict === false ? "✗ FAIL" : `• ${verdict}`;
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ""}`);
  logLine(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
}
const sql = (q) =>
  execFileSync(
    "ssh",
    [
      "-o",
      "ConnectTimeout=12",
      "-o",
      "BatchMode=yes",
      VPS,
      `docker exec dt_postgres psql -U postgres -d dailytour -c ${JSON.stringify(q)}`,
    ],
    { encoding: "utf8", timeout: 45000 },
  );

const apiLog = [];
async function setStatus(page, status) {
  await page.goto(`${BASE}/admin/places/${PLACE_ID}`, { waitUntil: "networkidle", timeout: 40000 });
  await page.locator('[name="address"]').waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);
  await page.locator('select:has(option[value="published"])').selectOption(status);
  const t0 = Date.now();
  await page.getByRole("button", { name: "Guardar" }).click();
  let hit = null;
  for (let i = 0; i < 130 && !hit; i++) {
    hit =
      apiLog.find((a) => a.at >= t0 && a.method === "PATCH" && a.url.includes(PLACE_ID)) ?? null;
    if (!hit) await page.waitForTimeout(150);
  }
  await page.waitForURL(/\/admin\/places$/, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  logLine(
    `[MUTATION ${ts()}] SET status=${status} on OWN place "${PLACE_NAME}" | id=${PLACE_ID} | httpStatus=${hit?.status ?? "none"}`,
  );
  return hit?.status ?? 0;
}

async function guestLeg(browser, vpName, vp) {
  const ctx = await browser.newContext({ viewport: vp, locale: "pt-PT" });
  const page = await ctx.newPage();
  let guestJwt = null;
  page.on("response", async (r) => {
    if (/\/v1\/r\//.test(r.url()) && r.request().method() === "GET") {
      try {
        guestJwt = JSON.parse(await r.text())?.jwt ?? guestJwt;
      } catch {}
    }
  });
  await page.goto(GUEST_URL, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page
    .locator('a[href*="/a/eat"]')
    .first()
    .click()
    .catch(() => {});
  await page.waitForURL(/\/a\/eat/, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const uiHit = await page
    .getByText(PLACE_NAME)
    .first()
    .isVisible()
    .catch(() => false);
  let api = "no jwt";
  if (guestJwt) {
    api = await page.evaluate(
      async ({ jwt, id }) => {
        const out = [];
        for (const a of ["eat", "drink", "see", "do", "buy", "move"]) {
          const res = await fetch(`/v1/discover?action=${a}&loc=37.74,-25.67&km=10`, {
            headers: { Authorization: `Bearer ${jwt}` },
          });
          out.push(
            `${a}:${res.ok ? (JSON.stringify(await res.json()).includes(id) ? "FOUND" : "absent") : `HTTP${res.status}`}`,
          );
        }
        return out.join(" ");
      },
      { jwt: guestJwt, id: PLACE_ID },
    );
  }
  await page.screenshot({ path: resolve(OUT, `rv-s7-${vpName}.png`) });
  step(
    `★ S7 place reaches guests under Comer [${vpName}]`,
    uiHit,
    `discoverUI_visible=${uiHit} discoverAPI[${api}]`,
  );

  // S8 — click the card LINK (the corrected selector).
  const cardLink = page.locator('a[href*="/p/"]').filter({ hasText: PLACE_NAME }).first();
  const linkCount = await cardLink.count();
  if (linkCount) await cardLink.click().catch(() => {});
  await page.waitForURL(/\/p\//, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const onDetail = /\/p\//.test(page.url());
  const nameShown = await page
    .getByText(PLACE_NAME)
    .first()
    .isVisible()
    .catch(() => false);
  const descShown = await page
    .getByText(PLACE_DESC_PT.slice(0, 40), { exact: false })
    .first()
    .isVisible()
    .catch(() => false);
  await page.screenshot({ path: resolve(OUT, `rv-s8-${vpName}.png`) });
  step(
    `S8 guest detail shows the entered name + description [${vpName}]`,
    onDetail && nameShown && descShown,
    `cardLinkFound=${linkCount} url=${page.url().replace(BASE, "")} nameVisible=${nameShown} descriptionVisible=${descShown}`,
  );
  await ctx.close();
}

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
  args: ["--no-sandbox"],
});
const ownerCtx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "pt-PT",
});
const owner = await ownerCtx.newPage();
owner.on("dialog", (d) => d.accept().catch(() => {}));
owner.on("response", async (r) => {
  if (/\/v1\/admin\/places/.test(r.url()) && ["POST", "PATCH"].includes(r.request().method())) {
    apiLog.push({ at: Date.now(), method: r.request().method(), url: r.url(), status: r.status() });
  }
});

try {
  // login
  await owner.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await owner.waitForURL(/auth\.qual/, { timeout: 25000 });
  await owner.locator('input[name="uidField"]').fill("akadmin");
  await owner.locator('input[name="uidField"]').press("Enter");
  await owner.locator('input[name="password"]').waitFor({ timeout: 15000 });
  await owner.locator('input[name="password"]').fill(AK_PW);
  await owner.locator('input[name="password"]').press("Enter");
  for (let i = 0; i < 25 && !isSameOrigin(owner.url(), BASE); i++) {
    const s = owner.locator('button[type="submit"]');
    if (await s.count())
      await s
        .first()
        .click()
        .catch(() => {});
    await owner.waitForTimeout(1000);
  }
  await owner.waitForFunction(
    ([a, c]) => !!localStorage.getItem(`oidc.user:${a}:${c}`),
    [AUTHORITY, CLIENT_ID],
    { timeout: 25000 },
  );
  await owner.waitForURL((u) => u.pathname === "/admin", { timeout: 15000 });

  const pub = await setStatus(owner, "published");
  step("RE-PUBLISH own ZZ-UAT30 place for re-verification", pub > 0 && pub < 400, `PATCH ${pub}`);

  await guestLeg(browser, "desktop", { width: 1440, height: 900 });
  await guestLeg(browser, "mobile", { width: 390, height: 844 });
} finally {
  const arc = await setStatus(owner, "archived").catch(() => 0);
  step("CLEANUP re-archive", arc > 0 && arc < 400, `PATCH ${arc}`);
  await browser.close().catch(() => {});
}

console.log("\n── DB verification (final) ──");
for (const [label, q] of Object.entries({
  "mandate query (name->>'pt')": `SELECT id, status, name->>'pt' FROM catalog.place WHERE name->>'pt' LIKE '${TOKEN}%';`,
  "corrected query (name->>'pt-PT')": `SELECT id, status, name->>'pt-PT' AS name_pt FROM catalog.place WHERE name->>'pt-PT' LIKE '${TOKEN}%';`,
  "tag count": `SELECT p.name->>'pt-PT' AS name_pt, p.status, COUNT(paw.wish_id) AS tag_count FROM catalog.place p LEFT JOIN catalog.place_action_wish paw ON paw.place_id=p.id WHERE p.name->>'pt-PT' LIKE '${TOKEN}%' GROUP BY 1,2;`,
  "tag detail": `SELECT a.slug AS action, w.slug AS wish FROM catalog.place p JOIN catalog.place_action_wish paw ON paw.place_id=p.id JOIN catalog.action a ON a.id=paw.action_id JOIN catalog.wish w ON w.id=paw.wish_id WHERE p.name->>'pt-PT' LIKE '${TOKEN}%';`,
})) {
  const out = sql(q);
  console.log(`\n$ ${label}\n${out}`);
  logLine(`\n$ ${label}\n${out}`);
}
const pass = results.filter((r) => r.verdict === true).length;
console.log(`\n${pass}/${results.length} re-verification steps passed`);
