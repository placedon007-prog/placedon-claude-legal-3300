# Compliance Pack — Frontend Design Spec

- **Date:** 2026-09-17
- **Feature:** 1 of 5 — Compliance Pack (`POST /v1/compliance-pack`)
- **Status:** Approved (design). Next: implementation plan.
- **Scope decision:** Build the **interactive** profile-form → live-pack version (not the static concept demo).
- **Ordering decision:** **Attention-first ledger under a calm-summary lead** (see §6).

---

## 0 · What this feature is

The question it answers: *"For a company of **this** class, as of **this** date, which Companies Act, 2013 duties apply — and is each one satisfied, unmet, or unprovable?"*

It is the flagship surface. It exercises every shared primitive (citations, all row states,
abstention, provenance, transport error), so features 2–4 reuse the UI language designed here.

**Product truth that governs the design:** Placedon is a **verification engine**, not an AI
answer machine. Obligations are decided by coded rules + date math; the verifier gate traces
every row to a source + a date, or refuses. Therefore the UI must **never look like a chatbot**.
The **citation and the as-of date are the hero**; **abstention is a first-class, competent state**.

---

## 1 · Mechanism — where the frontend sits

The engine is **server-only** (its token must never enter the client bundle). Flow:

```
[Profile form: client component]
        │  (submit)
        ▼
[Server action / route handler]  ── validates with compliancePackRequestSchema
        │
        ▼
engine.compliancePack(req)  →  POST /v1/compliance-pack
        │
        ▼
EngineResult<CompliancePack>  =  ok(pack)  |  error(transport)
        │
        ▼
[Render: SummaryStrip + ObligationLedger + record/provenance]  (server-rendered result)
```

- The form is a client component; submission crosses to the server (action/route handler) where
  the engine is invoked. The rendered pack comes back as server-rendered markup.
- The response is **not one answer** — it is a **ledger of mixed-certainty obligation rows**.
  Rendering that honestly is the core challenge.
- **Never** `catch { return abstention }`. A transport/5xx/DNS failure is a **distinct** state
  from an abstention (`EngineResult<T>`), per `AGENTS.md`.

---

## 2 · Contract — request → response → states

### Request (`CompliancePackRequest`)
- **Required:** `company_class` (`private | public | opc`), `incorporation_date` (ISO), `as_of` (ISO).
- **Optional profile:** `cin`, `financial_year`, `is_listed`, `is_section_8`,
  `is_holding_company`, `is_subsidiary_company`, `governed_by_special_act`, `director_count`,
  and money fields `paid_up_capital_rupees / turnover_rupees / net_worth_rupees / net_profit_rupees`.
- **Optional evidence:** `agm_dates[]`, `board_meetings[]`, `aoc4_filed_on`,
  `annual_return_filed_on`, `resident_director_days`, `financial_year_end`,
  `first_financial_year_end`, `calendar_year`.
- ⚠️ **Money-requires-FY:** any money figure requires `financial_year`, or the backend returns 400.
  Enforce this **inline in the form** (client validation mirrors `compliancePackRequestSchema`).
- **Principle:** *more evidence in → fewer "undetermined" rows out.* The form should communicate
  this ("add what you know to sharpen the result").

### Response (`CompliancePack`) — every renderable field
- Header: `company_class`, `cin` (nullable), `as_of`, `financial_year` (nullable),
  `generated_at` (stamp), `provenance`.
- `summary`: `satisfied · not_satisfied · undetermined · cannot_determine · not_applicable`.
- `rows[]` (`ObligationRow`): `obligation_id`, `duty`, `provision` (mono, e.g. `s.96(1)`),
  `state`, `basis`, `missing_facts[]`, `blocked_by` (nullable), `cited_spans[]`
  (`path / sha256 / resolved`).
- `unverified[]`: `{ obligation_id, to_settle }` — what would settle an open row.
- `law_currency_watch[]`: `{ obligation_id, status, instrument, detail }` — the **Monitoring hook**
  (feature 3 reuses this).
- `what_this_is[]` / `what_it_is_not[]` — honesty framing copy (render verbatim).
- **DRIFT 1:** the compliance-pack route is the ONE route that does **not** carry `no_model`.
  Do not read `no_model` off a pack.

### Row states → what the user sees

| `RowState` | Label | Bucket (see §6) |
|---|---|---|
| `APPLIES_SATISFIED` | Satisfied | Clear |
| `APPLIES_NOT_SATISFIED` | Not satisfied | Needs attention |
| `DOES_NOT_APPLY` | Does not apply | Not applicable |
| `APPLIES_UNDETERMINED` | Undetermined | Needs attention (abstain — `missing_facts`) |
| `CANNOT_DETERMINE` | Cannot determine | Needs attention (abstain — `blocked_by`) |

Plus **transport error** (`EngineErrorPanel`) — visually distinct from any abstention.

---

## 3 · The record — what the user keeps

The pack **is** a citable, reproducible artifact. `as_of` + `generated_at` + `provenance`
(`benchmark_version`, `corpus_version`, `checker_commit`, `working_tree_dirty`, `law_as_of`)
means the same inputs reproduce the same pack. `what_this_is` / `what_it_is_not` bound the claim.

Design implication: treat the result as a **document**, not a disposable query result —
persistent header stamp, provenance footer, and an **export/keep** affordance.
`provenance` may degrade to `{ error?, note? }` when version stamps can't be read — render that
gracefully (a muted note), never a crash or a fabricated version.

---

## 4 · Data inventory — hero vs. secondary

- **Hero (always visible per row):** `provision` (mono citation), `state` chip, `duty`, `basis`.
- **Secondary (on the row, progressive):** `missing_facts[]`, `blocked_by`, `cited_spans[]`.
- **Pack-level:** `summary` (strip), `law_currency_watch` (monitoring panel),
  `what_this_is`/`what_it_is_not` (honesty panel), `unverified` (settle-list), `provenance` (footer).

---

## 5 · What the user sees — the three faces

- **Proven** (satisfied / not-satisfied / does-not-apply): citation is the hero, `basis` one line,
  state readable **without colour** (icon + label).
- **Abstained** (undetermined / cannot-determine): *"No verified answer yet. Missing:
  [missing_facts]. This resolves when you provide X."* Competent, not broken. `blocked_by` names
  the blocker.
- **Transport error:** distinct `EngineErrorPanel` — "the engine is unreachable" — never a figure.
- **Framing:** lead with **"you're clear"** (satisfied count) per UX doctrine — never open on red.

---

## 6 · Interface design — how a person uses it

Two zones.

### Zone A — Profile driver (input "chart")
- Spine: `company_class` + `as_of` (required, always visible).
- Progressive disclosure: evidence/profile fields under "Add what you know to sharpen the result."
- Inline validation mirrors the schema; **money-requires-FY** enforced inline.
- Mobile-first, AA, 44px targets, labelled controls.

### Zone B — Result (output ledger) — **attention-first under calm summary lead**
1. **SummaryStrip** carries the calm brand voice: *"You're clear on N duties · M need attention."*
   Reassurance first (doctrine), counts from `summary`.
2. **ObligationLedger** ordered by action:
   - ① **Needs attention** — `not_satisfied` + `undetermined` + `cannot_determine`,
     styled **calmly** (grey / brass, never blaring red); abstentions rendered as competent.
   - ② **Clear** — `satisfied`.
   - ③ **Not applicable** — `does_not_apply`, collapsed / muted.
3. Persistent **as-of + jurisdiction stamp**; **mono** on every `s.xxx`; **provenance footer**;
   **what-this-is / is-not** honesty panel; **law_currency_watch** monitoring hook.

Rationale (three-agent verdict): the summary does the emotional lead ("you're clear"); the ledger
does the operational triage (gaps + abstentions first, calmly). Rejects pure clear-first (buries a
real gap in a liability tool) and pure gaps-first (manufactures anxiety, violates "no red alerts").

---

## 7 · Elements & build roadmap

**Reuse (already built, `surface-shell.tsx`):** `SurfaceShell`, `Citation`, `Stamp`,
`EngineErrorPanel`, `AbstentionCard`, `ProvenanceFooter`; `DeterminedRow` (in the current page).

**New / upgrade:**
- `ProfileForm` — the interactive input driver (client; schema-mirrored validation).
- `SummaryStrip` — the 5 counts + calm lead line.
- `ObligationLedger` — grouped, attention-first rows.
- `MissingFactsList` — abstain detail (`missing_facts` + `blocked_by`).
- `CurrencyWatch` — renders `law_currency_watch` (monitoring hook).
- `WhatThisIsPanel` — `what_this_is` / `what_it_is_not`.
- `RecordExport` — keep/export the pack as a document.

**Build order:**
1. Server action + real `EngineResult` state handling (ok / transport error).
2. `ObligationLedger` render against the live pack (evolve the existing concept page).
3. `ProfileForm` + submit round-trip.
4. Abstention + error polish; summary strip; grouping.
5. Record / export; provenance + honesty panels.
6. Icons + restrained motion **last** (shared animated-Lucide system, per the separate icon plan).

---

## 8 · Non-negotiables checklist (from `AGENTS.md`)

- [ ] Monochrome + brass ≤10%, one accent per view; abstain-grey only for abstention.
- [ ] Mono (`IBM Plex Mono`) on every statute reference / figure / instrument / date.
- [ ] Transport error visibly distinct from abstention; no `catch → abstention`.
- [ ] Reduced-motion renders final state; motion ≤250ms, purposeful.
- [ ] a11y AA; state distinguishable without colour; visible focus; responsive to 360px.
- [ ] No invented figures; abstain when data is missing. No banned words.
- [ ] Engine imported server-side only (never into a `"use client"` module).
