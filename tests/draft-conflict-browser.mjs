/**
 * A draft save that loses an optimistic-lock race keeps the person's text. Run against a
 * disposable workspace with a real gateway and PostgreSQL (accounts mode), never production:
 *
 *   TEST_ORIGIN=http://127.0.0.1:3352 TEST_EMAIL=… TEST_PASSWORD=… \
 *   [PLAYWRIGHT_MODULE=…] [CHROMIUM_PATH=…] node tests/draft-conflict-browser.mjs
 */
import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const origin = process.env.TEST_ORIGIN ?? 'http://127.0.0.1:3352';
for (const name of ['TEST_EMAIL', 'TEST_PASSWORD']) assert.ok(process.env[name], `${name} required (synthetic account only)`);
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
let count = 0;
const check = (value, message) => { assert.ok(value, message); console.log(`PASS ${++count}: ${message}`); };

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/login');
  await page.fill('input[name="email"]', process.env.TEST_EMAIL);
  await page.fill('input[name="password"]', process.env.TEST_PASSWORD);
  await Promise.all([page.waitForURL(/\/app(\/|$|\?)/), page.locator('form button[type="submit"]').first().click()]);

  await page.goto(origin + '/app/drafts/new');
  await page.getByLabel('Draft title').fill('Synthetic conflict ' + Date.now());
  await page.getByRole('button', { name: 'Create draft', exact: true }).click();
  const editor = page.getByLabel('Text', { exact: true });
  await editor.waitFor();

  const theirs = 'THEIRS-' + Date.now() + ': the other person saved this first.';
  const other = await context.newPage();
  await other.goto(page.url());
  await other.getByLabel('Text', { exact: true }).fill(theirs);
  await other.getByRole('button', { name: 'Save as version 2', exact: true }).click();
  await other.getByText('Saved as version 2.', { exact: true }).waitFor();
  await other.close();

  const mine = 'MINE-' + Date.now() + ': my unsaved edit must survive the conflict.';
  await editor.fill(mine);
  await page.getByRole('button', { name: 'Save as version 2', exact: true }).click();
  await page.getByText('CONFLICT — someone else saved first', { exact: false }).waitFor();
  check(true, 'a stale save shows the dedicated conflict panel, not a bare refusal');
  check(await editor.inputValue() === mine, 'the editor still holds my text after the conflict');
  check(await page.getByText('Your text is still in the editor.', { exact: false }).isVisible(), 'the panel says the text was kept and nothing was saved');

  await page.getByRole('button', { name: 'Load version 2 and keep my text' }).click();
  await page.getByText('Version 2, saved by someone else').waitFor();
  check(await page.getByText(theirs, { exact: false }).isVisible(), 'loading shows the other version read-only');
  check(await editor.inputValue() === mine, '...while my text stays in the editor');

  await page.getByRole('button', { name: 'Save as version 3', exact: true }).click();
  await page.getByText('Saved as version 3.', { exact: true }).waitFor();
  await page.reload();
  await editor.waitFor();
  check(await editor.inputValue() === mine, 'saving after loading makes version 3 with my text, and it survives a reload');
  check((await page.locator('main').innerText()).includes('Version 3'), '...and the draft is at version 3; version 2 is kept, not overwritten');
  check(errors.length === 0, 'no browser runtime errors');
} finally {
  await browser.close();
}
