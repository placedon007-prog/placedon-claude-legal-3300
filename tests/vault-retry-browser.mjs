/**
 * Wall System: a FAILED document can be retried from the file list, once. Run against a
 * disposable workspace with a real gateway, worker and PostgreSQL (accounts mode) that
 * holds one FAILED document whose stored bytes are present again, never production:
 *
 *   TEST_ORIGIN=http://127.0.0.1:3353 TEST_EMAIL=… TEST_PASSWORD=… TEST_FAILED_NAME=… \
 *   [PLAYWRIGHT_MODULE=…] [CHROMIUM_PATH=…] node tests/vault-retry-browser.mjs
 */
import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const origin = process.env.TEST_ORIGIN ?? 'http://127.0.0.1:3353';
for (const name of ['TEST_EMAIL', 'TEST_PASSWORD', 'TEST_FAILED_NAME']) assert.ok(process.env[name], `${name} required (synthetic workspace only)`);
const failedName = process.env.TEST_FAILED_NAME;
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
let count = 0;
const check = (value, message) => { assert.ok(value, message); console.log(`PASS ${++count}: ${message}`); };

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/login');
  await page.fill('input[name="email"]', process.env.TEST_EMAIL);
  await page.fill('input[name="password"]', process.env.TEST_PASSWORD);
  await Promise.all([page.waitForURL(/\/app(\/|$|\?)/), page.locator('form button[type="submit"]').first().click()]);

  await page.goto(origin + '/app/vault');
  const row = page.locator('.vault-file-row', { hasText: failedName });
  await row.waitFor();
  check(await row.getByText('Processing failed').isVisible(), 'a FAILED document says "Processing failed", not "Processing"');
  const retry = row.getByRole('button', { name: `Retry ${failedName}` });
  check(await retry.isVisible(), '...and offers Retry');
  check(await row.getByRole('link', { name: 'Inspect' }).count() === 1, '...and keeps Inspect, so the failure details stay reachable');
  check((await page.locator('main').innerText()).includes('reading stopped after its retries'), 'the state table explains FAILED in words');

  await retry.click();
  await page.getByText('Queued to be read again.', { exact: false }).waitFor();
  check(true, 'Retry queues it and says so');
  check(await page.getByRole('status').filter({ hasText: 'Queued to be read again.' }).count() >= 1, '...in a status region a screen reader announces');

  let ready = false;
  for (let i = 0; i < 30 && !ready; i++) {
    await page.reload();
    await page.locator('.vault-file-row', { hasText: failedName }).waitFor();
    ready = await page.locator('.vault-file-row', { hasText: failedName }).getByText('Ready to read').isVisible();
    if (!ready) await page.waitForTimeout(1000);
  }
  check(ready, 'the worker reads it again: Ready to read');
  check(await page.locator('.vault-file-row', { hasText: failedName }).getByRole('button', { name: /^Retry / }).count() === 0,
    '...and Retry is gone, so it cannot be retried twice');
  await page.setViewportSize({ width: 390, height: 844 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'the file list fits a phone screen');
  check(errors.length === 0, 'no browser runtime errors');
} finally {
  await browser.close();
}
