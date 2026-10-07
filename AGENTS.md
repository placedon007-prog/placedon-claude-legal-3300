# AGENTS.md — Placedon website (standing rules, re-read every turn)

This repo is the **Placedon** marketing website: Next.js 15 (App Router) + TypeScript (strict) +
Tailwind v4 + shadcn/ui. Placedon is an evidence-first legal-intelligence layer for Indian corporate
law (Companies Act, 2013). It answers only with the exact provision + amending instrument + operative
date, and **abstains** when it cannot verify. It is a **witness, not a tool.**

Full brief: see `codex-website-prompt.md`. These are the non-negotiables that must hold on **every**
change — check them before you consider any task done.

## Brand — do not drift
- **Colour is near-monochrome.** Base = near-black `#0C0C0D` + warm cream `#F4EFE6` (the "white") +
  a neutral warm-grey scale. **Accent = Brass Gold `#C9A24B`, ≤10% of any screen, ONE accent element
  per view.** `--gold-muted #9F743B` for citations only. Cool Grey `#5B6472` is reserved **only** for
  the "abstained / unknown" state — never decorative. No navy-dominant, no second accent colour.
- **Fonts:** Fraunces (display serif) · Inter/Archivo (body) · IBM Plex Mono for figures,
  instruments, dates and record identifiers. Reader-facing statutory references use the familiar
  legal-document form **Section 96(1)** in bold Georgia/Times-style serif. The engine may keep
  `s.96(1)` as data and accept `s.96`, `u/s 96` and `Section 96` as input; the UI always normalises
  display copy to **Section 96**. Use *Companies Act, 2013* in italics in prose. Underlining is for
  links or an expressly highlighted source passage, never decoration.
  Fonts are self-hosted from `brand-kit/fonts/` via `next/font/local`. The **evidence line beneath a
  reference** — `s.96(1)`, `chars 226–348`, the instrument `G.S.R. 880(E)`, the figure
  `₹10,00,00,000`, the as-of date — stays **IBM Plex Mono**: the claim is serif, its basis is mono.
  **Never paraphrase a section either way.**
- **The `/app` console is black and white (owner decision, 2026-10-06)** and has its own
  design system — see **"/app console"** below. The marketing site keeps the palette above.
- **Logo:** use the files in `brand-kit/logo/` (white on dark, ink/gold on light); inline SVG where possible.
- Everything reads from central design tokens. No hard-coded hex in components.

## /app console — design system (owner sign-off on direction C, 2026-10-07)

Research and rationale: `docs/design/TEARDOWN.md` (10 principles), `docs/design/SYSTEM.md`
(screens, verbs, state machine, citation model), `docs/design/LOOP.md` (decisions log).

- **Layout — the Split workspace.** Sidebar · thread · source panel.
  - Sidebar (`console-sidebar.tsx`): a 56px icon rail; **every icon has a tooltip**. The
    expand toggle (264px, labelled links, this browser's threads, search) is remembered per
    browser in localStorage. Below 768px it is a top bar plus a left Sheet.
  - Thread (`ask-workspace.tsx`, `answer.tsx`): a 680px column. **Each question is a heading
    line** (20/28, 600); the answer is unboxed prose at 16/28 (max 68ch). No chat bubbles.
  - Source panel (`source-panel.tsx`): docked at ≥1024px as a 440px column, **closed until a
    citation is clicked** (it also opens with the first cited answer); closing it gives the
    thread the full width. Below 1024px it is a **bottom sheet**.
- **Tokens** live in `src/app/app/app.css` under `.console, [data-slot]` (the `[data-slot]`
  half reaches shadcn's portals); their Tailwind names are in `globals.css` `@theme`.
  **Never hard-code a hex in a component — use these:**
  - ground `bg-ground` #fff · greys `bg-wash` #fafafa, `bg-wash-2` #f2f2f2, `border-line`
    #e8e8e8, `border-line-2` #d4d4d4, `border-line-control` #8f8f8f (3.3:1, for control edges).
  - text `text-fg` #0a0a0a, `text-fg-2` #404040, `text-fg-3` #6b6b6b — all AA on white.
  - type: `text-caption` 12/16 · `text-ui` 13/20 · `text-body` 14/22 · `text-read` 16/28 ·
    `text-title` 20/28 · `text-display` 28/34.
  - radii: `rounded-chip` 6px · `rounded-card` 10px · `rounded-composer` 24px. One shadow,
    `shadow-float`, used only by the composer and floating menus. Spacing on Tailwind's 4px base.
  - motion ≤200ms (`--c-dur` 160ms, `--c-dur-panel` 200ms), only in answer to an action;
    `prefers-reduced-motion` turns all of it off.
- **Type:** IBM Plex Sans (one family, `brand-kit/fonts/IBMPlexSans-Variable-latin.woff2`,
  OFL) for everything; IBM Plex Mono only for identifiers and evidence lines (provision,
  sha256, chars, dates). Fraunces and Playfair are rejected for the console.
- **Components:** shadcn primitives (radix base) in `src/components/ui/` — Button, Tooltip,
  Popover, Dialog, Sheet, DropdownMenu, ScrollArea, Separator, Textarea, Skeleton. `cn` is
  `@/lib/utils`. The composer is `src/components/ui/prompt-box.tsx` (from the owner's 21st.dev
  "ChatGPT prompt input"): "+" stores a PDF/DOCX in Wall System then opens Document Check;
  Tools = Research (default) · Draft (removable chip, sends the `DRAFT` override) · Check a
  document · Review a contract; mic shown, `aria-disabled`, "Voice input — coming soon"
  (voice will go through AWS Transcribe in Mumbai, never the browser speech API).
- **Answer registers — shape and words, never colour:** answered ✓ · partly answered ◐ ·
  a lawyer needs to decide ⦶ · not answered ⊘ (names its reason, or the body-by-body notes) ·
  needs clarification ? · queued ◷ · **did not arrive — this is not a refusal** (dashed ink
  box + Try again). An `ABSTAINED` envelope that still carries cited text shows it under
  "Passages served with this abstention — they do not answer the question", never as an answer.
- **Citations:** inline numbered marker → Sources list → Source panel. Ask runs on
  `conversation.send` / `conversation.get`; the panel re-reads every quote through
  `citation.get` and says when it no longer matches. The section number comes only from the
  served `provision` (`linkCitations` in `src/lib/thread.ts`). The panel shows the cited
  passages only — no verb serves a section's full text yet — and `in_force_from: null`
  renders "not recorded", never a date.
- **Standing limits:** on Ask, one quiet line under every result (law read as at · Playbook
  DRAFT · UAE North · not legal advice); on every other screen, one line under the top edge.
- **Banned in the console:** colour of any hue, gradients, blur/glass, left-border accent
  cards, ALL-CAPS tracked labels, avatar discs, suggestion cards on the empty state,
  model-written follow-up prompts, confidence numbers.
- **The marketing type scale is scoped out of the console** (`h1–h3`, `p` carry
  `:where(:not(.console *, [data-slot] *))` in `globals.css`), so console utilities win.

## Voice — Terse. Traceable. Unsparing.
- **Claim, then evidence.** Split the assertion from its basis. Filter test for every sentence:
  *would this appear in a judgment?* If it reads like advocacy or sales copy, cut it.
- **Banned words (any = failure):** streamline, empower, solution, easy, smart, seamless, revolutionary,
  unlock, supercharge, effortless, game-changer, cutting-edge.
- **Words in:** provision, verified, Section [number] (bold serif), abstains, liability, instrument, operative.
- Register: ~80% formal, calm/confident; humility appears once — in abstention.

## Honesty — do not overclaim
- **Pre-launch framing.** No live-corpus, customer-count, or accuracy-track-record claims. No fabricated
  metrics or logo clouds. **Never invent a statutory figure/section/date** — if unsure, show the abstain
  state, don't guess. Primary CTA: **"Request a pilot."**
  ⚠ **"Join the waitlist" is BANNED** (retired by codex 1.2). Never reintroduce it.
- **Never claim an accuracy rate.** Stanford RegLab's *Hallucination-Free?* (arXiv:2405.20362) measured 17–33%
  hallucination in legal AI. "Hallucination-free", "100% accurate" and confidence percentages are forbidden.
- Privacy policy and any legal copy are templates for counsel review, marked "not legal advice."

## Design & motion discipline
- Corporate, editorial, authoritative — **not** a generic template and **not** AI slop.
- Forbidden: purple/blue gradient heroes, glassmorphism everywhere, emoji section markers, everything
  centered, `rounded-lg`+accent-bar on every card, stock abstract blobs, Inter-as-display, fabricated
  logo walls, parallax-on-everything, mouse-spotlight gimmicks, confetti, tilt cards, gratuitous 3-D.
- Corners ≤6px. Shadows minimal. **One orchestrated hero motion moment; everywhere else ≤250ms,
  purposeful.** Respect `prefers-reduced-motion` (render final state). At most ONE ambient device.

## Engineering standards
- TypeScript strict; eslint/prettier clean; builds and runs. Accessible: WCAG AA, visible focus,
  keyboard nav, 44px targets, labelled controls, no colour-only status (the answer classes must be
  distinguishable without colour).
- Product data behind a typed engine client (`src/lib/engine/*`) with a `MockProvider` now and an
  `HttpProvider` matching the real backend. Output classes
  `verified_fact | deterministic_conclusion | predictive_signal` + `abstained`.
  **The backend now serves TWO surfaces, and this app calls the second.**

  **`/v1` — the engine, unauthenticated, six routes** (verified against `checker/api.py`):
  `GET /v1/health` · `POST /v1/compliance-pack` · `POST /v1/document-check` ·
  `GET /v1/company/{cin}/events` · `GET /v1/company/{cin}/events/{event_id}` ·
  `GET /v1/instruments/{fragment}/affected`. The gateway forwards these **byte for byte**
  and its own suite asserts it, so anything parsed from them is what the engine produced.
  ⚠ `/v1/company/{cin}/standing` still **DOES NOT EXIST**. Do not call it.
  ⚠ `/events` is **not** per-company: `cin` is echoed back but never used to filter. No UI
  may promise "this company's events."

  **`/v2` — the gateway verbs, API-key authenticated** (`gateway/verbs.py`, generated from
  ONE verb table that also produces the MCP tools and the CLI, with a parity test):
  `POST /v2/ask` · `POST /v2/review-contract` · `GET /v2/runs/{run_id}` ·
  `GET /v2/runs/{run_id}/trace` · `POST /v2/documents/upload`.
  **Ask runs on the conversation layer (C2):** `POST /v2/conversation/send` ·
  `GET /v2/conversation/{conversation_id}` · `POST /v2/citation` (`citation.get`, re-verifies the
  quote). `conversation.list` exists but needs a `matter_id`, so the sidebar lists only this
  browser's threads and says so.
  **`/v1/ask` now EXISTS** and is served through the gateway as the `ask` verb — an earlier
  revision of this file said it did not, which was true then and is not now.
  - The key maps to a **tenant**; every call writes a metadata-only audit row. It lives in
    `PLACEDON_GATEWAY_KEY`, a server env var, and `GATEWAY_URL` selects Http over Mock.
    `scripts/local-gateway.py` starts the real gateway and writes a fresh key into
    `.env.local` **without printing it**; `docs/RUN_LOCALLY.md` is the runbook. The
    screenshots in `docs/app-screens/` are LIVE captures against it, and its README
    records every way the live system behaved differently from the mock — read it before
    trusting a fixture to describe the product.
    **Never import `@/lib/gateway` into a `"use client"` module** — the key would be inlined
    into the public bundle, and `server-guard` throws rather than let it.
  - **There is no list-runs verb.** Runs are fetched by id. Any "past runs" list is only
    what this browser started, and must say so rather than look complete.
  - **`cost_inr: null` is UNPRICED and must never render as 0.** The backend refuses to
    record 0.0 for a billed provider at all — in Python and again as a database CHECK — so
    a zero would mean a free provider, not a free call. Show `UNPRICED` and its reason.
  - Every review carries **`playbook_status: DRAFT`** until a lawyer approves the rules, and
    the model is hosted in **UAE North**: a client contract may not be sent there, and the
    `test_data` input is the caller stating this document is a fixture. Both facts belong on
    screen, on every result.
  - A finding is a **POTENTIAL_ISSUE against a company standard, never a statement of law**.
    Statuses `MATCHES · DEVIATES · MISSING · NEEDS_LAWYER` must be distinguishable without
    colour.

  ⚠ **A transport failure must NEVER render as an abstention.** Abstention is a verified product state;
  a network/DNS/5xx error is a separate, visibly distinct state. Use `EngineResult<T>`, never
  `catch { return abstention }`.
  ⚠ The engine is plain HTTP on `127.0.0.1:8020`, unauthenticated, no CORS. It is **server-only** —
  never import a provider into a `"use client"` module (it would inline the token into the public bundle).
- Forms (waitlist/pilot): server-side validation (zod), honeypot, pluggable sink via env, recorded
  consent, no secrets in the repo, `.env.example` maintained. **Fail closed** — never render a
  fabricated legal figure when data is missing; show the abstain state.
- SEO (metadata, OG, JSON-LD, sitemap/robots), FAQ schema, real privacy policy + consent banner present.

## Before you call anything done
Run the checklist: monochrome + ≤10% gold held on every screen · abstain-grey used only for abstention ·
reader-facing "Section N" in bold serif and its evidence line in mono ·
brand fonts self-hosted · custom brand icons present · copy real,
grammatical, on-voice, no banned words, self-explanatory · a11y AA · reduced-motion respected ·
responsive to 360px · no overclaiming · no invented figures.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
