# Visual audit — live :3300 (done by the lead session, not a sub-agent)

Method: Chrome automation against `http://localhost:3300`, rendered-state screenshots,
plus `curl` route probing. Complements Agent A's static code audit.

## A. THE SITE IS ONE PAGE

Routes that exist on disk:
```
src/app/page.tsx              <- the ONLY page
src/app/api/waitlist/route.ts
src/app/icon.svg/route.ts
src/app/og/placedon.png/route.tsx
```
Live HTTP probe: `/` = **200**. Every one of these = **404**:
`/privacy /terms /cookies /product /pricing /about /faq /security
/how-it-works /waitlist /contact /evidence /resources /solutions`

**Implications**
1. **`/privacy` does not exist.** The user explicitly asked to "add animation over the privacy
   policy" — the page must first be BUILT. Content exists (`src/lib/placedon-content/legal/privacy-policy.md`)
   and so do `legal-page.tsx` + `legal-document.tsx`, but nothing routes to them.
2. `/terms` and `/cookies` also 404 → a public legal product with no reachable terms/privacy is a
   compliance and credibility problem, not just a design gap.
3. The top nav (Product · Solutions · Evidence · Resources) and "Log in"/"Contact" either dead-link
   or are in-page anchors only. Needs confirming per-link (Agent A).
4. A large, good content layer (11 content modules, 3 legal docs, SEO metadata + structured-data,
   10 components) is **dead** — it never reaches the browser. This is the single biggest
   opportunity: much of the "new" site already exists as unwired material.

## B. TYPOGRAPHY VERDICT — THE TYPEFACE IS **NOT** THE PROBLEM

Zoomed inspection of the hero headline shows Fraunces rendering as a **crisp, handsome
high-contrast Didone**. At rest, "How compliance teams use Placedon" is genuinely well-set.
The owner's "the font is not perfect" perception is real but **misattributed**. Actual causes:

1. **Reveal animation strands text at near-zero opacity.** While scrolling, headings and body copy
   sit in a very dark grey on near-black for an extended period — effectively illegible. Captured
   twice: section 01 showed only the word **"Built"** (rest unrevealed); section 02 showed only
   **"How"**. After a 3s settle, both render correctly and look good.
   → The word-by-word `AnimatedH2` reveal + scroll-triggered opacity is the defect.
   → Also an **accessibility failure**: mid-animation contrast is far below AA, and a
     `prefers-reduced-motion` user or a fast scroller may never see the settled state.
2. **Tracking slightly tight** on the large display line.
3. Suspected missing **Fraunces `opsz` optical-size axis** and **`tabular-nums`** on figures/dates
   (Agent A to confirm in code — visually, dates like `2026-03-31` do render in mono, which is good).

**Design consequence:** do NOT swap typefaces (user already locked this). Fix motion timing,
trigger thresholds, opacity floors, and reduced-motion fallbacks. That alone removes most of the
"not perfect" feeling.

## C. WHAT IS GENUINELY GOOD (PRESERVE)

- **The Compliance Note card** — cream "paper" panel on near-black, Fraunces title, mono
  `Note No. PL-2026-014 · Companies Act, 2013`, numbered clauses (1. Obligation, 2. Timing), inline
  mono statute ref `s.96(1)` and mono dates. This is the strongest brand artefact on the site and
  the clearest expression of "a witness, not a tool." Build the redesign AROUND this.
- **Ledger eyebrows** — `01 · THE RECORD`, `02 · IN PRACTICE` in mono with a rule and a lucide
  line-icon. Distinctive, cheap, non-derivative. Keep.
- **Tabbed demo** — AGM timing / Board meetings / Small-company status / Board's report / Registers,
  with PROMPT + CONNECTORS side rail. Good information design; needs a11y work (see Agent A's note
  that the dead `evidence-card.tsx` has better roving-tabindex a11y than the live tabs).
- **404 page** — mono `404 / PAGE NOT FOUND` eyebrow + Fraunces "This page is not available." +
  "Return home". Well made; matches brand.

## D. WHAT HURTS

1. **Tonal whiplash:** immediately under the dark hero sits a **bright white video panel**
   (`public/media/hero.mp4`, the black Placedon bookmark mark, with pause/mute buttons). Dark → white →
   dark is jarring and reads as an unfinished placeholder rather than a designed moment.
2. **Very large empty vertical gaps** between sections — the page feels sparse/unfinished while
   scrolling, especially combined with the low-contrast reveal.
3. The site is **flat and under-animated at rest** but **over-animated in transit** — exactly
   backwards. Motion should assist reading, not withhold it.
4. Hero CTAs (`Request a pilot`, `See the evidence`) appeared low-contrast mid-reveal too.

## E. WHERE GLASS + MOTION BELONG (flagged, not designed)

- Sticky top nav (currently solid) — the most defensible glass surface.
- The PROMPT / CONNECTORS side rail beside the Compliance Note.
- Status/verdict chips (verified / abstained) — glass tint could encode state *with* an icon+label
  so it is never colour-only.
- Replace the white video block with a designed, dark-toned hero moment (the ONE orchestrated
  motion moment permitted by doctrine).
- The privacy/legal pages (once built) — section-by-section reveal as the user requested.

## F. OPEN ITEMS FOR THE LEAD SESSION
- `browser_batch` MCP tool errors in this environment ("Couldn't determine which page this action
  targets") — use individual `computer` calls instead.
- Confirm every nav link target and whether "Log in" goes anywhere.
- Decide scope: single landing page vs. restoring the full multi-page site from the dead content layer.
