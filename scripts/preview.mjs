// Quick visual check of the local landing page — takes a screenshot at each
// scroll milestone so we can eyeball the hero, reveal, carousel, pricing, footer.
import { chromium } from "playwright";
import fs from "fs";

const URL = process.env.URL || "http://localhost:3000/";
const OUT_DIR = "./preview-shots";

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

await page.goto(URL, { waitUntil: "networkidle" });
const height = await page.evaluate(() => document.body.scrollHeight);
console.log("body height", height, "px");

const steps = 12;
for (let i = 0; i <= steps; i++) {
  const y = Math.round((height / steps) * i);
  await page.evaluate((pos) => window.scrollTo(0, pos), y);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT_DIR}/step-${String(i).padStart(2, "0")}.png` });
}

// hover the giant email at the bottom
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(500);
const giant = await page.locator(".hd-footer__giant").first();
if (await giant.count()) {
  await giant.hover();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT_DIR}/footer-hover.png` });
}

fs.writeFileSync(
  `${OUT_DIR}/console.json`,
  JSON.stringify({ errors, capturedAt: new Date().toISOString() }, null, 2),
);
await browser.close();
console.log("Done — see", OUT_DIR);
if (errors.length) {
  console.error("Errors captured:", errors.length);
  for (const e of errors) console.error(e);
}
