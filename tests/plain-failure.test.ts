import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { failureDetails, plainFailure } from "../src/lib/plain-failure";

const JARGON = /gateway|run id|\bverb|HTTP|transport|schema|_error|\/v[12]\//i;

test("each kind of failure reads as one plain sentence with no technical words", () => {
  const cases = [
    { kind: "transport_error", route: "/v2/draft/list" },
    { kind: "timeout", route: "/v2/draft/list" },
    { kind: "schema_mismatch", route: "/v2/draft/list", status: 200 },
    { kind: "server_error", route: "/v2/draft/list", status: 502 },
    { kind: "server_error", route: "/v2/draft/list", status: 503 },
    { kind: "bad_request", route: "/v2/draft/list", status: 429 },
    { kind: "bad_request", route: "/v2/draft/list", status: 400 },
    { kind: "bad_request", route: "/v2/draft/list", status: 401 },
    { kind: "not_found", route: "/v2/draft/list", status: 404 },
    { kind: "something_new", route: "/v2/draft/list" },
  ];
  const seen = new Set<string>();
  for (const c of cases) {
    const text = plainFailure(c);
    assert.doesNotMatch(text, JARGON, text);
    assert.match(text, /^[A-Z].*\.$/);
    seen.add(text);
  }
  assert.ok(seen.size >= 6, "different failures get different sentences");
  assert.match(plainFailure({ kind: "bad_request", status: 401 }), /sign in again/i);
  assert.match(plainFailure({ kind: "server_error", status: 503 }), /busy/i);
});

test("the technical detail is kept for the Details toggle", () => {
  const d = failureDetails({ kind: "server_error", route: "/v2/draft/list", status: 502, message: "Placedon answered with an error (HTTP 502).", detail: "upstream" });
  assert.equal(d, "server_error · /v2/draft/list · HTTP 502 · Placedon answered with an error (HTTP 502). · upstream");
  assert.equal(failureDetails({ kind: "timeout" }), "timeout");
});

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith(".tsx") ? [path] : [];
  });
}

test("no app screen prints an error's kind, route or HTTP status as visible text", () => {
  const root = new URL("../src/app/app", import.meta.url).pathname;
  const offenders = files(root).filter((path) => {
    const src = readFileSync(path, "utf8");
    return /\{[\w.]*error\.(kind|route)\}|· HTTP \$\{|\(HTTP \$\{|Engine failure ·/.test(src) || /\$\{[\w.]*error\.kind\}/.test(src);
  });
  assert.deepEqual(offenders.map((p) => p.slice(root.length)), []);
});
