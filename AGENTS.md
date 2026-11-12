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
- **Fonts — all self-hosted, no runtime third-party font requests:**
  **Redaction** (display serif: every `h1`/`h2`/`h3`, the wordmark, card titles), vendored as
  woff2 in `brand-kit/fonts/Redaction-{Regular,Bold,Italic}.woff2` and loaded with
  `next/font/local`. It is on Google Fonts, but `next/font/google` does **not** export it (Next's
  bundled manifest predates it — importing `{ Redaction }` is a type error). A `<link>` to
  `fonts.googleapis.com`/`fonts.gstatic.com` is **forbidden** regardless — it would disclose each
  visitor's IP to Google on page load, before the consent banner is answered, contradicting the
  privacy policy and the consent-gated analytics.
  ⚠ **Redaction is a STATIC font: only 400 and 700** (plus italic 400). There is no 600 — write
  `700` for bold display type. It has **no variable axes**; never add `font-variation-settings`
  to a display element. (It replaced Fraunces, which was variable and carried opsz/SOFT/WONK;
  all of those declarations were removed. `brand-kit/fonts/Fraunces-*` is retained only for the
  OG-image route.)
  **IBM Plex Mono** — every section reference `s.96(1)`, figure `₹10,00,00,000`, instrument
  `G.S.R. 880(E)`, and date. Mono citations are the brand signature — never paraphrase a section.
  **Inter** (body) — still variable 100..900, so its intermediate weights are real.
  Both are self-hosted from `brand-kit/fonts/` via `next/font/local`.
- **Logo:** use the files in `brand-kit/logo/` (white on dark, ink/gold on light); inline SVG where possible.
- Everything reads from central design tokens. No hard-coded hex in components.

## Voice — Terse. Traceable. Unsparing.
- **Claim, then evidence.** Split the assertion from its basis. Filter test for every sentence:
  *would this appear in a judgment?* If it reads like advocacy or sales copy, cut it.
- **Banned words (any = failure):** streamline, empower, solution, easy, smart, seamless, revolutionary,
  unlock, supercharge, effortless, game-changer, cutting-edge.
- **Words in:** provision, verified, section [number] (mono), abstains, liability, instrument, operative.
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
  **The backend has exactly SIX routes** (verified against `checker/api.py`):
  `GET /v1/health` · `POST /v1/compliance-pack` · `POST /v1/document-check` ·
  `GET /v1/company/{cin}/events` · `GET /v1/company/{cin}/events/{event_id}` ·
  `GET /v1/instruments/{fragment}/affected`.
  ⚠ **`/v1/company/{cin}/standing` DOES NOT EXIST** — nor does `/v1/ask`. Earlier revisions of this file
  documented `/standing`; that was wrong. Do not call it.
  ⚠ `/events` is **not** per-company: `cin` is echoed back but never used to filter. No UI may promise
  "this company's events."
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
mono on every statute reference · brand fonts self-hosted (no Google CDN link) · custom brand icons present · copy real,
grammatical, on-voice, no banned words, self-explanatory · a11y AA · reduced-motion respected ·
responsive to 360px · no overclaiming · no invented figures.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
