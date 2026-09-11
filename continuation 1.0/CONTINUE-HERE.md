# Placedon :3300 — Continuation 1.0 (paste this into the new terminal)

> **New Claude session: read this whole file, then read `HANDOFF-CHAIN-OF-THOUGHT.md`
> (repo root) §13 for the full layer-by-layer detail. This file is the short,
> current, paste-ready brief. Everything below is verified true as of commit
> `e84deea`.**

---

## 0. Paste-ready kickoff (what the user will say)

> "Read `continuation 1.0/CONTINUE-HERE.md` and `HANDOFF-CHAIN-OF-THOUGHT.md`, then
> continue the Placedon :3300 frontend build from where it stopped. Next up is
> Layer 5c (unify nav/footer chrome onto the legal pages) then Layers 6–8. Ask
> before any destructive step (deleting dead CSS). Keep the numbered-list style."

---

## 1. What this project is (30-second version)

Redesigning the **Placedon** marketing/product site — an evidence-first legal-
intelligence layer for **Indian corporate law (Companies Act 2013)**. Voice:
*"a witness, not a tool."* Golden rule: *"LLM explains, Code decides, Lawyer
verifies."* Near-monochrome editorial brand + a signature **glass** system +
purposeful, reduced-motion-safe animation. Must NOT look like AI slop and must
NOT look copied from Claude/Anthropic (Harvey already owns the plain warm-serif
look — we differentiate on evidence display + glass + motion).

## 2. Exact locations (verified)

| Thing | Path / value |
|---|---|
| **TARGET app (work here)** | `/Users/saiyamupadhyay/Desktop/PLACEDON/Claude Legal prototype (recovered)` → **port 3300** (`npm run dev`) |
| **BORROW-FROM (never modify)** | `/Users/saiyamupadhyay/Desktop/PLACEDON/Made by Claude 1.1 version frontend` → port 3200 (Codex/Astra) |
| **GitHub repo** | `github.com/placedon007-prog/placedon-claude-legal-3300` branch `main` (private) |
| **Terminal account** | `saiyamupadhyay200@gmail.com` |
| Stack | Next.js 16.3.4 (App Router, Turbopack), React 19, TS strict, Tailwind v4, framer-motion 13, zod v4 |

## 3. Locked decisions (do NOT relitigate)

1. **Glass = signature layer.** Rule: *"the record is opaque, the reading is
   translucent"* — glass carries what Placedon derives (citations, provenance,
   abstention, chrome), never the statute text/body copy, never over a flat void.
2. **Fonts stay Fraunces (display) + Inter (body) + IBM Plex Mono (statutes).**
   Do not swap faces. The craft is already fixed (see §5).
3. **Motion: purposeful, richer, reduced-motion safe.** Text never fades from
   `opacity:0` (illegible mid-fade); reveals lift from a **0.55 opacity floor**
   or use a mask wipe.
4. **Multi-page site** (not single landing page). Execution is **autonomous**,
   but **ask before destructive steps** (deleting dead CSS).
5. **Hero video: keep `hero.mp4`, grade it into the dark palette** — do not delete.

## 4. Hard rules (brand + honesty)

- Palette: ink `#0C0C0D`, cream `#F4EFE6`, warm grey; ONE accent brass `#C9A24B`
  (≤10%/screen, one element/view); `#9F743B` citations only; `#5B6472`
  **abstain state only** (surface/border token, never text on ink).
- **Banned words** (any = failure): streamline, empower, **solution/Solutions**,
  easy, smart, seamless, revolutionary, unlock, supercharge, effortless,
  game-changer, cutting-edge.
- **Never invent a statutory figure/section/date** → show the abstain state.
- **Never claim accuracy rates** (Stanford RegLab arXiv:2405.20362).
- **A transport/network error must NEVER render as an abstention.** (Already
  enforced structurally by the engine — keep it that way.)
- a11y AA: visible focus, keyboard nav, 44px targets, no colour-only status,
  respect `prefers-reduced-motion`, responsive to 360px.
- **Glass discipline:** ink tint ≥0.62 + `brightness(0.55)` clamp (never
  `saturate()`); interactive glass needs a ≥3:1 boundary (WCAG 1.4.11); ≤3
  backdrop-filter surfaces/viewport; never animate blur; never fade a glass
  panel's own opacity (backdrop-root trap).
- **Brave-specific gotcha (the user is on Brave):** Brave disables CSS
  `animation-timeline: view()` by default. Use **IntersectionObserver** for
  scroll reveals (see `src/components/scroll-reveal.tsx`), never scroll-timeline.
- **`:3200` is READ-ONLY.** Do not modify it. Do not force-push. No deploy/public launch.

## 5. DONE so far (Layers 0–5b, all committed + pushed)

| Layer | State |
|---|---|
| 0 Truth | ✅ `AGENTS.md` corrected (removed fake `/standing` & `/ask` routes, banned "Join the waitlist", added the 6 real routes + "error≠abstention" + no-accuracy rules). |
| 1 Engine | ✅ `src/lib/engine/{types,errors,http,server-guard,provider,mock,index}.ts`. `getEngine()` reads `PLACEDON_API_ORIGIN` at call time (unset→Mock). `EngineResult<T>` makes transport-error structurally distinct from abstention. Mock has real Companies-Act fixtures incl. a genuine s.96(1) abstention. tsc+lint clean; 6 fixtures validate; `tests/contracts.mjs` 36 pass. |
| 2 Typography | ✅ **The "font not perfect" root cause.** Fraunces axes (opsz default 9, wght 900, WONK 1) now set coherently: WONK/SOFT 0 + tabular-nums once on `body`; per-tier `--opsz/--track/--lead` tokens; explicit `font-variation-settings` per heading. **Confirmed fixed in-browser by the user.** |
| 3 Motion | ✅ `Reveal` floored at 0.55 opacity + `mode="surface"` (backdrop-root safe); `AnimatedH2` → mask wipe (headings never paint below AA mid-scroll). |
| 4 Glass | ✅ `.glass-1/2/3` + `.glass-abstain` + `.glass-interactive` in globals.css with @supports enhancement + reduced-transparency/contrast fallbacks. Applied to sticky nav `.dnav` and demo Prompt/Connectors rail `.dcard`. |
| 5a Legal routes | ✅ `/privacy` `/terms` `/cookies` built (were 404 → now 200) via `LegalPage`; `src/lib/seo.ts` `pageMetadata()` degrades safely with no origin. |
| 5b Legal reveal | ✅ Scroll reveal on legal pages via **IntersectionObserver** (`src/components/scroll-reveal.tsx`) — **user confirmed working in Brave.** Legal `h2` opsz fixed. |

## 6. TODO — resume here (in order)

1. **Layer 5c — unify chrome.** The legal pages render WITHOUT the homepage's
   dark nav/footer. Extract the nav + footer from `src/app/page.tsx` (currently
   inline in a client component using in-page `#anchor` links) into shared
   components that work across routes (real links: `/`, `/privacy`, etc.), and
   put them on the legal pages + homepage. While doing it, **purge the banned
   word "Solutions"** (live on the homepage nav/breadcrumb/eyebrow ~4×) and fix
   the **present-tense MCA21 overclaim** at `page.tsx:331` ("Placedon reads from
   MCA21 filings…" → future/conditional pre-launch framing).
2. **Layer 5d — restore accessible tabs.** The live demo tabs lack
   `aria-controls`/`tabpanel`/arrow-keys; the (dead) `evidence-card.tsx:85-118`
   has the correct APG roving-tabindex pattern. Port it into the live demo.
3. **Layer 5e — SEO wire-in.** Homepage `page.tsx` is a client component with
   hard-coded metadata; add a server wrapper so it can export
   `generateMetadata()`/emit JSON-LD via `src/lib/seo.ts`. Wire `structured-data.ts`.
4. **Layer 5f — delete dead code (⚠ ASK USER FIRST + verify visually).**
   ~1,150 dead lines in globals.css + ~250 in dashboard.css + 10 unused
   components + retire fictional `src/lib/api.ts` (nothing imports it — verified).
   Do a visual pass before/after; ranges from Agent A are in the dossiers.
5. **Layer 6 — hero + features.** Grade the white `hero.mp4` block into the dark
   palette (keep it). Build animated feature explainers.
6. **Layer 7 — product surfaces.** compliance-pack · events · document-check ·
   instrument-affected on the Mock engine via `getEngine()` in Server
   Components. State→UI map incl. a **visibly distinct transport-error state**.
   Abstain panel uses `.glass-abstain`.
7. **Layer 8 — verify.** a11y AA, reduced-motion, 360px, `npm run lint` +
   `npx tsc --noEmit` + `node tests/contracts.mjs` + `npx next build`, screenshots.

## 7. Verify-per-layer + workflow

- After each layer: `npx tsc --noEmit` · `npx eslint .` · `node tests/contracts.mjs`
  · `curl` the affected routes · commit · `git push origin main`.
- **Browser: the extension will NOT connect from the terminal in this setup.**
  Don't loop on it. Ask the user to paste a screenshot of `localhost:3300`
  (this has worked reliably all along). The user is on **Brave**.
- Keep the user's **numbered-list** reporting style.
- Dossiers with full detail: `docs/specs/` (design spec + 5 analysis dossiers).

## 8. Sanity check on resume
```
cd "/Users/saiyamupadhyay/Desktop/PLACEDON/Claude Legal prototype (recovered)"
git log --oneline -3        # newest should be e84deea (or later)
npm run dev                 # starts :3300
npx tsc --noEmit && npx eslint . && node tests/contracts.mjs   # all should pass
```
