# /app screenshots — LIVE

Every image in this directory is a **live capture** against the real backend gateway on
this laptop: PostgreSQL 18.6 (`store: postgres, degraded: false`), `azure/llama-3-3-70b`
deployed in **UAE North**, corpus `sha256:6809b8c8…`. No fixtures, no mock provider.

Four were taken 2026-09-29 at checker commit `6d3ac4a4`. `contracts-findings.png` was
re-taken 2026-09-30 at `4235e94`, after the standard column was filled — difference 4.

They replace an earlier set taken against `MockProvider`. The mock set is not kept: a
screenshot of a fixture in a directory called `app-screens` is the kind of thing that
gets cited later as evidence the product did something it has never done.

| File | Screen | Run |
|---|---|---|
| `ask-answer.png` | Ask — a cited answer | `d3830a4c` |
| `ask-refusal.png` | Ask — a named abstention | `568282e1` |
| `contracts-findings.png` | Contracts — `nda_N02.docx` uploaded and reviewed | `a366579e` |
| `runs-list.png` | Runs — the three runs this browser started | — |
| `run-trace.png` | Run — steps, models, region, cost | `d540c3c3` |
| `documents-minutes.png` | Documents — minutes, 49-day entry lag | `89b3c953` |
| `review-gate.png` | The human gate — one open, two locked | `89b3c953` |
| `decision-recorded.png` | The label, after Approve | `89b3c953` |
| `documents-notice.png` | Documents — a notice, nothing decided against it | `a70e28cf` |

The document reviewed is backend fixture **N02**, a test NDA. Nothing client-owned has
been sent to UAE North (PLAN_22 D3).

## What the live run did differently from the mock

Nine differences, all of them the live system being narrower or more careful than the
fixture that stood in for it. Listed because the mock was, in several places, a more
flattering description of the product than the product.

### 1. The mock's abstention claimed more than the engine does

The mock said: *"the question reaches a body of law this corpus does not hold, so no model
was called."* That asserts we identified the body of law and know we lack it.

The live engine says: *"the question cited nothing this corpus resolves, so no model was
called. That is not the same as there being no such provision."* It claims only that
retrieval found nothing, and then explicitly refuses the stronger reading.

The mock wording was the more useful-sounding of the two and the less true one.

### 2. The review reports every rule, not a selection

Mock: **3 of 4 rules need a look** — four rows, chosen to show off four different statuses
(`DEVIATES`, `NEEDS_LAWYER`, `MISSING`, `MATCHES`).

Live: **1 of 10 rules need a look** — all ten playbook rules, NDA-01 `DEVIATES` (*'five
years' (5) against the standard maximum '3 years' (3)*), NDA-02 through NDA-10 `MATCHES`.
A real review is mostly rows that say nothing is wrong, and the screen has to stay readable
when that is what comes back.

### 3. `MISSING` and `NEEDS_LAWYER` did not occur live

Both appeared in the mock. Against N02 neither fired: the model extracted every clause
present, and NDA-08/NDA-09 (Non-Compete, Non-Solicit) report *"the clause is absent, which
is the standard"* — absence as compliance, a case the mock never showed. The two statuses
are still implemented and still distinguishable without colour; this fixture does not
produce them.

### 4. "THE STANDARD" column was empty on every live row — now CLOSED

The mock filled it with rationale prose (*"Confidentiality obligations running longer than
three years are hard to administer…"*). The real `playbooks/nda_v1.json` carried no such
field, so the column rendered with a header and nothing under it. The prose in the mock was
written for the screenshot and did not exist in the product.

**Fixed 2026-09-29** (backend PR #20, `4235e94`): every rule now states a `standard_text` —
the company position in one plain sentence — and a `rationale`, `review_contract` sends
both, and the console renders the position in body type with the reason beneath it. Both
are DRAFT, marked by the `playbook_status` already on the response. `why`, the engineering
note on the rule's shape, is deliberately NOT sent: NDA-02's is a changelog about a
false-alarm rate, which is not what a lawyer's column is for.

`contracts-findings.png` was re-captured live after the fix and shows all ten cells filled.
The mock fixtures were updated to the playbook's real sentences at the same time, so the
mock stops being a more flattering description of the product than the product.

### 5. The trace is a different pipeline

| | Mock | Live |
|---|---|---|
| Outcome | `review_contract — PARTIAL` | `review_contract — ANSWERED` |
| Steps | 2 | 3 |
| Names | `intake`, `research / law.acquisition_exposure` | `intake`, `document / document.ground_extraction`, `playbook / contract.playbook_review` |

### 6. Cost is real, and it is not stable between runs

Mock: ₹0.0735 from 852+235 tokens, sourced to a bare `https://prices.azure.com/api/retail/prices`.

Live: ₹0.0492 from 439+288 tokens, sourced to the **exact filter query** —
`…/prices?$filter=armRegionName eq 'uaenorth' and contains(meterName,'Llama 3.3 70B')` (2026-09-29).

The same review run twice, minutes apart, cost ₹0.0473 (439+260) and ₹0.0492 (439+288):
identical prompt, different completion length. Costs on this screen are per-run facts and
must not be averaged into a "cost per review" figure.

`UNPRICED` behaved as designed on both no-model steps: null with a reason, never 0.

### 7. The upload path adds a file kind and a content hash

Live header: `nda_N02.docx · docx · sha256 ea11728e5ed9… · playbook DRAFT · model
azure/llama-3-3-70b · 9 clauses read · run d540c3c3`. The mock had pasted text
(`nda.txt`) and so no hash. The `.docx` was read by `src/lib/documents` with no new
dependency, and the gateway's `documents.upload` verb returned the digest.

### 8. The live answer is thinner than the mock's

Mock: 3 cited sentences from s.96 (spans 226–348, 409–524, 845–1043), 1 of 4 untraced.
Live, in `ask-answer.png`: **1** cited sentence (span 826–1044), 1 of 2 untraced.

**The counts are not stable, and this entry originally said they were.** It read "both runs
of the same question returned the same single sentence", which was true of the two browser
runs behind that screenshot and false in general: two further runs the same day returned
3 traced and 1 dropped on the identical question. The model writes a different number of
sentences each time, so a different number survive grounding. What is stable is the STATUS
— `PARTIAL` on every run — and that the dropped ones are counted rather than dropped
quietly. Never quote the traced/dropped numbers as a figure.

Note the span for the same sentence: mock `845–1043`, live `826–1044`. Fixture offsets
were approximations of real ones.

### 9. The typography change is visible

These captures are the first with the AGENTS.md audience split applied: **Section 96** in
Fraunces bold, the evidence line (`Companies Act 2013, s.96 chars 826–1044`) in IBM Plex
Mono. The replaced mock screenshots had the section reference in mono, under the older
rule.

## Two things the screenshots show that are not differences

- **`ACCESS · No passcode is configured`** is on every screen because `APP_PASSCODE` was
  unset locally. That notice is the app working correctly, not a defect.
- **`degraded route`** on every model line is the router reporting that no Anthropic credit
  is available and Azure Llama served instead, per PLAN_22 §3. Expected.

## The Documents screen and the human gate (2026-09-30)

Four captures from PLAN_23 O1, all live against the same gateway. `review_document` calls
NO model, so these involve no Azure spend and no residency question at all.

**`documents-minutes.png`** — the ICSI specimen minutes with a meeting date of 2026-05-12
and an entry date of 2026-06-30. `1 defect · read as minutes · 12 checks · 3 need a person`.
T1.4b reads *"meeting 2026-05-12 -> entry 2026-06-30"* against the standard *"Minutes
entered 49 days after the meeting (limit 30)"*, penalised in Trouw Nutrition India, ROC
Telangana, 22.10.2024 — ₹21.35 lakh across 54 board meetings.

**`documents-notice.png`** — the same screen given an AGM notice. Measured live:
**0 DEFECT rows, 11 of 12 checks N/A.** Only T1.6a applies, and it passes on the quoted
span `14th ANNUAL GENERAL MEETING`. Every other row says *"not applicable to a document of
type 'notice'"* rather than passing quietly. This is the failure the classifier exists to
stop: minutes checks on a notice produced false-positive rates of 80-93% against genuinely
compliant filings, because a notice is issued BEFORE the meeting and cannot record what the
meeting did.

**`review-gate.png`** — the anti-automation-bias gate, and the one image that shows the rule
working rather than described. Three `NEEDS_BOOK` rows, three gates:

- **T1.1** has its quote open and a reason typed. Approve and Reject are live.
- **T1.2 and T1.3** are closed. Both read *"Read the quote — required before deciding"* and
  *"Open the quote above first."*, and both pairs of buttons are visibly dimmed.

Measured on the live page, not inferred from the markup: `approve-all controls: 0`, all gate
buttons `disabled` at rest, still disabled with the quote open and no reason, and unlocked
only once both conditions hold. There is no page-clearing control anywhere on the screen,
and there is not going to be one — it would convert the gate into a rubber stamp and record
the result as a considered approval.

**`decision-recorded.png`** — what is kept:
`APPROVED — Inspected the minutes book: every page is initialled by the Chairman. ·
recorded 2026-09-30 04:35`. The verdict, the reason in the reviewer's own words, and the
time. The actor and the span they had open are stored with it and not shown here. That is
the label PLAN_23 rule 5 asks for.

## A note on how these were captured

`Page.captureScreenshot` stopped working on this machine partway through — it times out
after 20s even on `about:blank`, so it is the compositor and not any page. These four went
through `Page.printToPDF` instead and were converted with `sips`. Same pixels, different
pipeline. The five older captures above predate the failure and came through the normal
path.

## Reproducing

`docs/RUN_LOCALLY.md`. The captures were taken headless through the Chrome DevTools
Protocol at 1280px wide, using `DOM.setFileInputFiles` for the upload so the file went
through the real `<input type="file">`.

---

# The four new screens — LIVE, 2026-10-04

Captured against `scripts/local-gateway.py` at checker commit `68fb70a`, PostgreSQL 18.6,
store `postgres`. **Not** against `placedon_dev`: see "the runbook could not serve these
screens" below.

| File | Screen | What it shows |
|---|---|---|
| `calendar-unknown.png` | Calendar | 15 obligations that cannot be dated, each reading **unknown** with the fact it is missing |
| `vault-list.png` | Vault | the firm's vault, empty, saying so without claiming "no match" |
| `vault-upload-refused.png` | Vault | upload refused `NO_VAULT` by name |
| `tables-created.png` | Review tables | 4 cells queued, cost **UNPRICED** |
| `tables-grid.png` | Review tables | the grid, every cell PENDING with a glyph and a word |
| `tables-csv.png` | Review tables | the CSV, every cell carrying words rather than a blank |
| `drafts-version1.png` | Draft | version 1, with its provenance table |
| `drafts-saved.png` | Draft | version 2 saved, based on version 1 |
| `drafts-conflict.png` | Draft | a stale save **refused**, showing version 1 and version 2 |
| `tables-360.png` | Review tables at 360px | measured horizontal overflow: **0px** |

## Seven ways the live system differed from the mock

All seven are the live deployment being **narrower** than the fixture — which is the
direction worth knowing about, because a mock that is more capable than the product is a
demo that promises something nobody can deliver.

### 1. The runbook could not serve these screens at all

`docs/RUN_LOCALLY.md` points `local-gateway.py` at the backend's `PLACEDON_DATABASE_URL`,
which is `placedon_dev` — and `placedon_dev` is at migration **~007**. Every table these
four screens need arrives later: `review_grids` (011), `drafts` (012), `matters` (019),
`vault_documents` (020), `jobs.lane` (021).

It also **cannot be upgraded in place**: `scripts/rls_integration.py`'s own run log records
that `placedon_dev` holds 64 APPROVED seed rows written before `quote_viewed` existed, and
008's `VALIDATE` refuses them by design. A fresh database is the answer, and these captures
used one (`placedon_app_local`, 001–021 applied). **The runbook needs that step; without it
all four screens fail on a missing table.**

### 2. The local gateway minted a key that could not use the app

`KeyStore.mint` defaults to `role="viewer"`, and `vault.upload`, `review_table.create`,
`draft.create` and `draft.revise` all require `lawyer` (`gateway/roles.REQUIRED`). The first
live call returned:

> `403 — vault.upload needs the lawyer role; this key has viewer`

`scripts/local-gateway.py` now mints `lawyer`. Not `admin`: nothing these screens do needs
it, and a local key with more authority than the screens require is a habit worth not
forming.

### 3. The vault cannot accept an upload through the HTTP surface

`vault.upload` refuses, by name:

> `NO_VAULT` — no file store is configured on this deployment, so there is nowhere to put
> the bytes. Refused by name rather than accepting an upload and writing it nowhere.

This is **not** a local-setup gap. `gateway/app.py` never sets `Context.files` — the string
does not appear in the file — and `create_app` takes no parameter for one, so **no HTTP
caller can reach a working vault on any deployment.** `gateway/screens.py` sets `ctx.files`
directly in its own test, which is why the verb is proven and unreachable at the same time.
The mock accepts uploads and shows PENDING beside INGESTED, so the mock is the only place
that column has ever had two values.

`vault-upload-refused.png` is the live truth. The screen renders the refusal in the refusal
register — the gateway answered and declined — rather than as a failure.

### 4. No cell ever leaves PENDING live, because no queue is wired

`review_table.create` returns `scheduled.enqueued: []`. `create_app` accepts a `queue=`
parameter and `local-gateway.py` passes none, so one job per cell is planned and nothing
dispatches. Every cell in `tables-grid.png` is PENDING, correctly.

So the live capture cannot show FOUND, NOT FOUND or NEEDS LAWYER. The mock can, and the
legend on the screen names all five states regardless — a grid that only ever showed the
state it happened to be in would teach the wrong shape.

### 5. PAUSED_BUDGET did not fire live, and `status` cannot report it anyway

Two separate things, and the second is the one that matters.

Live, `scheduled.paused_budget` was `false`: no budget is wired, so nothing was reserved and
nothing was refused. The mock pauses any table over four cells, which is how that branch is
exercised at all.

And **`review_table.status` does not carry the budget state** — no key in the live response
mentions it. PAUSED_BUDGET arrives **once**, on `create`. A screen that only polled status
would show a table stuck at PENDING with no reason, so the console keeps the pause from the
create response and says, on the status panel, that this response cannot speak to it rather
than guessing.

### 6. A live draft has no slots, so nothing is marked as a suggestion

`draft.create` on the live gateway returned `blocking: []` and `ready_for_approval: true` —
no slots at all, because none were supplied. `drafts-version1.png` therefore shows a
provenance table with nothing in it, and `0` suggestion tags.

The mock seeds a `MODEL_SUGGESTION` slot, which is what makes the marking visible and
testable. The live path to one is `draft.create` with `slots`, or a draft built by the prose
writer — neither of which this screen does yet. **The marking is implemented and, on the
live deployment, currently has nothing to mark.**

### 7. The live gateway classified a "Board resolution" as `agm_notice`

`draft.create {"title": "Board resolution"}` came back `kind: "agm_notice"`. The mock says
`board_resolution`. The screen does not render `kind`, so nothing on screen is wrong — but
the classifier disagreeing with the obvious reading of the title is recorded here rather
than discovered later.

## What the captures confirmed, measured

- **`drafts-conflict.png`**: a stale save is refused and the panel shows *both* numbers —
  "your edit was based on version 1", "the draft is now at version 2". Driven by a second
  browser page holding the old `base_version`, so the race was real rather than simulated.
- **`calendar-unknown.png`**: 15 UNKNOWN entries, and the cell where a date would go reads
  the word `unknown`. Not blank, not a guess.
- **`tables-created.png`**: the cost cell reads `UNPRICED`, never `₹0.00`.
- **`tables-360.png`**: horizontal overflow at 360px measured at **0px**, on the widest
  screen of the four.
