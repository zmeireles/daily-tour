import { chromium } from "playwright-core";
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const OUT = "/media/jmeireles/ssd3/my-projects/daily-tour/temp/miguel-photos";
const b = await chromium.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
});
const ctx = await b.newContext({
  userAgent: UA,
  viewport: { width: 1440, height: 900 },
  locale: "en-US",
  timezoneId: "Europe/Lisbon",
});
const p = await ctx.newPage();
await p.goto("https://www.airbnb.com/rooms/983284485446555038", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
// dismiss consent
for (const s of [
  'button:has-text("Accept all")',
  'button:has-text("OK")',
  'button:has-text("Accept")',
]) {
  try {
    const e = p.locator(s).first();
    if (await e.isVisible({ timeout: 1500 })) {
      await e.click();
      break;
    }
  } catch {}
}
await p.waitForTimeout(2000);
// scroll gently in viewport-sized steps, waiting for images to decode each step
for (let s = 0; s < 14; s++) {
  await p.evaluate((y) => window.scrollTo(0, y), s * 700).catch(() => {});
  await p.waitForTimeout(450);
}
// wait specifically for gallery <img> to have natural dimensions
await p
  .waitForFunction(
    () => {
      const im = [...document.images].filter((i) => /muscache/.test(i.src || ""));
      return im.length > 2 && im.slice(0, 3).every((i) => i.naturalWidth > 10);
    },
    { timeout: 15000 },
  )
  .catch(() => {});
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/the-view-point.png`, fullPage: true });
console.log("reshot the-view-point done");
await b.close();
