# /app screenshots — LIVE

Every image in this directory is a **live capture**, taken 2026-09-29 against the real
backend gateway on this laptop: PostgreSQL 18.6 (`store: postgres, degraded: false`),
`azure/llama-3-3-70b` deployed in **UAE North**, corpus
`sha256:6809b8c8…`, checker commit `6d3ac4a4`. No fixtures, no mock provider.

They replace an earlier set taken against `MockProvider`. The mock set is not kept: a
screenshot of a fixture in a directory called `app-screens` is the kind of thing that
gets cited later as evidence the product did something it has never done.

| File | Screen | Run |
|---|---|---|
| `ask-answer.png` | Ask — a cited answer | `d3830a4c` |
| `ask-refusal.png` | Ask — a named abstention | `568282e1` |
| `contracts-findings.png` | Contracts — `nda_N02.docx` uploaded and reviewed | `d540c3c3` |
| `runs-list.png` | Runs — the three runs this browser started | — |
| `run-trace.png` | Run — steps, models, region, cost | `d540c3c3` |

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

### 4. "THE STANDARD" column is empty on every live row

The mock filled it with rationale prose (*"Confidentiality obligations running longer than
three years are hard to administer…"*). The real `playbooks/nda_v1.json` carries no such
field, so the column renders with a header and nothing under it. **The prose in the mock
was written for the screenshot and does not exist in the product.** Either the playbook
gains a `rationale` per rule or the column goes — an open item, not a resolved one.

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
Live: **1** cited sentence (span 826–1044), 1 of 2 untraced — both runs of the same
question returned the same single sentence. The header reads **Partial answer** in both
cases, which is the honest label; what differs is how much survives grounding.

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

## Reproducing

`docs/RUN_LOCALLY.md`. The captures were taken headless through the Chrome DevTools
Protocol at 1280px wide, using `DOM.setFileInputFiles` for the upload so the file went
through the real `<input type="file">`.
