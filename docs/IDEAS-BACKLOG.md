# Placedon frontend — ideas backlog

Snapshot of this clone (`remove-ui-icons` branch, local only — not synced with
`origin/main`). Everything below was checked against the actual code, not
assumed from memory. Nothing here has been actioned; this is a read-only
review.

---

## Needs the user's decision

- **Hero video keep/cut** (S) — `src/app/page.tsx` still autoplays
  `/media/hero.mp4` in its own section right below the new B&W image hero
  (`HeroVideo` component, line ~61). Flagged as possibly redundant two
  sessions ago, never resolved. Pick one hero treatment.
- **Border-radius vs. AGENTS.md's "Corners ≤6px" rule** (M) — the rule is
  written as binding, but `dashboard.css`/`globals.css` use 8–20px radii
  throughout (cards, demo panels, resource tiles, principle cards — ~20
  occurrences above 6px, plus several `999px` pill shapes). This isn't one
  bug, it's the whole card language. Either the written rule is stale and
  should be updated to match the shipped design, or the components need a
  real pass back to ≤6px. Needs a call, not a patch.
- **Resources grid cards look clickable but aren't** (S) — `.dres-card` in
  `dashboard.css` (line 987) has a `:hover` state that changes border colour
  and background, signalling interactivity. But in `page.tsx` (the
  "Evidence & resources" section) these render as plain `<div>`s with no
  `href`/`onClick` — six dead-end cards (How the record works, When
  Placedon abstains, etc.) with no actual page behind them. Either link them
  to real content or drop the hover affordance so they read as a static
  list, not broken links.
- **Lawyer review of the legal pages** — this is the one gate blocking
  `SITE_PUBLICATION_READY=true` / indexing. Confirmed still correctly
  disabled (`src/lib/seo.ts`, `src/app/sitemap.ts`, `src/app/robots.ts` all
  read `SITE_ORIGIN`/`SITE_PUBLICATION_READY`, both unset → honest
  `noindex`). Everything else about go-live is otherwise ready.
- **Lead-form sink: Web3Forms vs. the native `/api/waitlist` route** —
  there's a fully built, properly validated server route at
  `src/app/api/waitlist/route.ts`: zod schema (`requestSchema` from
  `src/lib/intake.ts`), origin check, body-size cap, IP rate-limiting
  (10/10min), consent-version check, pluggable storage sink + optional
  confirmation-email webhook — all gated behind `intakeConfiguration().enabled`.
  Right now Web3Forms is the live path (client-side only, per README, since
  the free tier doesn't accept server submits). The real validated pipeline
  exists and is unused. Worth deciding if/when to wire a sink and switch.
- **www vs non-www canonical domain** — README still lists "make
  `placedon.com` the primary in Vercel → Domains" as undone.
- **GA `generate_lead` as a key event** — GA Admin UI action, not a code
  change, still open per README.

## Safe to execute now

- **Dead CSS: one leftover `testimonial` class** in `dashboard.css` — the
  testimonials carousel itself is gone from `page.tsx` (not blank, actually
  removed), but one orphaned class reference remains in the stylesheet.
  Harmless, but easy cleanup.
- **Font-weight bump already done this session** — `h1`/`h2`/`h3` in
  `src/app/globals.css` moved from 400/420/500 → 600/560/600 on the Fraunces
  display faces. Worth a visual check on mobile widths once you're back.
- **Icon-removal visual QA** — `e53af30` stripped decorative icons sitewide.
  Worth a pass over FAQ accordion, feature rows, and nav to confirm nothing
  now reads as empty or loses scannability without an icon anchor.
- **Full verification pass** — `tsc --noEmit`, `eslint`, `node
  tests/contracts.mjs`, `next build` were kicked off but not confirmed clean
  this session; worth re-running and fixing anything red before further
  changes stack up.

## Needs backend / legal / GA Admin (not a code task)

- Legal counsel review of `privacy-policy.md` / `terms.md` / `cookie-consent.md`.
- GA4 Admin: mark `generate_lead` as a key event.
- Backend: the 4 mock product surfaces (`compliance-pack`, `document-check`,
  `events`, `instruments`) should get re-checked against the real 6-route
  contract once there's visibility into whether that contract has changed
  since this clone was last touched (Sept 19) — this clone can't see that on
  its own since it's intentionally not synced with the backend repo or
  `origin/main`.

---

*Written by a background review agent, read-only — no files modified, no git
actions taken, nothing pushed or pulled.*
