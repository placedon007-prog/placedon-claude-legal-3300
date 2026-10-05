# Placedon :3300 — Current-State Codebase Dossier

**Target:** `/Users/saiyamupadhyay/Desktop/PLACEDON/Claude Legal prototype (recovered)`
**Stack (actual, from `package.json`):** Next.js **16.3.4** (App Router), React **19.2.8**, Tailwind **v4** (`@tailwindcss/postcss`), TypeScript strict, zod 4.5.4.
**Note:** `AGENTS.md:3` still says "Next.js 15 … + shadcn/ui". Both are stale — it is Next 16, and there is **no shadcn/ui** anywhere in the tree (no `components/ui`, no `cn()` util wired in, no `tailwind-merge` usage despite being a dependency).
**Dev port:** 3300 (`package.json` scripts `dev`/`start` both `-p 3300`).

*Status: written progressively. Sections appended as analysis proceeds.*

---

## 0. HEADLINE VERDICT (verified first, as instructed)

### The components directory is 100% DEAD CODE. Confirmed.

```
$ grep -rn "@/components" src/          →  no matches, exit 1
$ grep -rn "\./components\|\.\./components\|components/" src/  →  no matches
$ grep -rn "components\|placedon-content" tests/  →  no matches
```

**Every import statement in `src/app/`** (the only render surface) is:

| File | Imports |
|---|---|
| `src/app/layout.tsx:1-3` | `next` Metadata, `next/font/local`, `./globals.css` |
| `src/app/page.tsx:3-12` | `next/image`, `next/link`, `react`, `framer-motion`, `./dashboard.css` |
| `src/app/not-found.tsx:1-2` | `@/lib/placedon-content/content/system`, `next/link` |
| `src/app/error.tsx` | (none — self-contained) |
| `src/app/robots.ts:1-3` | `@/lib/site`, `@/lib/placedon-content/seo/metadata` |
| `src/app/sitemap.ts:1-3` | `@/lib/site`, `@/lib/placedon-content/seo/metadata` |
| `src/app/icon.svg/route.ts:1` | `@/lib/tokens` |
| `src/app/og/placedon.png/route.tsx:1-4` | `next/og`, `node:fs/promises`, `node:path`, `@/lib/tokens` |
| `src/app/api/waitlist/route.ts` | (see §1) |

Not one of them touches `src/components/`.

The 10 component files import **only each other and `src/lib/`** — a closed, unreachable island of
**1,059 lines** of TSX:

| Component | Lines | Imported by | Status |
|---|---|---|---|
| `src/components/brand.tsx` | 112 | footer, sections, evidence-card, navigation | **DEAD** (island root) |
| `src/components/navigation.tsx` | 140 | nothing | **DEAD** |
| `src/components/footer.tsx` | 51 | nothing | **DEAD** |
| `src/components/sections.tsx` | 113 | nothing | **DEAD** |
| `src/components/evidence-card.tsx` | 147 | nothing | **DEAD** (highest-value salvage — see §5) |
| `src/components/legal-page.tsx` | 57 | nothing | **DEAD** |
| `src/components/legal-document.tsx` | 111 | legal-page | **DEAD** |
| `src/components/request-form.tsx` | 246 | nothing | **DEAD** |
| `src/components/consent.tsx` | 82 | footer | **DEAD** |
| `src/components/json-ld.tsx` | 17 | nothing | **DEAD** |

**Consequence:** `src/app/page.tsx` is a **940-line single-file monolith** that inlines every section,
every SVG, every string. That one file plus `layout.tsx` (57) is the entire visible website.

*(Details, per-file analysis and the rest of the dossier follow below.)*

---

## 1. ROUTING / RENDER SURFACE

### 1.1 Every route that exists

| Route | File | Type | Notes |
|---|---|---|---|
| `/` | `src/app/page.tsx` (940 ln) | **Client** (`"use client"` line 1) | The entire site. Single-page, anchor-nav only. |
| (root layout) | `src/app/layout.tsx` (57 ln) | Server | Fonts, hard-coded metadata, skip-link, `<main>` |
| error boundary | `src/app/error.tsx` (15 ln) | Client | Uses `.container .system-page` from `globals.css` |
| 404 | `src/app/not-found.tsx` (15 ln) | Server | **Only file that consumes `placedon-content`** (`systemContent.notFound`) |
| `/robots.txt` | `src/app/robots.ts` (12 ln) | Server | Fail-closed: no `SITE_ORIGIN` → `disallow: /` |
| `/sitemap.xml` | `src/app/sitemap.ts` (12 ln) | Server | Fail-closed: returns `[]` unless `SITE_PUBLICATION_READY==="true"` |
| `/icon.svg` | `src/app/icon.svg/route.ts` (12 ln) | Route handler | Inline SVG from `palette.ink`/`palette.cream`. Good — token-driven. |
| `/og/placedon.png` | `src/app/og/placedon.png/route.tsx` (99 ln) | Route handler (`runtime="nodejs"`) | `next/og` ImageResponse, cream ground, Fraunces-OG + Plex Mono loaded from disk. **Orphaned** — see §1.4 |
| `POST /api/waitlist` | `src/app/api/waitlist/route.ts` (133 ln) | Route handler (`runtime="nodejs"`) | Fully built, **no UI calls it** — `request-form.tsx` is dead |

**There are no other pages.** No `/product`, `/pricing`, `/about`, `/security`, `/faq`, `/how-it-works`, `/waitlist`, `/privacy`, `/terms`, `/cookies`, `/thank-you` — despite all eleven being declared in `seo/metadata.ts:11-102` and typed in `content/types.ts` as `SiteRoute`.

> **Landmine:** `buildSitemapEntries` (`seo/metadata.ts:194-199`) emits **8 indexable URLs**; 7 of them 404. It is only masked because `SITE_PUBLICATION_READY` is unset. Flipping that env var on a deploy publishes a sitemap of broken links.

### 1.2 Home page — sections IN ORDER (`src/app/page.tsx`)

| # | Lines | Section | What it does |
|---|---|---|---|
| 0 | 572-600 | **Sticky nav** `.dnav` | Brand (bobbing PNG logo) + 4 anchor links + Log in / Contact / Request a pilot. `backdrop-filter: blur(14px)` — the one existing glass surface. Burger button at ≤900px is **inert** (no `onClick`, no mobile menu exists). |
| 1 | 602-612 | **Breadcrumb strip** `.dcrumb` | "Solutions / Placedon legal solutions … Explore here ▾". Decorative only; the chevron is not a control. Contains the banned word. |
| 2 | 614-636 | **Hero** `.dhero` | Eyebrow, `<h1>` "Compliance you can put in front of a judge.", lead, two CTAs → then `<HeroVideo>` (`/media/hero.mp4`, IntersectionObserver autoplay, play/mute buttons). Whole block wrapped in ONE `<Reveal>` (opacity 0→1). |
| 3 | 638-689 | **Statement + Features** `#product` | `SecIcon` (perpetual wiggle) → `Index 01 · The record` → `<AnimatedH2>` "Built for the record" → lead. Then 4 `.dfeature-row`s (2-col: icon+title / body) beside a **sticky `.daside`** with 3 status chips (Verified / Attaches / Abstained) and an inert `.dbtn-link`. |
| 4 | 691-759 | **Interactive demo** `#evidence` | `Index 02 · In practice`. 5-tab pill `role="tablist"` → a cream "Compliance Note" document (`.ddoc-paper`, the page's only light surface) with numbered clauses + mono `.dcite` refs + `.ddoc-note` marginalia; right column = Prompt card + Connectors card. `AnimatePresence mode="wait"` cross-fade on tab change. **The best thing on the page.** |
| 5 | 761-791 | **Tools** `#solutions` | `Index 03 · Tools`. 4 feature rows (Placedon for Word / Matrix / Plugins / Platform) each with an inert "Learn more" button. |
| 6 | 793-812 | **Principles** | `Index 04 · The standard`. h2 "The model may propose. The system must verify." + 3 `.prin-card`s (Explain / Decide / Verify). Strong. |
| 7 | 814-836 | **Build** | `Index 05 · Platform`. 3-col rule-divided grid (MCP / Deterministic engine / Sensitive data). |
| 8 | 838-863 | **Resources** `#resources` | `Index 06 · Evidence`. 3×2 card grid, serif titles + motif icons. **All 6 cards are non-links** — no `href`, no handler. |
| 9 | 865-879 | **CTA band** | Bordered row: scale icon + h3 + "Learn more" → `#pilot`. |
| 10 | 881-898 | **Secondary hero** `#pilot` | AnimatedH2 + lead + the same two CTAs. `#pilot` is the target of *every* CTA on the page — there is **no form anywhere**. |
| 11 | 900-937 | **Footer** | Spinning logo, "How can I help you today?" box (inert), 4 link columns × 5-6 links — **all 21 links are `href="#top"`**. Bottom: © 2026 · "A witness, not a tool." · "Not legal advice." |

**Everything the page needs is defined in the same file:** icon paths `page.tsx:29-105`, all copy arrays `page.tsx:298-552`.

### 1.3 `src/components/*.tsx` — DEAD/ALIVE, definitively

All ten are **DEAD**. Verified three ways: (a) `grep -rn "@/components" src/` → exit 1, no output; (b) no relative `./components` / `../components` import anywhere in `src/`; (c) `tests/` references neither. The only inbound edges are component→component.

- `brand.tsx` — **DEAD**. `Brand`, `Mark`, `Arrow`, `LegalText`. The custom icon set (`Mark name="instrument" | "abstained" | "verified" | "provision" | "currency"`) is the "custom brand icons" AGENTS.md requires; the live page reinvented a *different*, more generic Lucide-ish set inline at `page.tsx:29-105`.
- `navigation.tsx` — **DEAD**. 140 ln: `usePathname` active state, `useSyncExternalStore` (theme or media query), real mobile menu. The live nav has none of this.
- `footer.tsx` — **DEAD**. Real routed links + consent-preferences control.
- `sections.tsx` — **DEAD**. Generic renderer over the `PageContent` type — the bridge that would have wired `placedon-content` to pages. Its absence is *why* the live page hard-codes everything.
- `evidence-card.tsx` — **DEAD**. Highest-value salvage; see §5.1.
- `legal-page.tsx` + `legal-document.tsx` — **DEAD**. Markdown → TOC + headings + tables + template banner.
- `request-form.tsx` — **DEAD**. 246 ln; the only client of `POST /api/waitlist`.
- `consent.tsx` — **DEAD**. `<dialog>`-based cookie consent.
- `json-ld.tsx` — **DEAD**. The only consumer of `seo/structured-data.ts`.

**Net effect:** ~1,059 lines of TSX + roughly **1,000 lines of `globals.css`** exist solely to style components that never mount.

### 1.4 Metadata / SEO wiring — BROKEN

`layout.tsx:26-35` hard-codes its own `Metadata` object and **never calls `pageMetadata()`** (`src/lib/site.ts:17`). Consequences:

- No `alternates.canonical`.
- **No `openGraph`, no `twitter`** → `/og/placedon.png` is generated but referenced by nothing. The OG route is orphaned.
- `robots: { index: false, follow: false }` is hard-coded at `layout.tsx:33`, bypassing the careful `publicationReady` gate in `metadataForRoute` (`seo/metadata.ts:154-157`).
- The layout's title/description are a *fourth* variant of the home copy, differing from `routeMetadata["/"]` (`seo/metadata.ts:13-15`) and from `homeContent.headline` (`content/home.ts:13`) and from the rendered `<h1>` (`page.tsx:618`). **Four different taglines.**
- **Zero JSON-LD is emitted.** `seo/structured-data.ts` (141 ln, incl. FAQPage schema built from `faqEntries`) is never executed. AGENTS.md explicitly requires "SEO (metadata, OG, JSON-LD, sitemap/robots), FAQ schema" — currently only robots + sitemap are wired, and both fail closed to empty.

---

## 2. CSS ARCHITECTURE

Two stylesheets, **two parallel and conflicting token systems**.

### 2.1 `src/app/globals.css` (1,584 ln) — imported by `layout.tsx:3`

- `@import "tailwindcss";` (line 1) — Tailwind v4 via `@tailwindcss/postcss` (`postcss.config.mjs`). **No `tailwind.config.*` file exists** (correct for v4). `@theme inline` (lines 30-35) exposes only 4 tokens to Tailwind: `--color-background`, `--color-foreground`, `--font-sans`, `--font-mono`. **No Tailwind utility class is used anywhere in `src/`** — the framework is imported, generates a preflight + nothing else, and is otherwise unused. `tailwind-merge`, `clsx`, `class-variance-authority` are dependencies with zero usages.
- **Tokens (`:root`, lines 3-21):** `--ink #0c0c0d`, `--cream #f4efe6`, `--grey #6b665f`, `--rule #d8d1c5`, `--gold #c9a24b`, `--gold-muted #9f743b`, `--abstain #5b6472`, `--paper #ede7dc`, `--dark-rule`, `--dark-muted`; semantic aliases `--background/--foreground/--surface/--border/--muted`; `--radius: 3px`; `color-scheme: light`.
- **Theming (lines 22-29):** `:root[data-theme="dark"]` swaps the semantic aliases and sets `color-scheme: dark`. `layout.tsx:45` hard-codes `data-theme="dark"` on `<html>`. **There is no theme toggle in the live UI** (the dead `navigation.tsx` had one via `useSyncExternalStore`), so the light palette — half the token system — never renders. `suppressHydrationWarning` at `layout.tsx:47` is vestigial from that removed toggle.
- **LIVE portion — lines 1-204 + 918-930 + 1546-1551 + 1573-1584 only:**
  base reset, `html/body`, `h1/h2/h3/p`, links, form resets, `:focus-visible` (line 113), `::selection`, `.container`, `.mono`, `.eyebrow`, `.button`, `.skip-link` (used by `layout.tsx:50`), `.system-page` (used by `error.tsx:4` and `not-found.tsx:6`), and the global reduced-motion block.
- **DEAD portion — lines 205-917 and 931-1545 and 1206-1572 (responsive) ≈ 1,150 lines (~73% of the file).** Every selector from `.site-header` (205) to `.template-placeholder` (1205), minus `.system-page` (918-930), styles components that never mount. Large dead runs worth naming: `.evidence-*` 344-497, `.witness-*` 498-546, `.currency-*` 547-593 + 646-653, `.audience-*` 594-620, `.home-faq/.faq-*` 621-667, `.site-footer/.footer-*` 691-753, `.page-hero/.reading-*` 754-817, `.product-showcase/.answer-*` 818-888, `.faq-layout/.faq-index` 889-917, `.consent-dialog/.dialog-*` 931-978, `.form-*/.field/.request-form/.honeypot` 979-1125, `.legal-*` 1126-1194, `.template-*` 1195-1205. The `@media (max-width:1050px)` block (1212-1265) and the `@media (max-width:760px)` block (1266-1572) are dead **except** `.container` (1213-1215, 1267-1269) and `.system-page` (1546-1551).
- **`.button-gold` (lines 170-174) is the ONLY gold-using rule in the codebase — and it is dead.**

### 2.2 `src/app/dashboard.css` (1,221 ln) — imported *inside the client component* at `page.tsx:12`

- Redeclares its own token block on `.dash` (lines 8-22) instead of consuming `globals.css`: `--ink: #0b0b0c` (**not** the brand `#0C0C0D` / `--ink` — a hard-coded near-miss), `--cream`, `--paper #e9e3d8`, `--line`/`--line-strong`/`--muted`/`--muted-2` as cream-alpha. This is a direct violation of AGENTS.md "Everything reads from central design tokens. No hard-coded hex in components."
- **`#C9A24B` appears ZERO times in `dashboard.css`.** The live site has **no Brass Gold at all** — not ≤10%, but 0%. The single mandated brand accent is absent from the only page that renders.
- **`#5B6472` (abstain cool-grey) also appears zero times.** `.chip-abstain` (959-966) signals abstention with `var(--muted)` (cream @60%) + `border-style: dashed`. The dashed border is a genuinely good non-colour cue, but the reserved semantic colour is unused.
- `.chip-met` is applied at `page.tsx:672` but **is never defined** in either stylesheet → "Verified" silently falls back to bare `.chip`. Conversely `.chip-missing` (952-958) is defined and never used.
- **Dead CSS in `dashboard.css` (~250 ln, none of these classes appear in `page.tsx`):** `.dblank*` 287-323, `.dhero-panel` 325-329, `.daside-img` 407-411, `.deco*` 551-581 **and** 1033-1060, `.dstrip` 577-581, `.dquotes-grid/.dquote*/.dcarousel*/.ddots/.ddot` 586-649, `.chip-missing` 952-958, `.hm*` (hero matrix) 969-1022 + 1215-1220, `.mq*` (statute marquee) 1063-1102. The `.hm` and `.mq` blocks are the remains of two "motion graphic" devices that were built, styled, and then removed from the markup.
- **Reduced-motion (892-897):** `.dash * { animation: none !important; transition: none !important; }`. This kills CSS transitions but **has no effect on Framer Motion**, which writes inline `transform`/`opacity` styles via WAAPI/rAF. Framer's own `useReducedMotion()` is what actually guards `Reveal`, `AnimatedH2`, `BrandMark`, `SecIcon` — and it does so correctly. **But `HeroVideo` (`page.tsx:179-263`) is NOT guarded**: it calls `useReducedMotion()` nowhere, and `autoPlay` + IntersectionObserver `v.play()` (line 189) start a looping video regardless of the user's preference. That is the one genuine reduced-motion failure.
- **Ambient-motion budget blown.** AGENTS.md: "One orchestrated hero motion moment; everywhere else ≤250ms… At most ONE ambient device." Live: `BrandMark` bob 3.4s infinite (nav) + `BrandMark` spin 24s infinite (footer) + **six** `SecIcon` wiggles at 5s infinite (lines 642, 695, 765, 797, 818, 842) + a looping video = **9 perpetual animations**. And most transitions are 550ms (`Reveal`) / 500ms+stagger (`AnimatedH2`), over the 250ms budget.

---

## 3. FONT DIAGNOSIS

### 3.1 Loading (`src/app/layout.tsx:5-24`)

```
fraunces: Fraunces-Variable.ttf,  variable --font-display, display swap, weight "100 900"
inter:    Inter-Variable.ttf,     variable --font-body,    display swap, weight "100 900"
mono:     IBMPlexMono-{Regular,Medium}.ttf, variable --font-code, display swap
```

Correct use of `next/font/local` and the CSS-variable pattern; all three applied at `layout.tsx:46`. Below, every defect with its fix.

### 3.2 The actual variable axes (parsed from the `fvar` tables on disk)

| Font | Axis | min | **default** | max |
|---|---|---|---|---|
| Fraunces-Variable.ttf | `opsz` | 9 | **9** | 144 |
| | `wght` | 100 | **900** | 900 |
| | `SOFT` | 0 | **0** | 100 |
| | `WONK` | 0 | **1** | 1 |
| Inter-Variable.ttf | `opsz` | 14 | **14** | 32 |
| | `wght` | 100 | **400** | 900 |

### 3.3 FINDING F1 — **`WONK` is applied inconsistently. This is the visible defect.** (confirmed)

`globals.css:65-67` sets, on the `h1, h2` selector **only**:
```
font-variation-settings: "SOFT" 0, "WONK" 0;
```
Fraunces' `WONK` default is **1** (wonky alternates ON: the swashed single-storey `g`, the flicked `y`/`f`, the cranked `a`). Setting it to 0 is a defensible editorial choice for a legal brand. But it is applied to `h1` and `h2` and **nothing else**. Every other Fraunces-set element in the live page has no `font-variation-settings` and therefore renders at **WONK 1**:

| Element | file:line | WONK |
|---|---|---|
| `h1` (hero), `h2` (all AnimatedH2) | globals.css:58-68 | **0** |
| `.dnav-brand` — **the "Placedon" wordmark, twice** | dashboard.css:158-166 | **1** |
| `.dash h3` (`.prin-card h3`, `.dbuild-col h3`, `.dband h3`) | dashboard.css:36-45, 1129-1132 | **1** |
| `.dfeature-title` | dashboard.css:372-377 | **1** |
| `.ddoc-paper h4` (the demo document title) | dashboard.css:471-476 | **1** |
| `.dres-card .dres-title` | dashboard.css:1155-1164 | **1** |
| `.hm-foot b` | dashboard.css:1017-1022 | **1** |

So the `a`, `o`, `g` in **"Placedon" in the navbar** are drawn with different, quirkier letterforms than the same letters in the headline directly beneath it. That is exactly the "font is not perfect" sensation: the typeface is fine (as the owner observed at zoom), but the *brand* is being set in two different cuts of it on the same screen.
**Fix:** promote the axis declaration to a single class/custom-property applied to every display-serif element — e.g. `--display-axes: "SOFT" 0, "WONK" 0, "opsz" <n>;` and set `font-variation-settings: var(--display-axes)` on `.dash h1,h2,h3,h4, .dnav-brand, .dfeature-title, .dres-title, .ddoc-paper h4`.

### 3.4 FINDING F2 — **`opsz` is never controlled anywhere.** (confirmed)

`grep -rn "opsz\|font-optical-sizing" src/` → **zero hits.** Fraunces' `opsz` default is **9** — the caption cut (heavy stems, tall x-height, blunt flat serifs, low stroke contrast), designed for 9pt text. `font-optical-sizing: auto` is the browser initial value, so engines *should* map opsz to the used font-size, but (a) that mapping is engine-dependent, (b) it means a **different letterform design at every size** with no deliberate choice — the 88px `h1` gets opsz≈88, `.dfeature-title` at 25px gets opsz≈25, `.dres-title` at 20px gets opsz≈20, and the 22px `.dnav-brand` gets opsz≈22 — and (c) it is only reliable when the page is not also overriding `font-variation-settings`. Nothing is pinned; nothing is verified.
**Fix:** set `opsz` explicitly per type tier inside the same `font-variation-settings` declaration as F1 — display `h1` ≈ `"opsz" 120`, `h2` ≈ `"opsz" 72`, `h3`/`.dfeature-title` ≈ `"opsz" 28`, wordmark ≈ `"opsz" 24`. Pinning it is the only way to guarantee the headline uses the high-contrast display cut rather than the 9pt caption cut.

### 3.5 FINDING F3 — the hero-reveal contrast flash. **CONFIRMED.**

`Reveal` (`page.tsx:266-295`) animates `{ opacity: 0 → 1, y: 20 → 0 }` over **0.55s**. It wraps the *entire* hero block (`page.tsx:616-632`), `<h1>` included. The hero is in the viewport on load, so `whileInView` fires immediately at mount.

Composited maths: cream `#F4EFE6` over ink `#0B0B0C` at α=0.30 → `rgb(81,79,77)` ≈ **2.4 : 1** against the ground. At α=0.5 → ≈ 4.1 : 1. The headline sits below the WCAG AA large-text 3:1 threshold for roughly the first third of the animation and below 4.5:1 for most of it. So: *dark-grey-on-near-black mid-animation* — **exactly as suspected, and the mechanism is opacity compositing, not colour.**

Two aggravators:
1. `AnimatedH2` (`page.tsx:143-176`) does the same per word with `staggerChildren: 0.05` + `duration: 0.5` → an 8-word heading takes **0.85s**, during which the tail words are ghost-grey while the head words are solid. Six headings on the page do this.
2. It stacks with the FOUT (F4) — the fallback serif paints, *then* Fraunces swaps in, *then* opacity ramps.

**Fix:** animate only `y` / `clip-path` on the headline and hold `opacity: 1` (or start at ≥0.6); shorten to ≤300ms; and give the hero an explicit `initial={{opacity:1}}` since it is above the fold. Keep the opacity fade for non-text blocks only.

### 3.6 FINDING F4 — raw `.ttf` payload + no fallback metrics → guaranteed FOUT

`Inter-Variable.ttf` **876 KB** + `Fraunces-Variable.ttf` **360 KB** + `IBMPlexMono-Regular.ttf` **136 KB** + `IBMPlexMono-Medium.ttf` **137 KB** = **≈1.5 MB of uncompressed TrueType**. `next/font/local` does not transcode — it serves what you give it. As WOFF2 this would be ≈400 KB total.
Combined with `display: "swap"` (`layout.tsx:8,14,23`) and **no `fallback` array and no `adjustFontFallback`** on any of the three declarations, the first paint uses the generic `serif`/`sans-serif` from `dashboard.css:19,40` with wildly different metrics, then reflows the 88px headline.
**Fix:** convert all four files to `.woff2`; add `fallback: ["Georgia","serif"]` / `["system-ui","sans-serif"]` and `adjustFontFallback` (or explicit `size-adjust`/`ascent-override`) so the swap does not shift layout. Drop the three unused font files (below).

### 3.7 FINDING F5 — unused font assets shipped

`brand-kit/fonts/` contains `PlayfairDisplay-Variable.ttf` (301 KB) and `IBMPlexMono-SemiBold.ttf` (140 KB) which are **loaded by nothing**, and `Fraunces-OG-Regular.ttf` (72 KB) which is used **only** by the OG route (`og/placedon.png/route.tsx:8`) — correct there (satori needs a static file), but it means two different Fraunces cuts exist in the repo. Playfair is a leftover from an abandoned display choice and should be deleted so no one reintroduces it.

### 3.8 FINDING F6 — the type scale is ad-hoc and duplicated across two files

There is no scale; there are two competing partial ones plus ~20 one-off `font-size` values.

| Role | globals.css | dashboard.css | Conflict |
|---|---|---|---|
| `h1` size | `clamp(48px, 6.4vw, 91px)` :70 | `clamp(44px, 6vw, 88px)` :47 | two |
| `h2` size | `clamp(34px, 4vw, 56px)` :73 | `clamp(34px, 4.4vw, 60px)` :50 | two |
| display weight | `450` :61 | `440` :41 | **two values for one role** |
| display tracking | `-0.045em` :62 | `-0.03em` :42 (h3 `-0.02em` :54) | **three values** |
| display leading | `1.07` :63 | `1.04` :43 | two |
| `.mono` size | `0.9em` :130 | `0.86em` :76 | two |
| measure (`p` max-width) | `70ch` :82 | `60ch` :58 | two |

`dashboard.css` wins on the live page (higher specificity via `.dash`) for everything **except `font-variation-settings`**, which only `globals.css` declares — which is precisely how F1 happened.

One-off sizes with no scale membership: `25px` (:373), `27px` (:53), `30px` (:475), `22px` (:674), `24px` (:1131), `20px` (:1019/:1161), `17px` (:381), `15px` (:403/:679/:1136), `14.5px` (:491/:525), `13px`, `12.5px` (:1057), `12px`, `11px`. **`14.5px` and `12.5px` are fractional-pixel body sizes** — they will hint and round inconsistently across platforms and are a real source of "the type feels slightly off".

### 3.9 FINDING F7 — leading and measure

- `.dash h1 { line-height: 1.04 }` (dashboard.css:43) on a `clamp(44px…88px)` serif with `max-width: 15ch` (`.dhero h1`, :274) → the hero headline wraps to 2-3 lines at **1.04**, i.e. descenders of line 1 nearly touch ascenders of line 2. For Fraunces (a tall-ascender face) 1.04 is too tight for multi-line; **1.10–1.14** is the safe floor for 2+ lines. Tracking `-0.03em` at 88px = −2.6px, which on top of opsz-9 letterforms (already wide-set) reads as *forced* rather than optically tuned. **Both suspicions confirmed.**
- Measure: `.dash p { max-width: 60ch }` (:58) is sound, but `.dfeature-body` at 17px/1.55 inside a `1fr` half-column at 1200px container = ~560px ≈ 72 characters — the `60ch` cap never binds because `.dfeature-row` is `grid-template-columns: 1fr 1fr` (:356). `.ddoc-p` explicitly sets `max-width: none` (:493) at 14.5px/1.62 inside a ≤740px column ≈ **95 characters**. The demo document — the most important reading surface on the page — has the worst measure on it.
- `.dash .lead { line-height: 1.55 }` at `clamp(17px,1.5vw,21px)` is fine. `body { line-height: 1.7 }` (globals :49) at 15px is loose but only affects the dead surface.

### 3.10 FINDING F8 — `tabular-nums`: **partially refuted, still worth fixing**

`grep -rn "font-variant\|tabular" src/` → **one hit**, and it is the `font-variation-settings` at globals.css:65. `font-variant-numeric` is declared **nowhere.**

However, the figures that matter on the live page are already inside mono spans, where digits are monospaced by construction:
`.dcite` dates `2026-03-31` / `2026-09-30` / `2026-10-14`, `96 days`, `s.96(1)`, `s.173(1)`, `s.2(85)`, `G.S.R. 700(E)` (page.tsx:364-480); `.ddoc-meta .mono` note numbers (:731); `.dindex b` "01"–"06" (:915); `.prin-step` (:1138); footer `© 2026` (:931). So the acute alignment failure the brief anticipated is **not currently visible** — the mono discipline is genuinely being honoured.

It is still a real gap for the redesign: (a) nothing *enforces* it, so the first Inter-set figure or right-aligned numeric column will break alignment; (b) Inter's default numerals are proportional; (c) the obligation-matrix pattern the brand is built around (`.hm-*`, dead at dashboard.css:969-1022) is a numeric table that will need it.
**Fix:** `font-variant-numeric: tabular-nums lining-nums;` on `.mono, .dcite, .dindex, .prin-step, table, .hm-*` — and, since IBM Plex Mono ships slashed-zero, decide `zero` on/off deliberately.

### 3.11 FINDING F9 — pairing

Fraunces (display) + Inter (body) + IBM Plex Mono (statute refs) is a **good, defensible pairing** and matches AGENTS.md. No violation of "Inter-as-display" on the live page — the one risk is `.eyebrow` (dashboard.css:60-67), which correctly forces `var(--font-body)`. Keep the pairing; the problems are all axis/scale/consistency, not selection.

### 3.12 FINDING F10 — `wght` and the 900-default trap

Fraunces' `wght` **default is 900**. `localFont({ weight: "100 900" })` emits `font-weight: 100 900` in the `@font-face`, so CSS weight resolution works — but any element that does not inherit a numeric weight, or any context where the variation is not applied (older engines, a `font-variation-settings` override that omits `wght`), snaps to **Black**. Belt-and-braces: state `"wght"` explicitly in the same `font-variation-settings` declaration as `opsz`/`SOFT`/`WONK`.
Separately, `.dfeature-title` (dashboard.css:372-377) is a `<span>` with `font-family: var(--font-display)` and **no `font-weight`** → it inherits `400` from `body`, while sibling headings are `440`. Four feature titles on the live page are a different weight from every other display element. Same for `.ddoc-paper h4` (:471), which relies on the UA default `bold` (700) for `h4` → a **third** display weight.

> **Three display weights on one screen (400 / 440 / 700), two tracking values, and two WONK settings.** That is the font problem. The typeface is not at fault.

---

## 4. DATA / CONTENT LAYER

### 4.1 What exists (`src/lib/`, 1,981 lines)

- **`placedon-content/content/*.ts` (1,376 ln)** — `types.ts` defines `SiteRoute`, `PageContent`, `AnswerClass`, `FaqEntry`, `StateCopy`, `FormFieldCopy`. `shared.ts` holds `sharedCopy`, `sharedStates`, `answerClasses`, `evidencePreview`, `pilotCta`, `waitlistCta`, `globalContent`. Then one typed module per page: `home`, `product`, `how-it-works`, `pricing`, `security`, `about`, `faq` (255 ln, 20+ Q&A), `waitlist` (261 ln, full form copy), `system` (404 / consent / errors). All `as const satisfies PageContent` — genuinely well-typed.
- **`placedon-content/legal/*.md` (250 ln)** — privacy-policy, terms, cookie-consent, with `{{UPPER_SNAKE}}` placeholders.
- **`placedon-content/seo/metadata.ts` (211 ln)** — `routeMetadata` for 12 routes, `canonicalOrigin` (rejects non-HTTPS, credentials, path, query, fragment), `metadataForRoute`, `buildMetadata`, `buildSitemapEntries`, `buildRobots`. All gated on a caller-supplied origin — **no domain is ever assumed.** Excellent.
- **`placedon-content/seo/structured-data.ts` (141 ln)** — Organization / WebSite / FAQPage JSON-LD built from `faqEntries`.
- **`lib/site.ts` (42 ln)** — `siteOrigin()` reads `SITE_ORIGIN`; `pageMetadata(route)` degrades to `index:false` with no canonical when the origin is absent. Sound.
- **`lib/tokens.ts` (10 ln)** — the canonical hex palette, correct casing, matching `globals.css`.
- **`lib/legal.ts` (50 ln)** — `legalReady()` refuses to serve the documents unless `LEGAL_REVIEW_CONFIRMED === "true"` **and** every `{{TOKEN}}` in all three markdown files has a clean value. Fail-closed, and the sanitiser strips `[<>\n\r]`. Very good.
- **`lib/intake.ts` (100 ln)** — zod `requestSchema`, consent/notice versioning, pluggable sink, `secureEndpoint()`.
- **`lib/api.ts` (152 ln)** — the typed product client AGENTS.md mandates (`MockProvider`/`HttpProvider`, `verified_fact | deterministic_conclusion | predictive_signal | abstained`). **Imported by nothing.**

### 4.2 Is any of it wired? — Almost none.

| Module | Reached at render? |
|---|---|
| `content/system.ts` | **YES** — `not-found.tsx:1` (`systemContent.notFound`). The single live consumer. |
| `seo/metadata.ts` (`buildRobots`, `buildSitemapEntries`) | **YES** — but both fail closed to empty in the current env, so they emit nothing. |
| `lib/site.ts` (`siteOrigin`) | **YES** via robots/sitemap. `pageMetadata()` — **NO**. |
| `lib/tokens.ts` | **YES** — `icon.svg/route.ts:1`, `og/…route.tsx:4`. |
| `lib/intake.ts` | **YES** — `api/waitlist/route.ts:1-6`. But no UI posts to it. |
| `content/home, product, pricing, faq, about, security, how-it-works, waitlist, shared` | **NO — dead.** |
| `legal/*.md` + `lib/legal.ts` | **NO — dead** (only `legal-page.tsx` reads them). |
| `seo/structured-data.ts` | **NO — dead** (only `json-ld.tsx` reads it). |
| `lib/api.ts` | **NO — dead.** |

**Verdict:** the good content and the entire SEO/structured-data apparatus are **dead while the page hard-codes its own copy** (`page.tsx:298-552`) — a *different*, weaker set of strings. The gap between the two is the single largest quality delta in the repo (see §5.3).

> `lib/legal.ts:11-14` reads via `process.cwd()` at request time. That works in `next dev` and in a normal `next build`, but will not resolve under `output: "standalone"` or a bundled serverless target unless the `.md` files are explicitly traced. Worth fixing when it is revived.

---

## 5. HONEST QUALITY ASSESSMENT

### 5.1 Genuinely good — preserve

1. **The "Compliance Note" demo** (`page.tsx:691-759` + `.ddoc*` CSS 459-505). A cream legal document floating on an ink page, numbered clauses, mono `s.96(1)` citations underlined like a hyperlink-that-is-a-citation, and a `.ddoc-note` rule-bordered marginal note for the negative findings ("First-AGM relief not applicable… No Registrar extension… is on record"). This is the brand argument made visually. **This is the thing to build the redesign around.**
2. **The abstention demo** (`page.tsx:413-441`). Tab 3 answers "Is the company a small company?" with *"Placedon abstains. No status is asserted without the instrument."* Shipping a demo whose headline output is a refusal is the correct and unusual choice. Preserve exactly.
3. **The principles trio** (`page.tsx:321-340`): "The model explains / Code decides / The record verifies", under the h2 "The model may propose. The system must verify." On-voice, terse, would survive the judgment test.
4. **Non-colour status encoding** in `.chip` (dashboard.css:927-966): `.chip-attaches::before` is a hollow square, `.chip-missing::before` a 45° hatch, `.chip-abstain` a dashed border + dashed dot. Distinguishable without colour — exactly what AGENTS.md asks. Preserve the *idea*, fix the missing `.chip-met`.
5. **The `.dindex` ledger eyebrow** (dashboard.css:904-924) — mono `01 · The record` + a 30px rule via `::after`. Quiet, editorial, distinctive, cheap. Keep.
6. **The SEO/legal/intake engineering** (§4.1). `canonicalOrigin`'s refusal to assume a domain, `legalReady()`'s refusal to serve unreviewed templates, the waitlist route's origin check + 8 KB body cap + streaming read + consent-version 409 + fail-closed 503. This is careful, adult code. It only needs *connecting*, not rewriting.
7. **SALVAGE — `evidence-card.tsx:85-118` roving tabindex.** The dead `AnswerExplorer` implements the full APG tabs pattern: `role="tablist"`, per-tab `id`, `tabIndex={active===key?0:-1}`, ArrowRight/ArrowLeft wrap-around, Home/End, `preventDefault`, programmatic `.focus()`, and a real `role="tabpanel"` with `aria-labelledby` and `tabIndex={0}`. **The live demo tabs (`page.tsx:702-715`) have `role`+`aria-selected` and nothing else** — no `id`, no `aria-controls`, no `tabpanel` role on `.ddemo-stage`, no arrow keys, all five tabs in the tab order. **Port the dead component's keyboard handler onto the live tabs.** (One bug to fix while porting: `evidence-card.tsx:90` sets `aria-controls={`panel-${active}`}` on *every* tab — it should be `panel-${tab.key}`.)
8. The dead `Mark` icon set in `brand.tsx` (`instrument`/`abstained`/`verified`/`provision`/`currency`) is semantically named brand iconography; the live inline set (`page.tsx:29-105`) is generic (plug, bag, grid, feather, cpu). Prefer the dead one's naming discipline.

### 5.2 Weak / templated / AI-slop

- **`features[0]`, `page.tsx:302`** — *"Placedon reads from MCA21 filings, board minutes, and your statutory registers — no re-keying, no copy-paste, no re-explaining the company each time you open a question."* Present tense, three-part negative cadence, a SaaS-brochure sentence. It would not appear in a judgment.
- **`tools`, `page.tsx:485-506`** — four named products ("Placedon for Word", "Placedon Matrix", "Plugins", "Platform") described as existing. Generic product-suite boilerplate.
- **`page.tsx:909` "How can I help you today?"** — a chat-assistant trope pasted into a legal footer. Directly contradicts "a witness, not a tool."
- **`page.tsx:606,617` "Solutions / Placedon legal solutions" / "Placedon Legal Solutions"** — a breadcrumb to nowhere plus a category label.
- **`page.tsx:886-888`** — *"Whether you are an in-house secretary scaling filings or an advisor building on the record, we will help you find where to start."* The "Whether you are X or Y, we will…" construction is textbook filler.
- **Compare** `page.tsx:618` *"Compliance you can put in front of a judge."* with `content/home.ts:13` *"An answer must carry its authority."* The dead one is better, calmer, and more on-voice. The live one is advocacy.

### 5.3 Broken / inconsistent

| Issue | Location |
|---|---|
| **21 footer links all `href="#top"`** | page.tsx:921 |
| 6 resource cards are not links at all | page.tsx:847-862 |
| Burger button opens nothing (no mobile menu exists) | page.tsx:594-597; CSS dashboard.css:197-213, shown at :842 |
| "Learn more" / "How the record works" `.dbtn-link` buttons are inert `<button>`s with no handler | page.tsx:680-685, 780-785 |
| `.dfoot-ask` box looks like an input, is a `<div>` | page.tsx:909-914 |
| "Log in" / "Contact" both go to `#pilot`; `#pilot` contains no form | page.tsx:585-592, 882 |
| `.chip-met` applied but undefined | page.tsx:672 |
| `--ink: #0b0b0c` ≠ brand `#0C0C0D` | dashboard.css:8 |
| Four different taglines across layout / seo / content / h1 | layout.tsx:28, metadata.ts:13, home.ts:13, page.tsx:618 |
| `dashboard.css` imported inside a client component rather than the layout | page.tsx:12 |
| ~1,150 dead lines in globals.css + ~250 in dashboard.css + 1,059 dead TSX | §1.3, §2 |
| AGENTS.md says "Next.js 15 + shadcn/ui"; reality is Next 16, no shadcn | AGENTS.md:3 |
| `tailwind-merge`, `clsx`, `cva`, `lucide-react`, `sonner`, `react-hook-form`, `@number-flow/react`, `@react-spring/web`, `animejs` are all installed and **unused** | package.json |

### 5.4 Accessibility gaps

1. **Tabs are keyboard-incomplete** — `page.tsx:702-715`: no `aria-controls`, no `id`, `.ddemo-stage` has no `role="tabpanel"` / `aria-labelledby`, no arrow-key roving tabindex. All 5 tabs sit in the tab order. (Fix = §5.1 item 7.)
2. **Focus visibility is lost on the live page.** `globals.css:113-116` sets `:focus-visible { outline: 2px solid var(--foreground); outline-offset: 5px }`. `--foreground` resolves from `:root[data-theme="dark"]` to `--cream`, which is fine — **but `dashboard.css` declares no focus styles at all**, and several interactive elements set `border: none` + `background: none` (`.ddemo-tab` :443-444, `.dbtn-link` :131, `.dvideo-btn` :1192-1193, `.dnav-burger` :207). The global ring still applies, but it is never verified against the pill/round shapes and will clip inside `.ddemo-tabs { overflow: … }` contexts. **No focus style is defined for the component that most needs it.**
3. **Reduced motion: the hero video ignores it.** `page.tsx:179-263` — `autoPlay` + `IntersectionObserver.play()` with no `useReducedMotion()` guard. The CSS block at dashboard.css:892-897 cannot stop it.
4. **Contrast.** `--muted-2: rgba(244,239,230,0.42)` on `--ink` ≈ **3.3 : 1** — below AA 4.5:1 for the ≤13px text it is used on: `.dcard-label` (:521), `.dres-kind` (:714), `.prin-step` (:1141), `.dfoot-col-label` (:805), `.dfoot-bottom` (:827), `.hm-head` (:990). `--muted` (0.60) ≈ **6.2 : 1** and is fine. **Every `--muted-2` use is an AA failure.** Plus the transient hero-reveal failure (§3.5).
5. **44px targets.** `.dbtn` is 46px high ✓. `.dvideo-btn` 48px ✓. `.dnav-burger` 42px ✗ (2px short). `.ddemo-tab` = 9px padding + ~20px line ≈ **38px ✗**. `.dnav-links a`, `.dnav-login`, `.dfoot-col a` (5px vertical padding on a 14px line ≈ **30px ✗**) all fail. The dead `globals.css` was *more* careful here (`min-height: 44px` at :229, :247, :1289, :1394, :1447, :1541).
6. **`aria-hidden` on all icons** ✓ (`page.tsx:24`) — correct, since every icon is paired with text.
7. `<h4>` inside `.ddoc-paper` (`page.tsx:730`) follows an `<h2>` with no `<h3>` between — a heading-level skip.
8. `.dconn-mark` (`page.tsx:751`) is a decorative empty `<span>` with no `aria-hidden` — harmless but untidy.
9. The video has no captions/`<track>` and no accessible description; `.dhero-video` carries no label.

### 5.5 Overclaiming and banned words

**Banned word — `solution`: 5 occurrences on the live page.** `page.tsx:541` (footer column `"Solutions"`), `:580` (nav link), `:606` (breadcrumb, twice: "Solutions / Placedon legal solutions"), `:617` (hero eyebrow "Placedon Legal Solutions"), `:762` (`id="solutions"`). By AGENTS.md's own rule ("any = failure") the live page fails.
The rest of the banned list is clean, and **`src/lib/` is entirely clean** — the dead content layer never slips.

**Overclaiming** (AGENTS.md: "Pre-launch framing. No live-corpus… claims"):
- `page.tsx:302` "Placedon **reads from** MCA21 filings…" — asserts a live integration.
- `page.tsx:312` "**Use Placedon in** Word, in email, and alongside the secretarial software your team already runs." — asserts shipped products.
- `page.tsx:485-506` — four products described in the present indicative.
- `page.tsx:512` "**Connect** your registers… through the open Model Context Protocol."
- **Nothing on the live page carries the pre-launch frame.** No "Pre-launch", no "Product concept", no "Concept" tag. The dead `evidence-card.tsx:28` has `<span className="record-tag">Concept</span>` and `:58` "Product concept — not a live answer"; `content/home.ts:12` eyebrow is "Indian corporate law · Pre-launch". The live page dropped all of it. Only the footer's "Not legal advice." (`page.tsx:934`) survives.

**Invented figures** (AGENTS.md: "Never invent a statutory figure/section/date"):
- `page.tsx:354,387,416,445,466` — note numbers `PL-2026-014/021/030/037/041`.
- `page.tsx:373-374` — "the outer date is `2026-09-30`"; `:405-406` — "the gap… is `96 days`… due before `2026-10-14`"; `:403` — "Three meetings are held to date".
- `page.tsx:434` — attributes the s.2(85) threshold to **`G.S.R. 700(E)`**, an instrument number presented as the governing notification.
These are demo fixtures, which is defensible — but **nothing on screen marks them as illustrative**, so a reader takes them as product output. The `Concept` tag must be restored to `.ddoc-paper`.

---

## 6. FLAGGED SURFACES (flagged only — no design proposed)

### 6.1 Where tasteful glassmorphism could live
Constraint from AGENTS.md: *"glassmorphism everywhere"* is forbidden — so at most one or two surfaces, and only where a translucent plane is doing real work (indicating a layer above the record).

1. **`.dnav` (dashboard.css:144-151)** — already `color-mix(ink 82%) + backdrop-filter: blur(14px) saturate(140%)`. The only existing glass. It is the *correct* place for it (a floating chrome layer over scrolling content) and the natural place to invest rather than add new ones. Watch: the cream-on-82%-ink text contrast during scroll-over of the `.ddoc-paper` cream document.
2. **`.dvideo-btn` (dashboard.css:1190-1209)** — `color-mix(ink 60%) + blur(6px)` over video. Legitimate: controls floating over moving imagery. Keep, refine.
3. **`.ddemo-tabs` pill rail (dashboard.css:425-436)** — currently opaque-bordered; a candidate for a frosted rail if it becomes sticky while the document scrolls beneath it.
4. **A sticky `.daside` (dashboard.css:394-401)** — it is `position: sticky; top: 96px` over scrolling feature rows; a faint frosted plane would explain *why* it does not scroll.
5. **NOT candidates:** `.ddoc-paper`, `.prin-card`, `.dres-card`, `.dbuild-col`, `.dband`. The document must read as opaque paper; the cards must read as ruled ledger, not glass. Glassing them is exactly the "glassmorphism everywhere" failure.

### 6.2 Where richer, reduced-motion-safe motion could live
Budget from AGENTS.md: **one** orchestrated hero moment, ≤250ms elsewhere, **one** ambient device. Current state spends 9 perpetual animations and 550-850ms reveals — so this is a *reallocation*, not an addition.

1. **The hero moment (`page.tsx:614-636`)** — the single licensed orchestration. Currently a flat 550ms opacity fade on a whole slab, which causes the contrast flash (§3.5). This is where a real, staged, contrast-safe entrance belongs.
2. **Tab→document transition (`page.tsx:721-740`)** — currently a 300ms opacity/y cross-fade. The highest-value motion on the page: the document *changing its findings* is the product. Directional and content-aware motion here would earn its cost. Must degrade to an instant swap under `prefers-reduced-motion`.
3. **The abstention reveal (tab 3, `page.tsx:413-441`)** — the moment the system refuses. Deserves a distinct, slower, quieter treatment than the other four tabs. Currently identical to them.
4. **`.chip` state changes (dashboard.css:927-966)** — attaches → met → abstained is a state machine with no motion at all.
5. **The dead `.hm-*` obligation matrix (dashboard.css:969-1022) and `.mq-*` statute marquee (:1063-1102)** — two pre-built ambient devices sitting unused. If an ambient device is wanted, one of these is the candidate, and the *other six* `SecIcon` wiggles (`page.tsx:642,695,765,797,818,842`) plus both `BrandMark` loops (`:108-124`) should be retired to pay for it.
6. **Scroll-linked rules** — `.dsection { border-top }` (dashboard.css:242) and `.dindex::after` (:919-924) are static hairlines that could draw in; cheap, on-brand, and trivially reduced-motion-safe.
7. **Must fix regardless of direction:** `HeroVideo` (`page.tsx:179-263`) needs a `useReducedMotion()` guard before `autoPlay`/`.play()`.

