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
npx tsc --noEmit && npx eslint . && node tests/contracts.mjs   # full check
```

---

## Architecture (why this matters for backend work)
- **Frontend (this repo)** → Vercel. Cheap/free, purpose-built for Next.js.
- **Backend (separate)** → the deterministic engine + narration model. Host on a
  cloud with GPU credits (Azure/AWS/GCP) — that's where the money/compute goes,
  NOT the frontend.
- **They connect via one env var:** `PLACEDON_API_ORIGIN`. Unset → the app uses
  the built-in **Mock engine** (real Companies-Act fixtures, deterministic). Set
  it to the backend URL → the product surfaces show live answers. No rebuild.
- **The engine is server-only** (`src/lib/engine/*`). Never import a provider
  into a `"use client"` module (it would leak the token/origin into the browser
  bundle). `getEngine()` picks Mock vs Http at call time.
- **Contract: the backend has exactly SIX routes** (see `AGENTS.md` and
  `src/lib/engine/types.ts`). `/v1/company/{cin}/standing` and `/v1/ask` do NOT
  exist. A transport error must NEVER render as an abstention (`EngineResult<T>`
  enforces this).

## Where things live
- **Pages:** `src/app/*/page.tsx` (home, product, how-it-works, pricing, about,
  security, faq, waitlist, privacy, terms, cookies, + 4 product surfaces under
  `src/app/product/*`).
- **Shared UI:** `src/components/*` (site-chrome nav/footer, marketing-page
  scaffold, sections, faq-accordion, legal-page/-toc, request-form, analytics,
  surfaces/*).
- **All copy is real content** in `src/lib/placedon-content/content/*` — do not
  hardcode marketing copy in components; edit the content modules.
- **Legal pages** (`src/lib/placedon-content/legal/*.md`) are FILLED with real
  operator details (Placedon Technologies Private Limited; DPC/Grievance =
  Hardik Singh Rajpurohit + Nishant Singh; privacy/security email
  placedonsecurity@gmail.com; grievance/legal email placedon007@gmail.com;
  effective 14 Sep 2026; v1.0). Still marked "for counsel review" — a real lawyer
  must review before enabling indexing.

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
- **Azure (optional)**: `docs/AZURE-DEPLOY.md` — App Service via Deployment
  Center. `next.config.ts` has `output: "standalone"` for this. Only if you
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
   one gold accent; IBM Plex Mono on every statute ref/figure/date; **banned
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

## Reference docs (historical — read only if you need the detail)
- `AGENTS.md` — binding brand/voice/engineering rules (authoritative).
- `docs/AZURE-DEPLOY.md`, `DEPLOY.md` — deployment guides.
- `docs/specs/backend-architecture-dossier.md` — backend contract detail.
- `docs/specs/*` — redesign analysis dossiers (background, not required reading).
