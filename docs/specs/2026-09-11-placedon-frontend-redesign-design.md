# Placedon :3300 — Frontend Redesign Design Spec
**Date:** 2026-09-11 · **Status:** awaiting owner approval · **Target:** `Claude Legal prototype (recovered)` @ localhost:3300

Grounded in five investigations (dossiers in scratchpad `analysis/`):
`3300-codebase-dossier.md` · `codex12-claude13-integration-dossier.md` ·
`backend-architecture-dossier.md` · `design-research-dossier.md` · `visual-audit-3300.md`

---

## 1. What we actually found (the four facts that drive every decision)

**F1 — The site is one page with a large orphan library attached.**
`src/app/page.tsx` (940 lines, `"use client"`) + `layout.tsx` is the entire website. `grep -rn "@/components" src/`
returns nothing: all ten components (1,059 lines) are a closed island that never mounts. `/privacy`, `/terms`,
`/cookies` and 11 SEO-declared routes all 404. ~1,150 of `globals.css`'s 1,584 lines style unmounted components.
Tailwind v4 is imported with **zero** utility classes used. The *best* engineering — typed content layer, SEO
metadata/JSON-LD, legal pages, and `evidence-card.tsx:85-118`'s complete APG roving-tabindex tabs — is all dead,
while the live page hard-codes worse copy.

**F2 — The API client is fiction, and it disguises failure as virtue.**
`src/lib/api.ts` has zero field overlap with the real contract and calls `/v1/company/{cin}/standing`, which
**does not exist**. Worse: `catch { return abstention }` renders network/DNS/500 failures as "Placedon abstains."
For a product sold on *"it abstains when it cannot verify,"* this is an integrity defect, not a bug.

**F3 — Two typography defects, one motion defect — the typeface is innocent.**
`WONK` is zeroed on `h1,h2` **only** while Fraunces' default is 1, so the wordmark, `h3`, feature titles and doc
headings render wonky alternates ON beside a headline with them OFF. `opsz` is never set (default 9 — the caption
cut — stretched to 88px). Three display weights (400/440/700) and two tracking values compete. Separately,
`Reveal` (`page.tsx:266-295`) fades `opacity 0→1` over 550ms: **2.46:1 at α 0.30 when AA needs α 0.48 — ~265ms of
every reveal is illegible.**

**F4 — Harvey already owns the intended aesthetic.**
Harvey pairs TWK Ghost (high-contrast display serif) with ABC Diatype over warm near-black/off-white monochrome.
Placedon cannot differentiate on palette or typography adjectives. It must differentiate on **evidence display
and motion**, which the category leaves unspent. Harvey, Legora and Spellbook use **no glass at all**.

---

## 2. Design thesis

> **The record is opaque. The reading is translucent.**

Statute text, filed documents and gazette extracts are opaque, permanent, ink-on-cream. Everything Placedon
*derives* — an extraction, a confidence band, a cross-reference, an abstention — sits on **glass**, because it is
a layer *over* the record, not the record itself. Translucency is the visual grammar of derivation.

Consequences (these are rules, not suggestions):
- Glass carries **chrome and evidence overlays**: citation chip, provenance card, sticky rail, abstain panel, command bar.
- Glass **never** carries statute text, long-form body copy, or a decorative section background.
- **If nothing meaningful sits beneath it, the surface must be opaque.** Glass over a flat void is the clearest
  tell of vibe-coded glassmorphism.

This is the differentiator: a glass system with a *semantic* rule, in a category that uses none.

**Anchor artefact:** the existing **Compliance Note** card (cream paper, Fraunces title, mono
`Note No. PL-2026-014 · Companies Act, 2013`, numbered clauses, inline `s.96(1)`). It is the strongest thing on
the site and the clearest expression of "a witness, not a tool." The redesign is built *around* it, not over it.

---

## 3. Design system

### 3.1 Typography (faces locked: Fraunces · Inter · IBM Plex Mono)
- `WONK: 0` and `SOFT: 0` set **globally**, not per-element — kills the mixed-personality defect.
- Explicit four-axis `font-variation-settings` per size tier, with **`opsz` matched to the rendered size**
  (display 72–96px → opsz ~96; section 32–48px → opsz ~40; body → opsz 14).
- One display weight ramp and one tracking ramp, single-sourced. Tracking loosened from `-0.03em`;
  `line-height` raised from 1.04 on multi-line display.
- `font-variant-numeric: tabular-nums` on all figures, dates and counts.
- Measure capped at 62–72ch for body copy.

### 3.2 Glass tiers (only three; no ad-hoc values)
| Tier | Use | Blur | Ink tint α | Radius |
|---|---|---|---|---|
| `glass-1` chip | citation chip, confidence band, statute pill | 8–12px | 0.55 | 6px |
| `glass-2` panel | provenance card, abstain panel, filter rail | 20–28px | 0.70 | 10px |
| `glass-3` chrome | sticky header, command bar, modal surround | 32–40px | 0.78 | 0/12px |

Binding rules: text-bearing glass uses **ink tint ≥ α 0.62** (house default 0.70 → ~6.4:1);
`backdrop-filter: blur(N) brightness(0.55)` as a deterministic luminance clamp — **never** the copy-pasted
`saturate(180%)`; interactive glass needs a **≥3:1** boundary (WCAG 1.4.11 — a 10% cream hairline is ~1.3:1 and
illegal); **≤3 backdrop-filter surfaces per viewport, max 2 stacked planes**; never animate blur radius;
never fade a glass panel by animating its own opacity (**backdrop-root trap**). Ship a *designed* opaque
fallback via `@supports`, plus `prefers-reduced-transparency` and `prefers-contrast` branches.
Abstain panel is the one **cool-grey `#5B6472`** surface — a temperature shift read before any word.
Cool grey is a surface/border token, never a text token.

### 3.3 Motion
- **Text never rests at `opacity: 0`.** Reveals use `clip-path` (unpainted or full contrast) or an
  **opacity floor of 0.55**. This is the fix for the 265ms-illegible defect and is non-negotiable.
- One easing curve, three durations; everything ≤250ms except **one** orchestrated hero moment.
- `prefers-reduced-motion` renders the final state immediately.
- The single hero moment **replaces the bright white video panel**, which currently causes dark→white→dark whiplash.

### 3.4 Colour
Single-sourced from `src/lib/tokens.ts`. ink `#0C0C0D` · cream `#F4EFE6` · warm grey ramp (chroma reduced at the
ink end to avoid a brown shift) · brass `#C9A24B` ≤10% per screen, one accent element per view ·
`#9F743B` citations only · `#5B6472` abstention only. **Guard:** never import `:3200`'s `astra.css`, which
redefines `--gold: #171717` at `:root` and would silently kill the brass.

---

## 4. Architecture

```
src/lib/engine/
  types.ts    zod schemas generated from the real contract
  errors.ts   EngineResult<T> — transport_error is structurally distinct from abstention
  provider.ts import "server-only"  ← the boundary
  mock.ts     fixtures generated from checker.api.handle()
  http.ts     import "server-only"
```

- **`EngineResult<T>` instead of throws.** Abstention lives *inside* `data`; transport failure is a sibling
  variant. This permanently fixes F2 — an error can never again render as an abstention.
- **`getEngine()` reads `PLACEDON_API_ORIGIN` inside the function**, unprefixed env vars. Going live is one
  `.env.local` line, zero code change.
- **Server Components for render-time reads; same-origin route handlers for interaction.** The engine is plain
  HTTP on `127.0.0.1:8020`, unauthenticated, no CORS — client-side fetch fails by construction, and a
  `"use client"` import of `HttpProvider(origin, token)` would inline the token into the public bundle forever.
  `src/lib/intake.ts` already implements this pattern correctly — copy it.

**The six verified routes** (read from `checker/api.py` @ `f2ebcb3`):
`GET /v1/health` · `POST /v1/compliance-pack` · `POST /v1/document-check` ·
`GET /v1/company/{cin}/events` · `GET /v1/company/{cin}/events/{event_id}` ·
`GET /v1/instruments/{fragment}/affected`

Known drifts to honour: `/compliance-pack` carries **no** `no_model` (5 of 6 routes do); doc-check
`cannot_verify[]` has **two** shapes; `/events` **is not per-company** — `cin` is echoed, never used to filter,
so no UI may promise "this company's events."

### 4.1 State → UI mapping
`verified_fact` · `deterministic_conclusion` · `predictive_signal` · `abstained` — each with an icon **and** a
text label (never colour-only), plus skeletons (never full-page spinners), designed empty states, and a
**visibly distinct transport-error state**.

---

## 5. Copy
Dual-register: a plain-language line a non-lawyer understands, with the precise statutory formulation beside it
(mono citation + operative date). Purge the banned word **"Solutions"** (used 5× live), remove the present-tense
claim of live MCA21 integration, and add pre-launch framing. Adopt a one-line data covenant naming
**ISO 42001 and DPDP Act 2023** (India-specific — not another SOC 2 lockup).
Never claim accuracy rates: Stanford RegLab's *Hallucination-Free?* (arXiv:2405.20362) measured 17–33%
hallucination in legal AI and demolishes exactly those claims.

---

## 6. Build plan

| # | Layer | Content |
|---|---|---|
| 0 | **Truth** | Fix `AGENTS.md` (`/standing`, banned CTA); single-source palette; git baseline |
| 1 | **Engine** | `src/lib/engine/*`, `EngineResult<T>`, kill the abstention-disguise bug, retire `api.ts` |
| 2 | **Type system** | global `WONK`/`SOFT` 0, per-tier `opsz`, one weight/tracking ramp, tabular-nums |
| 3 | **Motion system** | clip-path reveals, opacity floor, one easing/three durations, reduced-motion |
| 4 | **Glass system** | three tiers + tokens + `@supports`/reduced-transparency/contrast fallbacks |
| 5 | **Recover dead layer** | wire content + SEO/JSON-LD, build `/privacy` `/terms` `/cookies`, restore APG tabs, delete ~1,400 dead CSS lines |
| 6 | **Hero + features** | replace white video block with the one orchestrated moment; animated feature explainers |
| 7 | **Product surfaces** | compliance pack · events · document check · instrument-affected on Mock |
| 8 | **Verify** | a11y AA, reduced-motion, 360px, lint/tsc/`next build`, screenshots both themes |

Verification per layer: `npm run lint` · `tsc --noEmit` · `node tests/contracts.mjs` · `npx next build` ·
browser check at :3300. Commit per layer. Never force-push.

---

## 7. Open decision for the owner
**Scope:** single landing page, or restore the full multi-page site?
Recommendation: **multi-page.** `/privacy` must exist (you asked for animation there), `/terms` and `/cookies`
are table stakes for a legal product, the SEO layer already declares 11 routes, and `:3200`'s
`app/[slug]/page.tsx` (176 lines) adds 11 routes and revives four orphans. The content is already written.

---

## 8. Explicitly out of scope
No deployment, no public launch, no opening intake. No modification of the `:3200` Codex/Astra project.
No invented statutory figures — abstain instead.
