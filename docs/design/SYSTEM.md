# /app console — how the screens work

Written 2026-10-06 against this repo's `src/lib/gateway/*` and the backend's
`gateway/verbs.py` on `origin/main` (ca1e86a). Principles referenced as P1–P10 are in
`TEARDOWN.md`.

## 1. What the backend actually serves (and what it does not)

| Verb | In backend main | Called by this app today |
|------|-----------------|--------------------------|
| `ask` | yes | yes — Ask |
| `conversation.send` / `conversation.get` | yes | **no** |
| `conversation.list` | yes, but **requires `matter_id`** — no all-matters list | no |
| `citation.get` (quote re-verified against the corpus) | yes | **no** |
| `/v2/ask/stream` | **no** — no streaming route on main | no |
| `review_contract`, `review_document`, `documents.upload`, `runs.*` | yes | yes |
| `vault.*`, `document.check` | yes | yes |
| `review_table.*`, `draft.*`, `calendar.upcoming` | yes | yes |

Two consequences for the design:

1. **The Source panel cannot show provision text from the `ask` verb.** `ask` returns prose with
   `— <source> [start:end]` lines and nothing else. The quote, `sha256` and `in_force_from` exist
   only in the `answer_envelope.v1` citations that `conversation.send` returns and
   `citation.get` re-verifies. So the hi-fi build moves Ask onto `conversation.send` +
   `citation.get`. Until that lands, the panel shows the served source label and character
   span and says *"The provision text is not served by this verb."* It never fetches or
   reconstructs text itself.
2. **There is no streaming.** The "streaming" state is designed and built behind a flag, and
   the shipped state is *Pending*: one line, a stop button that is disabled with the tooltip
   "Stopping needs the streaming route". When `/v2/ask/stream` merges, the same slot shows
   text arriving.

## 2. Screens and routes

| Route | Name on screen | Verbs | Notes |
|-------|----------------|-------|-------|
| `/app` | Ask | `conversation.send`, `conversation.get`, `citation.get` (today: `ask`) | The thread. |
| `/app/vault` | **Wall System** (name to be confirmed by the owner) | `vault.upload`, `vault.status`, `vault.find`, `vault.verify` | PENDING ≠ INGESTED, per file. |
| `/app/document-check` | Document Check | `vault.status`, `document.check` | Write verb: a recorded check has a `check_id`. |
| `/app/contracts` | Contracts | `documents.upload`, `review_contract`, `runs.approve/reject` | DRAFT + UAE North on every result. |
| `/app/documents` | Documents (filings) | `documents.upload`, `review_document` | No model called, so no residency line. |
| `/app/tables` | Review tables | `review_table.create/status/export/cancel` | `estimated_cost_inr: null` → UNPRICED. |
| `/app/drafts`, `/app/drafts/[id]` | Drafts | `draft.create/revise/versions/diff/export` | Revise needs `baseVersion`; CONFLICT names both versions. |
| `/app/calendar` | Calendar | `calendar.upcoming` | `due: null` → "unknown", with the missing fact named. |
| `/app/runs`, `/app/runs/[id]` | Runs | `runs.get`, `runs.trace`, `runs.cancel` | No list verb: the list is this browser's runs and says so. |

## 3. Data flow

```
client component ("use client")
   │  FormData / plain args — never a key, never a gateway import
   ▼
server action  (src/app/app/**/actions.ts, "use server")
   │  zod-validates input at the boundary
   ▼
getGateway()  (src/lib/gateway, server-only; server-guard throws in a client bundle)
   │  Mock when GATEWAY_URL is unset; Http with PLACEDON_GATEWAY_KEY otherwise
   ▼
EngineResult<T>  = { ok: true, data } | { ok: false, error: EngineError }
   ▼
discriminated state returned to the client:
   answered | refused | failed (transport) | invalid
```

`failed` and `refused` are separate branches in the type, so a transport error has no path into
the refusal renderer.

## 4. Answer state machine

```
idle ──send──▶ pending ──(stream lands)──▶ streaming ──▶ ┐
                 │                                       │
                 └───────────────────────────────────────┴─▶ answered
                                                            partial
                                                            needs lawyer
                                                            not answered (reason)
                                                            needs clarification
                                                            did not arrive (transport)
```

| State | Source of truth | Icon (shape, 14 px, ink) | Status line copy | Body |
|-------|-----------------|--------------------------|------------------|------|
| Pending | request in flight | 6 px ink dot, slow pulse (static under reduced motion) | **Reading the held law…** | nothing else |
| Streaming *(flagged off)* | stream open | same dot | **Writing — citations are checked as each sentence lands** | text arriving; Stop |
| Answered | `ANSWERED` | tick | **Answered from held law** · *N sources* | prose + markers + Sources |
| Partial | `PARTIAL` | half-filled circle | **Partly answered** · *N sources* | prose + the backend's notice line verbatim (e.g. "1 of 4 sentences did not trace") |
| Needs lawyer | `NEEDS_LAWYER` (envelope) | circle with a vertical bar | **A lawyer needs to decide this** | the backend's reason; the bodies list |
| Not answered | `REFUSED` / `ABSTAINED` | circle struck through | **Not answered** · `CODE` | the meaning of the code (table below) + `reason` verbatim |
| Needs clarification | `NEEDS_CLARIFICATION` | open circle with "?" | **Which question did you mean?** | intake's note |
| Did not arrive | client transport error, or envelope `FAILED` | broken-signal glyph | **Did not arrive — this is not a refusal** | `kind · message (HTTP n)` in mono; **Try again** button |

Refusal codes (copy already in `ask-thread.tsx`, kept):
`NO_EVIDENCE` — No provision in the held law answers this, so no answer is given and no model was
called. · `NOTHING_TRACED` — A draft was written, but none of its sentences could be traced to a
provision. Nothing from it is shown. · `NO_MODEL` — No model was available for this question, so
no answer was attempted. · `NO_BUDGET` — The budget limit was reached before any call was made.
Unknown code → "No answer is given." plus the code itself.

Every result ends with **one** grey line: `Playbook DRAFT — not approved by a lawyer · Model in
UAE North — test documents only` (shown on results that called a model; the residency half is
dropped on Documents, which calls none). Model name and run link sit on the same line.

## 5. Citation model

```
prose sentence.[1]           ← 18 px square marker, 11 px number, after punctuation
                               button: opens the panel; aria-label "Source 1, Section 96"
Sources                      ← 13 px label, not a card header
 1  Section 96               ← sans 14/600; ONLY if the backend served "s.96" in the source
    Companies Act 2013, s.96 · chars 226–348 · in force 2014-04-01 · sha256 9f2c…  ← mono 12
```

Clicking a marker or a Sources row opens the **Source panel** (right sheet, 440 px; full-screen
sheet below 1024 px):

- heading: the served source label;
- the provision text from `citation.get` with the cited span `[start, end)` wrapped in `<mark>`
  (ink underline 2 px + grey-100 fill — the brief allows underline for an expressly highlighted
  passage), scrolled into view;
- evidence line in mono: instrument · provision · chars a–b · sha256 (first 12, full on copy) ·
  in force on DATE · fetched_at;
- `reverified: false` → the line **"Re-read just now and it did not match — nothing may rest on
  this quote"** above the text, and the mark is removed.
- Today (ask verb): label + chars only, and the sentence "The provision text is not served by
  this verb."

**Rule:** the section number comes only from `parseAnswer`/the envelope's `provision`. If the
shape is unfamiliar, `section` is null and only the verbatim source label is shown.

## 6. Component tree (Ask)

```
AppLayout (server)                     — session gate, notices moved to result lines
├─ ConsoleSidebar ("use client")       — shadcn Sheet on < 1024 px
│  ├─ NewQuestionButton                — shadcn Button (ghost)
│  ├─ ThreadSearch                     — shadcn Input; filters localStorage threads; says so
│  ├─ ThreadGroups (Today / Previous 7 days) — shadcn ScrollArea
│  ├─ ProductNav (lucide icons)        — Link + aria-current
│  └─ UserMenu                         — shadcn DropdownMenu (Sign out)
└─ AskThread ("use client")
   ├─ EmptyState                       — one sentence + PromptBox
   ├─ Turn
   │  ├─ UserBubble
   │  └─ Answer
   │     ├─ StatusLine                 — icon + words
   │     ├─ Prose + CitationMarker     — button → SourcePanel
   │     ├─ SourcesList
   │     ├─ ResultNotice               — DRAFT / region, one line
   │     └─ AnswerActions (hover/focus) — copy · add to calendar · draft from this · view run;
   │                                     shadcn Tooltip + Button(icon)
   ├─ SourcePanel                      — shadcn Sheet (side="right")
   └─ PromptBox                        — 21st "ChatGPT prompt input", adapted; shadcn Popover
                                         (tools), Tooltip (mic), Textarea
```

21st components used as **starting points** (code adapted to the tokens, never pasted as-is):
`chatgpt-prompt-input` (composer), `source-citation-rail` (marker ↔ list sync behaviour),
`conversation-list` (grouping), `prompt-input` (send ↔ stop swap).

## 7. Responsive rules

| Width | Sidebar | Thread column | Source panel |
|-------|---------|---------------|--------------|
| 1440 | 264 px, open, collapsible to 56 px icon rail | 680 px centred in the remaining space | 440 px right panel; thread shifts left, does not overlay |
| 1024 | 56 px icon rail by default | 680 px (min 16 px gutters) | overlay sheet 440 px with scrim |
| 390 | hidden; top bar with menu button opens a left Sheet | full width, 16 px gutters | full-screen sheet with a Close button at top |

Composer stays docked to the bottom of the thread column at every width; on 390 it is full width
minus 12 px and the tools button collapses into the `+` menu.
