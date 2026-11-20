import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const CONSOLE_DIR = new URL("../src/app/app/", import.meta.url).pathname;

const files: string[] = [];
const walk = (dir: string) =>
  readdirSync(dir).forEach((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".tsx")) files.push(p);
  });
walk(CONSOLE_DIR);

test("question headings use text-pretty for balanced wrapping", () => {
  const answer = readFileSync(new URL("../src/app/app/answer.tsx", import.meta.url), "utf8");
  const questionHeadings = answer.match(/id={`q-\$\{turn\.key\}`}[^>]+>/g) ?? [];
  assert.ok(questionHeadings.length >= 1, "expected at least one question heading");
  for (const h of questionHeadings) {
    assert.match(h, /text-pretty/, `question heading missing text-pretty: ${h.slice(0, 80)}`);
  }
});

test("welcome heading uses text-pretty", () => {
  const welcome = readFileSync(new URL("../src/app/app/welcome.tsx", import.meta.url), "utf8");
  assert.match(welcome, /text-pretty.*text-display/, "welcome h2 should use text-pretty");
});

test("starter questions use text-body, not text-ui", () => {
  const workspace = readFileSync(new URL("../src/app/app/ask-workspace.tsx", import.meta.url), "utf8");
  // The starter question buttons should be text-body (14px) not text-ui (13px).
  const starterMatch = workspace.match(/STARTER_QUESTIONS[\s\S]{0,500}text-(body|ui)/);
  assert.ok(starterMatch, "could not find starter question text size");
  assert.equal(starterMatch![1], "body", "starter questions should use text-body");
});

test("no console .tsx file uses dangerouslySetInnerHTML", () => {
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    assert.doesNotMatch(src, /dangerouslySetInnerHTML/, `${file} uses dangerouslySetInnerHTML`);
  }
});

test("answer article containers use gap-5 for section spacing", () => {
  const answer = readFileSync(new URL("../src/app/app/answer.tsx", import.meta.url), "utf8");
  // Both Answered and CaseAnswered should use gap-5 on their article.
  const articles = answer.match(/<article[^>]+>/g) ?? [];
  assert.ok(articles.length >= 2, `expected at least 2 article elements, found ${articles.length}`);
  for (const a of articles) {
    assert.match(a, /gap-5/, `article missing gap-5: ${a.slice(0, 80)}`);
  }
});

test("answer footers use border-t for visual separation from prose", () => {
  const answer = readFileSync(new URL("../src/app/app/answer.tsx", import.meta.url), "utf8");
  const footers = answer.match(/<footer[^>]+>/g) ?? [];
  assert.ok(footers.length >= 1, "expected at least one footer element");
  for (const f of footers) {
    assert.match(f, /border-t/, `footer missing border-t: ${f.slice(0, 80)}`);
  }
});

test("no console .tsx file uses aria-label={undefined} or aria-label={null}", () => {
  const problems: string[] = [];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (/aria-label=\{(?:undefined|null)\}/.test(lines[i])) {
        problems.push(`${file}:${i + 1} has aria-label bound to undefined/null`);
      }
    }
  }
  assert.deepEqual(problems, [], `Broken aria-labels:\n${problems.join("\n")}`);
});
