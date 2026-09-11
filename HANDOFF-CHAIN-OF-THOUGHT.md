# PLACEDON Frontend — Claude → Claude Handoff & Chain-of-Thought

> **Purpose.** This file lets a *different Claude Code session (on another account/terminal)*
> resume this exact task with zero context loss. Read it top-to-bottom first, then jump to
> **§11 "DO THIS NEXT"**. Nothing here is speculative unless explicitly marked `⚠ UNVERIFIED`.
>
> **Why the handoff:** the previous session hit the **monthly spend limit**, which terminated
> all four analysis sub-agents mid-flight. No work was lost — it just hasn't been *finished*.
> This document reconstructs everything so the new session picks up precisely where we stopped.

---

## 1. The task (what the user asked for)

Redesign + integrate the **Placedon Claude-legal frontend** that runs on **http://localhost:3300**.
Placedon is an **evidence-first legal-intelligence layer for Indian corporate law (Companies Act, 2013)**.
Positioning: **"a witness, not a tool."** Golden rule: **"LLM explains, Code decides, Lawyer verifies."**

The user's brief, distilled:
1. Deeply analyse the **Codex 1.2** handoff file and the **claude 1.3** branch from GitHub (see §3).
2. Redesign the :3300 frontend so it looks **human-crafted and premium** — *not* AI-slop, *not*
   vibe-coded, *not* obviously copied from Claude.com. Reference **Harvey AI, Spellbook, Claude Legal**.
3. Fonts feel "not perfect" → fix them (see decisions §5).
4. Copy must be understandable to the **general public** yet detailed enough for **lawyers**.
5. Add **purposeful motion / text animation**, including on the **features** and **privacy policy** sections.
6. Use **glassmorphism** (user was firm on this — see decision §5).
7. Design a clean **frontend architecture / system design** that integrates fast with the backend.
8. Plan first, question the plan 2–3×, **ask before executing**, then build (sub-agents allowed).

---

## 2. Environment & exact paths (verified this session)

| Thing | Path / value |
|---|---|
| **Machine** | macOS (darwin 25.5.0), zsh. User: `saiyamupadhyay`, home `/Users/saiyamupadhyay` |
| **TARGET app (:3300)** | `/Users/saiyamupadhyay/Desktop/PLACEDON/Claude Legal prototype (recovered)` |
| **BORROW-FROM app (:3200)** | `/Users/saiyamupadhyay/Desktop/PLACEDON/Made by Claude 1.1 version frontend` |
| **Codex handoff file** | `…/Made by Claude 1.1 version frontend/codex 1.2.md` |
| **"claude 1.3"** | a **git branch** (`claude-1.3`) in the :3200 repo — NOT a file |
| **:3200 git remote** | `https://github.com/placedon007-prog/placedon-frontend-astra.git` (PRIVATE) |
| **Knowledge repo** | `https://github.com/placedon007-prog/Placedon-law-business-plan` |
| **Backend repo** | `https://github.com/bubblebee1408/placedon-law-backend` |
| **Backend contract doc** | `…/Claude Legal prototype (recovered)/docs/RAG-INTEGRATION.md` ⚠ confirm |
| **Scratchpad (this session)** | `/private/tmp/claude-501/-Users-saiyamupadhyay/4b876e4c-0a12-4c78-8661-c443fd6f29d9/scratchpad` (session-specific — the new session will have a DIFFERENT scratchpad path) |

**Stack of :3300** (from `package.json`): Next.js **16.3.4** (App Router, Turbopack), React **19.2.8**,
TypeScript strict, Tailwind **v4**, framer-motion **13**, animejs **3.2**, @react-spring/web **10**,
lucide-react, @number-flow/react, react-hook-form, zod, sonner. Dev server: `npm run dev` → port **3300**.
**The :3300 folder has NO git repo yet.**

⚠ **Next.js 16 is NOT the Next you know** — its `AGENTS.md` warns of breaking API/convention changes.
Read `node_modules/next/dist/docs/` before writing Next-specific code.

---

## 3. Both servers were live

At handoff: `node` listening on **:3300** (target) and **:3200** (Codex/Astra). Restart with `npm run dev`
in each folder if they're down. Do NOT assume ports from memory — memory had them as 3100/3200; the
**current truth is 3200 = Codex/Astra, 3300 = Claude-legal target.**

---

## 4. STRICT RULES (from user memory — do not violate)

- **Do NOT modify the :3200 "Made by Claude 1.1" / Codex-Astra work.** It is the borrow-from *source*
  only. Read from it; never overwrite it. Its Codex checkpoint is committed + pushed (`89012ba`).
- Preserve Placedon's **near-monochrome editorial brand**: ink `#0C0C0D`, cream `#F4EFE6`, warm grey
  scale, ONE accent **Brass Gold `#C9A24B` (≤10% per screen, one accent element per view)**,
  `--gold-muted #9F743B` for citations only, cool grey `#5B6472` **only** for the abstain/unknown state.
- **Banned marketing words** (any = failure): streamline, empower, solution, easy, smart, seamless,
  revolutionary, unlock, supercharge, effortless, game-changer, cutting-edge.
- **No overclaiming / no invented figures.** Pre-launch: no live-corpus/customer/accuracy claims, no
  fabricated metrics or logo walls. If a statutory figure/section/date isn't verified → show the
  **abstain state**, never guess. Legal copy is "template for counsel review, not legal advice."
- Every legal claim carries an inline **citation + jurisdiction + as-of date** (mono for statute refs).
- a11y **AA**: visible focus, keyboard nav, 44px targets, no colour-only status, respect
  `prefers-reduced-motion` (render final state).
- User prefers **numbered step lists**, not prose blocks, when reporting plans/status.
- **Ask the user before executing** the build. Plan → approve → build.

---

## 5. LOCKED DECISIONS (user answered these this session — treat as settled)

The user was asked 4 forking questions and answered:

1. **Glassmorphism = "Glass as a signature layer."** Make glassmorphism a *defining, visible* visual
   system across many surfaces — but execute with real craft so it reads as intentional, premium, and
   stays AA-accessible over the monochrome base. (This deliberately overrides the old "glass-everywhere
   is forbidden" rule in `AGENTS.md` — the user consciously chose to lean in. Keep it tasteful.)
2. **Fonts = "Keep + perfect the current trio."** Keep **Fraunces** (display) + **Inter** (body) +
   **IBM Plex Mono** (statute refs). Do NOT swap typefaces. Fix the *craft*: optical-size axis, weights,
   type scale, leading, measure, letter-spacing, tabular-nums for figures/dates, and the reveal animation.
   (Fonts are self-hosted in `brand-kit/fonts/` via `next/font/local`.)
3. **Motion = "Purposeful & richer."** More alive than today — scroll reveals, ONE orchestrated hero
   moment, tasteful text reveals, animated feature + privacy explainers — but still editorial and
   **reduced-motion safe**. Not motion-forward slop.
4. **Execution = "Plan → approve → autonomous."** Finish deep analysis → write a full plan/spec for the
   user's approval → then build autonomously (sub-agents where useful) and resume the `/loop`.

---

## 6. What was DONE this session (chain of thought)

1. Invoked skills in order: `loop` (parsed to **dynamic/self-paced** mode) → `superpowers:brainstorming`
   (HARD-GATE: no code until a design is approved) → `superpowers:dispatching-parallel-agents`.
2. Read user memory: `placedon-dashboard-setup`, `placedon-codex-checkpoint`, `placedon-brand-rules`,
   `break-tasks-numbered`. (These live in the user's auto-memory dir; the new session gets them via its
   own MEMORY.md context.)
3. Located everything on disk (§2) and confirmed both servers live (§3).
4. Read `:3300` `layout.tsx`, `tokens.ts`, `AGENTS.md`, `CLAUDE.md` and the full `src/` file tree.
5. Surfaced 3 doctrine contradictions to the user (glass / motion / fonts) and got the §5 decisions.
6. Launched 4 read-only analysis sub-agents (prompts preserved verbatim in §9). **All 4 died on the
   monthly spend limit before writing their dossiers.** `scratchpad/analysis/` is EMPTY.
7. Did a partial **visual audit** of :3300 myself (findings in §7).

---

## 7. Visual audit findings (:3300 home, observed directly)

- **Hero**: `PLACEDON LEGAL SOLUTIONS` (mono eyebrow) → headline *"Compliance you can put in front of a
  judge."* in Fraunces → subhead → two buttons `Request a pilot` / `See the evidence`. There is a
  breadcrumb bar `Solutions / Placedon legal solutions` + an `Explore here ▾` on the right. Top nav:
  Placedon logo, Product · Solutions · Evidence · Resources, Log in · Contact · Request a pilot.
- **Font "not perfect" diagnosis (visual):** Zoomed in, Fraunces glyphs are actually *handsome* (a
  crisp high-contrast Didone). The problem is NOT the typeface — it's (a) the **hero reveal animation
  renders the headline as low-contrast dark-grey-on-near-black mid-animation** (looks broken/low-effort
  for the first moment), (b) **tracking is slightly tight** on the display line, and (c) likely missing
  **optical-size (`opsz`) axis + tabular-nums** (confirm in code). Fix craft, keep the face.
- **Tonal jump:** directly under the dark hero, a **bright white video panel** (`public/media/hero.mp4`,
  the black Placedon bookmark mark, with pause/mute controls) drops in — a jarring dark→white→dark jump.
- **Ledger sections** use mono eyebrows like `01 · THE RECORD` with a lucide line-icon above. Good brand
  signature; keep the numbered-ledger device.
- Overall: the bones are serious and editorial; it does NOT currently read as slop, but it's flat/dark,
  under-animated, and the white video block breaks the tone. Lots of room for the tasteful glass + motion.

---

## 8. Partial sub-agent findings (from their final status lines — ⚠ PARTIAL, verify)

- **Codebase audit agent:** `grep "from \"@/components\""` reportedly returns **nothing** → *no page
  imports any component*; the `src/components/*.tsx` files may be **dead/unused** and the pages inline
  everything. ALSO: the (dead) `evidence-card.tsx` has **full arrow-key roving tabindex + aria-controls**
  — better a11y than the live demo tabs. → **The new session must confirm what actually renders vs. dead
  code, and salvage the good a11y patterns.**
- **Backend/architecture agent:** `docs/RAG-INTEGRATION.md` is (self-described) the **definitive verified
  backend contract**, against repo `placedon-law-backend`, server `checker/api.py` + `scripts/serve_api.py`,
  **Python stdlib, port 8020**. → Start backend analysis from that doc.
- **Integration agent & design-research agent:** died before producing findings. Rerun from scratch.

---

## 9. EXACT sub-agent prompts to RELAUNCH (rerun these read-only agents, in parallel)

> Relaunch as `general-purpose` agents. They are READ-ONLY (write only their dossier to *your* scratchpad
> `…/scratchpad/analysis/`). Replace the scratchpad path below with the NEW session's scratchpad path.
> All four are independent → dispatch in one message for parallelism.

### Agent A — Audit the :3300 codebase → `analysis/3300-codebase-dossier.md`
Analyse (read-only) the Next.js 16 app at `/Users/saiyamupadhyay/Desktop/PLACEDON/Claude Legal prototype
(recovered)`. Read `AGENTS.md` first. **Verify the lead that NO page imports any `@/components` component
(so components may be dead/inlined)** — document exactly what renders vs. what is dead. Map every route
under `src/app/`, the home page section order, CSS architecture (`globals.css`, `dashboard.css`, Tailwind
v4, tokens, `data-theme="dark"` theming). **Font diagnosis** (owner: "font is not perfect"): read
`layout.tsx` `next/font/local` for Fraunces/Inter/IBM Plex Mono + every type-scale/weight/leading/tracking
rule; diagnose concretely (missing Fraunces `opsz` axis, wrong weights, missing tabular-nums on figures/
dates, loose tracking, hero reveal rendering low-contrast mid-animation) with file:line + fixes. Inventory
`src/lib/placedon-content/*` + `api.ts/intake.ts/legal.ts/site.ts/tokens.ts` — is the good content + SEO/
JSON-LD wired in or dead? Honest quality assessment (preserve vs. slop vs. broken), a11y gaps, banned words.
Flag surfaces for tasteful glass + reduced-motion-safe motion. Return a ~400-word exec summary.

### Agent B — Codex 1.2 + claude-1.3 integration → `analysis/codex12-claude13-integration-dossier.md`
Read-only. Read `codex 1.2.md` (in the :3200 folder) IN FULL: what Codex built, what it did NOT build, the
locked design (palette; note Codex used **Playfair Display** as display face — conflicts with our Fraunces
decision), the 6-route backend contract, copy/truth rules, 7-layer roadmap (quote locked constraints
verbatim). In the :3200 repo inspect branch **claude-1.3** *read-only* (`git log --oneline`,
`git diff main...claude-1.3 --stat`, `git show` — NEVER `git checkout`, never push): determine what it
changed vs the Codex baseline. Identify SPECIFIC assets worth borrowing INTO :3300 (components, icon set,
copy, SEO/JSON-LD, workspace/product-app patterns, motion, glass) with :3200 file paths + why. Flag merge
conflicts (Playfair vs Fraunces, palette diffs, Codex's known dead layers). ~400-word exec summary.

### Agent C — Backend + frontend architecture → `analysis/backend-architecture-dossier.md`
Read-only (may clone the public backend repo into scratchpad to verify). Start from `docs/RAG-INTEGRATION.md`
in :3300 (reportedly the verified contract: `placedon-law-backend`, `checker/api.py`, stdlib, port 8020).
Read :3300 `src/lib/api.ts`, `intake.ts`, `legal.ts`, `site.ts`, `tokens.ts`: document the typed API client,
Mock-vs-Http provider pattern, output classes (`verified_fact | deterministic_conclusion |
predictive_signal | abstained`), request/response types. Reconcile the EXACT route list from code/docs
(do NOT invent routes; label anything unverified). Recommend a frontend architecture: the typed data-layer
boundary (fix the risk that a Mock/Http provider imported by a CLIENT component leaks a token → use a
server boundary / route handlers), domain types per route, UI-state → data mapping (verified/deterministic/
predictive/abstained + skeletons + empty + error states), a text/mermaid data-flow diagram for the key
surfaces (compliance pack, company standing/events, document check, instrument-affected), and an
integration checklist so swapping Mock→Http is a config change. ~400-word exec summary.

### Agent D — Legal-tech design research → `analysis/design-research-dossier.md`
Web research, cited (URLs inline). Teardown of **Harvey AI (harvey.ai)**, **Spellbook (spellbook.legal)**,
**Claude legal (claude.com/solutions/legal)** (+ glance at Legora/Robin AI/Ironclad): layout, typography,
colour/contrast, motion, how they signal trust; 2–3 patterns to adapt each + what to AVOID so we don't copy.
**Glassmorphism done right for a serious product** + its **accessibility pitfalls** (WCAG AA contrast over
blur, `backdrop-filter` fallback, performance) with concrete CSS guidance (blur radius, tint opacity,
border/inner-shadow, layering over monochrome). Motion that reads as credible vs gimmicky +
`prefers-reduced-motion`. Typography craft: Fraunces (`opsz`) + Inter + IBM Plex Mono pairing, scale,
measure, leading, tabular-nums. Legal-UX credibility research (citation/provenance display, honest
abstention/uncertainty states). Each section = specific Placedon recommendations + a "would look AI-generated
(avoid)" list. ~450-word exec summary.

---

## 10. Planned workflow AFTER analysis (do not skip the gate)

1. Read all 4 dossiers; write a consolidated **design spec** to
   `docs/superpowers/specs/YYYY-MM-DD-placedon-frontend-redesign-design.md` (brainstorming skill's format).
2. Use `frontend-design` skill for the visual system; pull glassmorphism examples from the installed
   animation/motion skills (`animation-components`, `authoring-motion`, `hyperframes-animation`).
3. **Present the plan to the user and get approval BEFORE building** (brainstorming HARD-GATE + user's
   explicit "ask before executing"). Then `writing-plans` → build.
4. Build order (proposed, refine after dossiers): (0) init git in :3300 + baseline; (1) typography/token
   system fix; (2) glass + motion design system primitives; (3) hero + tonal fix; (4) feature explainers
   w/ animation; (5) product/workspace surfaces on the typed Mock data layer; (6) privacy policy w/ motion;
   (7) SEO/JSON-LD wire-in + a11y audit + reduced-motion + responsive to 360px.
5. Verify each layer: `npm run lint`, `tsc --noEmit`, `node tests/contracts.mjs`, `npx next build`,
   browser check at `http://localhost:3300`, screenshots. Commit per layer.

---

## 11. DO THIS NEXT (new Claude, start here)

1. Read this whole file + the user's memory (dashboard-setup, codex-checkpoint, brand-rules, break-tasks-numbered).
2. Confirm servers: `npm run dev` in the :3300 folder (and :3200 if you need to inspect it live).
3. Re-dispatch **Agents A–D** from §9 in parallel (fix the scratchpad path to your session's). Wait for dossiers.
4. Consolidate → write the design spec → **present plan to user for approval** (§10 gate). Do NOT build first.
5. Honour every §4 strict rule and §5 locked decision. Keep the user's numbered-list reporting style.

---

## 12. Status flags at handoff
- ✅ Analysis targets located; decisions locked; visual audit partly done.
- ⏸ 4 analysis dossiers NOT written (agents died on spend limit) — must rerun (§9).
- ⏸ No design spec yet; no code changes made; :3300 untouched; no git in :3300 yet.
- 🔒 Nothing built — brainstorming HARD-GATE still closed (design not yet approved).
