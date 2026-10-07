# /app console — verification screens (2026-10-08)

Captured by `capture.mjs` (Playwright + axe-core) against a **production build** (`next build &&
next start`) of this branch, talking to the **real gateway** — backend PR #78 head `49110d3`
(`citation.get` serves the section), started fresh on its in-memory store. Nothing on these
screens is a fixture: every answer, abstention and citation is what that gateway served.
"Did not arrive" was captured by stopping the gateway, so it is a real transport failure.
The greeting states pin the clock and this browser's storage; nothing is asked for them.

Widths: 1440 · 1024 · 390 (file suffix). 66 screenshots.

| File | What it shows |
|------|---------------|
| `greeting-first-midnight-*` | First visit at 12:40 am: "Hey Night Wolf, / what are we checking tonight?" · badge *Night Wolf · Late-night session* |
| `greeting-named-midnight-*` | Name set, after midnight: the greeting alternates name and nickname by day (here "Hey Nishant,") |
| `greeting-habit-afternoon-*` | A night habit (8+ questions over 3+ days) recognised at 3 pm: *Most of your questions come between 10 pm and 4 am* |
| `greeting-plain-evening-*` | An ordinary weekday evening: "Evening, Nishant. / What's on your mind?", no badge |
| `account-menu-1440` | The account menu: initials avatar, name, nicknames switch, forget my pattern, sign out |
| `ask-empty-*` | The welcome screen at capture time |
| `ask-answered-*` | Answered; at ≥1024 the source panel opens with the first cited answer — the whole section, every cited passage marked, the opened one underlined |
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
| `keyboard-walkthrough.txt` | 30 Tab presses on Ask: order and visible focus at each stop |

In the keyboard walk, `body` is the page itself (start, and Tab wrapping round), and the
composer's textarea shows focus on its frame (the border turns ink) rather than as an outline
on the field; every control shows a visible focus ring.
