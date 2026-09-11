# Placedon — Design Research Dossier

**Prepared:** 2026-09-11
**Scope:** Competitive teardown (legal-tech + premium editorial), glassmorphism done right + accessibility, motion for legal/enterprise trust, typography craft (Fraunces / Inter / IBM Plex Mono), legal-UX credibility research.
**Status:** written progressively — sections land in order 1 → 5.

**Product context this dossier serves.** Placedon is an evidence-first legal-intelligence layer for Indian corporate law (Companies Act 2013), positioned as "a witness, not a tool." Primary readers are advocates, in-house counsel and researchers who read closely and distrust confident-sounding software; secondary readers are the general public who must still understand the pitch. Palette is near-monochrome editorial: ink `#0C0C0D`, warm cream `#F4EFE6`, a warm grey ramp, one accent Brass Gold `#C9A24B` capped at ~10% of any screen, and cool grey `#5B6472` reserved exclusively for the abstain/unknown state. Type is self-hosted Fraunces (variable display serif with an `opsz` axis), Inter (body), IBM Plex Mono (statute citations).

**Decisions that are settled and which this research serves rather than revisits:** glassmorphism is a *signature* layer, not a garnish; motion is purposeful and richer than typical enterprise sites but reduced-motion safe; the three typefaces stay. The job is craft, not reselection.

---

## 1. Teardown — legal-tech and premium editorial product sites

### 1.1 Harvey AI — harvey.ai

**This is the most dangerous reference in the set, because it has already occupied Placedon's intended aesthetic.**

Harvey's identity was built by Portland studio Geist with brand consultant Shawn Farsai, and its type system is **TWK Ghost** (WELTKERN, by Nolan Paparelli) for wordmark/headlines/display, paired with **ABC Diatype** (Dinamo) for body and UI ([Fonts In Use](https://fontsinuse.com/uses/77027/harvey)). Fonts In Use describes TWK Ghost's "refined high-contrast shapes" as giving "the editorial gravitas of a legal journal while signaling craftsmanship and precision," with Diatype as "a measured counterpoint that lets TWK Ghost hold the emotional and visual weight."

That is, almost verbatim, the Fraunces + Inter thesis. Placedon's differentiation therefore **cannot** be "warm monochrome + high-contrast display serif + neutral sans" — Harvey owns that. Differentiation has to come from *structure and evidence display*, not from palette adjectives.

- **Layout system.** Full-bleed cinematic hero photograph under a dark scrim, large serif headline on top; then a customer logo grid; then alternating feature blocks; then testimonial carousel; multi-column footer. Generous whitespace, low information density on the marketing site (the opposite of the product). Hierarchy is achieved "entirely through type scale, weight, and warm gray tonal steps" — not through colour.
- **Typography.** Hero H1 around 60px+, weights 500–700; body at 400. Headline currently "Build a Frontier Legal Organization"; product launch line "Introducing Harvey II — the most powerful Harvey yet" ([harvey.ai](https://www.harvey.ai/)).
- **Colour/contrast.** Warm near-black and off-white monochrome. Harvey's own design-system write-up says the rebuilt ramp **locked hue around 90°** for a consistent warm-neutral feel, **recalibrated chroma higher in light tones and lower in dark tones specifically to avoid a brown shift**, and made **WCAG accessibility a default in both light and dark modes** ([Rebuilding Harvey's Design System](https://www.harvey.ai/blog/rebuilding-harveys-design-system-from-the-ground-up)). Teal/cyan appears only on the "Request a Demo" CTA.
- **Motion.** Restrained: auto-advancing testimonial carousel, hover/nav transitions, micro-animations and product demo video produced by basement.studio ([basement.studio case study](https://basement.studio/post/from-seed-to-unicorn-how-we-supercharged-harvey-ai)). No signature scroll spectacle.
- **Trust/authority.** Quantified proof ("2,400+ Legal Organizations", "200,000+ Professionals", "75+ AmLaw 100 firms", "25+ average hours saved per month"), a compliance row (SOC 2 Type II, GDPR, ISO 27001, ISO 27701, **ISO 42001** — the AI management standard), Fortune-500 logos, funding as credibility ("We Raised $550M at a $15.5B Valuation"), and long named-attribution quotes from firm leadership.

**Harvey's stated design principles are worth internalising even though the visual language must be avoided** ([How We Approach Design at Harvey](https://www.harvey.ai/blog/how-we-approach-design-at-harvey)):
- design "the way lawyers write: saying the most with the least";
- surface "a clear paper trail of Harvey's thinking steps and citations" so the system "isn't a black box" but reflects "clarity, accountability, and the rigor that legal work demands";
- "polish is synonymous with credibility."

**Adapt (2–3 specific patterns):**
1. **Colour-free hierarchy.** Build the entire marketing page's hierarchy from type scale + warm-grey tonal steps, reserving Brass Gold for a single element per viewport. This is why Harvey reads as "premium legal services, not SaaS."
2. **The hue-locked warm ramp.** Copy the *technique*, not the values: derive the warm grey ramp from a single locked hue (Placedon's cream `#F4EFE6` implies roughly 30–40° hue) and deliberately drop chroma in the darkest steps so the ink end doesn't go muddy-brown. Harvey documents that exact failure mode.
3. **Compliance strip including ISO 42001.** For an evidence-first AI product sold to Indian counsel, an AI-management-system claim reads louder than another SOC 2 lockup. Add DPDP Act 2023 alongside GDPR for the Indian buyer.

**Avoid (so we don't read as a Harvey clone):**
- Full-bleed photographic hero under a dark scrim with a giant serif headline — that is Harvey's signature frame. Placedon's hero should be **document-native**, not photographic.
- A teal/cyan CTA. Placedon's only accent is Brass Gold; a second "action colour" would instantly read as a template.
- Valuation/funding as a trust signal. Placedon's trust argument is *provenance*, not capital.
- Aspirational abstractions ("Own Their Intelligence", "Frontier Legal Organization"). Placedon's voice is evidentiary and concrete.

### 1.2 Spellbook — spellbook.com (formerly spellbook.legal; the `.legal` domain 301s to `.com`)

- **Layout.** Conventional high-converting SaaS: hero with dual CTAs ("Book a Demo" / "Start 7-day Free Trial"), trust bar, alternating text-image feature sections, testimonial block, fat footer.
- **Typography.** Single sans-serif family, hierarchy by size/weight only. H1 "AI Contract Review and Drafting", sub "Contracts at the speed of commerce."
- **Colour.** Dark hero, then alternating white and light-grey sections; blue accents confined to CTAs.
- **Imagery.** Product screenshots in context, grayscale customer logos, testimonial headshots, geometric check/badge icons.
- **Motion.** Minimal — hover states and scroll-in fades.
- **Trust.** Very dense and very explicit: 15+ enterprise logos (Dropbox, eBay, Asics), named-executive testimonials with photos, **"4.7 on G2"** with stars, **"5,000+ legal teams"**, and a compliance row of SOC 2 Type II, HIPAA, GDPR and — notably — **EU AI Act**.
- **Voice.** "Legal work made magic"; "Spot risks"; "Draft and revise at lightning speed."

**Adapt:** (1) the **third-party-rating** trust device — a verifiable external score outranks self-description, and Placedon's analogue is measurable abstention/citation-accuracy figures published openly; (2) the **regulatory-badge row that names the actual AI statute** rather than only security certs.

**Avoid:** "magic"/"lightning speed" register — for a witness-positioned product, magic is the enemy; the whole promise is that nothing is magic. Avoid the two-CTA hero (demo + free trial), which reads as growth-funnel SaaS rather than a professional instrument.

### 1.3 Anthropic — claude.com/solutions/legal

This is the page Placedon must *most explicitly* not resemble, since the brief bars looking like Claude/Anthropic.

- **Layout.** Modular vertical scroll, alternating full-width sections; hero → webinar CTA → testimonial carousel → "Built for legal work" → feature deep-dives → Anthropic's own legal team as a case study → Free Law Project partnership → tabbed workflow examples ("Legal research", "M&A diligence") → developer/API section ([claude.com/solutions/legal](https://claude.com/solutions/legal)).
- **Typography.** Sans throughout; all-caps micro-labels ("Active", "Verified") used as rhythm/scannability devices.
- **Colour.** Near-black grounds with light text, alternating with neutral logo bands; accent reserved for "Contact sales" / "Try it now."
- **Motion.** Carousel prev/next, video play affordances, tabbed content switching — interaction rather than animation.
- **Trust.** Named marquee firms (Freshfields, Holland & Knight, Crosby Legal) with executive attribution, blind-review benchmark claims, and — most relevant to Placedon — **"Verified" and "Confirm" annotations rendered directly onto legal citations.**
- **Voice.** "Practice better judgment with Claude"; "Confidentiality by design"; and procedural legal-drafting mimicry: **"Pinned to template §5.2"**, **"Flag for counsel — unsettled."**

**Adapt:** (1) **procedural-register microcopy** — status lines written the way a lawyer would annotate a margin, not the way an app would toast a notification; `Flag for counsel — unsettled` is exactly the tone Placedon's abstain state needs; (2) **verification chips attached to the citation itself**, not to the answer as a whole; (3) **tabbed real workflows** as the demo device — but Placedon's tabs should be Companies Act workflows (e.g. s.185 loans to directors, s.188 related-party transactions, CSR under s.135, s.203 KMP appointments) rather than generic "legal research."

**Avoid:** the orange/clay-on-warm-white Anthropic palette; the "Built for X" section-heading construction; a mission/partnership section as the emotional beat; big-firm logo-carousel-as-proof (Placedon won't have those, and faking gravitas with borrowed logos is the fastest credibility loss available).

### 1.4 Quick glances — Legora, Robin AI, Ironclad

**Legora** ([legora.com](https://legora.com/)) — "Legal work, without limits." / "Collaborative AI for exceptional lawyers" / "The agentic operating system for legal work." Sans-only, neutral, hierarchy by size. Compliance stated as a **single declarative line**: *"SOC 2 Type II. ISO 27001. GDPR. HIPAA. Zero AI training on your data."* That last clause is the highest-value sentence on any of these sites for a confidentiality-anxious buyer. **Adapt the sentence form; Placedon's version should be a one-line data covenant** (no training on user matter, no retention beyond session, Indian data residency if true).

**Robin AI** ([robinai.com](https://robinai.com/)) — sans-serif, white-dominant, very restrained accent use. Trust stack leans on **press mastheads** (Forbes, Bloomberg, FT, CNBC), **investor names** (Google, PayPal, Temasek) and hard metrics ("80% faster review", "500k+ docs processed"). Headline voice is problem-first: *"Answering legal questions shouldn't take days."* **Adapt:** problem-first headline construction — far more legible to the general public than category abstractions. **Avoid:** investor-logo trust borrowing.

**Ironclad** ([ironcladapp.com](https://ironcladapp.com/)) — deep green + white with orange/red CTAs, italic emphasis inside the headline (*"Keep Contracts Moving, and Business Growing"*), multi-coloured analyst badges (Gartner MQ, Forrester Wave, G2), circular lifecycle diagrams, logo carousels, card shadows. This is the **most conventional and least premium** of the set: multi-coloured badge rows and stylised illustration are precisely what makes an enterprise page read as generic. **Avoid wholesale.** The one adaptable idea: **italic emphasis inside a headline** as a typographic accent — and Fraunces' true italic makes this far better than Ironclad's execution, giving Placedon an emphasis device that costs zero colour budget.

### 1.5 Cross-cutting read

Every site in this set converges on: warm-or-cool near-monochrome, one accent, sans-dominant type, screenshots-as-proof, a logo wall, a compliance row, and near-zero motion. **The category's whole visual differentiation budget is currently unspent on two things: (a) showing the evidence artefact itself, and (b) motion.** That is exactly where Placedon's settled direction — signature glass + richer purposeful motion — can win without looking like anyone here.

### 1.6 What would make Section 1 look AI-generated (avoid)

- A hero that is a stock/generated photo of a courthouse, gavel, scales of justice, or a "professional in a glass-walled office."
- Three feature cards with 24px line icons, identical heights, and headings of the form *Verb + noun* ("Analyse contracts" / "Track changes" / "Stay compliant").
- A logo wall of companies that are not customers.
- Headline-then-subhead-then-two-buttons hero with a centre-aligned gradient blob behind it.
- Section headings built on "Built for ___", "Powered by ___", "___, reimagined."
- Any claim with a suspiciously round percentage and no methodology link ("10x faster", "90% accurate").

---

## 2. Glassmorphism done right for a serious product — and its accessibility pitfalls

### 2.0 The idea that makes glass *intentional* rather than trendy

Glassmorphism was named by Michal Malewicz (Hype4.Academy) in November 2020 to unify what vendors had been calling "acrylic", "frosted glass" and "blur backgrounds" ([origin note](https://github.com/sneha3236/glass-morphism)). Its defining characteristics are semi-transparency, light borders, and — in the original formulation — *vivid or pastel colour behind the glass*. Placedon has no vivid colour. So the trend's own recipe does not apply, and copying it is what would make the site look generic.

**The substitute rationale — and this should be written into Placedon's design principles — is semantic:**

> The record is opaque. The reading is translucent.

The statute text, the filed document, the gazette extract — these are **opaque, permanent, ink-on-cream**. Everything Placedon *derives* — an extraction, a confidence band, a cross-reference, an abstention — lives on **glass**, because it is a layer *over* the record, not the record itself. Translucency is the visual grammar of derivation: you can always see the source through Placedon's reading of it.

That gives every glass surface a rule for existing. Consequences:
- Glass is used for **chrome and evidence overlays**: the citation chip, the provenance card, the sticky section rail, the abstain panel, the command bar.
- Glass is **never** used for the statute text itself, for long-form body copy, or for a marketing section background "because it looks nice."
- If a surface has no source beneath it that the user benefits from seeing, **it must be opaque.** Glass over a flat void is the single clearest tell of decorative, vibe-coded glassmorphism.

This is also the differentiator from Harvey/Legora/Spellbook, none of whom use glass at all.

### 2.1 The accessibility problem, stated precisely

The effective background of glass text is *whatever shows through*, so contrast is **variable, not fixed**. CSS-Tricks' analysis of Apple's Liquid Glass names it exactly: translucence creates "variable contrast ratios that might work well over one background, but fail over a bright photo" ([CSS-Tricks](https://css-tricks.com/getting-clarity-on-apples-liquid-glass/)). Independent testing of iOS 26 betas found screens "well below WCAG minimum contrast, with some instances at 1.5:1 when the bar is 4.5:1" ([Infinum](https://infinum.com/blog/apples-ios-26-liquid-glass-sleek-shiny-and-questionably-accessible/), [Access Advisors](https://accessadvisors.nz/blog/liquid-glass)). Apple's mitigation was to ship user-facing transparency reduction, and eventually a transparency *slider* — i.e. even the company with the largest design budget on earth could not make unconstrained glass accessible and had to hand users an escape hatch.

The binding requirements:
- **WCAG 1.4.3 Contrast (Minimum), AA** — 4.5:1 for body text, 3:1 for large text (≥24px regular / ≥18.66px bold).
- **WCAG 1.4.11 Non-text Contrast, AA** — "The visual presentation of the following have a contrast ratio of at least 3:1 against adjacent color(s): User Interface Components… Graphical Objects" ([W3C Understanding 1.4.11](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html)). This is the one glass designs fail most often and notice least: **a 1px hairline at 10% opacity is a beautiful glass edge and an illegal control boundary.** Note the exception — *inactive* components are exempt, which is useful for Placedon's disabled states.
- NN/g's position is blunt and worth quoting to stakeholders who push for more transparency: *"Low-contrast text may be trendy, but it is also illegible, undiscoverable, and inaccessible"* ([NN/g](https://www.nngroup.com/articles/low-contrast/)).

**The central technical insight:** blur changes contrast *variance*; tint changes contrast *floor*. Blurring the backdrop makes the text sit on a smoother field — which helps legibility subjectively — but it barely moves mean luminance, so **blur alone never guarantees a contrast ratio.** Only opacity/tint and a bounded backdrop do. Design the tint for the guarantee and the blur for the feel.

### 2.2 Concrete CSS-level guidance for Placedon

These numbers are computed against Placedon's actual tokens: ink `#0C0C0D` (relative luminance ≈ 0.004), warm cream `#F4EFE6` (L ≈ 0.867), brass `#C9A24B` (L ≈ 0.388).

**Rule A — the contrast floor (non-negotiable).**
Text-bearing glass on the dark ground is tinted with **ink at alpha ≥ 0.62**, and **≥ 0.70 is the house default**. Worked example: ink at α=0.62 composited over pure white gives ≈ `#686868` (L ≈ 0.139) → cream text on it = **4.86:1** (passes AA). At α=0.70 the worst case is ≈ `#575757` → **≈ 6.4:1**. At α=0.40 the same glass over white collapses to ≈ 2.6:1 and fails. So: **α=0.40 glass is only ever legal over a backdrop whose luminance is capped.**

**Rule B — cap the backdrop, then you may go thinner.**
If the layer beneath glass is guaranteed to be within Placedon's own dark range (max relative luminance ≤ 0.40 — which brass at full strength exactly hits), ink tint at **α = 0.40** still yields ≈ 4.65:1 for cream text. Enforce the cap in code, not by eye: put every glass panel over a dedicated backdrop layer whose brightest permitted token is brass, and forbid photography/video under glass entirely.

**Rule C — use `brightness()` in the backdrop filter as a contrast guarantee, not `saturate()`.**
The Apple-ish idiom `backdrop-filter: blur(20px) saturate(180%)` exists to rescue colour from a blur. Placedon is near-monochrome; saturation boost has nothing to rescue and will pull unwanted colour out of the warm greys. Replace it with a deterministic luminance clamp:

```css
/* Dark ground, text-bearing glass */
.glass {
  background-color: rgb(12 12 13 / 0.70);          /* Rule A floor */
  backdrop-filter: blur(24px) brightness(0.55);     /* clamp, don't saturate */
  -webkit-backdrop-filter: blur(24px) brightness(0.55);
  border: 1px solid rgb(244 239 230 / 0.10);
  box-shadow:
    inset 0 1px 0 rgb(244 239 230 / 0.14),          /* top light catch */
    inset 0 -1px 0 rgb(12 12 13 / 0.50),            /* bottom seat */
    0 24px 48px -12px rgb(12 12 13 / 0.55);         /* cast, not glow */
  border-radius: 10px;
}
```

`brightness(0.55)` multiplies backdrop luminance, so it *mathematically* bounds what can show through — the single cheapest accessibility win available in a glass system.

**Rule D — blur radius ranges, tied to elevation.** Establish three tiers and forbid ad-hoc values:

| Tier | Use | Blur | Ink tint α | Radius | Notes |
|---|---|---|---|---|---|
| `glass-1` — *chip* | citation chip, confidence band, statute pill | 8–12px | 0.55 | 6px | short text only, never body copy |
| `glass-2` — *panel* | provenance card, abstain panel, filter rail | 20–28px | 0.70 | 10px | the workhorse; the only tier allowed to carry a paragraph |
| `glass-3` — *chrome* | sticky header, command bar, modal scrim surround | 32–40px | 0.78 | 0 / 12px | highest tint because it floats over everything |

Above ~40px the blur stops reading as glass and starts reading as fog, and the GPU cost climbs steeply; below ~8px it reads as a rendering bug. Malewicz's original guidance and most practitioner write-ups converge on avoiding `blur(20px)`+ *with low opacity* specifically because that combination looks soft while failing contrast ([practitioner summary](https://www.newtarget.com/web-insights-blog/glassmorphism/)).

**Rule E — borders and inner shadows are load-bearing, and there are two kinds.**
- *Aesthetic edge:* asymmetric light. A single top-inset highlight at cream 12–14% plus a bottom-inset ink line at ~50% makes the pane read as a physical object catching one light source. A uniform 1px border all round is the flat, generated-looking version.
- *Legal edge (WCAG 1.4.11):* any glass surface that is **interactive** — a button, a tab, a text input, a toggle — needs a boundary or state indicator at **≥3:1 against adjacent colour**. A 10% cream hairline is ~1.3:1 and does not qualify. Placedon's rule: **interactive glass gets a warm-grey ≥3:1 stroke, or it stops being glass on hover/focus and becomes a solid surface.** The focus ring must be solid, 2px, brass `#C9A24B` on the dark ground (brass L 0.388 vs ink 0.004 → ≈ 8.1:1, comfortably clear) with a 2px ink offset so it survives over any tier.

**Rule F — layering over a near-monochrome dark base.** Maximum **two** glass planes stacked in the z-axis anywhere on screen. Glass on glass triples the compositing cost, compounds the tint unpredictably, and destroys the "one pane over the record" metaphor. If a modal opens over a glass rail, the rail must flatten to opaque.

**Rule G — the backdrop-root trap.** `backdrop-filter` is bounded by *backdrop root* elements. Any ancestor with `opacity < 1`, `filter`, `mask`, `clip-path`, `mix-blend-mode`, or `will-change` on those properties creates a root, and the child's blur will then only sample content *between* the ancestor and itself — producing a panel that mysteriously blurs nothing ([MDN: backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)). **This is the #1 reason hand-rolled glass looks broken.** Never fade in a glass panel by animating the *panel's* opacity; animate a child wrapper or use `clip-path`-free transforms.

**Rule H — fallbacks.** `backdrop-filter` reached Baseline in September 2024, but Firefox software-renders blur without WebRender and Safari has historically been inconsistent with filter chains ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter); [Mozilla bug 1718471](https://bugzilla.mozilla.org/show_bug.cgi?id=1718471)). Ship a solid fallback that is *designed*, not degraded:

```css
.glass { background-color: #16161A; }             /* designed opaque default */
@supports (backdrop-filter: blur(1px)) {
  .glass { background-color: rgb(12 12 13 / 0.70);
           backdrop-filter: blur(24px) brightness(0.55); }
}
@media (prefers-reduced-transparency: reduce) {
  .glass { background-color: #16161A; backdrop-filter: none; }
}
@media (prefers-contrast: more) {
  .glass { background-color: #0C0C0D;
           border-color: rgb(244 239 230 / 0.55); }
}
```

Honouring `prefers-reduced-transparency` is the web analogue of the setting Apple was forced to ship; for a product sold on honesty, respecting it is on-brand as well as correct.

**Rule I — performance budget.** Backdrop filters cost more as radius grows, area grows, element count grows, and as the content behind them changes. Concretely for Placedon: **≤3 active `backdrop-filter` surfaces per viewport; never `backdrop-filter` on an element whose backdrop is a scrolling document at 60fps unless it is `position: fixed` and small; never animate `blur()` radius** (animate `opacity` of a sibling scrim or `transform` instead); always pair glass with `contain: paint` where layout allows. Measure on a mid-range Android in Chrome, not on the design machine.

### 2.3 Making glass feel premium rather than trendy — Placedon specifics

1. **Give it a light source and keep it.** One consistent top-left light across every pane. Trendy glass has glow from everywhere; premium glass has one light and a real cast shadow (`0 24px 48px -12px`), never a coloured glow.
2. **Let the record show through *meaningfully*.** The glass provenance card should be positioned so the statute text it cites is the thing visible behind it, faintly. That is a content decision, not a style one, and it is the difference between "glass" and "Placedon's glass."
3. **Brass on glass, once.** Exactly one brass element per glass pane (the verification tick, or the section symbol). Brass is ≤10% of screen globally; on glass it should be ≤1 element.
4. **Mono on glass, for citations only.** IBM Plex Mono set in cream at 13–14px with generous tracking reads as a stamped reference number on a pane. That is the single most "legal instrument" detail available.
5. **Cool grey `#5B6472` is the abstain glass.** The abstain/unknown panel is the one pane that uses cool grey rather than warm — a temperature shift the eye registers before it reads a word. Verify it: cool grey `#5B6472` (L ≈ 0.136) against cream text ≈ 4.9:1 — passes as a *background*, but never use `#5B6472` as text on the dark ground (≈ 3.6:1, fails body text). Cool grey is a **surface and border** token, not a text token.
6. **Sharp beats soft.** 6–12px radii, not 20–24px. Big radii plus heavy blur is the pill-shaped consumer-app look; small radii plus heavy blur reads as an instrument panel.

### 2.4 What would make the glass look AI-generated (avoid)

- Glass panels floating over a **gradient mesh / aurora blob** background. This is the single most recognisable generated-UI signature in existence.
- **Purple-blue gradients** or any colour that is not in the token set bleeding through the blur.
- A **uniform 1px white border at 20% on all four sides** with a symmetrical outer glow.
- `border-radius: 16px` or larger on every card, uniformly.
- Glass over a **solid flat colour** with nothing to see through — transparency with no content behind it is decoration pretending to be depth.
- Three identical glass cards in a row, equal height, each with an icon, heading, and two lines of grey text.
- `backdrop-filter: blur(20px) saturate(180%)` copied verbatim — it is the most-pasted glass snippet on the web and reads as such.

---

## 3. Motion for legal/enterprise trust

### 3.0 The live bug this section must fix

**Audit finding:** the current build animates heading `opacity: 0 → 1` over **550ms** on scroll. Cream `#F4EFE6` text on ink `#0C0C0D` at partial opacity composites to an intermediate colour, and the measured mid-animation ratio is **≈ 2.4:1** — well under the 4.5:1 AA floor of WCAG 1.4.3. The maths confirms it exactly:

| Text opacity | Composited text colour over `#0C0C0D` | Contrast vs ink |
|---|---|---|
| 0.30 | ≈ `#51504E` | **2.46:1** ❌ |
| 0.45 | ≈ `#74736F` | **4.11:1** ❌ |
| **0.48** | ≈ `#7B7975` | **4.53:1** ✅ (exact AA threshold) |
| 0.55 | ≈ `#8C8984` | 5.62:1 ✅ |
| 1.00 | `#F4EFE6` | 14.4:1 ✅ |

So a linear `0 → 1` fade spends roughly the **first 48% of its duration below AA** — about **265ms of every 550ms reveal** — and with an `ease-in` curve it is worse. Every heading on the page is, briefly but repeatedly, illegible while the user scrolls. For a product whose entire pitch is that it does not overstate what can be read, this is a thematic failure as well as a compliance one.

**Three fixes, in order of preference.**

1. **Don't animate text opacity at all. Use `clip-path` (or a masked wipe) plus `transform`.** This is the structurally correct answer. Partial opacity produces a state that is *perceivable but non-compliant*; a clip-path reveal produces a state that is *not yet perceivable at all*, which raises no contrast obligation — the glyph is either fully rendered at 14.4:1 or not painted. It also matches Placedon's register: text is *uncovered*, like a page turning or a redaction lifting, rather than materialising out of fog.

```css
@media (prefers-reduced-motion: no-preference) {
  .reveal > .line {
    clip-path: inset(0 0 110% 0);
    transform: translateY(0.18em);
    transition: clip-path 520ms cubic-bezier(0.22, 0.61, 0.36, 1),
                transform 520ms cubic-bezier(0.22, 0.61, 0.36, 1);
  }
  .reveal.is-in > .line { clip-path: inset(0 0 -10% 0); transform: none; }
}
```

2. **If opacity must be used, set a floor of `0.55`, never `0`.** `opacity: .55 → 1` keeps every frame at ≥5.6:1. Pair it with a short `translateY` so the reveal still reads as motion rather than a brightness flicker. This is the cheap retrofit for existing components.

3. **Never fade the glass panel itself to reveal text on it.** Per Rule G in §2, animating a glass ancestor's `opacity` also creates a backdrop root and silently breaks the blur. Animate a child, or animate `transform` only.

**Trigger thresholds.** The current implementation compounds the problem by starting reveals too late. Set `IntersectionObserver` with `rootMargin: "0px 0px -12% 0px"` and `threshold: 0.15`, so an element begins revealing when ~15% of it has entered and is **finished well before it reaches reading position** (roughly the middle third of the viewport). Additional hard rules:
- **Reveal once.** `unobserve()` after firing. Elements that re-animate on scroll-back are the clearest gimmick tell and they re-inflict the illegible window every time.
- **Above-the-fold content never animates in on scroll.** The hero must be legible at paint. Anything in the first viewport is already-final state.
- **Never bind a reveal's progress to scroll position** (scroll-linked, scrubbed animation) for text. Scroll-driven text opacity means the user can *park* a heading at 30% opacity indefinitely — a permanent 2.4:1 state, not a transient one. Scroll-linked animation is acceptable only for non-text, non-informational layers.

### 3.1 What reads as credible vs gimmicky

Val Head's connection between motion and trust is the frame to work from: *"If interfaces seem nonresponsive or don't pay attention to user input, trust is lost and the quality of experience degrades"* ([Smashing Magazine — Including Animation In Your Design System](https://www.smashingmagazine.com/2019/02/animation-design-system/)). Motion earns trust when it **explains** (where something came from, what changed, what is still loading) and loses trust when it **performs**.

| Reads as credible | Reads as gimmicky |
|---|---|
| An element moves from where it was to where it is (origin-linked transitions) | Elements sliding in from offscreen edges for no reason |
| One deliberate hero moment, then stillness | Every section animating on scroll |
| State changes (verified → abstained) shown as a transition so the change is noticed | Looping ambient motion, floating blobs, drifting gradients |
| Loading/derivation shown honestly with determinate progress | Fake "AI thinking" shimmer that isn't tied to real work |
| Hover feedback in ≤150ms | Parallax on text, tilt-on-mouse cards, magnetic cursors |
| Counters that settle into a final, citable number | Counters that spin decoratively past the real value |
| Reduced-motion users get the same information | Reduced-motion users get a blank or broken page |

For a product called "a witness," the governing metaphor should be **the document, not the interface**: pages settle, margins annotate, references stamp into place. Nothing should float, glow, pulse, or breathe.

### 3.2 Durations and easing — the Placedon motion token set

Val Head's ranges, grounded in NN/g response-time research and the Model Human Processor (*"100ms is perceived as instant, and 1 second is considered the upper limit of a user's flow of thought"*; *"on average it takes a human 230ms to visually perceive something"*), give **200–500ms** as the working band: 200–300ms for small elements, 400–500ms for larger travel or complex easing ([valhead.com](https://valhead.com/2016/05/05/how-fast-should-your-ui-animations-be/)).

```css
:root {
  /* durations */
  --dur-instant: 120ms;  /* hover, focus ring, chip state */
  --dur-quick:   200ms;  /* tooltip, small toggles, tab switch */
  --dur-base:    320ms;  /* panel open, citation expand */
  --dur-reveal:  520ms;  /* scroll reveal of a heading/line group */
  --dur-hero:    1400ms; /* the one orchestrated moment, total span */

  /* easing — custom curves, not CSS defaults */
  --ease-out:   cubic-bezier(0.22, 0.61, 0.36, 1);   /* entrances: decisive, no overshoot */
  --ease-inout: cubic-bezier(0.65, 0, 0.35, 1);      /* moves between two known positions */
  --ease-in:    cubic-bezier(0.55, 0.09, 0.68, 0.53);/* exits only */
}
```

Val Head's specific advice is to **author custom curves rather than use the CSS defaults**, because that is how a brand accumulates "motion equity" ([Smashing](https://www.smashingmagazine.com/2019/02/animation-design-system/)). Placedon's signature should be a **decisive ease-out with zero overshoot** — no bounce, no elastic, no spring. Bounce is friendliness; Placedon is not friendly, it is careful. Ban `cubic-bezier` curves with any control point above 1 across the entire system.

Distance rule: reveals travel **≤ 0.2em / ≤ 12px**. Long travel is what makes scroll animation feel like a presentation deck.

### 3.3 The one orchestrated hero moment

Exactly one. It should **dramatise the product's core claim — that every assertion is anchored to a source** — and then never repeat.

Proposed choreography (total ~1400ms, autoplaying once on load, not scroll-linked):
1. `0ms` — Statute text is already painted, full contrast, opaque, in Fraunces/Inter on cream or ink. **Nothing fades in.**
2. `180ms` — A `glass-2` provenance pane wipes down over the passage (`clip-path`, 420ms, `--ease-out`), with the statute still readable through it. This is the §2 metaphor made literal in the first two seconds.
3. `520ms` — An IBM Plex Mono citation string types/stamps in — better as a **stamp** (scale 1.02 → 1, 160ms) than a typewriter effect, which is the single most overused AI-product animation on the web.
4. `760ms` — A brass `#C9A24B` verification rule draws left-to-right beneath the citation (280ms). This is the only brass motion on the page.
5. `1100ms` — One adjacent claim resolves instead to the **abstain** state in cool grey `#5B6472`, with the label holding still. Showing the product decline to answer *inside the hero* is the strongest possible trust signal and no competitor in §1 does anything like it.
6. `1400ms` — Motion stops entirely. No loop, no idle animation, no ambient drift.

### 3.4 `prefers-reduced-motion` — render the final state

W3C Technique **C39** is the sufficient technique for SC 2.3.3 Animation from Interactions, and offers two shapes ([W3C C39](https://www.w3.org/WAI/WCAG21/Techniques/css/C39)):

```css
@media (prefers-reduced-motion: reduce)        { /* disable motion */ }
@media (prefers-reduced-motion: no-preference) { /* opt motion IN */ }
```

**Use the second form as the default authoring pattern.** Wrapping motion in `no-preference` means the *static, final, fully legible state is the base stylesheet* and motion is an enhancement. The `reduce` form inverts the risk: a selector you forget to override leaves a reduced-motion user staring at `opacity: 0` — content that is present in the DOM, announced by a screen reader, and invisible on screen. That failure mode is common and severe.

Placedon's rules:
- **Reduced motion means final state, not no content.** Every reveal resolves instantly to opacity 1, no transform, no clip.
- **Don't strip all motion — substitute it.** web.dev's guidance is that alternatives such as opacity fades, colour transitions and shortened durations still communicate state change without vestibular risk ([web.dev — Animation and motion](https://web.dev/learn/accessibility/motion)). Under `reduce`, Placedon keeps state-change feedback at `--dur-instant` with no positional travel: a verification tick may still appear, it simply does not travel.
- **The hero moment plays as a still composition** under `reduce` — the final frame, with the abstain state already visible.
- **Offer an in-page toggle too.** web.dev explicitly recommends a site-level animation toggle and suggests *defaulting it to off*. A "Reduce motion" control in Placedon's footer, sitting beside the data covenant, reinforces the honesty positioning.
- Also honour `prefers-reduced-transparency` and `prefers-contrast` alongside it (§2, Rule H) — layering the preference queries together is the recommended practice.
- Nothing autoplays longer than **5 seconds** without a pause control (WCAG 2.2.2), nothing flashes more than **three times per second** (WCAG 2.3.1).

### 3.5 What would make the motion look AI-generated (avoid)

- **Every section fading up on scroll** with the same duration and the same 20px translate — the universal signature of a generated landing page.
- `opacity: 0` as the resting state of any text (the live bug).
- Typewriter / text-scramble / "thinking…" shimmer effects.
- Looping ambient background motion: drifting gradient meshes, floating orbs, animated noise, aurora.
- Parallax on headings, tilt-on-hover cards, magnetic buttons, cursor followers.
- Number counters that spin up on scroll.
- Marquee logo strips scrolling infinitely.
- Spring/bounce easing anywhere in a legal product.
- Scroll-scrubbed hero sequences that hijack scrolling.

---

## 4. Typography craft — Fraunces + Inter + IBM Plex Mono

### 4.0 The two live defects this section must fix

**Audit finding 1 — `WONK` is inconsistent.** The build sets `WONK: 0` on `h1`/`h2` only. Fraunces' `WONK` axis **defaults to 1**, so every other heading (`h3`–`h6`, display spans, pull quotes) renders the *wonky alternates ON*. The WONK axis controls "the lean of the `h`, `n`, and `m` glyphs in the Roman, and the flagged ball terminals of the `b, d, h, k, l, v, w` glyphs of the Italic" ([Fraunces axis documentation](https://fontaza.com/fraunces-font/); [googlefonts/fraunces](https://github.com/googlefonts/fraunces)). The result is a site where the big headings are upright and sober and the smaller ones quietly lean — an inconsistency that reads as carelessness precisely where a legal product cannot afford it.

**Fix: `WONK: 0` globally, on every Fraunces instance, with no exceptions.** Wonk is Fraunces' charm axis — it is what makes the face read as a bakery or a podcast. Placedon is a witness. Set it once on a base class and never override it.

**Audit finding 2 — `opsz` is never set, so the caption cut is being stretched to 88px.** Fraunces' `opsz` axis runs **9 → 144** and defaults to **9**. The axis "ties together changes in contrast, x-height, spacing, and character widths. As opsz decreases, the x-height increases, spacing opens up, and the characters expand in width" — at 9 the strokes thicken and spacing opens for small-size legibility; at 144 it becomes "sharp, high-contrast, almost brittle… what you'd want on a poster headline" ([Fraunces axes](https://fontaza.com/fraunces-font/)).

Leaving `opsz` at 9 on an 88px hero is the exact inverse of correct optical sizing: the hero is currently rendering a **thick, wide, open-spaced, low-contrast caption design blown up to display size**. That is why large Fraunces headings tend to look soft and slightly amateurish rather than editorial. Optical size is, as Pixelambacht puts it, "the hidden superpower of variable fonts" — and it is the one axis whose neglect is visible at a glance ([Pixelambacht](https://pixelambacht.nl/2021/optical-size-hidden-superpower/)).

**Fix: set `opsz` to match the rendered size at every tier.** Two caveats:
- `font-optical-sizing: auto` will do this automatically, **but any `font-variation-settings` declaration listing `opsz` overrides it**, and in several browsers declaring `font-variation-settings` at all resets unlisted axes to their defaults. Because Placedon needs `SOFT` and `WONK` pinned anyway, the safe pattern is **one explicit `font-variation-settings` per tier listing all four axes**.
- The axis is nominally in points; in practice map it to the rendered **px** size and clamp to 9–144. For fluid `clamp()` headings, step `opsz` at breakpoints rather than trying to interpolate it.

```css
.fr { font-family: "Fraunces", Georgia, serif; font-optical-sizing: none; }

/* tier: display / h1 */
.t-display {
  font-size: clamp(2.75rem, 6vw, 4.75rem);           /* 44 → 76px */
  font-variation-settings: "opsz" 72, "wght" 400, "SOFT" 0, "WONK" 0;
  letter-spacing: -0.021em;
  line-height: 1.04;
}
/* tier: section / h2 */
.t-h2 {
  font-size: 2.5rem;                                  /* 40px */
  font-variation-settings: "opsz" 40, "wght" 450, "SOFT" 0, "WONK" 0;
  letter-spacing: -0.014em;
  line-height: 1.12;
}
/* tier: sub / h3 */
.t-h3 {
  font-size: 1.75rem;                                 /* 28px */
  font-variation-settings: "opsz" 28, "wght" 500, "SOFT" 0, "WONK" 0;
  letter-spacing: -0.008em;
  line-height: 1.22;
}
/* tier: pull-quote / statute epigraph (the only italic use) */
.t-quote {
  font-size: 1.5rem; font-style: italic;
  font-variation-settings: "opsz" 24, "wght" 400, "SOFT" 0, "WONK" 0;
  letter-spacing: 0; line-height: 1.38;
}
@media (max-width: 700px) { .t-display { font-variation-settings: "opsz" 44, "wght" 420, "SOFT" 0, "WONK" 0; } }
```

**`SOFT` guidance:** `SOFT` controls "the wetness or inkiness of the typeface… pushing it up rounds off the sharp terminals and gives the letterforms a blobbier, warmer feel," which is the axis "that makes Fraunces read as playful rather than formal" ([Fraunces axes](https://fontaza.com/fraunces-font/)). **`SOFT: 0` everywhere.** The one defensible exception is `SOFT: 8–12` on the wordmark only, at very large sizes, if the logotype needs to shed brittleness — but never in running headings.

**Weight compensation:** because higher `opsz` raises stroke contrast (thins the hairlines), display tiers should carry slightly *lower* weight than mid tiers and still look heavier. Hence 400 at the display tier, 450–500 at h2/h3 above. Do not use Fraunces above ~600 weight anywhere; heavy Fraunces reads as a magazine cover, not a legal instrument.

### 4.1 Division of labour between the three faces

A clean rule that prevents the "three random fonts" look:

| Face | Role | Never used for |
|---|---|---|
| **Fraunces** | Display only: h1–h3, pull quotes, statute epigraphs, the wordmark. Sets the editorial register. | Body copy, UI labels, buttons, tables, anything below ~22px |
| **Inter** | Everything functional: body, UI, labels, nav, buttons, tables, form fields, captions, eyebrows | Display headlines (it has no voice at 76px) |
| **IBM Plex Mono** | **Citations and identifiers only**: section references (`s. 185(1)(b)`), CIN/DIN numbers, case citations, gazette IDs, dates in evidence context, confidence figures | Body copy, headings, general "techy" flavour text |

The discipline that makes this legible as a *system* rather than a font salad: **IBM Plex Mono appears if and only if the string is something a reader could look up.** Mono becomes a semantic signal — "this is a verifiable identifier" — which is precisely Placedon's thesis. The moment mono is used for a button label or a nav item, that meaning is gone.

Harvey's own framing is the benchmark to beat here: TWK Ghost provides "the editorial gravitas of a legal journal" while Diatype is "a measured counterpoint" ([Fonts In Use](https://fontsinuse.com/uses/77027/harvey)). Placedon's third voice — the mono citation — is the thing Harvey does *not* have, and it should be pushed hard.

### 4.2 Scale, measure, leading, tracking

**Type scale** — a ~1.25 ratio through the body range with a deliberate leap to display (the leap is what makes it editorial rather than a default Tailwind ramp):

| Token | px | Face | Line-height | Tracking |
|---|---|---|---|---|
| `display` | 44–76 (fluid) | Fraunces 400 | 1.04 | −0.021em |
| `h2` | 40 | Fraunces 450 | 1.12 | −0.014em |
| `h3` | 28 | Fraunces 500 | 1.22 | −0.008em |
| `lead` | 21 | Inter 400 | 1.52 | −0.005em |
| `body` | 17 | Inter 400 | 1.60 | 0 |
| `body-sm` | 15 | Inter 400 | 1.55 | 0 |
| `caption` | 13 | Inter 450 | 1.45 | +0.005em |
| `eyebrow` | 12 | Inter 600, uppercase | 1.2 | **+0.09em** |
| `cite` | 14 | IBM Plex Mono 450 | 1.45 | +0.01em |

**Tracking rule (the one that separates craft from default):** *tracking runs inversely to size.* Large display type is set too loose by default and must be tightened (−0.015 to −0.025em); small caps, eyebrows and all-caps labels are set too tight and must be opened (+0.06 to +0.10em); body sits at 0. This single rule fixes most of what makes hand-built sites look untuned.

**Measure (line length).** Bringhurst's classic guidance is 45–75 characters with 66 as the single-column ideal; Butterick's *Practical Typography* gives a working band of roughly 45–90 characters and recommends setting it by the point size ([practicaltypography.com — line length](https://practicaltypography.com/line-length.html)). For Placedon:
- Marketing body copy: `max-width: 62ch` (≈ 640px at 17px Inter).
- Lead paragraphs: `52ch` — shorter, because they are read at a glance.
- Statute quotations: `72ch` — legal text tolerates and expects a longer measure, and a slightly longer line reinforces "this is a document, not a card."
- Never centre a paragraph longer than two lines; never justify without hyphenation (and on the web, don't justify at all).

**Leading.** Butterick recommends line spacing of roughly **120–145% of the point size** for body text ([practicaltypography.com — line spacing](https://practicaltypography.com/line-spacing.html)). Placedon runs at the generous end (1.55–1.60) for Inter body because the reading is careful and sustained, and tight (1.04–1.22) for Fraunces display, where the leading should visibly compress to create the editorial "block."

**Tabular figures — mandatory, not optional.** Any number that appears in a column, changes in place, or is compared across rows must use tabular (fixed-width) figures so digits don't shimmy. Inter ships `tnum`, and IBM Plex Mono is monospaced so it is inherently tabular ([Inter — rsms.me/inter](https://rsms.me/inter/)).

```css
.tnum, table td, .metric, .date, .count, .confidence {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
```

Apply to: confidence percentages, section numbers, dates, counts of sources, CIN/DIN strings, pricing, and any animated counter. Additionally, for Inter, consider enabling `ss01`/disambiguation features so `1`/`l`/`I` and `0`/`O` are distinguishable — in a product where a mistyped section number is a legal error, glyph disambiguation is a correctness feature, not a nicety. Inter's "Disambiguation" stylistic set exists for exactly this.

**Self-hosting checklist.** Ship variable WOFF2 for all three; subset Latin (+ any Devanagari needs separately — do **not** stretch Fraunces to cover Hindi); `font-display: swap` with a metrics-matched fallback (`size-adjust`, `ascent-override`) so the CLS from swapping Fraunces → Georgia doesn't jolt the hero; `preload` only the display cut used above the fold.

### 4.3 What would make the typography look AI-generated (avoid)

- A variable font with its axes left at defaults (**the current state**) — soft, wide, wonky Fraunces at 88px is a legible fingerprint of "installed, not designed."
- `WONK: 1` anywhere in a legal product.
- Uniform `letter-spacing: -0.02em` applied to all headings regardless of size, or no tracking adjustments at all.
- `line-height: 1.5` on everything including the hero.
- Full-width body text with no `max-width` / measure constraint.
- Centre-aligned multi-paragraph blocks.
- Mono used decoratively — for buttons, nav, eyebrows, "tech" flavour — instead of semantically for identifiers.
- Gradient-filled headline text (`background-clip: text`).
- All-caps headings with default tracking.
- Proportional figures in tables and counters, so numbers jitter as they change.

---

## 5. Legal-UX credibility — trust, provenance, and honest abstention

### 5.1 The research base

**The single most important citation for Placedon.** Magesh, Surani, Dahl, Suzgun, Manning and Ho, *"Hallucination-Free? Assessing the Reliability of Leading AI Legal Research Tools"* (Stanford RegLab / HAI; arXiv May 2024, peer-reviewed in the *Journal of Empirical Legal Studies*, 2025) — the first preregistered empirical evaluation of proprietary legal AI. Verbatim from the abstract:

> "Recently, certain legal research providers have touted methods such as retrieval-augmented generation (RAG) as 'eliminating' (Casetext, 2023) or 'avoid[ing]' hallucinations (Thomson Reuters, 2023), or guaranteeing 'hallucination-free' legal citations (LexisNexis, 2023). Because of the closed nature of these systems, systematically assessing these claims is challenging… We demonstrate that the providers' claims are overstated. While hallucinations are reduced relative to general-purpose chatbots (GPT-4), we find that the AI research tools made by LexisNexis (Lexis+ AI) and Thomson Reuters (Westlaw AI-Assisted Research and Ask Practical Law AI) each **hallucinate between 17% and 33% of the time**."
> — [arXiv:2405.20362](https://arxiv.org/abs/2405.20362); [Stanford RegLab](https://reglab.stanford.edu/publications/hallucination-free-assessing-the-reliability-of-leading-ai-legal-research-tools/)

Reported accuracy figures: Lexis+ AI answered **65%** of queries accurately; Westlaw AI-Assisted Research **42%**, hallucinating roughly twice as often as the other legal tools tested; Ask Practical Law AI gave incomplete answers on **more than 60%** of queries ([study coverage](https://legalaiworld.com/westlaw-ai-and-lexis-ai-still-hallucinate-what-the-stanford-study-actually-found/); [Cardozo LARC summary](https://larc.cardozo.yu.edu/context/staff-online-pubs/article/1023/viewcontent/New_Study_Shows_Legal_Research_Platform_AI_Tools_Do__In_Fact__Hallucinate___RIPS_Law_Librarian_Blog.pdf)).

**Three design implications fall directly out of this paper, and they define Placedon's positioning:**

1. **Never claim "hallucination-free," "zero hallucinations," "100% accurate," or "eliminates errors."** The most-cited paper in the field exists specifically to demolish those three phrases, by name, with the vendors attributed. Any Placedon marketing copy that echoes them makes the product a footnote in the next version of that study. This is a hard copy constraint, not a stylistic preference.
2. **The paper's headline contribution for UX is its typology separating hallucination from accuracy — critically distinguishing a statement that is *wrong* from one that is *right but misgrounded*** (accurate proposition, citation that does not actually support it). A misgrounded citation is more dangerous than an obvious error because it survives a skim. **Placedon's citation UI must therefore be able to express two independent axes — "is the claim right?" and "does this source actually support it?" — not one blended "confidence" number.** No competitor in §1 does this.
3. The paper closes by noting it "provides evidence to inform the responsibilities of legal professionals in **supervising and verifying** AI outputs." Supervision is the user's job, and the interface's job is to make supervision *cheap*. Design for the verifying reader, not the trusting one.

**How practitioners actually decide to trust.** Survey evidence converges on conditional trust: verification remains the norm and AI is treated as an assistant rather than an authority; **35%** of legal professionals name inaccurate or incomplete information as their top concern; trust is higher for purpose-built legal tools than general chatbots; and *source authority* is repeatedly identified as the crucial differentiator for evaluating teams ([Filevine Legal AI Trust Index](https://www.filevine.com/guides/ai-trust-index-survey-report/); [Artificial Lawyer](https://www.artificiallawyer.com/2026/03/23/legal-ai-access-at-83-but-trust-issues-remain/); [Thomson Reuters on benchmarking legal AI](https://legal.thomsonreuters.com/blog/benchmarking-and-evaluating-ai-solutions-in-legal-work/)). The recurring mental model in the literature is that lawyers evaluate AI output **the way they evaluate a junior associate's memo** — check the supporting evidence, consider alternative readings, decide whether the conclusion holds ([Thomson Reuters](https://legal.thomsonreuters.com/blog/benchmarking-and-evaluating-ai-solutions-in-legal-work/)).

**Design consequence:** Placedon's output should be shaped like **a junior's memo with a source-checked margin**, not like a chat reply. Proposition, pin-cite, the quoted provision itself, and a "what would change this answer" line.

**Transparency and trust in the interface.** NN/g's Page Laubheimer: *"Establishing trust with users requires acknowledging AI's limits and fallibility."* Their work also finds that language itself — tone, clarity, transparency — directly affects trust, and that users are substantially more likely to rely on systems that display confidence levels or explain their reasoning than on black-box answers ([NN/g via UXmatters summary](https://www.uxmatters.com/mt/archives/2025/11/the-design-psychology-of-trust-in-ai-crafting-experiences-users-believe-in.php); [NN/g articles index](https://www.nngroup.com/articles/)). Source links, inline citations and hover explanations are named as the concrete mechanisms.

The older but still-load-bearing baseline is Stanford's Web Credibility Project guidelines (B.J. Fogg et al.) — show the real organisation behind the site, make it easy to contact you, show credentials, cite and link sources, keep the site current, and avoid any whiff of promotional excess ([credibility.stanford.edu](https://credibility.stanford.edu/guidelines/index.html)). For a solo-founder Indian legal product, "show that there's a real organisation behind the site" is not boilerplate — it is the highest-leverage credibility item available.

**Abstention.** The survey literature (*"Know Your Limits: A Survey of Abstention in Large Language Models"*, [arXiv:2407.18418](https://arxiv.org/abs/2407.18418)) frames abstention as a confidence-thresholded decision, and applied write-ups report that **users welcome abstention in high-stakes work, preferring an explicit "I do not know" to a speculative answer, and read it as a signal of honesty and of where the evidence boundary lies** ([Float — Productizing Uncertainty](https://floatfinancial.com/blog/productizing-uncertainty-how-we-taught-our-ai-to-say-i-dont-know/)). The consistent UX rule across these sources: **when you show uncertainty you must also show a path forward**, and confidence UI must be risk-aware ([Confidence UI pattern](https://medium.com/@Modexa/the-confidence-ui-pattern-that-users-actually-trust-ff27e1a8a956)). Calibration is the open problem — neither token probabilities nor verbalised confidence are reliably calibrated — which is a strong argument against exposing raw percentages.

### 5.2 Displaying citations and provenance — Placedon specifics

**The citation is the product.** Given "a witness, not a tool," the citation should be the *most* designed object on the site, not a footnote. Concrete spec:

- **Pin-cite granularity, always.** `Companies Act, 2013 — s. 185(2)(b)` in IBM Plex Mono, never "the Companies Act" or "Section 185." A witness testifies to a specific line.
- **Quote the provision inline, verbatim, opaque.** Below every assertion, the actual statutory text in Fraunces italic or Inter at `72ch` measure, on an opaque cream/ink surface (the record is never on glass — §2). Verbatim quotation is the thing a lawyer checks first; making them click for it destroys the entire trust proposition.
- **Two independent chips, per the Stanford typology.** Do not merge them:
  - `SUPPORTED` — the quoted text supports the proposition (groundedness).
  - `CURRENT AS OF 12 AUG 2026` — the provision is in force and unamended at that date (currency).
  A claim can be grounded in a repealed section; a claim can cite a live section that says something else. Two separate failures deserve two separate indicators.
- **Version and amendment lineage.** Indian corporate law amends constantly. Show `as amended by Companies (Amendment) Act, 2020` and make superseded text reachable. A visible diff between the pre- and post-amendment provision would be genuinely novel in this category and is the single strongest "witness" feature imaginable.
- **Source class, stated plainly.** Bare Act / Gazette notification / MCA circular / Rules / case law are not equally authoritative. Label the class in the eyebrow style rather than flattening everything into "source."
- **Brass is the verification colour, and only that.** `#C9A24B` marks a verified pin-cite and nothing else — not CTAs, not decorative rules, not hover states. One accent with exactly one meaning is how a monochrome system stays legible, and it makes verification scannable at a glance down a page.
- **Timestamp and jurisdiction in the footer of every result.** Retrieved date, corpus version, jurisdiction. Cheap to build, disproportionately credible.
- **Publish your own benchmark.** The Stanford paper's implicit challenge to the industry is that closed systems can't be assessed. A public methodology page with Placedon's own measured grounding accuracy and abstention rate — including the numbers that are unflattering — would be a stronger trust asset than any logo wall, and is the honest analogue of Spellbook's "4.7 on G2" (§1.2).

**For the general-public reader (the second audience).** The site must be readable by a founder or a journalist without losing the practitioner. The device that serves both: **a plain-language line and a citation line, stacked, always in the same order and always visually distinct.** Inter for the plain-English claim; IBM Plex Mono for the pin-cite directly beneath, at 14px. The layperson reads the top line and stops; the advocate's eye goes straight to the mono. Nobody is patronised and nothing is hidden. Do not build a "simple mode" toggle — it implies one of the two readings is the real one.

### 5.3 Designing the abstain / unknown state so it looks competent

This is the highest-risk screen in the product. A blank state, a grey box, or an error icon reads as *broken*. The design goal is to make abstention read as **a considered professional judgment**, which in practice means it should look like the *most* worked-out state in the interface, not the least.

**Seven rules:**

1. **Cool grey `#5B6472` is the abstain temperature, and it is a surface/border token only.** Verified against Placedon's palette: `#5B6472` (L ≈ 0.136) behind cream `#F4EFE6` text gives ≈ 4.9:1 — fine as a background. As *text* on the ink ground it is ≈ 3.6:1 and **fails AA for body copy**. So: cool grey panel, cream text. Never cool-grey text at body size.
2. **Abstain panels are full-weight, not dimmed.** No reduced opacity, no lower type scale, no `disabled` styling. Dimming says "nothing here"; Placedon means "something specific here."
3. **Name the reason, in legal register.** Never "No results" or "I'm not sure." Use taxonomy the way a practitioner would: `No provision on point`; `Conflicting authority — unresolved`; `Outside corpus — Companies Act 2013 only`; `Provision amended; commencement not notified`; `Requires facts not in evidence`. Anthropic's `Flag for counsel — unsettled` (§1.3) is the exact tonal target.
4. **Say what *is* known.** The strongest abstention shows its work: the nearest provisions checked, what they cover, and precisely where the boundary sits. "I checked ss. 185, 186 and 188 and none addresses X" is an answer. Silence is not.
5. **Always show a path forward** — the single consistent finding across the uncertainty-UX literature. Every abstain panel ends with a concrete next action: the nearest relevant provisions, the MCA circular that might govern, an export of the search trail, or "escalate to counsel."
6. **No numeric confidence percentages.** Calibration research says verbalised and probability-based confidence are both poorly calibrated, and a precise-looking "73% confident" on a legal question is false precision — exactly the overclaiming the Stanford paper punishes. Use a **three-state ordinal** instead: `Supported` / `Partially supported` / `No support found`, each defined in a linked glossary. Ordinal bands with published definitions are defensible; decimals are not.
7. **Put abstention in the marketing, not just the product.** Feature the abstain state in the hero (§3.3) and give it a named section on the page. Every competitor in §1 markets capability; marketing *restraint* is Placedon's whole differentiator and it is currently unoccupied territory in legal tech.

**Copy compliance note (verify with counsel, do not guess):** Placedon is a software product, not an advocate, but Indian marketing for legal-adjacent products sits near the Bar Council of India's restrictions on legal-practice advertising (Rule 36 of the BCI Rules), and the site must not read as offering legal advice or soliciting legal work. The safe framing — which is also the honest one — is that **Placedon reports what the statute says; it does not advise.** "A witness, not a tool" already carries this. Pair it with an explicit, visible line: *Placedon is a research instrument. It does not provide legal advice.* Add the data covenant in the Legora one-line style (§1.4) — no training on user matter, retention policy, Indian data residency — and reference DPDP Act 2023 compliance if accurate.

### 5.4 What would make the credibility layer look AI-generated (avoid)

- The phrases **"hallucination-free," "100% accurate," "zero errors," "always cites its sources"** — named and demolished in the field's most-cited paper.
- Fake precision: "94.7% confidence", "Trust Score: 8.6/10", animated confidence meters.
- A **shield / lock / checkmark icon trio** as the trust section.
- Generic compliance badges with no linked trust centre or policy.
- Testimonials with invented names, generic titles ("Senior Partner, Leading Law Firm"), or AI-generated headshots. **If Placedon has no customers yet, ship no testimonial section at all** — an empty space is credible; a fabricated quote is unrecoverable.
- Logo walls of firms that are not customers.
- "Powered by GPT-4 / Claude / [model]" as a credibility claim. Model provenance is not evidence provenance, and the Stanford result shows model quality did not prevent double-digit hallucination rates.
- An abstain state rendered as a greyed-out empty card with a magnifying-glass icon and the words "No results found."
- A disclaimer buried in 11px grey at the bottom of the footer — which reads as legal cover rather than honesty. Put it where it will be read.

---

## Appendix — consolidated source list

**Competitors / brand**
- Harvey — https://www.harvey.ai/ · [design principles](https://www.harvey.ai/blog/how-we-approach-design-at-harvey) · [design system rebuild](https://www.harvey.ai/blog/rebuilding-harveys-design-system-from-the-ground-up) · [typefaces, Fonts In Use](https://fontsinuse.com/uses/77027/harvey) · [basement.studio case study](https://basement.studio/post/from-seed-to-unicorn-how-we-supercharged-harvey-ai)
- Spellbook — https://spellbook.com/ (spellbook.legal 301s here)
- Claude legal solutions — https://claude.com/solutions/legal
- Legora — https://legora.com/ · Robin AI — https://robinai.com/ · Ironclad — https://ironcladapp.com/

**Glassmorphism / accessibility**
- W3C, Understanding SC 1.4.11 Non-text Contrast — https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html
- MDN, `backdrop-filter` — https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter
- CSS-Tricks, Getting Clarity on Apple's Liquid Glass — https://css-tricks.com/getting-clarity-on-apples-liquid-glass/
- Infinum, iOS 26 Liquid Glass accessibility — https://infinum.com/blog/apples-ios-26-liquid-glass-sleek-shiny-and-questionably-accessible/
- Access Advisors, Liquid Glass accessibility challenges — https://accessadvisors.nz/blog/liquid-glass
- NN/g, Low-Contrast Text Is Not the Answer — https://www.nngroup.com/articles/low-contrast/
- Glassmorphism origin (Malewicz / Hype4) — https://github.com/sneha3236/glass-morphism
- Mozilla bug 1718471, backdrop-filter blur perf — https://bugzilla.mozilla.org/show_bug.cgi?id=1718471

**Motion**
- Val Head, How fast should your UI animations be? — https://valhead.com/2016/05/05/how-fast-should-your-ui-animations-be/
- Val Head / Smashing, Including Animation In Your Design System — https://www.smashingmagazine.com/2019/02/animation-design-system/
- W3C Technique C39 (`prefers-reduced-motion`, SC 2.3.3) — https://www.w3.org/WAI/WCAG21/Techniques/css/C39
- web.dev, Animation and motion — https://web.dev/learn/accessibility/motion

**Typography**
- googlefonts/fraunces — https://github.com/googlefonts/fraunces
- Fraunces axes explained (opsz / SOFT / WONK) — https://fontaza.com/fraunces-font/
- Pixelambacht, Optical size: the hidden superpower of variable fonts — https://pixelambacht.nl/2021/optical-size-hidden-superpower/
- Butterick, Practical Typography — [line length](https://practicaltypography.com/line-length.html) · [line spacing](https://practicaltypography.com/line-spacing.html)
- Inter — https://rsms.me/inter/

**Legal-UX credibility**
- Magesh et al., *Hallucination-Free?* — https://arxiv.org/abs/2405.20362 · https://reglab.stanford.edu/publications/hallucination-free-assessing-the-reliability-of-leading-ai-legal-research-tools/
- Know Your Limits: A Survey of Abstention in LLMs — https://arxiv.org/abs/2407.18418
- Filevine, Legal AI Trust Index — https://www.filevine.com/guides/ai-trust-index-survey-report/
- Thomson Reuters, Benchmarking and evaluating AI in legal work — https://legal.thomsonreuters.com/blog/benchmarking-and-evaluating-ai-solutions-in-legal-work/
- UXmatters, The Design Psychology of Trust in AI (summarising NN/g) — https://www.uxmatters.com/mt/archives/2025/11/the-design-psychology-of-trust-in-ai-crafting-experiences-users-believe-in.php
- Stanford Web Credibility guidelines — https://credibility.stanford.edu/guidelines/index.html
- Float, Productizing Uncertainty — https://floatfinancial.com/blog/productizing-uncertainty-how-we-taught-our-ai-to-say-i-dont-know/
