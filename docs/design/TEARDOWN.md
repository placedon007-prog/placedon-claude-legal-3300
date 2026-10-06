# /app teardown — what serious AI work tools do, and what Placedon takes from them

Captured 2026-10-06 for PR #6. Screenshots in `docs/design/refs/`. **These are references for
patterns only.** No layout, icon, logo or copy from them is reproduced in Placedon.

How the measurements were taken: from 1440 px headless captures, read off the pixels. They are
estimates to ±2 px, not values from anyone's stylesheet. Where a product is behind a login, only
its public marketing capture was available, and the entry says so.

Could not capture: **Perplexity** (Cloudflare bot check, deleted), **Mobbin** and **Pinterest**
(login walls, not attempted with credentials), **claude.com/product** (rendered blank before its
lazy content loaded; Claude's thread pattern is described from the 21st replicas and first-hand
product knowledge instead, and marked as such).

## The references

| # | File | Source URL | What it is |
|---|------|-----------|-----------|
| 1 | `harvey-assistant.png` | https://www.harvey.ai/platform/assistant | Harvey marketing page with a product frame: thread + right "Progress / Context / Properties" rail |
| 2 | `harvey-home.png` | https://www.harvey.ai/ | Harvey home |
| 3 | `legora-home.png` | https://legora.com/ | Legora home (marketing only; product behind login) |
| 4 | `cocounsel.png` | https://www.thomsonreuters.com/en/cocounsel | CoCounsel marketing (product behind login) |
| 5 | `chatgpt-loggedout.png` | https://chatgpt.com/ | ChatGPT logged-out shell: sidebar + centred composer |
| 6 | `claude-home.png` | https://claude.com/product/overview | Blank capture; kept as proof of the attempt |
| 7 | `dribbble-legal-ai.png` | https://dribbble.com/search/legal-ai-assistant | Dribbble search, "legal ai assistant" — the anti-reference |
| 8 | `21st-source-citation-rail.png` | https://21st.dev/@rmahammad/components/source-citation-rail | Inline [n] markers synced to a source list |
| 9 | `21st-message-thread.png` | https://21st.dev/@mohammadshehadeh/components/message-thread | Thread with tool call, sources row, streaming caret |
| 10 | `21st-conversation-list.png` | https://21st.dev/@arihantcodes_1f7b8c4d/components/conversation-list | Date-grouped history |
| 11 | `21st-chatgpt-prompt-input.png` | https://21st.dev/@jahed/components/chatgpt-prompt-input | The owner's composer starting point |
| 12 | `21st-prompt-input-stop.png` | https://21st.dev/@tinkerers-labs/components/prompt-input | Composer with send ↔ stop swap |
| 13 | `21st-agent-chat.png` | https://21st.dev/@serafimcloud/components/agent-chat | Empty-state chat shell |
| 14 | `21st-streaming-text.png` | https://21st.dev/@arihantcodes_1f7b8c4d/components/streaming-text | Streamed prose with superscript markers and follow-ups |
| 15 | `21st-ai-sources.png` | https://21st.dev/@elements-/components/sources | Collapsible sources block |

## Teardown

### 1. Harvey — Assistant product frame (ref 1)
- **Grid:** three columns inside the frame: icon rail ~40 px · thread ~640 px centred in a ~900 px
  pane · right rail ~240 px. The thread column is narrow; the right rail holds the work's state.
- **Sidebar:** icons only (new, chat, vault, tables, history, …). No conversation titles in the rail.
- **Type:** UI sans ~12–13 px in the frame; thread body ~13 px / ~1.55. Headings absent from the
  thread — hierarchy comes from the user bubble vs plain prose. Marketing display face is a serif.
- **Spacing/borders/radius:** hairline 1 px grey dividers between rail sections; user bubble radius
  ~10 px on a pale grey fill; almost no shadow inside the product.
- **Answer layout:** plain prose paragraphs, no bubble, left-aligned under a right-aligned user
  bubble. Status of the work lives in the right rail as a struck-through checklist ("4 of 4 steps").
- **Citations:** right rail has an Outputs / Sources toggle; files listed with type icon and name.
- **Composer:** not visible in the capture.
- **States visible:** done (struck steps). Others not shown.
- **Why it feels premium:** restraint. One grey, one ink, hairlines, the content is the only thing
  with weight. Work state is separated from the prose instead of being sprinkled through it.

### 2–4. Harvey, Legora, CoCounsel — marketing (refs 2–4)
Useful only for tone. Harvey: serif display + black buttons on off-white. Legora: full-bleed
photography and a green accent. CoCounsel: dark green field, orange accent, four identical cards
with arrows — the **card-row-with-arrows pattern is exactly the template look to avoid**. None
shows the product's citation behaviour publicly in a capturable form.

### 5. ChatGPT — logged-out shell (ref 5)
- **Grid:** sidebar 260 px · main fluid; composer max ~768 px centred, vertically centred when empty.
- **Sidebar:** brand, collapse toggle, "New chat", feature links with 18 px line icons, footer CTA.
  Items ~36 px tall, 14 px text, no section labels.
- **Type:** 14 px UI, 24 px empty-state heading at regular weight (not bold). One family.
- **Composer:** pill, radius ≈ full (~26 px), 1 px border + very soft shadow; `+` left, mic and a
  round send right; send is disabled-tinted until text exists.
- **Empty state:** one sentence, one composer, nothing else.
- **Why it feels premium:** emptiness is allowed. No suggestion cards, no illustrations.

### 6. Claude (from product knowledge; capture failed)
- Thread column ~720–768 px. User turns in a light filled bubble; assistant turns as unboxed prose
  with real headings and lists. Hover-revealed actions under each answer (copy, retry, feedback).
- Composer: rounded rectangle (~16–20 px radius), attach + tools on the left, model picker and send
  on the right; Enter sends, Shift+Enter breaks.
- Artifacts/documents open in a right-hand panel and the thread narrows — the closest pattern to a
  source panel.
- **Why it feels premium:** prose typography is treated as the product — measure, line-height and
  heading rhythm are book-like.

### 7. Dribbble "legal ai assistant" (ref 7) — the anti-reference
Purple/neon gradients, glowing CTAs, phone mockups held by hands, stock lawyer portraits, gauges
showing a "68%" confidence ring, tag pills in five colours. **Every one of these is what the owner
calls slop**, and two (the confidence gauge, colour-only status) would also break AGENTS.md.

### 8. Source citation rail (ref 8)
- Inline square markers `[1]` in the line, filled when active. Source list below in a bordered card
  with a tinted header, an "ACTIVE" pill, a left accent bar and a green "Verified" badge.
- **Take:** the marker ↔ list sync and keyboard navigation. **Leave:** the tinted header, left
  accent bar, coloured badges and pill — all banned by the brief.

### 9. Message thread (ref 9)
- Avatar disc on each assistant turn, a collapsed "Thought for 4s", a tool-call row with a status
  dot, prose, then an inline "SOURCES" row of numbered pill chips, timestamps under each turn.
- **Take:** sources as a compact numbered row directly under the prose; the tool row as a single
  quiet line. **Leave:** avatar discs, tracked caps labels, green status dots.

### 10. Conversation list (ref 10)
Today / Yesterday / Previous 7 days groups, 14 px titles, active row on a grey fill with ~12 px
radius, pin icon on hover. **Take:** grouping and the grey-fill active row. **Leave:** tracked-mono
caps group labels (a known generated-UI tell); use sentence-case 12 px grey instead.

### 11–12. Prompt inputs (refs 11, 12)
ChatGPT replica: rounded container, `+`, tools button, mic, round black send. Tinkerers: send swaps
to a square stop while a reply streams; auto-grow; Enter/Shift+Enter. **Take both**; ours keeps
the tools menu and adds the stop swap for when `/v2/ask/stream` lands.

### 13. Agent chat (ref 13)
Centred empty state with a heading and composer, attachment chips above the textarea, error state
as an inline message. **Take:** attachment chips sit *inside* the composer above the text.

### 14. Streaming text (ref 14)
Small superscript grey number badges after the sentence, "2 sources" with stacked discs, a
follow-ups list with ↵ glyphs. **Take:** markers small and after punctuation. **Leave:** suggested
follow-ups — for a legal witness, inventing the next question is advocacy.

### 15. AI sources (ref 15)
"Used N sources" collapsible, favicon + title + host per row. **Take:** collapsed by default
when there are more than three sources. **Leave:** favicons — a statute has no favicon.

## What separates the premium ones from the slop

Premium (Harvey frame, ChatGPT, Claude): one ink, one grey family, hairlines instead of boxes, a
narrow reading column, prose that is typeset rather than dumped in bubbles, state separated from
content, empty screens allowed to be empty, motion only when something changes.

Slop (Dribbble, half the component catalogue): tinted headers on every card, coloured status
pills, accent bars, avatar discs, ALL-CAPS tracked labels, gradient glows, confidence gauges,
suggestion-card grids on the empty state, follow-up prompts, three shadows at once.

## Ten principles Placedon's console follows

1. **The answer is a document, not a message.** Assistant replies are unboxed prose in a 680 px
   column at 16/28; only the user's words sit in a bubble.
2. **State first, in words.** Every answer opens with one line — icon + label — saying what kind
   of answer it is. Colour never carries state; shape and words do.
3. **A citation is a number that opens evidence.** Small square marker after the sentence →
   numbered Sources under the answer → click opens the Source panel with the served quote and its
   evidence line. A section number that the backend did not serve is never shown.
4. **Evidence is mono, claims are sans.** Instrument, provision, chars, sha256 and in-force date
   are one mono line under the reference. Nothing else is mono.
5. **One ink, five greys, hairlines.** No fills on cards except the user bubble and the active row;
   1 px borders; at most one shadow in the system (the composer).
6. **Radius tracks size.** Composer 24 px, bubbles 18 px, panels/cards ≤ 10 px, chips 6 px. Not one
   radius on everything.
7. **Empty means one sentence and the composer.** No suggestion cards, no illustration, no
   follow-up prompts we wrote ourselves.
8. **Limits are quiet but always present.** DRAFT playbook and model region appear as one grey line
   on every result, not a banner stack at the top of every screen.
9. **Failure is not refusal, visibly.** "Did not arrive" uses a dashed outline and a Try again
   button; "Not answered" names its reason. They never share a shape.
10. **Motion only answers an action** (panel opens, status changes), ≤ 200 ms, and the
    reduced-motion user gets the end state immediately.
