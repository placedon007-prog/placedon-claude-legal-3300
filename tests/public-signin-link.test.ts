import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("the public header and the mobile menu both link to /login as 'Sign in'", () => {
  const chrome = readFileSync(new URL("../src/components/site-chrome.tsx", import.meta.url), "utf8");
  const nav = chrome.slice(chrome.indexOf("export function SiteNav"), chrome.indexOf("export function SiteFooter"));
  const desktop = nav.slice(nav.indexOf('className="dnav-actions"'), nav.indexOf('id="dnav-mobile"'));
  const mobile = nav.slice(nav.indexOf('id="dnav-mobile"'));
  assert.match(desktop, /<Link href="\/login" className="dnav-login"[\s\S]*?>\s*Sign in\s*<\/Link>/);
  assert.match(mobile, /<Link href="\/login"[\s\S]*?>\s*Sign in\s*<\/Link>/);
});
