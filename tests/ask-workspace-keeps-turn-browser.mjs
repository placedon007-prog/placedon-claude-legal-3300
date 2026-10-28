/**
 * The Ask workspace keeps a just-sent turn's request after its own address change.
 * Run against the demo build (PLACEDON_DEMO_MODE=true), which answers from fixtures:
 *
 *   TEST_ORIGIN=http://127.0.0.1:3354 [PLAYWRIGHT_MODULE=…] [CHROMIUM_PATH=…] node tests/ask-workspace-keeps-turn-browser.mjs
 *
 * Before the fix, `/app` -> `/app?c=<id>` re-rendered the page under a new key and remounted
 * the workspace, so the turn lost its task, files and matter, and Retry re-ran a draft as
 * research with no files.
 */
import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const origin = process.env.TEST_ORIGIN ?? 'http://127.0.0.1:3354';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH ?? process.env.PLAYWRIGHT_EXECUTABLE });
let count = 0;
const check = (value, message) => { assert.ok(value, message); console.log(`PASS ${++count}: ${message}`); };

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/app');
  const box = page.getByRole('combobox', { name: 'Your question' });
  await box.waitFor();
  await box.fill('What are the annual general meeting requirements under Section 96?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByRole('heading', { name: 'Sources', exact: true }).waitFor({ timeout: 90000 });
  await page.waitForURL(/\/app\?c=/);
  await page.waitForTimeout(2000);
  const answerPath = page.locator('.answer-path').first();
  await answerPath.locator(':scope > summary').click();
  const scope = answerPath.locator('ol > li').nth(1);
  await scope.locator('summary').click();
  const scopeText = (await scope.innerText()).replace(/\s+/g, ' ');
  check(/Scope\s+Recorded/.test(scopeText) && !scopeText.includes('not recorded on this saved turn'),
    `after its own address change the turn is still the one this tab sent, with its request (${scopeText.slice(0, 120)})`);
  check(scopeText.includes('Matter: unfiled workspace'), '...its matter');
  check(scopeText.includes('Task: research'), '...and its task');

  await page.goto(origin + '/app');
  await page.getByRole('combobox', { name: 'Your question' }).waitFor();
  check(await page.locator('.answer-path').count() === 0, 'a new conversation still starts with a fresh, empty workspace');
  check(errors.length === 0, `no browser runtime errors (${errors.join('; ').slice(0, 120)})`);
} finally {
  await browser.close();
}
