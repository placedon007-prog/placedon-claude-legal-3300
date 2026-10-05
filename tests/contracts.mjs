import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import ts from "typescript";

// Test the actual server modules without bundling or installing a test runner.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      return {
        url: pathToFileURL(resolve("src", specifier.slice(2) + ".ts")).href,
        shortCircuit: true,
      };
    }
    if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts")) {
      const url = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(fileURLToPath(url)))
        return { url: url.href, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (
      url.startsWith("file:") &&
      url.endsWith(".ts") &&
      !url.includes("node_modules")
    ) {
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
          },
        }).outputText,
      };
    }
    return next(url, context);
  },
});
const { requestSchema, intakeConfiguration, storeRequest, secureEndpoint } =
  await import("../src/lib/intake.ts");
const { MockProvider, HttpProvider } = await import("../src/lib/api.ts");
const { legalSource } = await import("../src/lib/legal.ts");
const { formatProvisionReference } = await import("../src/lib/format.ts");
const { POST } = await import("../src/app/api/waitlist/route.ts");
const { MockGateway } = await import("../src/lib/gateway/mock.ts");
const { HttpGateway } = await import("../src/lib/gateway/http.ts");
const gatewayTypes = await import("../src/lib/gateway/types.ts");
const { GATEWAY_ROUTES } = await import("../src/lib/engine/types.ts");
let assertions = 0;
function check(value, message) {
  assert.ok(value, message);
  assertions++;
}
check(
  formatProvisionReference("Companies Act 2013, s.173(1)") ===
    "Companies Act, 2013, Section 173(1)",
  "Compact engine citations become lawyer-facing references",
);
check(
  formatProvisionReference("s.2(85) and ss. 96(1)") ===
    "Section 2(85) and Sections 96(1)",
  "Singular and plural section shorthand are normalised for display",
);
const valid = {
  intent: "waitlist",
  requestId: "d3c57a74-9b3b-4f45-a22f-08dbde73c4df",
  email: "test@example.invalid",
  requestConsent: true,
  productUpdatesConsent: false,
  website: "",
  noticeVersion: "review-1",
  consentVersion: "review-1",
};
check(requestSchema.safeParse(valid).success, "Valid waitlist");
for (const change of [
  { email: "bad" },
  { requestConsent: false },
  { website: "bot" },
  { intent: "pilot" },
  { role: "unknown" },
  { requestId: "bad" },
  { name: "x".repeat(101) },
]) {
  check(
    !requestSchema.safeParse({ ...valid, ...change }).success,
    `Reject ${Object.keys(change)[0]}`,
  );
}
check(
  requestSchema.safeParse({
    ...valid,
    intent: "pilot",
    workflow: "Review filing evidence",
  }).success,
  "Valid pilot",
);
check(
  !("workflow" in requestSchema.parse({ ...valid, workflow: "discard" })),
  "Waitlist excludes pilot-only data",
);
for (const url of [
  "http://example.invalid",
  "https://user:secret@example.invalid",
  "bad",
  "https://example.invalid/#fragment",
])
  check(!secureEndpoint(url), "Unsafe endpoint");
check(!intakeConfiguration().enabled, "Default closed");
const receipt = await storeRequest(
  { ...valid, receivedAt: new Date().toISOString() },
  "https://sink.example.invalid",
  async (_, init) => {
    check(
      init.headers["Idempotency-Key"] === valid.requestId,
      "Idempotency key",
    );
    return Response.json({ stored: true, requestId: valid.requestId });
  },
);
check(receipt.stored, "Receipt acknowledged");
for (const data of [
  {},
  { stored: false },
  { stored: true, requestId: "019646c1-aa44-7fcc-aead-741126cb56f8" },
]) {
  await assert.rejects(() =>
    storeRequest(valid, "https://sink.example.invalid", async () =>
      Response.json(data),
    ),
  );
  assertions++;
}
const mock = new MockProvider();
check(
  (await mock.compliancePack()).answers[0].status === "abstained",
  "Mock abstains",
);
check((await mock.health()).status === "mock", "Mock labelled");
const bad = new HttpProvider(
  "https://api.example.invalid",
  undefined,
  async () =>
    Response.json({
      answers: [{ status: "answered", statement: "Unsupported" }],
    }),
);
check(
  (await bad.compliancePack({})).answers[0].status === "abstained",
  "Malformed backend abstains",
);
check(
  (await bad.health()).status === "unavailable",
  "Malformed health unavailable",
);
await assert.rejects(() => bad.events("A".repeat(21)));
assertions++;
await assert.rejects(() => bad.standing("invalid"));
assertions++;
const originalFetch = globalThis.fetch;
try {
  check(
    (
      await POST(
        new Request("https://site.example.invalid/api/waitlist", {
          method: "POST",
        }),
      )
    ).status === 503,
    "Route closed",
  );
  const details = Object.fromEntries(
    ["privacy", "terms", "cookies"].flatMap((kind) =>
      [...legalSource(kind).matchAll(/\{\{([A-Z_]+)\}\}/g)].map((match) => [
        match[1],
        "Test fixture only",
      ]),
    ),
  );
  details.PRIVACY_NOTICE_VERSION = "review-1";
  Object.assign(process.env, {
    SITE_ORIGIN: "https://site.example.invalid",
    WAITLIST_ENABLED: "true",
    WAITLIST_SINK_URL: "https://sink.example.invalid",
    LEGAL_REVIEW_CONFIRMED: "true",
    LEGAL_DETAILS_JSON: JSON.stringify(details),
    PRIVACY_NOTICE_VERSION: "review-1",
    CONSENT_VERSION: "review-1",
  });
  check(intakeConfiguration().enabled, "Complete test configuration enables");
  const request = (
    data,
    origin = "https://site.example.invalid",
    contentType = "application/json",
  ) =>
    new Request("https://site.example.invalid/api/waitlist", {
      method: "POST",
      headers: { origin, "Content-Type": contentType },
      body: typeof data === "string" ? data : JSON.stringify(data),
    });
  check(
    (await POST(request(valid, "https://elsewhere.example.invalid"))).status ===
      403,
    "Cross-origin rejected",
  );
  check(
    (await POST(request(valid, undefined, "text/plain"))).status === 415,
    "Content type rejected",
  );
  check(
    (await POST(request("x".repeat(8193)))).status === 413,
    "Oversized request rejected",
  );
  check(
    (await POST(request({ ...valid, requestConsent: false }))).status === 400,
    "Consent required at route",
  );
  check(
    (await POST(request({ ...valid, noticeVersion: "stale" }))).status === 409,
    "Stale notice rejected",
  );
  globalThis.fetch = async () => Response.json({});
  check(
    (await POST(request(valid))).status === 502,
    "Unconfirmed sink cannot succeed",
  );
  globalThis.fetch = async () =>
    Response.json({ stored: true, requestId: valid.requestId });
  const stored = await POST(request(valid));
  check(
    stored.status === 200 && (await stored.json()).stored === true,
    "Confirmed storage succeeds",
  );
  process.env.PRIVACY_NOTICE_VERSION = "different";
  check(
    !intakeConfiguration().enabled,
    "Published notice mismatch closes intake",
  );
} finally {
  globalThis.fetch = originalFetch;
}
/* ── the four screens' verbs, on BOTH providers ──────────────────────────────
 *
 * One list run against the mock and against the http client's URL shaping, because a verb
 * added to one provider and not the other is a screen that works in the demo and 404s in
 * production. Every shape below was read from a LIVE gateway on 2026-10-04; where the live
 * system differed from a fixture, docs/app-screens/README.md records it.
 */
const gw = new MockGateway();

// Every verb the four screens call must exist on the interface, on both providers.
const SCREEN_VERBS = [
  "vaultUpload", "vaultStatus", "vaultFind", "vaultVerify",
  "tableCreate", "tableStatus", "tableExport", "tableCancel",
  "draftCreate", "draftRevise", "draftVersions", "draftDiff", "draftExport",
  "calendarUpcoming",
];
const httpProto = HttpGateway.prototype;
for (const verb of SCREEN_VERBS) {
  check(typeof gw[verb] === "function", `MockGateway implements ${verb}`);
  check(typeof httpProto[verb] === "function", `HttpGateway implements ${verb}`);
}
// And each must have a route, or the http client would POST to undefined.
for (const route of [
  "vaultUpload", "vaultStatus", "vaultFind", "vaultVerify",
  "tableCreate", "tableStatus", "tableExport", "tableCancel",
  "draftCreate", "draftRevise", "draftVersions", "draftDiff", "draftExport",
  "calendarUpcoming",
]) {
  check(
    typeof GATEWAY_ROUTES[route] === "string" && GATEWAY_ROUTES[route].startsWith("/v2/"),
    `GATEWAY_ROUTES.${route} is a /v2 path (${GATEWAY_ROUTES[route]})`,
  );
}
// `review_table.create` is `/v2/review-table/create` — a hyphen, from rest_path() in the
// backend, not the underscore a dotted verb name suggests nor a REST noun.
check(
  GATEWAY_ROUTES.tableCreate === "/v2/review-table/create",
  "a dotted verb's head becomes a HYPHENATED path segment",
);

// ── the vault: a state per file, and PENDING is not INGESTED ─────────────────
const vs = await gw.vaultStatus();
check(vs.ok && vs.data.documents > 0, "vaultStatus returns the firm's documents");
check(
  vs.ok && vs.data.unsearchable > 0 && vs.data.unsearchable < vs.data.documents,
  "...with some documents unsearchable and some not, so the column has both states",
);
const uploaded = await gw.vaultUpload({ name: "new.txt", text: "Some clause." });
check(
  uploaded.ok && !gatewayTypes.isRefusal(uploaded.data) && uploaded.data.state === "PENDING",
  "a fresh upload is PENDING, not INGESTED — nothing is searchable until a worker reads it",
);
const found = await gw.vaultFind({ query: "nothing matches this at all" });
check(
  found.ok && found.data.hits.length === 0 && found.data.unsearchable > 0,
  "a search with no hits still reports how many documents it could NOT look at, so an " +
    "empty result is not read as 'no document matches'",
);
// One line per check, never a single real/fake badge.
const verified = await gw.vaultVerify({ document_id: undefined, documentId: "a".repeat(64) });
check(
  verified.ok && !gatewayTypes.isRefusal(verified.data) &&
    Array.isArray(verified.data.checks) && verified.data.checks.length >= 3,
  "vaultVerify returns each check on its own line, not one verdict",
);
const broken = await gw.vaultVerify({ documentId: "c".repeat(64) });
check(
  broken.ok && !gatewayTypes.isRefusal(broken.data) &&
    broken.data.checks.some((c) => c.result === "FAIL") &&
    broken.data.checks.some((c) => c.result === "NOT RUN"),
  "...and a missing-bytes document distinguishes FAIL from NOT RUN — collapsing them " +
    "would make 'the bytes are gone' and 'the bytes changed' the same answer",
);

// ── review tables: cell states, UNPRICED, PAUSED_BUDGET as a state ───────────
const cols = (n) =>
  Array.from({ length: n }, (_, i) => ({
    name: `q${i + 1}`,
    kind: "text",
    question: `Question ${i + 1}?`,
  }));
const small = await gw.tableCreate({ name: "Small", documentIds: ["a".repeat(64)], columns: cols(2) });
check(small.ok && small.data.estimated_cost_inr === null, "a new table is UNPRICED, not 0");
check(
  small.ok && small.data.cost_note.startsWith("UNPRICED:"),
  "...and says why, rather than showing a currency symbol with nothing behind it",
);
check(small.ok && small.data.scheduled.paused_budget === false, "a small table is not paused");

const big = await gw.tableCreate({
  name: "Big",
  documentIds: ["a".repeat(64), "b".repeat(64), "c".repeat(64)],
  columns: cols(3),
});
check(
  big.ok && big.data.scheduled.paused_budget === true,
  "a table past the cap PAUSES — so the paused branch is exercised, not just present",
);
check(
  big.ok && big.data.scheduled.not_scheduled.length > 0 &&
    big.data.scheduled.enqueued.length > 0,
  "...after dispatching SOME cells and naming the rest, which is what makes it resumable",
);
check(
  big.ok && big.data.scheduled.pause_reason.toLowerCase().includes("cap"),
  "...and the reason names the cap that refused it",
);
const st = await gw.tableStatus({ gridId: small.data.grid_id });
check(st.ok && st.data.cells_detail.length === 2, "tableStatus returns a row per cell");
check(
  st.ok && st.data.spend.total_inr === null && st.data.spend.note.startsWith("UNPRICED:"),
  "...and its spend is UNPRICED while no cell has run",
);
check(
  st.ok && st.data.findings === 0 && st.data.by_state.PENDING === 2,
  "PENDING cells are NOT counted as findings — neither is FAILED",
);
const csv = await gw.tableExport({ gridId: small.data.grid_id });
check(csv.ok && csv.data.content_type === "text/csv", "tableExport is CSV");
check(
  csv.ok && !/,,/.test(csv.data.csv) && csv.data.csv.includes("PENDING"),
  "...and every cell carries WORDS, never a blank: a blank makes 'absent' and 'not read' " +
    "identical",
);
const cancelled = await gw.tableCancel({ gridId: small.data.grid_id });
check(
  cancelled.ok && cancelled.data.pending_stopped === 2 && cancelled.data.cancelled,
  "tableCancel stops scheduling and reports what it stopped",
);
check(
  cancelled.ok && cancelled.data.note.includes("not mark unrun cells as failed"),
  "...and says unrun cells stay PENDING rather than becoming failures",
);
const missing = await gw.tableStatus({ gridId: "no-such-grid" });
check(
  !missing.ok && missing.error.kind === "not_found",
  "an unknown table is a FAILURE, not an empty table — an empty grid would read as 'no " +
    "findings', which is a claim about documents nobody looked at",
);

// ── drafts: model prose is a suggestion, and CONFLICT names both versions ────
const draft = await gw.draftCreate({ title: "Board resolution" });
check(draft.ok && draft.data.version === 1, "draftCreate starts at version 1");
check(
  draft.ok && draft.data.blocking.length > 0 && draft.data.ready_for_approval === false,
  "...and a MODEL_SUGGESTION slot BLOCKS approval until a person accepts it",
);
const versions = await gw.draftVersions({ draftId: draft.data.draft_id });
check(
  versions.ok &&
    versions.data.versions[0].slots.some((sl) => sl.origin === "MODEL_SUGGESTION"),
  "the model's prose is marked MODEL_SUGGESTION in its own slot, not blended into the body",
);
const good = await gw.draftRevise({
  draftId: draft.data.draft_id,
  baseVersion: 1,
  body: "The Board resolved, as amended.",
});
check(good.ok && !gatewayTypes.isConflict(good.data) && good.data.version === 2,
  "a revise from the CURRENT latest succeeds and lands at version 2");
const stale = await gw.draftRevise({
  draftId: draft.data.draft_id,
  baseVersion: 1,
  body: "a second writer, from a stale tab",
});
check(stale.ok, "a CONFLICT arrives as a RESULT, not a transport failure");
check(gatewayTypes.isConflict(stale.data), "...and is typed as a CONFLICT");
check(
  stale.ok && stale.data.base_version === 1 && stale.data.latest_version === 2,
  "...naming BOTH versions: the base it was given and the one that beat it",
);
const diff = await gw.draftDiff({ draftId: draft.data.draft_id, fromVersion: 1, toVersion: 2 });
check(diff.ok && diff.data.text_changed && diff.data.text.length > 0, "draftDiff shows the text change");
const exported = await gw.draftExport({ draftId: draft.data.draft_id, version: 2 });
check(
  exported.ok && exported.data.ready_for_approval === false &&
    exported.data.text.includes("NOT APPROVABLE"),
  "an unapprovable export says so ON ITS OWN FACE, because the file travels away from " +
    "this system",
);

// ── calendar: a missing fact is unknown, never a date ────────────────────────
const blind = await gw.calendarUpcoming({ company: { company_class: "private" } });
check(blind.ok && blind.data.due.length === 0, "with no anchor supplied, nothing is DUE");
check(
  blind.ok && blind.data.unknown.length > 0,
  "...and the obligations appear as UNKNOWN rather than disappearing",
);
for (const u of blind.data.unknown) {
  check(u.due === null, `UNKNOWN entry ${u.obligation_id} carries due: null, never a date`);
  check(
    Array.isArray(u.missing) && u.missing.length > 0,
    `...and NAMES the fact it is missing (${u.missing?.join(", ")})`,
  );
}
const dated = await gw.calendarUpcoming({
  company: { company_class: "private" },
  anchors: { financial_year_end: "2026-06-30" },
});
check(
  dated.ok && dated.data.due.length > 0 && dated.data.due[0].due !== null,
  "a date appears ONLY once the fact it derives from is supplied — so the UNKNOWN branch " +
    "is not simply the only branch",
);
check(
  dated.ok && dated.data.due[0].anchor_label === "financial_year_end",
  "...and the entry names the supplied fact the date was derived from",
);

// ── a transport failure is never an abstention ───────────────────────────────
const unreachable = new HttpGateway("http://127.0.0.1:1", "test-key-not-a-real-key");
const dead = await unreachable.calendarUpcoming({ company: {} });
check(!dead.ok, "an unreachable gateway is a FAILURE");
check(
  !dead.ok && (dead.error.kind === "transport_error" || dead.error.kind === "timeout"),
  `...typed as transport, never as a product state (${dead.error?.kind})`,
);
check(
  !dead.ok && !("unknown" in (dead.error ?? {})) && !("due" in (dead.error ?? {})),
  "...and carries no calendar shape, so it cannot be rendered as an unknown date",
);

console.log(
  `${assertions} contract assertions passed. No external requests were sent.`,
);
