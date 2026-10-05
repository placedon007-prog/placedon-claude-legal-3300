# Placedon — website (frontend)

**Read this whole file first. It is the single source of truth for continuing
this project — a fresh Claude on any machine/account should be productive from
this file alone, without re-analysing the codebase.**

Placedon is an evidence-first legal-intelligence product for **Indian corporate
law (Companies Act, 2013)**. Voice: *"a witness, not a tool."* Golden rule:
*"the model explains, the code decides, the record verifies."* Every answer
carries its provision, amending instrument, and operative date — or it abstains.

This repo is the **marketing + product-concept website**. The deterministic
legal engine and the (to-be-trained) narration model are a **separate backend**
(see "Architecture").

---

## Status: LIVE (pilot)

| Thing | Value |
|---|---|
| **Production URL** | https://placedon.com (and www.placedon.com) |
| **Host** | Vercel (auto-deploys on every push to `main`) |
| **Vercel URL** | https://placedon-claude-legal-3300.vercel.app |
| **GitHub** | github.com/placedon007-prog/placedon-claude-legal-3300 (private, branch `main`) |
| **Domain/DNS** | Registered + DNS managed at **Squarespace** → points to Vercel (A `@`→`76.76.21.21`, CNAME `www`→`…vercel-dns-017.com`, TXT `_vercel` verify) |
| **Indexing** | `noindex` (pre-launch). Do NOT enable indexing until legal review is done. |

## Stack
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict · Tailwind v4
· framer-motion 13 · zod v4. Node 20.

## Run locally
```bash
npm install
npm run dev          # http://localhost:3300
npm run build        # production build (also verifies it compiles)
npm run start:local  # run the production build on :3300
npm run typecheck && npm run lint && npm test   # full check (node:test, no extra test dependency)
```

---

## Architecture (why this matters for backend work)
- **Frontend (this repo)** → Vercel. Marketing site **plus** the `/app` console for in-house lawyers.
- **Backend (separate repo, `placedon-law-backend`)** → the deterministic engine, the gateway, the
  job worker and the model gateway.
- **Two backend surfaces, two clients in this repo** (full contract in `AGENTS.md`):
  - `/v1` engine, unauthenticated → `src/lib/engine/*`, selected by `PLACEDON_API_ORIGIN`
    (unset → Mock engine with real Companies-Act fixtures). Used by the `/product/*` surfaces.
  - `/v2` gateway verbs, API-key authenticated → `src/lib/gateway/*`, selected by `GATEWAY_URL`
    + `PLACEDON_GATEWAY_KEY` (unset → MockGateway; URL set without a key → throws on purpose).
    Used by the `/app` console.
- **Both clients are server-only.** Never import either into a `"use client"` module — the token
  would be inlined into the public bundle; `server-guard` throws rather than let it.
- **A transport error must NEVER render as an abstention** (`EngineResult<T>` / `AskState`
  enforce it). `cost_inr: null` is UNPRICED, never 0. There is no list-runs verb.
- Run the real gateway locally: `python3 scripts/local-gateway.py` → see `docs/RUN_LOCALLY.md`.

## Where things live
```
src/
├── app/                     Next.js App Router
│   ├── page.tsx               home
│   ├── product/ how-it-works/ pricing/ about/ security/ faq/   marketing pages
│   ├── product/{compliance-pack,document-check,events,instruments}/  live /v1 surfaces
│   ├── app/                   the /app console (passcode login)
│   │   ├── page.tsx + ask-console.tsx     Ask
│   │   ├── contracts/                     playbook review
│   │   ├── documents/                     document review
│   │   ├── runs/ + runs/[id]/             runs started in this browser + trace
│   │   ├── review-gate.tsx                lawyer approve / reject
│   │   ├── actions.ts                     Server Actions — the only path to the gateway
│   │   └── login/                         passcode → signed session cookie
│   ├── api/waitlist/route.ts  pilot-request form sink
│   ├── privacy/ terms/ cookies/            legal pages (templates for counsel review)
│   ├── og/ robots.ts sitemap.ts            SEO
│   └── layout.tsx globals.css             fonts, tokens, chrome
├── components/              shared UI (site-chrome, sections, evidence-card, request-form, surfaces/)
└── lib/
    ├── engine/                /v1 client: types, Mock + Http providers, errors, server-guard
    ├── gateway/               /v2 client: types, Mock + Http providers
    ├── auth/                  console session, token, recent-runs (this browser only)
    ├── documents/             .pdf / .docx / .zip text extraction for uploads
    ├── placedon-content/      ALL marketing copy + legal templates (edit here, not in components)
    ├── tokens.ts              design tokens — no hex in components
    └── format.ts seo.ts site.ts track.ts legal.ts intake.ts
tests/                       node:test suites (gateway, documents) + contracts.mjs + browser.mjs
scripts/local-gateway.py     starts the real backend gateway and writes a key into .env.local
brand-kit/                   logo, colours, self-hosted fonts (Fraunces, IBM Plex Mono, Inter), posters
public/                      served assets (brand mark, hero media)
docs/                        see docs/README.md
```

## Integrations (and where the keys are)
- **Lead form → Web3Forms.** Key in `src/components/request-form.tsx`
  (`WEB3FORMS_ACCESS_KEY`). Submissions email to `placedon007@gmail.com`.
  Web3Forms free tier only accepts **client-side** submissions (a server-side
  test returns "method not allowed" — that's expected).
- **Google Analytics 4** (`G-DE8BMPJRVL`) in `src/components/analytics.tsx`.
  **Consent-gated**: loads only after the visitor clicks "Accept analytics"
  (matches the privacy policy). ID is baked in with a `||` fallback; override via
  `NEXT_PUBLIC_GA_ID`. Funnel events fire via `src/lib/track.ts`
  (request_pilot_click, see_evidence_click, demo_tab_view, form_start,
  generate_lead). Enhanced Measurement (GA) covers page views/scroll/outbound.

## Deployment
- **Vercel**: push to `main` → auto-deploy. No config needed; no env vars
  required for the pilot (mock data, Web3Forms, GA all work on defaults).
- **Azure (optional)**: `docs/deploy/AZURE.md` — App Service via Deployment
  Center. Build with `BUILD_STANDALONE=1` for this; **never set it on Vercel** (it breaks the
  post-build trace step with `ENOENT .next/next-server.js.nft.json`). Only if you
  choose Azure over Vercel for the frontend (not recommended — save cloud credits
  for the model). Point `placedon.com` at ONE host, not both.

---

## ⚠️ CRITICAL gotchas (save yourself hours)
1. **Git author email must be valid** or Vercel silently BLOCKS the deploy.
   Set it before committing: `git config user.email "placedon007@gmail.com"`.
   (A `…@Macbook.local` author = Blocked deploy, site serves the old build.)
2. **You cannot push `.github/workflows/*`** with the current token (no
   `workflow` OAuth scope). Use Vercel's auto-deploy or Azure Deployment Center
   instead — do not add CI workflow files to the repo.
3. **Verify with `npm run build` + a real browser, NOT curl.** Curl-based
   fetching of the deployed JS chunks is unreliable in this environment and gives
   false negatives. Trust the Vercel dashboard + browser DevTools.
4. **Brave (and ad-blockers) block Google Analytics.** When testing GA, use
   Chrome with extensions off, check GA **Realtime** (not the lagging Home page),
   and look for a `google-analytics.com/g/collect` request in DevTools → Network.
5. **AGENTS.md is binding** (re-read it every session): near-monochrome brand +
   one gold accent; reader-facing **Section 96** in bold serif, its evidence line (`s.96(1)`, figures, instruments, dates) in IBM Plex Mono; **banned
   words** (streamline, empower, solution/Solutions, seamless, easy, smart,
   revolutionary, unlock, supercharge, effortless, game-changer, cutting-edge,
   "Join the waitlist"); never invent a statutory figure/section/date (abstain);
   never claim an accuracy rate; a11y AA; respect prefers-reduced-motion.
6. **India-first**: ₹ lakh/crore, MCA21/ROC/Gazette/CIN, DPDP Act 2023,
   ICSI/ICAI, IST timestamps, Indian number grouping (`src/lib/format.ts`).

## What's left / next steps
1. **Legal review** of the templates by a real lawyer → then set `SITE_ORIGIN`
   + `SITE_PUBLICATION_READY=true` (Vercel env) to allow Google indexing.
2. **Backend**: train the narration/description model + host the engine on a
   credit-backed cloud; then set `PLACEDON_API_ORIGIN` so product surfaces go
   live instead of mock.
3. **GA**: mark `generate_lead` as a key event (GA Admin → Events).
4. Optional: make `placedon.com` (non-www) the primary in Vercel → Domains;
   grade/replace the white hero video below the fold.

## Reference docs
- `AGENTS.md` — binding brand/voice/engineering rules (authoritative).
- `docs/README.md` — index of every document.
- `docs/RUN_LOCALLY.md` — run the console against the real gateway.
- `docs/deploy/VERCEL.md`, `docs/deploy/AZURE.md` — deployment guides.
- `docs/app-screens/` — live screenshots of the console, and how the live system differed from the mock.
- `docs/archive/` — earlier prompts, RAG notes and redesign dossiers (history, not instructions).
