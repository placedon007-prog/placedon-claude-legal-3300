# Placedon Integration & Borrow Dossier
### Codex 1.2 (:3200 "Made by Claude 1.1 version frontend") → :3300 ("Claude Legal prototype (recovered)")

**Analysis date:** 2026-09-11 · **Mode:** READ-ONLY. No project file was modified, created, or deleted. Only read-only git commands (`log`, `diff`, `show`, `ls-tree`, `for-each-ref`, `rev-list`) were used.

**Projects**
| Role | Path | Port | Git |
| --- | --- | --- | --- |
| SOURCE (borrow from, DO NOT MODIFY) | `/Users/saiyamupadhyay/Desktop/PLACEDON/Made by Claude 1.1 version frontend` | 3200 | remote `origin` → `placedon-frontend-astra` (private). Branches: `main` @ `af0edf8`, `claude-1.3` @ `bf54970` |
| TARGET (work happens here later) | `/Users/saiyamupadhyay/Desktop/PLACEDON/Claude Legal prototype (recovered)` | 3300 | single commit `77dc2c5` "Placedon :3300 Claude-legal prototype — baseline + Claude→Claude handoff" |

---

## 0. Headline finding (read this first)

**`claude-1.3` is not a deliverable, an iteration, or a body of new work.** It is an *archive pointer*.

- `git log --oneline main..claude-1.3` → **empty** (0 commits).
- `git rev-list --count main..claude-1.3` → **0**. `git rev-list --count claude-1.3..main` → **9**.
- `git log --oneline -20 claude-1.3` → **exactly one commit**: `bf54970 chore: preserve original Placedon frontend before ASTRA redesign`.
- `claude-1.3` and `origin/claude-1.3` both resolve to `bf5497076badf607d3e487316a5f1b8eb14b9bea` — the **root commit** of the repository.

So `claude-1.3` points at the *pre-ASTRA, first-generation* Placedon frontend, nine commits **behind** `main`. It contains zero work that `main` does not already supersede.

**And it is already in your hands.** The :3300 target folder is byte-identical to the `claude-1.3` snapshot:

```
git ls-tree -r --name-only claude-1.3 -- src   ==   find src -type f   in the :3300 folder
→ IDENTICAL FILE LISTS
```

Spot checksums (SHA-1), `claude-1.3` blob vs. :3300 working file:

| File | claude-1.3 | :3300 | |
| --- | --- | --- | --- |
| `src/app/page.tsx` | `4cd064b3…` | `4cd064b3…` | SAME |
| `src/app/globals.css` | `bc33f061…` | `bc33f061…` | SAME |
| `src/app/dashboard.css` | `a85b8ef0…` | `a85b8ef0…` | SAME |
| `src/components/navigation.tsx` | `2db59801…` | `2db59801…` | SAME |
| `src/lib/tokens.ts` | `74a6485a…` | `74a6485a…` | SAME |

**Conclusion:** "claude 1.3" = the archived original frontend that was copied out to become the :3300 redesign base. There is nothing to *analyse* on that branch; its entire content is the :3300 starting point. The real body of work to mine is `main` on :3200 (`af0edf8`), which is nine commits of ASTRA redesign *ahead* of it.

### The full `main` history (what actually exists)

```
af0edf8 chore: orphan cleanup + fix broken pilot-success link (Layer 0b, part 3)
88107b0 feat: wire per-route metadata, canonical, OpenGraph and JSON-LD (Layer 0b)
e10a393 chore: remove dead first-generation UI (Layer 0b, part 1)
28c7f93 fix: live-layer hygiene (theme toggle, no-op motion, tabular numerals)
4e2afb8 docs: add codex 1.2 Claude Code continuation brief
89012ba test: verify preview routes and document remaining integration risks   ← "Codex 1.2 checkpoint"
1fb2d84 feat: add marketing pages and contract-based workspace preview
e41d2d1 feat: establish monochrome editorial design and evidence-led home
8f44e6e docs: record approved ASTRA direction and recovery checkpoint
bf54970 chore: preserve original Placedon frontend before ASTRA redesign        ← claude-1.3 / :3300 base
```

Note that **four commits post-date the `codex 1.2.md` brief** (`28c7f93`, `e10a393`, `88107b0`, `af0edf8`). These are Claude Code's Layer 0/0b work: live-layer hygiene, *dead first-generation UI removal*, and per-route SEO. This matters enormously for §4 — the "dead layers beside live ones" problem the brief warns about has been **partially cleaned already on `main`**.

---

## 1. `codex 1.2.md` — full summary

Source: `/Users/saiyamupadhyay/Desktop/PLACEDON/Made by Claude 1.1 version frontend/codex 1.2.md` (414 lines). Read in full.

### 1.1 What the document is

Its own framing, verbatim:

> "This is the continuation brief for Claude Code. It records the actual Codex implementation, the user's approved direction and the remaining work. **It is not a declaration that the entire ASTRA master brief has been completed.**"

Checkpoint declared: branch `main`, commit `89012ba`. Local archive `../backups/placedon-before-astra-20260911.tar.gz`, SHA-256 `61f62005fa509451db97a72c37a18cd1e25b7d20ec6db5a54113ee30e34b7c38`.

### 1.2 What Codex DID build

**Design & marketing**
- Replaced the homepage with an asymmetrical, left-aligned **editorial** layout: filing responsibility → evidence-sheet illustration → stale-law problem → Sentinel explanation → product links → early-access CTA.
- Evidence illustration explicitly labelled; contains **no** invented statutory figure, citation, source hash or verified result.
- Expandable evidence disclosure via native `details`/`summary`.
- Responsive nav, light/dark appearance control, footer links, existing cookie dialog.
- New routes: `/product`, `/problem`, `/sentinel`, `/evidence`, `/about`.
- Early-access intake at `/early-access`; `/pricing` and `/waitlist` resolve to that same intake.
- `/privacy`, `/terms`, `/cookies` wired to existing legal rendering.
- **Display typography changed to locally-hosted Playfair Display.** Inter retained for body, IBM Plex Mono for record text.
- 240 ms hero entrance + CSS reduced-motion final state. No looping video or decorative third-party media on the new homepage.
- Sitemap route list updated, publication gate retained.

**Workspace & data boundary**
- `/workspace` + sidebar for all ten planned product capabilities.
- Company-fact, document-date and company-event forms.
- Response rendering for obligation states, source paths/hashes, missing facts, blockers, provenance, honesty statements, law-currency watch entries.
- Document-response groups and bitemporal event rendering.
- Print initiation for a non-empty evidence record.
- `EngineProvider`, `MockProvider`, `HttpProvider` in `src/lib/engine.ts`; `src/lib/api.ts` reduced to a re-export.
- Removed the obsolete `/standing` method. HTTP failure ≠ evidence abstention; invalid schemas produce an explicit error.
- Active provider stays local: `engine = new MockProvider()`.

**Privacy & verification**
- Preserved server-side validation, purpose-specific consent, honeypot, storage acknowledgement, configuration gates.
- Intake stays **closed** without reviewed legal details + configured sink. Policy retains draft/counsel-review status.
- Passed TypeScript, ESLint, and a **webpack** production build. **35 contract assertions and 104 browser assertions.**
- Fixed two browser-discovered defects: a server/client module boundary error and a reduced-motion hydration mismatch.

### 1.3 What Codex honestly did NOT build

Explicit, in the document's own words:

> "Print initiation for a non-empty evidence record. **This is not yet a complete designed PDF/evidence-export workflow.**"

> "The mock returns empty, labelled preview records. **It does not produce real legal determinations or the complete statutory matrix. Zero-length preview arrays are not proof of no obligations, no changes or legal compliance.**"

> "**Do not assume that a route's existence means its engine workflow is implemented.** The monitor, point-in-time, bulk-review, research and drafting screens currently explain their limits. **They are not full interactive workflows.**"

> "These checks do not establish comprehensive accessibility, legal compliance, performance on physical phones, security certification or live engine correctness."

> "The master brief envisioned a fully fresh triad, but **this implementation only replaced the display family.** Ask before changing the remaining families."

> "Codex searched their official pages; **it did not complete a detailed visual audit of both sites. Do not describe that audit as completed.**" (re: Harvey / Claude Legal)

Also incomplete by its own map: `og/placedon.png/route.tsx` — "*Existing share image; font alignment still pending*"; a **coherent custom icon set** is listed as Layer-1 remaining work, i.e. it does not yet exist.

### 1.4 LOCKED design decisions — VERBATIM

**Authority clause:**

> "The user explicitly approved the latest black/white direction and ASTRA taking precedence over conflicting older brand rules. **Do not restore brass gold merely because an older AGENTS.md or brand-kit file mentions it.**"

**Palette table (verbatim values):**

| Role | Current value |
| --- | --- |
| Ink | `#080808` |
| Paper/white | `#FAFAFA` |
| Light surface | `#F0F0F0` |
| Light secondary text | `#595959` |
| Light rule | `#D5D5D5` |
| Uncertainty neutral | `#6A6A6A` |
| Dark surface | `#151515` |
| Dark rule | `#353535` |
| Dark secondary text | `#B5B5B5` |

> "Use semantic tokens, not literal colours in components. **Existing `gold` token names now resolve to neutral values for compatibility; do not infer permission to add a coloured accent.** The default appearance is dark. The current appearance toggle is in-memory and does not persist its choice; review cookie-copy alignment before introducing storage."

**Typography (the conflict):**

> "**Display: Playfair Display. Body: Inter. Citations, legal figures and dates: IBM Plex Mono, with tabular numerals.** Self-host all fonts and preserve licences. The master brief envisioned a fully fresh triad, but this implementation only replaced the display family. Ask before changing the remaining families."

**Layout / skeleton:**

> "Maintain the evidence-sheet hero, generous space, asymmetric composition, restrained corners, clear hierarchy and native expandable evidence disclosure. **Preserve useful current structure; do not impose a new site template. Do not mechanically spread the same card treatment across every screen.**"

**Motion:**

> "Motion should explain interaction: **at most one hero entrance, approximately 250 ms or less for interface transitions, no bouncing or gratuitous animation, and final-state rendering for reduced motion.** Avoid server/client-dependent initial styles that cause hydration mismatches."

**Reference discipline:**

> "Harvey and Claude Legal are references for professional restraint, **not permission to copy layouts, branding, proprietary assets, claims, testimonials or customers.**"

**Workspace skeleton (verbatim):**

> "Workspace route IDs are `matrix` (also `/workspace`), `document-check`, `evidence-pack`, `sentinel`, `monitor`, `point-in-time`, `staleness`, `bulk-review`, `research` and `drafting`."

### 1.5 The 6-route backend contract — VERBATIM

> "Only these engine routes are documented:
> ```text
> GET  /v1/health
> POST /v1/compliance-pack
> POST /v1/document-check
> GET  /v1/company/{cin}/events
> GET  /v1/company/{cin}/events/{event_id}
> GET  /v1/instruments/{fragment}/affected
> ```
> **There is no `/v1/ask` or `/v1/company/{cin}/standing`.** The separate existing `/api/waitlist` is the site's intake route, not an engine route."

> "Company facts belong in POST bodies. **Preserve exact enum strings:**
> ```text
> APPLIES_SATISFIED
> APPLIES_NOT_SATISFIED
> APPLIES_UNDETERMINED
> DOES_NOT_APPLY
> CANNOT_DETERMINE
>
> VERIFIED_FACT
> DETERMINISTIC_CONSEQUENCE
> SIGNAL
> ```"

> "Future research abstention `INSUFFICIENT_EVIDENCE` is a separate taxonomy. **Signals require a visibly different treatment from verified facts. A verified event requires a verifier. Render both event dates: `at` and `known_at`.** Surface the law-change-only scope and preserve provenance, `what_this_is`, `what_it_is_not`, missing facts, blockers and `unverified` records."

> "**Do not change the client to send private tokens to a browser.** Before enabling a live provider, inspect the backend and determine the appropriate server-side boundary, origin, authentication, transport and data-handling configuration. No live URL or credentials have been supplied in this handoff."

⚠️ **This directly contradicts the :3300 `AGENTS.md`**, which still documents the old three-route shape including `/v1/company/{cin}/standing` and lowercase output classes `verified_fact | deterministic_conclusion | predictive_signal`. See §4.

### 1.6 Copy & truth rules — VERBATIM

> "- Indian corporate-law practitioners are the primary audience: advocates, corporate associates and in-house counsel. Keep the person signing central.
> - Voice: **terse, traceable, unsparing. Claim, then evidence.** Proofread headings, buttons, errors, descriptions, legal pages and exports, not only the homepage.
> - Use Indian English and unambiguous dates such as `1 December 2025`.
> - Use rupees and Indian grouping. `indianDate` and `rupees` already exist.
> - **Do not invent citations, metrics, customers, quotations, coverage, source hashes, current-law figures, live-model capabilities or successful verification.**
> - Do not publish the master brief's Supreme Court assertion or threshold contrast until the primary sources have been checked and the legal statement reviewed.
> - **Do not use: streamline, empower, solution, easy, smart, seamless, revolutionary, unlock, supercharge, effortless, game-changer or cutting-edge in product copy.**
> - **CTAs: "Request a pilot" and "Request early access". Do not restore "Join the waitlist".**
> - Keep network error, empty preview, legal abstention and "does not apply" distinct.
> - A qualified lawyer verifies legal conclusions. **Never label the site legally compliant, certified or production-ready based on frontend checks.**"

⚠️ The CTA rule is a **direct reversal** of the :3300 `AGENTS.md`, which still says: *"Primary CTAs: 'Request a pilot' / 'Join the waitlist.'"*

### 1.7 The 7-layer continuation roadmap

Framing clause: *"Complete one layer, review it, verify it and commit it before moving to the next. **These are remaining deliverables, not claims of completed work.**"*

1. **Baseline and component discipline.** Preserve the approved homepage. Extract shared citation/status/record components without changing meaning or visual direction. **Complete a coherent custom icon set.** Keep server-readable route config outside client-only modules. Consolidate duplicated tokens carefully.
2. **Compliance matrix depth.** Complete company profile + evidence inputs from the real request contract. Grouped rows, backend-derived summaries, provenance/health surfaces, meaningful missing-fact guidance. *"Test all five states independently. **A real negative result must not resemble uncertainty.**"*
3. **Currency and Sentinel depth.** Document result presentation, instrument-affected lookup, event details and filters using only documented routes. Both dates, source provenance, scope. *"Do not imply that alerts or historical verification are live when the engine does not support them."*
4. **Evidence pack and remaining planned screens.** Legible print/export record preserving uncertainty and provenance. Improve research, drafting, bulk-review, historical screens. *"Where there is no endpoint, build an honest designed state and name the blocker; do not fabricate a working service or invent an endpoint."*
5. **Marketing completeness and touchpoints.** Source-checked demonstrations, glossary/help, truthful product status, **full metadata/JSON-LD**, share-card typography, branded error/404/loading states, route consistency. *"Do not leave old generated sitemap entries or internal links pointing at missing pages."*
6. **Privacy and legal alignment.** Preserve draft notices and closed intake until verified operator/provider details exist. Reconcile early-access vocabulary, appearance storage and consent behaviour with notices.
7. **Live integration and final audit.** Authorised backend source + reviewed fixtures. Verify schemas and positive/error responses. Full keyboard, screen-reader, contrast, zoom, both themes, narrow/wide, long records, reduced-motion, performance checks.

**Status against `main`:** Layer 1 is partially done (dead UI removed in `e10a393`, hygiene in `28c7f93`) but the **custom icon set is still missing**. Layer 5's metadata/JSON-LD half is done (`88107b0`, `af0edf8`). Layers 2–4, 6, 7 are untouched.

### 1.8 Verification commands (verbatim, for reuse in :3300)

```sh
npm run lint
npx tsc --noEmit
node tests/contracts.mjs
npx next build --webpack
```

> "`npm run build` uses the default Turbopack path. **That sandboxed build stalled in the Codex session and was stopped; the successful build was webpack.** Do not claim the default build command passed or permanently change it without diagnosis."

```sh
TEST_ORIGIN=http://localhost:3200 \
PLAYWRIGHT_MODULE=/Users/saiyamupadhyay/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs \
node tests/astra-browser.mjs
```

> "`npm run dev` serves port 3200; check for an existing process before starting another server. **Another port alone did not avoid Next.js's same-project dev lock. Do not kill the user's existing process casually.**"

---

## 2. What `claude-1.3` actually is — evidence

Commands run (all read-only) and their exact output:

```
$ git for-each-ref --format='%(refname:short) %(objectname:short) %(committerdate:iso) %(subject)' refs/heads refs/remotes
claude-1.3        bf54970 2026-09-11 00:19:50 +0530 chore: preserve original Placedon frontend before ASTRA redesign
main              af0edf8 2026-09-11 10:39:21 +0530 chore: orphan cleanup + fix broken pilot-success link (Layer 0b, part 3)
origin/claude-1.3 bf54970 2026-09-11 00:19:50 +0530 chore: preserve original Placedon frontend before ASTRA redesign
origin/main       af0edf8 2026-09-11 10:39:21 +0530 chore: orphan cleanup + fix broken pilot-success link (Layer 0b, part 3)

$ git log --oneline main..claude-1.3
(empty)

$ git log --oneline -20 claude-1.3
bf54970 chore: preserve original Placedon frontend before ASTRA redesign

$ git diff main...claude-1.3 --stat
(empty — claude-1.3 is an ancestor of main, so the merge-base IS claude-1.3)
```

### 2.1 The only meaningful diff is `claude-1.3 → main` (two-dot, i.e. what ASTRA added)

`git diff claude-1.3 main --stat` — 36 files, **+2598 / −3679**:

| Added by ASTRA | Deleted by ASTRA (still alive in :3300) |
| --- | --- |
| `codex 1.2.md` (+414) | `src/app/dashboard.css` (−1221) |
| `docs/ASTRA-DESIGN-REVIEW.md` (+74) | `src/app/page.tsx` (−944 of 944 → thin wrapper) |
| `docs/ASTRA-HANDOFF.md` (+55) | `src/components/evidence-card.tsx` (−147) |
| `src/app/astra.css` (+550) | `src/components/navigation.tsx` (−140) |
| `src/app/[slug]/page.tsx` (+176) | `src/components/sections.tsx` (−113) |
| `src/app/workspace/[[...view]]/page.tsx` (+29) | `src/components/footer.tsx` (−51) |
| `src/components/astra-workspace.tsx` (+408) | `src/components/json-ld.tsx` (−17) |
| `src/components/astra-home.tsx` (+194) | `content/faq.ts` (−255), `product.ts` (−120), `home.ts` (−121) |
| `src/components/astra-chrome.tsx` (+74) | `content/security.ts` (−96), `how-it-works.ts` (−95) |
| `src/lib/engine.ts` (+396) | `content/pricing.ts` (−79), `about.ts` (−59) |
| `tests/astra-browser.mjs` (+98) | `src/lib/api.ts` (−154 → re-export stub) |

**Reading:** every file in the right-hand column is *still present and live* in the :3300 target. The two projects are literally the two sides of this diff. :3300 = the left state; :3200 `main` = the right state.

### 2.2 Practical consequence

There is nothing to "analyse" or merge *from* `claude-1.3`. The user's belief that "claude 1.3 is a deliverable" should be corrected: **the deliverable to mine is `main` (`af0edf8`) on the :3200 repo.** `claude-1.3` is the safety branch that preserves what :3300 already contains — it is a *rollback point*, not a *forward increment*.

---

## 3. Structural comparison — :3200 vs :3300

### 3.1 Route surface

| | :3200 `main` (SOURCE) | :3300 (TARGET) |
| --- | --- | --- |
| Page routes | `/` · `/[slug]` (→ `/product`, `/problem`, `/sentinel`, `/evidence`, `/about`, `/early-access`, `/pricing`, `/waitlist`, `/privacy`, `/terms`, `/cookies`) · `/workspace/[[...view]]` (10 views) | **`/` only** |
| Handlers | `api/waitlist`, `icon.svg`, `og/placedon.png`, `sitemap`, `robots` | same five |
| Chrome | `astra-chrome.tsx` (header + mobile nav + theme toggle + footer) | **none** — nav/footer are inline in `page.tsx`; `navigation.tsx` / `footer.tsx` are orphans |
| Stylesheets | `globals.css` (1,582 lines, **all 109 classes referenced — no dead ranges**) + `astra.css` (550 lines) | `globals.css` (1,585) + `dashboard.css` (1,221) |
| Engine client | `src/lib/engine.ts` — 6 routes, Zod, Mock+Http | `src/lib/api.ts` — **old 3-route shape incl. `/standing`** |

### 3.2 :3200 `src/app` and `src/components` (LIVE inventory)

```
src/app/[slug]/page.tsx                  marketing + legal + intake router (176 lines)
src/app/api/waitlist/route.ts            gated intake endpoint
src/app/astra.css                        the live design layer (550 lines)
src/app/error.tsx  src/app/not-found.tsx branded error states
src/app/globals.css                      shared base + legal/form styles (live)
src/app/icon.svg/route.ts                generated favicon
src/app/layout.tsx                        fonts + metadataBase + site-wide JSON-LD
src/app/og/placedon.png/route.tsx        share card (font alignment still pending)
src/app/page.tsx                          thin wrapper → AstraHome
src/app/robots.ts  src/app/sitemap.ts    publication-gated
src/app/workspace/[[...view]]/page.tsx   validates 10 view ids, renders AstraWorkspace
src/components/astra-chrome.tsx          AstraHeader + AstraFooter (74 lines)
src/components/astra-home.tsx            homepage (194 lines)
src/components/astra-workspace.tsx       workspace shell + forms + result rendering (408)
src/components/brand.tsx                 wordmark / marks
src/components/consent.tsx               native cookie-preferences dialog
src/components/legal-document.tsx        legal-text renderer
src/components/legal-page.tsx            policy layout
src/components/request-form.tsx          reusable intake form
src/lib/engine.ts                        6-route contract + Zod + Mock/Http (396 lines)
src/lib/api.ts                           re-export of engine.ts
src/lib/intake.ts  src/lib/legal.ts  src/lib/site.ts  src/lib/tokens.ts
src/lib/placedon-content/content/{shared,system,types,waitlist}.ts
src/lib/placedon-content/legal/{privacy-policy,terms,cookie-consent}.md
src/lib/placedon-content/seo/{metadata,structured-data}.ts
```

Everything listed is reachable from a route. The dead first-generation layer that `codex 1.2.md` warned about was **already deleted on `main`** by `e10a393` and `af0edf8`.

### 3.3 :3300 (TARGET) current state

```
src/app/page.tsx        940 lines — the ENTIRE site. "use client", framer-motion,
                        inline icon set, inline nav + footer, imports ./dashboard.css
src/app/dashboard.css   1,221 lines — the live stylesheet for that page
src/app/layout.tsx      Fraunces/Inter/IBM Plex Mono; NO metadataBase, NO JSON-LD
src/components/…        brand.tsx, consent.tsx, legal-document.tsx are reachable;
                        evidence-card, footer, json-ld, legal-page, navigation,
                        request-form, sections are ORPHANS (nothing imports them)
src/lib/api.ts          old 3-route client (/v1/company/{cin}/standing)
src/lib/placedon-content/content/  about, faq, home, how-it-works, pricing,
                        product, security, shared, system, types, waitlist
```

**Orphan audit, :3300** (grep of the whole `src` import graph):

| Component | Imported by |
| --- | --- |
| `evidence-card.tsx` | NOBODY |
| `footer.tsx` | NOBODY |
| `json-ld.tsx` | NOBODY |
| `legal-page.tsx` | NOBODY |
| `navigation.tsx` | NOBODY |
| `request-form.tsx` | NOBODY |
| `sections.tsx` | NOBODY |
| `brand.tsx` | only by the orphans + `legal-document.tsx` |
| `consent.tsx` | only by `footer.tsx` (itself an orphan) |

So :3300 today is a **single-page site with a large orphan library attached**, plus an `api/waitlist` endpoint no rendered form points at, plus `/privacy`, `/terms`, `/cookies` **content that has no route to render it**.

### 3.4 What :3300 already has that :3200 lacks

Worth noting before the borrow list, because it runs the other way:

- **A custom icon set.** `:3300 src/app/page.tsx` lines ~14–60 define an `Icon` wrapper plus an `I` map of hand-drawn 24×24 stroke paths (`plug`, `checks`, `pen`, `lock`, …; 34 SVG primitives in the file). Codex's roadmap **Layer 1 lists "Complete a coherent custom icon set" as outstanding** — :3200 has no icon set at all. This is the one asset :3300 should *keep* rather than replace.
- **A richer motion vocabulary** (framer-motion word-stagger headings, `AnimatePresence` tab swaps, cubic-bezier `[0.22, 0.61, 0.36, 1]`, `useReducedMotion` guards). :3200 deliberately reduced this to one 240 ms CSS entrance — `28c7f93` explicitly *removed* the framer-motion wrapper.
- **The live gold accent** `#C9A24B` and the warm cream/ink palette.

---

## 4. What to borrow from :3200 into :3300

Ranked. Each entry: exact :3200 path · why · adaptation required.

### B1 — The 6-route engine client (highest value, lowest risk)
**Path:** `/Users/saiyamupadhyay/Desktop/PLACEDON/Made by Claude 1.1 version frontend/src/lib/engine.ts` (396 lines)

**Why.** :3300's `src/lib/api.ts` still implements the *obsolete* three-route contract including `GET /v1/company/{cin}/standing` and lowercase classes `verified_fact | deterministic_conclusion | predictive_signal`. `codex 1.2.md` states flatly: *"There is no `/v1/ask` or `/v1/company/{cin}/standing`."* Keeping the old client in :3300 means building UI against an endpoint that does not exist.

`engine.ts` is the single most reusable artefact in the repo: Zod schemas for every documented response; the exact uppercase enums; a refinement that enforces *"A verified fact requires a verifier"* (`eventSchema.refine`); a refinement enforcing *"financial_year is required for money fields"*; `HttpProvider` that rejects non-HTTPS/credentialed origins; and — critically — **distinct error taxonomies**: 503 "could not be reached", 502 "unreadable response", 502 "did not match its contract. No determination is displayed." That directly satisfies the truth rule *"Keep network error, empty preview, legal abstention and 'does not apply' distinct."*

Also carries `indianDate()` (en-IN, UTC, "1 December 2025") and `rupees()` (en-IN INR grouping) — the two formatters the copy rules mandate.

**Adaptation.** Drop-in. Then replace `:3300/src/lib/api.ts` with the same re-export stub `:3200` uses, or delete it. Verify `zod` is in `:3300/package.json` (both projects share an identical `package-lock.json`, so it should be). Keep `engine = new MockProvider()` — *"Do not change the client to send private tokens to a browser."*

### B2 — The workspace/product-app pattern (route + shell + result rendering)
**Paths:**
- `/Users/saiyamupadhyay/Desktop/PLACEDON/Made by Claude 1.1 version frontend/src/app/workspace/[[...view]]/page.tsx`
- `/Users/saiyamupadhyay/Desktop/PLACEDON/Made by Claude 1.1 version frontend/src/components/astra-workspace.tsx` (408 lines)

**Why.** :3300 has **no product surface at all**. This gives you, free: an optional-catch-all route that whitelists the ten locked view ids and `notFound()`s everything else; a sidebar with `aria-current="page"`; a shared three-field company-facts form that grows a fourth field per view; and — the part that is genuinely hard to re-derive — **honest result rendering**. Specifically:

- The five-state label map with its non-colour glyph prefixes (`✓ / ! / ◌ / − / ?`), satisfying AGENTS.md's *"no colour-only status"*.
- `data-unknown` on `.astra-status`, which renders uncertainty as a **dashed** border — the visual separation the brief demands between *"a real negative result"* and *"uncertainty."*
- The empty-result block that reads *"No legal determination available … an empty result does not mean the company has no obligations"* plus a **"What would settle this"** line. This is the exact anti-pattern guard the brief spends paragraphs on, already written.
- Dedicated `Provenance` / `What this is` / `What this is not` / `What could not be verified` / `Law currency watch` sections.
- Both event dates rendered (`Effective:` from `at`, `Learned:` from `known_at`) with `SIGNAL` flagged via `data-unknown`.

**Adaptation.** It is `"use client"` and imports `AstraHeader`/`AstraFooter`; you will re-point those at :3300's chrome. Restyle `.astra-*` class names to :3300's system — but **keep the DOM structure, the label map, the `data-unknown` logic and every honesty string verbatim**; those are the reviewed-truth layer, not decoration.

### B3 — The whole SEO/JSON-LD system, already wired
**Paths:**
- `…/src/lib/placedon-content/seo/metadata.ts` (247 lines)
- `…/src/lib/placedon-content/seo/structured-data.ts` (117 lines)
- `…/src/lib/site.ts` (`siteOrigin()` + `pageMetadata()`)
- wiring reference: `…/src/app/layout.tsx` lines 34–44 and 63–72

**Why.** :3300 has the *files* but they are **half-dead**: `site.ts` exists and exports `pageMetadata`, yet `grep` shows nothing in :3300 calls it — only `siteOrigin` is used, by `robots.ts`, `sitemap.ts` and the orphan `json-ld.tsx`. So :3300 ships no canonical URLs, no OpenGraph, no Twitter card, no JSON-LD and no `metadataBase`. :3200's `88107b0` did exactly this activation work and it is directly transplantable.

The :3200 version adds route metadata for `/problem`, `/sentinel`, `/evidence`, `/early-access`, `/workspace`, sets `indexable:false` on the non-live `/how-it-works`, `/security`, `/faq`, and canonicals `/waitlist` → `/early-access`. It keeps `canonicalOrigin()` throwing on non-HTTPS/credentialed/pathed origins, and `buildRobots()` returning `disallow: "/"` until `SITE_PUBLICATION_READY === "true"` — the publication gate stays intact.

Note `structured-data.ts` on :3200 is the **trimmed** version (`af0edf8` removed the unused `FAQPage` builder); :3300 still has the larger untrimmed one with a `content/faq` import. Borrow :3200's.

**Adaptation.** `routeMetadata` is keyed by `SiteRoute`, and `content/types.ts` differs between the two (:3200 added `/waitlist`, `/problem`, `/sentinel`, `/evidence`, `/early-access`, `/workspace`). Take :3200's `types.ts` union **and** its `metadata.ts` together, then prune to :3300's actual route list — an unreachable route in `routeMetadata` is how you end up with *"old generated sitemap entries or internal links pointing at missing pages"*, which Layer 5 forbids. Also take :3200's `sitemap.ts`, which delegates to `buildSitemapEntries` instead of :3300's hand-written path array.

### B4 — Marketing routing + copy for five pages
**Path:** `/Users/saiyamupadhyay/Desktop/PLACEDON/Made by Claude 1.1 version frontend/src/app/[slug]/page.tsx` (176 lines)

**Why.** One small file gives :3300 eleven routes. It is three routers in one: legal slugs (`privacy`/`terms`/`cookies`) → `<LegalPage kind={…}/>`; intake slugs (`early-access`/`pricing`/`waitlist`) → `<RequestForm initialIntent="pilot" …/>` gated by `intakeConfiguration()`; everything else → the `pages` record. **This is what finally gives :3300's orphaned `legal-page.tsx`, `legal-document.tsx`, `request-form.tsx` and the three `legal/*.md` drafts a way to render**, and what connects the already-present `api/waitlist` endpoint to an actual form.

The embedded prose for `problem` / `sentinel` / `evidence` / `about` / `product` is **reviewed, on-voice, banned-word-free copy** — e.g. *"Code decides. Lawyer verifies."*, *"An absence from that stream is not evidence that nothing happened to a company."* Rewriting this from scratch risks re-introducing claims the truth rules prohibit.

**Adaptation.** Swap `AstraHeader`/`AstraFooter` and the `astra-page` / `astra-prose` / `astra-lead` class names for :3300 equivalents. Keep the copy strings verbatim.

### B5 — Chrome: header, mobile nav, theme toggle, footer
**Path:** `/Users/saiyamupadhyay/Desktop/PLACEDON/Made by Claude 1.1 version frontend/src/components/astra-chrome.tsx` (74 lines)

**Why.** :3300's nav and footer are inline inside the 940-line `page.tsx`, so **no second page can reuse them** — which is a hard blocker on B2 and B4. `astra-chrome.tsx` is the extracted, multi-page-ready version, and it carries a specific bug fix worth inheriting: `28c7f93` replaced naive theme state with

```ts
const light = useSyncExternalStore(subscribeTheme, () =>
  document.documentElement.dataset.theme === "light", () => false);
```

driven by a `MutationObserver` on `data-theme`, *"so the light/dark toggle no longer desyncs when the header remounts on navigation"* — with a server snapshot of `false` matching `layout.tsx`'s `data-theme="dark"`, avoiding the hydration mismatch class of defect the brief warns about twice. It also adds `aria-expanded` / `aria-controls` on the menu button and `aria-pressed` on the toggle.

The footer strings are reviewed truth copy: *"A witness, not a tool."*, *"Indian corporate law. Pre-launch."*, *"A legal reference. Every conclusion requires professional review."*, and it mounts `<ConsentPreferences/>` — which is how :3300's orphaned `consent.tsx` gets back on screen.

**Adaptation.** Extract :3300's inline nav/footer markup and icons into this component's shape rather than importing :3200's visual classes wholesale. **Keep the `useSyncExternalStore` mechanism and the ARIA attributes exactly.** Note the toggle is in-memory only — *"The current appearance toggle is in-memory and does not persist its choice; review cookie-copy alignment before introducing storage."*

### B6 — Motion, print and reduced-motion rules from `astra.css`
**Path:** `/Users/saiyamupadhyay/Desktop/PLACEDON/Made by Claude 1.1 version frontend/src/app/astra.css`, lines **509–550**

**Why.** Three small, portable blocks that are pure policy:

```css
@keyframes astra-enter { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.astra-hero-intro { animation: astra-enter 0.24s ease-out; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; animation: none !important; transition: none !important; }
}
@media print {
  .astra-nav, .astra-sidebar, .astra-footer, .astra-form, .astra-button { display: none !important; }
  .astra-workspace { display: block; }
  .astra-panel { color: black; background: white; padding: 0; }
  details { break-inside: avoid; }
}
```

The print block is the seed of the evidence-pack export (Layer 4) — `astra-workspace.tsx` calls `window.print()` behind a *"Print evidence record"* button, and `break-inside: avoid` keeps each citation intact across pages. The reduced-motion block implements *"final-state rendering"* globally in four lines, which :3300 currently only achieves per-component via `useReducedMotion()`.

Also worth taking from the same file: `.astra-citation` (lines 179–194) — the native `details`/`summary` expandable-citation treatment with a 44px-minimum summary — and `.astra-abstain` (195–208), whose **dashed** `border-top: 1px dashed var(--abstain)` gives abstention a non-colour signature.

**Adaptation.** Rename classes; keep the 240 ms duration and the `@media` bodies. Reconcile against :3300's framer-motion layer — see R4 below.

### Also worth taking (secondary)
- `…/src/app/layout.tsx` lines 34–44 + 63–72 — `metadataBase`, title template, and the site-wide JSON-LD `<script>` using `serializeJsonLd` (which escapes `<`, `>`, `&`, U+2028/9 to protect the script boundary). :3300's layout has none of this.
- `…/src/lib/placedon-content/content/shared.ts` — the CTA now reads `label: "Request early access", href: "/early-access"`; :3300 still says `"Join the waitlist"`, which the locked rules forbid.
- `…/tests/contracts.mjs` (35 assertions) and `…/tests/astra-browser.mjs` (104 assertions) — a ready verification harness; retarget `TEST_ORIGIN` to `http://localhost:3300`.

---

## 5. Conflicts and risks

### R1 — Display typeface: Playfair Display vs Fraunces (**the headline conflict**)

:3200 `src/app/layout.tsx` lines 13–18:
```ts
const fraunces = localFont({
  src: "../../brand-kit/fonts/PlayfairDisplay-Variable.ttf",
  variable: "--font-display", …});
```
The const is still *named* `fraunces` while loading **Playfair** — a rename Codex never finished, and a good way to mislead a future reader.

:3300 `src/app/layout.tsx` loads `Fraunces-Variable.ttf`, and its `globals.css` sets `font-variation-settings: "SOFT" 0, "WONK" 0` on headings — real Fraunces axes. `28c7f93` **stripped those axes on :3200** with the note *"Strip inert Fraunces SOFT/WONK axes from the Playfair headings"* — they were inert because Playfair has no such axes.

Both faces are present in **both** `brand-kit/fonts/`, so this is purely a decision, not a sourcing problem. But note the asymmetry of authority: `AGENTS.md` (present verbatim in both repos) mandates *"Fraunces (display serif)"*; `codex 1.2.md` says *"Display: Playfair Display"* and *"The user's newer approved direction overrides older conflicting gold/font rules."* **`codex 1.2.md`'s override was scoped to the :3200 ASTRA work.** Whether it governs :3300 is a user decision, not one to infer. Flag it and ask.

Practical impact: Playfair is higher-contrast, more Didone; Fraunces is softer and wonkier. `astra.css`'s heading sizes (`clamp(52px, 5.6vw, 84px)`, `letter-spacing: -0.055em`) are tuned to Playfair's metrics. **If :3300 keeps Fraunces, do not copy `astra.css` type scales verbatim** — re-tune letter-spacing, and if you keep Fraunces, restore the `SOFT`/`WONK` settings that `28c7f93` removed.

### R2 — Palette: neutralised vs live gold

| Token | :3200 `astra.css` / `tokens.ts` | :3300 `globals.css` / `tokens.ts` |
| --- | --- | --- |
| `--ink` | `#080808` | `#0C0C0D` |
| `--cream` | `#FAFAFA` | `#F4EFE6` |
| `--grey` | `#595959` | `#6B665F` |
| `--rule` | `#D5D5D5` | `#D8D1C5` |
| `--gold` | **`#171717`** (neutralised; `→ var(--cream)` in dark) | **`#C9A24B`** (live brass) |
| `--gold-muted` | `#404040` | `#9F743B` |
| `--abstain` | `#6A6A6A` (neutral) | `#5B6472` (cool grey) |
| `--paper` | `#F0F0F0` | `#EDE7DC` |
| dark surface | `#151515` | `#191918` |

:3200 is **cool pure monochrome**; :3300 is **warm cream + brass**. The locked rule is unambiguous:

> "Existing `gold` token names now resolve to neutral values for compatibility; **do not infer permission to add a coloured accent.**"
> "**Do not restore brass gold merely because an older AGENTS.md or brand-kit file mentions it.**"

Note that `#C9A24B` is not an "older file mentioning it" — it is **live in :3300's running CSS**. So the conflict is real and bidirectional. Two failure modes to avoid:

1. **Copying `astra.css` into :3300 wholesale** silently kills the gold accent, because `astra.css` redefines `--gold: #171717` at `:root` and `--gold: var(--cream)` at `:root[data-theme="dark"]`, overriding `globals.css`'s `#C9A24B` by load order (`layout.tsx` imports `globals.css` *then* `astra.css`).
2. **Copying a :3200 component into :3300 unchanged** flips it from neutral to brass, because the component references `var(--gold)` and :3300 resolves that token to live gold. A component Codex designed as monochrome would silently gain an accent — and AGENTS.md caps accent at *"≤10% of any screen, ONE accent element per view."*

**Mitigation:** decide the palette **before** any component transplant, and port `src/lib/tokens.ts` and the CSS `:root` block as one atomic decision. `tokens.ts` feeds the server-rendered `og/placedon.png` and `icon.svg` routes, so a mismatch between CSS and `tokens.ts` produces share cards that do not match the site.

Separately: `--abstain` must survive whatever happens. AGENTS.md reserves it *"only for the 'abstained / unknown' state — never decorative"*, and `.astra-abstain` / `.astra-status[data-unknown]` both depend on it.

### R3 — Backend contract: :3300's `AGENTS.md` and `api.ts` are both stale

:3300's `AGENTS.md` still documents:
> "`/v1/compliance-pack`, `/v1/company/{cin}/standing`, `/v1/company/{cin}/events`; output classes `verified_fact | deterministic_conclusion | predictive_signal` + `abstained`"

Every part of that is superseded. `codex 1.2.md`: *"Removed the old `/standing` method"*, *"There is no `/v1/ask` or `/v1/company/{cin}/standing`"*, and the enums are **uppercase** `VERIFIED_FACT | DETERMINISTIC_CONSEQUENCE | SIGNAL`. `:3300/src/lib/api.ts` implements the stale shape.

**Risk:** an agent working in :3300 reads `AGENTS.md` (which `CLAUDE.md` `@`-includes, so it loads every turn) and builds against endpoints that do not exist. This is the most likely way to waste a whole layer of work.

**Mitigation:** land B1 and update :3300's `AGENTS.md` contract paragraph in the **same** change. Same for the CTA line — :3300's `AGENTS.md` still says *"Primary CTAs: 'Request a pilot' / 'Join the waitlist'"* against the locked *"Do not restore 'Join the waitlist'."*

### R4 — Motion philosophy collision

:3300 runs framer-motion with word-stagger headings, `AnimatePresence` tab swaps, a 5 s infinite `repeat` loop (`page.tsx` ~line 134) and 0.5–0.55 s eases. The locked rule:

> "at most one hero entrance, approximately **250 ms or less** for interface transitions, no bouncing or gratuitous animation, and final-state rendering for reduced motion"

:3300's 0.5 s / 0.55 s transitions are ~2× the ceiling, and `repeat: Infinity` is squarely in *"gratuitous animation"* territory. Meanwhile `28c7f93` **removed** framer-motion from :3200's home entirely (*"drop the no-op framer-motion wrapper"*), so borrowing :3200 components brings no motion with them — they will simply sit still inside :3300's animated page and look inconsistent.

**Mitigation:** pick one motion budget for the merged site before transplanting. If :3300's richer motion is the direction, say so explicitly as a new approved decision rather than letting it survive by inertia — and at minimum kill the infinite loop and pull interface transitions to ≤250 ms.

### R5 — Which layer is LIVE (so you borrow from the right one)

Codex's habit of leaving dead layers beside live ones is real, but **on :3200 it has already been cleaned**. Current truth:

| :3200 module | Status |
| --- | --- |
| `astra.css` | **LIVE** — the design layer |
| `globals.css` | **LIVE** — all 109 declared classes are referenced from `src`; no dead ranges remain |
| `dashboard.css` | **DELETED** (`e10a393`) |
| `navigation/sections/footer/evidence-card/json-ld.tsx` | **DELETED** (`e10a393`) |
| `content/{home,how-it-works,security,product,pricing,about,faq}.ts` | **DELETED** (`af0edf8`) |
| `content/{shared,system,types,waitlist}.ts` | **LIVE** |
| `seo/metadata.ts`, `seo/structured-data.ts` | **LIVE and wired** (`88107b0`) — `structured-data.ts` trimmed to 3 entities |
| `src/lib/api.ts` | **LIVE but a stub** — re-exports `engine.ts` |
| `tests/browser.mjs` | **DEAD** — *"Legacy earlier-site browser suite; not current acceptance"* |
| `tests/astra-browser.mjs` | **LIVE** — the 104-assertion suite |

⚠️ **The inversion that matters:** every file in the DELETED rows is **still live or orphaned in :3300**. :3300's `page.tsx` genuinely imports `dashboard.css`; its `navigation.tsx` / `footer.tsx` / `sections.tsx` / `evidence-card.tsx` / `json-ld.tsx` / `legal-page.tsx` / `request-form.tsx` are orphans that `e10a393`'s reasoning would also condemn — *except* `legal-page.tsx` and `request-form.tsx`, which B4 **revives**. Do not run a blind "delete what :3200 deleted" sweep: check B4 first, then delete the remainder.

Concretely, the four :3300 orphans with no future under this plan are `evidence-card.tsx`, `sections.tsx`, `json-ld.tsx` (superseded by the `layout.tsx` inline JSON-LD in B3) and `navigation.tsx`/`footer.tsx` (superseded by B5).

### R6 — Smaller traps
- **Build command.** *"`npm run build` uses the default Turbopack path. That sandboxed build stalled … the successful build was webpack."* Use `npx next build --webpack` in :3300 too.
- **Dev-server lock.** *"Another port alone did not avoid Next.js's same-project dev lock. Do not kill the user's existing process casually."* :3200 on 3100/3200 and :3300 are separate directories so the lock should not bite — but check for a running process before starting one.
- **`og/placedon.png` font alignment** is listed as still pending on :3200; do not borrow it as finished.
- **`content/types.ts` `SiteRoute` union differs** between the projects. Porting `metadata.ts` without `types.ts` will not typecheck.
- **`--font-display` is shared** by `globals.css` and `astra.css`; if both are imported in :3300, `astra.css` wins on any token it redefines. Import order in `layout.tsx` is `globals.css` then `astra.css`.
- **`tabular-nums`.** `28c7f93` added `font-variant-numeric: tabular-nums` to mono citations and form fields on :3200; the corresponding line is **absent** from :3300's `globals.css` (it sits in `astra.css` instead). Carry it over — the locked rule says mono is used *"with tabular numerals."*

---

## 6. Suggested order of work (for the later :3300 session)

0. **Decide the two open design questions first** — Playfair vs Fraunces (R1), neutral vs brass gold (R2). Everything downstream depends on them, and both are user decisions, not inferences.
1. **B1** `engine.ts` + retire `api.ts` + correct :3300's `AGENTS.md` contract paragraph and CTA line (R3). Self-contained, no visual impact.
2. **B5** extract :3300's inline nav/footer into a chrome component using `astra-chrome.tsx`'s structure and `useSyncExternalStore` theme mechanism.
3. **B4** add `[slug]/page.tsx` — revives `legal-page`, `legal-document`, `request-form`, the three legal drafts and the `api/waitlist` endpoint.
4. **B3** activate `pageMetadata()` across every route, add `metadataBase` + JSON-LD to `layout.tsx`, swap `sitemap.ts` for the `buildSitemapEntries` version.
5. **B2** add `/workspace/[[...view]]` and the workspace shell — the largest piece; keep every honesty string verbatim.
6. **B6** motion / print / reduced-motion rules, reconciled with the R4 decision.
7. Delete the remaining :3300 orphans (`evidence-card`, `sections`, `json-ld`, and `navigation`/`footer` once B5 lands).
8. Re-run `npm run lint`, `npx tsc --noEmit`, `node tests/contracts.mjs`, `npx next build --webpack`, and the browser suite at `TEST_ORIGIN=http://localhost:3300`. Report actual counts, not inherited ones.

---

*End of dossier. No file in either project was modified.*
