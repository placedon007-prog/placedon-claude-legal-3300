# /app console — verification screens (2026-10-07)

Captured by `capture.mjs` (Playwright + axe-core) against a **production build** (`next build &&
next start`) talking to the **real gateway** — backend main 7e0e38f plus PR #78 (`citation.get`
serves the section), on its in-memory store. Nothing on
these screens is a fixture: every answer, abstention and citation is what the gateway served.
"Did not arrive" was captured by stopping that gateway, so the failure is a real transport error.

Widths: 1440 · 1024 · 390 (file suffix).

| File | What it shows |
|------|---------------|
| `ask-empty-*` | Empty state: one sentence and the composer |
| `ask-answered-*` | Answered; at ≥1024 the source panel opens with the first cited answer, showing the whole section with the cited passage marked |
| `ask-panel-closed-*` | The panel closed: the thread takes the full width |
| `ask-source-sheet-390` | Below 1024 the source panel is a bottom sheet |
| `ask-abstained-*` | Not answered; the reasons, body by body |
| `ask-mixed-*` | An abstention that still carried a cited passage — set aside under its own label |
| `ask-clarify-*`, `ask-thread-full-*` | Further turns; the whole thread (full page) |
| `ask-did-not-arrive-*` | Transport failure: dashed box, "this is not a refusal", Try again |
| `ask-reduced-motion-1440` | `prefers-reduced-motion: reduce` — 0 elements animating |
| `composer-tools-1440` | The Tools menu |
| `sidebar-expanded-*`, `nav-sheet-390` | Expanded sidebar with this browser's threads; the phone sheet |
| `screen-*` | Every other console screen in the same system (full page) |
| `axe-live.json`, `axe-dead.json` | axe-core (WCAG 2.0/2.1/2.2 A+AA) at 1440 and 390: **0 violations** |
| `keyboard-walkthrough.txt` | 30 Tab presses on Ask: order and visible focus for each stop |

The composer's textarea shows focus on its frame (the border turns ink), not as an outline on
the field, which is why the walkthrough lists it as `focus-visible:NO`.
