import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

// The console type scale is defined as CSS custom properties and mapped to Tailwind utility
// classes: text-caption, text-ui, text-body, text-read, text-title, text-display. Any raw
// font-size value (text-[14px], text-[1rem], text-sm, text-lg, text-xs, text-base, text-xl,
// text-2xl, etc.) in a console .tsx file bypasses the scale and will drift.

const CONSOLE_DIR = new URL("../src/app/app/", import.meta.url).pathname;
const ALLOWED_TOKENS = ["text-caption", "text-ui", "text-body", "text-read", "text-title", "text-display"];

// Raw Tailwind font-size classes that bypass the design token scale.
const RAW_FONT_SIZES = /\btext-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/;
// Arbitrary font-size values like text-[14px] or text-[1rem].
const ARBITRARY_FONT_SIZES = /\btext-\[\d+(?:\.\d+)?(?:px|rem|em)\]/;

// Intentional micro-sizes below the token scale (11px labels on citation markers, etc.).
// These are deliberate design choices, not drift. Add here with a comment if needed.
const ALLOWED_ESCAPES = new Set(["text-[11px]", "text-[0.6875rem]"]);

const files: string[] = [];
const walk = (dir: string) =>
  readdirSync(dir).forEach((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".tsx")) files.push(p);
  });
walk(CONSOLE_DIR);

test("console .tsx files use only the type-scale tokens, no raw Tailwind font sizes", () => {
  assert.ok(files.length >= 10, `expected at least 10 console .tsx files, found ${files.length}`);
  const violations: string[] = [];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const rawMatch = line.match(RAW_FONT_SIZES);
      const arbMatch = line.match(ARBITRARY_FONT_SIZES);
      if (rawMatch) violations.push(`${file}:${i + 1} uses ${rawMatch[0]} — use a token (${ALLOWED_TOKENS.join(", ")})`);
      if (arbMatch && !ALLOWED_ESCAPES.has(arbMatch[0])) violations.push(`${file}:${i + 1} uses ${arbMatch[0]} — use a token (${ALLOWED_TOKENS.join(", ")})`);
    }
  }
  assert.deepEqual(violations, [], `Typography token violations:\n${violations.join("\n")}`);
});

test("the type-scale tokens are defined in globals.css with font-size and line-height", () => {
  const globals = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  for (const token of ALLOWED_TOKENS) {
    const varName = `--${token}`;
    assert.match(globals, new RegExp(`${varName}:\\s*[\\d.]+rem`), `${varName} not found`);
    assert.match(globals, new RegExp(`${varName}--line-height:\\s*[\\d.]+rem`), `${varName}--line-height not found`);
  }
});

test("answer prose uses the text-read token with tracking", () => {
  const answer = readFileSync(new URL("../src/app/app/answer.tsx", import.meta.url), "utf8");
  // The parsed-prose container must carry text-read and the tracking value.
  assert.match(answer, /gap-\[1\.15em\].*text-read.*tracking-\[0\.005em\]/, "parsed prose container missing text-read + tracking");
  // StatusLine uses text-body for the register label.
  assert.match(answer, /text-body.*font-semibold/, "StatusLine should use text-body font-semibold");
});

test("source panel quotes use the same tracking as answer prose", () => {
  const panel = readFileSync(new URL("../src/app/app/source-panel.tsx", import.meta.url), "utf8");
  assert.match(panel, /blockquote.*text-read.*tracking-\[0\.005em\]/, "passage blockquote missing tracking");
  assert.match(panel, /rounded-card.*text-read.*tracking-\[0\.005em\].*whitespace-pre-line/, "section view missing tracking");
});
