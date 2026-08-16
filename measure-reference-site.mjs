// measure-reference-site.mjs
// Setup: npm i -D playwright && npx playwright install chromium
// Run:   node measure-reference-site.mjs
import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'https://umanodesign.studio/';
const OUT = './umano-measurements.json';

async function getComputed(locator) {
  return locator.evaluate((node) => {
    const cs = getComputedStyle(node);
    return {
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      fontFamily: cs.fontFamily,
      fontWeight: cs.fontWeight,
      fontSize: cs.fontSize,
      letterSpacing: cs.letterSpacing,
      lineHeight: cs.lineHeight,
      borderRadius: cs.borderRadius,
      padding: cs.padding,
      transitionDuration: cs.transitionDuration,
      transitionTimingFunction: cs.transitionTimingFunction,
      boxShadow: cs.boxShadow,
    };
  });
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await page.goto(URL, { waitUntil: 'networkidle' });

  const report = { url: URL, capturedAt: new Date().toISOString(), scrollStates: [] };

  report.fontsLoaded = await page.evaluate(() =>
    [...document.fonts].map((f) => ({
      family: f.family,
      weight: f.weight,
      style: f.style,
      status: f.status,
    }))
  );

  const nav = page.locator('header').first();
  if (await nav.count()) {
    report.header = await getComputed(nav);
  }

  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const y = Math.round((scrollHeight / steps) * i);
    await page.evaluate((pos) => window.scrollTo(0, pos), y);
    await page.waitForTimeout(300);
    const shot = `scroll-step-${i}.png`;
    await page.screenshot({ path: shot });
    const box = (await nav.count()) ? await nav.boundingBox() : null;
    report.scrollStates.push({ step: i, scrollY: y, screenshot: shot, headerBox: box });
  }

  report.cssVariables = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    const vars = {};
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText === ':root') {
            for (const prop of rule.style) {
              if (prop.startsWith('--')) vars[prop] = styles.getPropertyValue(prop).trim();
            }
          }
        }
      } catch (e) {
        /* cross-origin stylesheets throw — safe to ignore */
      }
    }
    return vars;
  });

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  await browser.close();
  console.log(`Done. See ${OUT} and scroll-step-*.png`);
})();
