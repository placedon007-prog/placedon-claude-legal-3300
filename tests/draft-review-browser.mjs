/** Run against a disposable workspace with a real gateway and PostgreSQL. */
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const origin = process.env.TEST_ORIGIN ?? 'http://127.0.0.1:3349';
assert.ok(process.env.TEST_PASSCODE, 'TEST_PASSCODE required for the synthetic workspace');
const browser = await chromium.launch({ headless: true });
let count = 0;
const check = (value, message) => { assert.ok(value, message); console.log(`PASS ${++count}: ${message}`); };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/login');
  await page.getByLabel('Workspace passcode').fill(process.env.TEST_PASSCODE);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('combobox', { name: 'Your question' }).waitFor();
  await page.goto(origin + '/app/drafts/new');
  await page.getByLabel('Draft title').fill('Synthetic review checklist ' + Date.now());
  await page.getByRole('button', { name: 'Create draft', exact: true }).click();
  await page.getByRole('heading', { name: 'Before this draft can be signed off' }).waitFor();
  check(await page.getByText('Add draft text before requesting review.', { exact: false }).isVisible(), 'empty draft shows a specific next action');
  check(!await page.getByText('Ready for lawyer review · not approved', { exact: false }).count(), 'empty draft does not show ready');
  await page.getByLabel('Text', { exact: true }).fill('Synthetic client note. Confirm the meeting date before sending.');
  await page.getByRole('button', { name: 'Save as version 2', exact: true }).click();
  await page.getByText('Saved as version 2.', { exact: true }).waitFor();
  check(await page.getByText('The draft text changed.', { exact: false }).first().isVisible(), 'changed text requires fresh review');
  await page.reload();
  await page.getByRole('heading', { name: 'Before this draft can be signed off' }).waitFor();
  check((await page.getByLabel('Text', { exact: true }).inputValue()).startsWith('Synthetic client note.'), 'saved text survives reload');
  check(await page.getByText('The draft text changed.', { exact: false }).first().isVisible(), 'review gate survives reload');
  await page.setViewportSize({ width: 390, height: 844 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'draft editor fits mobile viewport');
  check(errors.length === 0, 'no browser runtime errors');
} finally { await browser.close(); }
