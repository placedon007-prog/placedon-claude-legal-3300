import assert from "node:assert/strict";

// Run against the local production demo after a build. Both synthetic files are
// rejected before gateway dispatch, so this test never stores a real document.
const origin = new URL(process.env.UPLOAD_TEST_ORIGIN ?? "http://localhost:3311");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname), "Use a local demo server");
const uploadUrl = new URL("/app/vault", origin);
const maximumFileBytes = 10 * 1024 * 1024;
const demoPage = await fetch(new URL("/app", origin), { redirect: "manual" });
assert.equal(demoPage.status, 200, "The local demo must admit the workspace without a session");
assert.ok(/Demo[^<]*|synthetic data/i.test(await demoPage.text()), "Only run against an explicitly labelled demo");

function decodeAttribute(value) {
  return value.replace(/&(?:quot|apos|amp|lt|gt|#\d+|#x[\da-f]+);/gi, (entity) => {
    const known = { "&quot;": '"', "&apos;": "'", "&amp;": "&", "&lt;": "<", "&gt;": ">" };
    if (known[entity]) return known[entity];
    const hexadecimal = entity.startsWith("&#x");
    return String.fromCodePoint(Number.parseInt(entity.slice(hexadecimal ? 3 : 2, -1), hexadecimal ? 16 : 10));
  });
}

function attributes(input) {
  return Object.fromEntries([...input.matchAll(/([\w$:-]+)=(?:"([^"]*)"|'([^']*)')/g)]
    .map(([, key, doubleQuoted, singleQuoted]) => [key, decodeAttribute(doubleQuoted ?? singleQuoted)]));
}

async function submitSyntheticPdf(size, expectedMessage) {
  const page = await fetch(uploadUrl, { redirect: "manual" });
  assert.equal(page.status, 200, "The local demo must admit the upload page without a session");
  const html = await page.text();
  const form = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)]
    .map(([value]) => value)
    .find((value) => /\bname=["']file["']/.test(value));
  assert.ok(form, "The document upload form must be server rendered");
  const data = new FormData();
  for (const [input] of form.matchAll(/<input\b[^>]*>/g)) {
    const attrs = attributes(input);
    if (attrs.type === "hidden" && attrs.name) data.append(attrs.name, attrs.value ?? "");
  }
  assert.ok([...data.keys()].some((key) => key.startsWith("$ACTION_")), "Preserve the real Server Action binding");
  data.append("file", new File([new Uint8Array(size)], "synthetic-upload-limit.pdf", { type: "application/pdf" }));
  data.append("name", "synthetic-upload-limit.pdf");
  const request = new Request(uploadUrl, { method: "POST", body: data, headers: { Origin: origin.origin } });
  const response = await fetch(request, { redirect: "manual" });
  assert.equal(response.status, 200, "The framework must admit a 10 MiB file plus multipart overhead");
  assert.match(await response.text(), expectedMessage, "The application validation must run after transport acceptance");
  return { fileBytes: size, status: response.status, applicationValidation: "reached" };
}

const results = [];
results.push(await submitSyntheticPdf(maximumFileBytes, /This file does not begin with %PDF- and is not a PDF\./));
results.push(await submitSyntheticPdf(maximumFileBytes + 1, /That file is 10485761 bytes; the limit is 10485760\./));
console.log(JSON.stringify({ origin: origin.origin, passed: results.length, results }, null, 2));
