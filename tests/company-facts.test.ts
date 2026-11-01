import assert from "node:assert/strict";
import { test } from "node:test";
import { HttpGateway } from "../src/lib/gateway/http";
import { MockGateway } from "../src/lib/gateway/mock";
import { companyFactsExtractSchema, isRefusal } from "../src/lib/gateway/types";
import { mergeFacts, readStoredFacts, sourceLine, typedFact, type StoredFact } from "../src/lib/company-facts";
import { extractCompanyFactsAction } from "../src/app/app/company/actions";

// The backend's own synthetic page (checker/sources/mca_fixture.py `master_data_text()`).
const MASTER_DATA = [
  "Company Master Data",
  "This is a SYNTHETIC test fixture. It is not a real company's record.",
  "",
  "CIN                              U00000ZZ0000ZZZ000000",
  "Company Name                     SYNTHETIC EXAMPLE PRIVATE LIMITED",
  "ROC Code                         RoC-Synthetic",
  "Registration Number              000000",
  "Class of Company                 Private",
  "Paid up Capital(Rs)              500000",
  "Date of Incorporation            14/08/2010",
  "Registered Address               5 FORT STREET, SYNTHETIC CITY, Maharashtra, 400001",
  "Whether Listed or not            Unlisted",
  "Company Status(for efiling)      Active",
  "",
  "Directors/Signatory Details",
  "DIN/PAN      Name                        Begin date",
  "01234567     SYNTHETIC DIRECTOR ONE     14/08/2010",
].join("\n");

const TODAY = "2026-11-01";

test("a typed CIN, listed and State are checked the way the backend checks them", () => {
  const cin = typedFact("cin", " u00000mh2010ptc000000 ", TODAY);
  assert.ok(cin.ok && cin.fact.value === "U00000MH2010PTC000000" && cin.fact.basis === "USER_FACT" && cin.fact.label === "you told us");
  assert.equal(typedFact("cin", "U123", TODAY).ok, false);
  assert.equal(typedFact("listed", "maybe", TODAY).ok, false);
  assert.equal(typedFact("state", "Atlantis", TODAY).ok, false);
  const state = typedFact("state", "Kerala", TODAY);
  assert.ok(state.ok && state.fact.confirmed && !state.fact.can_verify && state.fact.quoted_span === "");
  assert.equal(typedFact("listed", "", TODAY).ok, false);
});

test("stored facts: a malformed or unconfirmed entry is dropped, never repaired", () => {
  const good = { field: "listed", value: "no", basis: "USER_FACT", label: "you told us", quoted_span: "", confirmed: true, can_verify: false, saved_on: TODAY };
  const raw = JSON.stringify([good, { ...good, field: "director_name" }, { ...good, field: "state", confirmed: false }, "x"]);
  assert.deepEqual(readStoredFacts(raw), [good]);
  assert.deepEqual(readStoredFacts("{not json"), []);
  assert.deepEqual(readStoredFacts(null), []);
});

test("merging replaces by field, keeps the rest, and does not touch the input", () => {
  const a = typedFact("listed", "yes", TODAY);
  const b = typedFact("listed", "no", TODAY);
  const c = typedFact("cin", "U00000MH2010PTC000000", TODAY);
  assert.ok(a.ok && b.ok && c.ok);
  const current: readonly StoredFact[] = Object.freeze([a.fact, c.fact]);
  const merged = mergeFacts(current, [b.fact]);
  assert.deepEqual(merged.map((f) => [f.field, f.value]), [["cin", "U00000MH2010PTC000000"], ["listed", "no"]]);
  assert.equal(current[0].value, "yes");
});

test("the source line says typed or MCA, with its date", () => {
  const typed = typedFact("state", "Goa", TODAY);
  assert.ok(typed.ok);
  assert.equal(sourceLine(typed.fact), "Entered by hand on 2026-11-01");
  assert.equal(sourceLine({ ...typed.fact, basis: "COMPANY_FACT", label: "MCA master data, as uploaded by the user on 2026-10-01" }),
    "From an MCA master-data page uploaded on 2026-10-01");
});

test("companyFactsExtract posts text and uploaded_on to /v2/company-facts/extract", async () => {
  const original = globalThis.fetch;
  let seen: { url: string; body: unknown } | null = null;
  globalThis.fetch = async (url, init) => {
    seen = { url: String(url), body: JSON.parse(String(init?.body)) };
    return Response.json({ status: "REFUSED", code: "CANNOT_READ", detail: "no text" });
  };
  try {
    const result = await new HttpGateway("http://localhost:8021", "fixture-key").companyFactsExtract({ text: "x", uploadedOn: TODAY });
    assert.deepEqual(seen, { url: "http://localhost:8021/v2/company-facts/extract", body: { text: "x", uploaded_on: TODAY } });
    assert.ok(result.ok && isRefusal(result.data) && result.data.code === "CANNOT_READ");
  } finally { globalThis.fetch = original; }
});

test("the schema refuses a fact outside the backend's eight fields", () => {
  const fact = { field: "director_name", value: "X", basis: "COMPANY_FACT", label: "l", quoted_span: "s", confirmed: false, can_verify: false };
  assert.equal(companyFactsExtractSchema.safeParse({ source_label: "l", facts: [fact], unmatched: [] }).success, false);
});

test("the demo reads the backend's synthetic page as the backend does, and no director", async () => {
  const result = await new MockGateway().companyFactsExtract({ text: MASTER_DATA, uploadedOn: "2026-10-01" });
  assert.ok(result.ok && !isRefusal(result.data));
  const byField = Object.fromEntries(result.data.facts.map((f) => [f.field, f.value]));
  assert.deepEqual(byField, {
    cin: "U00000ZZ0000ZZZ000000", name: "SYNTHETIC EXAMPLE PRIVATE LIMITED", roc: "RoC-Synthetic",
    incorporated_on: "14/08/2010", address: "5 FORT STREET, SYNTHETIC CITY, Maharashtra, 400001",
    listed: "no", status: "Active", state: "Maharashtra",
  });
  assert.ok(result.data.facts.every((f) => f.quoted_span && !f.confirmed && f.label.endsWith("2026-10-01")));
  assert.doesNotMatch(JSON.stringify(result.data), /DIRECTOR ONE|01234567/);
  const other = await new MockGateway().companyFactsExtract({ text: "A board resolution", uploadedOn: TODAY });
  assert.ok(other.ok && !isRefusal(other.data) && other.data.facts.length === 0 && other.data.unmatched.length === 8);
});

async function withEnv<T>(set: Record<string, string>, fn: () => Promise<T>): Promise<T> {
  const keys = ["APP_PASSCODE", "APP_SESSION_SECRET", "PLACEDON_DEMO_MODE", "GATEWAY_URL", "PLACEDON_GATEWAY_KEY"];
  const saved = keys.map((k) => process.env[k]);
  try {
    for (const k of keys) delete process.env[k];
    Object.assign(process.env, set);
    return await fn();
  } finally {
    keys.forEach((k, i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i]; });
  }
}

const form = (fields: Record<string, string | File>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

test("the action requires a session before contacting the gateway", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return new Response("no", { status: 500 }); };
  try {
    const result = await withEnv({ GATEWAY_URL: "http://gateway.invalid", PLACEDON_GATEWAY_KEY: "test-key-that-is-not-a-secret" },
      () => extractCompanyFactsAction(form({ text: MASTER_DATA })));
    assert.ok(!result.ok && /session has ended/.test(result.message));
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }
});

test("the action reads pasted text or a .txt file, and names what was not found", async () => {
  await withEnv({ PLACEDON_DEMO_MODE: "true" }, async () => {
    const pasted = await extractCompanyFactsAction(form({ text: MASTER_DATA }));
    assert.ok(pasted.ok && pasted.facts.length === 8 && pasted.missing.length === 0 && /^\d{4}-\d{2}-\d{2}$/.test(pasted.uploadedOn));
    const partial = await extractCompanyFactsAction(form({ file: new File(["CIN   U00000ZZ0000ZZZ000000"], "page.txt") }));
    assert.ok(partial.ok && partial.facts.length === 1 && partial.missing.includes("state") && partial.missing.includes("listed"));
    const empty = await extractCompanyFactsAction(form({ text: "   " }));
    assert.ok(!empty.ok && /paste the page/.test(empty.message));
  });
});

test("the action says a refusal and a role block in words, never as facts", async () => {
  const original = MockGateway.prototype.companyFactsExtract;
  try {
    await withEnv({ PLACEDON_DEMO_MODE: "true" }, async () => {
      MockGateway.prototype.companyFactsExtract = async () => ({ ok: true, data: { status: "REFUSED", code: "CANNOT_READ", detail: "x" } });
      const scan = await extractCompanyFactsAction(form({ text: "x" }));
      assert.ok(!scan.ok && /no readable text/.test(scan.message));
      MockGateway.prototype.companyFactsExtract = async () => ({ ok: false, error: { kind: "bad_request", route: "/v2/company-facts/extract", status: 403, message: "403" } });
      const role = await extractCompanyFactsAction(form({ text: "x" }));
      assert.ok(!role.ok && /role cannot/.test(role.message));
    });
  } finally { MockGateway.prototype.companyFactsExtract = original; }
});
