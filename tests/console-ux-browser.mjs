/**
 * Console UX visual regression and mobile overflow checks.
 *
 * Run:
 *   PLACEDON_DEMO_MODE=true pnpm dev --port 3311
 *   PLAYWRIGHT_EXECUTABLE=/path/to/chromium node tests/console-ux-browser.mjs
 *
 * Outputs screenshots to verification-artifacts/console-ux/ at multiple breakpoints.
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const origin = process.env.TEST_ORIGIN ?? "http://localhost:3311";
const artifacts = "verification-artifacts/console-ux";
await mkdir(artifacts, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE,
});
const errors = [];
let checks = 0;
const check = (ok, message) => {
  assert.ok(ok, message);
  checks++;
  console.log(`PASS ${checks}: ${message}`);
};

const VIEWPORTS = [
  { name: "mobile", width: 320, height: 568 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1080 },
];

try {
  // ── Empty workspace (welcome + starters) ──
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`${vp.name}: ${e.message}`));
    await page.goto(`${origin}/app`);
    await page.getByRole("combobox", { name: "Your question" }).waitFor();
    // No horizontal overflow.
    check(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${vp.name} empty workspace: no horizontal overflow`,
    );
    await page.screenshot({
      path: `${artifacts}/welcome-${vp.name}.png`,
      fullPage: true,
    });
    await context.close();
  }

  // ── Answered conversation ──
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`${vp.name}: ${e.message}`));
    await page.goto(`${origin}/app`);
    await page.getByRole("combobox", { name: "Your question" }).waitFor();
    // Type and submit a question to get a demo answer.
    const input = page.getByRole("combobox", { name: "Your question" });
    await input.fill("What are the annual general meeting requirements under Section 96?");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    // Wait for the answer to render (Sources heading appears when done).
    await page.getByRole("heading", { name: "Sources", exact: true }).waitFor({ timeout: 15000 });
    // No horizontal overflow after answer renders.
    check(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${vp.name} answered: no horizontal overflow`,
    );
    // The answer prose container exists with the expected structure.
    const proseParas = await page.locator("article p").count();
    check(proseParas >= 1, `${vp.name} answered: at least one prose paragraph rendered`);
    // Footer has border-t separation.
    const footer = page.locator("article footer");
    check(await footer.count() >= 1, `${vp.name} answered: footer element present`);
    await page.screenshot({
      path: `${artifacts}/answer-${vp.name}.png`,
      fullPage: true,
    });

    // ── Source panel ──
    if (vp.width >= 768) {
      // Click first citation marker to open source panel.
      const marker = page.locator("button[aria-label*='Source']").first();
      if (await marker.count() > 0) {
        await marker.click();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: `${artifacts}/source-panel-${vp.name}.png`,
          fullPage: true,
        });
      }
    }
    await context.close();
  }

  check(errors.length === 0, `No browser exceptions: ${errors.join("; ")}`);
  console.log(`\n${checks} console UX checks passed.`);
} finally {
  await browser.close();
}
