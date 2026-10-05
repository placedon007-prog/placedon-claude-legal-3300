# Placedon :3300 — Build Execution Plan (verified, 2026-09-11)

Grounded against disk + live server, not memory. Baseline commit: `fe0ef3b` (Layers 0–5c done).
Approved by user: **full multi-page site · 2–3 parallel sub-agents · keep faces, fix craft.**

## Verified reality (do not re-derive)
- Live routes: `/`, `/privacy`, `/terms`, `/cookies` = 200. Everything else = 404.
- Homepage motion is already GOOD (Layer 3): `AnimatedH2` = clip-path mask word-reveal (full-contrast, never a muddy fade); `Reveal` floors at 0.55 opacity + renders final state under reduced-motion; tokens = single easing `cubic-bezier(0.2,0,0,1)`, three durations 140/220/320ms. **Do not rewrite this.**
- The "font not perfect" complaint is NOT the typeface (audit-confirmed Fraunces renders well) and NOT the reveal anymore. Remaining suspects: (a) hero display tracking slightly tight; (b) white `hero.mp4` block = tonal whiplash; (c) `SecIcon` infinite 5s wiggle loop = AI-slop looping motion (violates "one ambient device").
- Real content exists for every marketing page: `home, product, pricing, about, faq (255 lines), security, how-it-works` in `src/lib/placedon-content/content/*`. Canonical nav/footer defined in `shared.ts → globalContent`.
- Dead components `sections.tsx` (`PageHero/ReadingSection/ClosingInvitation`) have bugs to fix on wire-in: banned **"Join the waitlist"** (line 104) + 404 `/waitlist` links.

## Canonical routes to build (each `src/app/<route>/page.tsx`)
`/product` `/how-it-works` `/pricing` `/security` `/about` `/faq` `/waitlist` (+ product surfaces).
Nav = Product · How it works · Security · Pricing + "Request a pilot" (from `globalContent.header`).

## Phase 1 — shared foundation (LEAD does this first; touches shared files)
1. Kill `SecIcon` infinite wiggle → reveal-once/static (page.tsx). Refine hero tracking (dashboard.css).
2. Multi-page chrome: `site-chrome.tsx` nav/footer → real routes from `globalContent`. Delete dead `navigation.tsx`.
3. Shared **MarketingPage scaffold**: fix `sections.tsx` bugs, add a server `MarketingPage` + `pageMetadata()` wrapper so each route is a thin server component. Agents reuse it.
4. Scroll-spy: new client component; legal TOC highlights active topic with a white marker (IntersectionObserver, Brave-safe, keyboard-accessible, reduced-motion safe). Wire into `legal-page.tsx`.
5. Request-pilot form: realistic example placeholders at reduced opacity (`request-form.tsx` + `waitlist.ts` field copy + `::placeholder` CSS).
6. Hero moment: grade the white video block into the dark palette (defer fine-tuning until user screenshot).

## Phase 2 — parallel sub-agents (each creates NEW route files ONLY; shared files read-only)
- **Agent A — Marketing:** `/product`, `/how-it-works`, `/pricing` (uses MarketingPage scaffold + page-specific bits: pricing tiers).
- **Agent B — Trust:** `/about`, `/faq` (accordion), `/security` + `/waitlist` request page.
- **Agent C — Product surfaces:** compliance-pack · events · document-check · instrument-affected on the typed Mock engine (server-only `getEngine()`), with a visibly distinct transport-error state (never render network error as abstention).

## Phase 3 — integration & verify (LEAD)
Stitch pages into nav/sitemap/footer; every link resolves (no reachable 404s).
Per layer: `npx tsc --noEmit` · `npx eslint .` · `node tests/contracts.mjs` · `npx next build` · route curls · user screenshot review → commit per layer → push. No force-push, no deploy.

## Hard rules (binding — from AGENTS.md)
Near-monochrome + ≤10% brass gold, one accent/view; abstain-grey for abstain state only; IBM Plex Mono on every statute ref/figure/date; keep Fraunces/Inter/Plex; banned words (streamline, empower, solution/Solutions, easy, smart, seamless, revolutionary, unlock, supercharge, effortless, game-changer, cutting-edge, "Join the waitlist"); never invent a statutory figure/section/date (abstain instead); never claim accuracy rates; transport error ≠ abstention; a11y AA, visible focus, 44px targets, reduced-motion, responsive to 360px; glass discipline (ink tint ≥0.62 + brightness(0.55), ≤3 backdrop surfaces/viewport, never animate blur, ≥3:1 boundary on interactive glass). Engine is server-only (never import a provider into a `"use client"` module).
