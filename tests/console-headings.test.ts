import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

// Every console tool page's title is its h1 (screen-reader navigation). Regression: the nine
// tool pages started at h2 and had no h1. The look is unchanged: app.css styles both.
const root = new URL("../src/app/app/", import.meta.url).pathname;
const pages: string[] = [];
const walk = (dir: string) => readdirSync(dir).forEach((f) => {
  const p = join(dir, f);
  if (statSync(p).isDirectory()) walk(p); else if (f === "page.tsx" && dir !== root.replace(/\/$/, "")) pages.push(p);
});
walk(root);

test("each console tool page titles itself with an h1, never an h2", () => {
  assert.ok(pages.length >= 12, `found ${pages.length} pages`);
  for (const p of pages) {
    const s = readFileSync(p, "utf8");
    if (!/<h[12][ >]/.test(s)) continue; // a page whose console renders its own heading
    assert.match(s, /<h1[ >]/, p);
    assert.doesNotMatch(s, /<h2[ >]/, p);
  }
});

test("form and fieldset section headings are styled like the other section headings", () => {
  const css = readFileSync(new URL("../src/app/app/app.css", import.meta.url), "utf8");
  assert.match(css, /\.console-main form > h3, \.console-main fieldset > h3 \{/);
  assert.match(css, /\.console-main > h1, \.console-main > h2, \.drafts-heading h1 \{/);
});
