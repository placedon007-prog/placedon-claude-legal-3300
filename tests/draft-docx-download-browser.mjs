/**
 * Draft → Word download, end to end. Run against a disposable workspace with a real gateway
 * and PostgreSQL (accounts mode), never production:
 *
 *   TEST_ORIGIN=http://127.0.0.1:3351 \
 *   TEST_EMAIL=… TEST_PASSWORD=… OTHER_EMAIL=… OTHER_PASSWORD=… \
 *   [PLAYWRIGHT_MODULE=…] [CHROMIUM_PATH=…] node tests/draft-docx-download-browser.mjs
 *
 * OTHER_* is a second account in the same workspace that is NOT given the draft.
 * Needs `unzip` on PATH to read the downloaded file.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const origin = process.env.TEST_ORIGIN ?? 'http://127.0.0.1:3351';
for (const name of ['TEST_EMAIL', 'TEST_PASSWORD', 'OTHER_EMAIL', 'OTHER_PASSWORD']) {
  assert.ok(process.env[name], `${name} required (synthetic accounts only)`);
}
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const dir = mkdtempSync(join(tmpdir(), 'docx-download-'));
let count = 0;
const check = (value, message) => { assert.ok(value, message); console.log(`PASS ${++count}: ${message}`); };
const documentXml = (path) => execFileSync('unzip', ['-p', path, 'word/document.xml']).toString('utf8');
// From inside the page, as the button does: the session cookie is Secure in a production
// build, and Playwright's request API will not send a Secure cookie over plain http.
const browserGet = (page, url) => page.evaluate(async (target) => {
  const response = await fetch(target, { cache: 'no-store' });
  return { status: response.status, type: response.headers.get('content-type') ?? '', body: await response.text() };
}, url);

async function signIn(email, password) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(origin + '/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([page.waitForURL(/\/app(\/|$|\?)/), page.locator('form button[type="submit"]').first().click()]);
  return { context, page };
}

try {
  const { page } = await signIn(process.env.TEST_EMAIL, process.env.TEST_PASSWORD);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const marker = 'SAVED-' + Date.now();

  await page.goto(origin + '/app/drafts/new');
  await page.getByLabel('Draft title').fill('Synthetic Word export ' + Date.now());
  await page.getByRole('button', { name: 'Create draft', exact: true }).click();
  await page.getByLabel('Text', { exact: true }).waitFor();
  const draftUrl = page.url();
  const draftId = new URL(draftUrl).pathname.split('/').pop();
  await page.getByLabel('Text', { exact: true }).fill(`Synthetic note. ${marker}.`);
  await page.getByRole('button', { name: 'Save as version 2', exact: true }).click();
  await page.getByText('Saved as version 2.', { exact: true }).waitFor();
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));

  const button = page.getByRole('button', { name: 'Download Word file (version 2)' });
  const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
  const saved = join(dir, 'saved.docx');
  await download.saveAs(saved);
  check(download.suggestedFilename().endsWith('.docx'), `the browser receives a .docx (${download.suggestedFilename()})`);
  check(readFileSync(saved).subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])), 'the file is a real Word (ZIP) document');
  check(documentXml(saved).includes(marker), 'the Word file contains the saved text');
  check(await page.getByText(`Downloaded ${download.suggestedFilename()}.`).isVisible(), 'the page confirms the download');

  const unsavedMarker = 'UNSAVED-' + Date.now();
  await page.getByLabel('Text', { exact: true }).fill(`Synthetic note. ${marker}. ${unsavedMarker}.`);
  let early = false;
  page.once('download', () => { early = true; });
  await button.click();
  await page.getByText('You have unsaved edits.', { exact: false }).waitFor();
  check(!early, 'with unsaved edits, nothing downloads until the person chooses');
  const [anyway] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download version 2 anyway' }).click()]);
  const old = join(dir, 'anyway.docx');
  await anyway.saveAs(old);
  const oldXml = documentXml(old);
  check(oldXml.includes(marker) && !oldXml.includes(unsavedMarker), '"anyway" downloads the saved version, without the unsaved edit');

  // Another tab saves version 3; this tab's save then conflicts. The download must stay on
  // the version THIS tab saved, and the conflicting edit still counts as unsaved.
  const otherTab = await page.context().newPage();
  await otherTab.goto(draftUrl);
  await otherTab.getByLabel('Text', { exact: true }).fill(`Synthetic note. ${marker}. Other tab.`);
  await otherTab.getByRole('button', { name: 'Save as version 3', exact: true }).click();
  await otherTab.getByText('Saved as version 3.', { exact: true }).waitFor();
  await otherTab.close();
  await page.getByLabel('Text', { exact: true }).fill(`Synthetic note. ${marker}. Stale tab.`);
  await page.getByRole('button', { name: 'Save as version 3', exact: true }).click();
  await page.getByText('CONFLICT — someone else saved first', { exact: false }).waitFor();
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
  check(await button.isVisible(), 'after a conflicting save the button still offers version 2, the version this tab saved');
  await button.click();
  check(await page.getByText('You have unsaved edits.', { exact: false }).isVisible(), '...and the edit that conflicted is still reported as unsaved');

  const route = `${origin}/app/drafts/${draftId}/download?version=2`;
  const other = await signIn(process.env.OTHER_EMAIL, process.env.OTHER_PASSWORD);
  const denied = await browserGet(other.page, route);
  check(denied.status === 404 && !denied.type.includes('wordprocessingml'),
    `another lawyer gets 404 and no file (${denied.status})`);
  check(JSON.parse(denied.body).message.length > 0, 'the refusal carries a message, not a file');

  const anonymous = await browser.newContext();
  const signedOut = await anonymous.request.get(route, { maxRedirects: 0 });
  check([302, 303, 307, 308].includes(signedOut.status()) && (signedOut.headers().location ?? '').includes('/login'),
    `a signed-out request is sent to sign-in, never served the file (${signedOut.status()})`);

  const bad = await browserGet(page, `${origin}/app/drafts/not-a-draft/download`);
  check(bad.status === 400, `a malformed draft id is refused (${bad.status})`);
  check(errors.length === 0, 'no browser runtime errors');
} finally {
  await browser.close();
}
