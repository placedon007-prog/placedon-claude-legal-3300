# Status — the /app console (2026-10-08)

Branch `claude/console-redesign-2026-10-07`, draft PR #8. Not merged: the owner approves the
final screenshots first. Design system of record: AGENTS.md → "/app console".

## Completed

**Research and design**
- `docs/design/TEARDOWN.md`: 15 references (Harvey, Legora, CoCounsel, ChatGPT, Claude, 21st.dev
  components, Dribbble as the anti-reference) and the 10 principles the console follows.
- `docs/design/SYSTEM.md`: screens, the gateway verbs each calls, the answer state machine, the
  citation model, and the responsive rules.
- Three low-fi directions were built; the owner chose **C — Split** (2026-10-07).

**The Split workspace (Ask)**
- Ask runs on the conversation layer (`conversation.send` / `conversation.get`). The thread id
  is in the URL (`?c=`) and in this browser's thread list.
- Each question is a heading. The answer is prose with numbered citation markers, a Sources
  list, one quiet line of standing limits (law read as at · Playbook DRAFT · UAE North · not
  legal advice), and copy / draft-from-this / view-run actions on hover or focus.
- The answer registers are told apart by shape and words, never colour: answered, partly
  answered, a lawyer needs to decide, not answered (reason named, body by body), needs
  clarification, queued, and **did not arrive — this is not a refusal** (dashed box, Try
  again). An abstention that still carries cited text sets that text aside under its own label.
- **Source panel**: docked at ≥1024 px and closed until a citation is clicked (it also opens
  with the first cited answer). Below 1024 px it is a bottom sheet. Every quote is re-read
  through `citation.get`. With backend PR #78 the panel shows the **whole section** with the
  cited passage marked; a mark is drawn only where the offsets slice back to the exact quote.

**Sidebar and composer**
- An icon rail with a tooltip on every icon, and an expand toggle remembered per browser
  (labelled links, Today / Previous 7 days, search over this browser's threads). It becomes
  a sheet on phones.
- The **Placedon mark** (inline SVG, from `brand-kit/logo/`) replaces the placeholder "P".
- An initials avatar and an account menu in the style of Claude.
- Composer (from the owner's 21st.dev prompt input, rebuilt on shadcn):
  - "+" stores a PDF/DOCX in **Wall System**, then opens it in Document Check.
  - Tools: Research, Draft (a removable chip), Check a document, Review a contract.
  - The mic is disabled, with the tooltip "Voice input — coming soon".

**Welcome line** (owner request)
- A two-line greeting, then a badge saying what was recognised and why.
  - Open the console at 1 am: **"Hey Night Wolf, / what are we checking tonight?"** ·
    *Night Wolf · Late-night session*.
  - A habit from the user's own history (8+ questions over 3+ days, mostly in one band)
    lasts all day.
  - With a name set, name and nickname alternate by day ("Hey Nishant," / "Hey Night Wolf,").
- Personas: Night Wolf (10 pm–4 am), Early Riser (5–8 am), Weekend Warrior.
- Everything is kept in this browser only. The account menu turns nicknames off and forgets
  the pattern.

**System**
- Console tokens: 5 greys, 3 text steps (all AA on white), 6 type sizes, 3 radii, one shadow,
  motion of 200 ms or less with reduced motion honoured.
- IBM Plex Sans, subset to a 69 KB woff2.
- shadcn primitives, scoped so the marketing site is unchanged.
- The console stays black on white even when the OS is in dark mode.
- The other screens (Wall System, Document Check, Contracts, Documents, Review tables, Drafts,
  Calendar, Runs) use the same system.

**Verification**
- typecheck · lint · **76/76 tests** · build.
- axe (WCAG 2.0/2.1/2.2 A+AA): 0 violations.
- Keyboard walkthrough; reduced motion leaves 0 elements animating.
- 56 screens at 1440/1024/390 against the real gateway (`docs/design/screens/`). They predate
  the logo, avatar and welcome-line changes and are re-captured before approval.

**Backend** (`bubblebee1408/placedon-law-backend`)
- **PR #78** — `citation.get` serves the section a quote was re-read from. Gate 317/317 green.
  **Waiting for the owner to merge.**

## Open — needs the owner
1. Merge backend PR #78 (the whole-section source panel).
2. Approve the final screenshots, then merge PR #8.
3. The local `placedon_dev` database lacks migrations 010–023 (no `conversations` table). They
   must be applied deliberately; the backend's own script refuses to touch `placedon_dev`.
4. Publishing to `probonhs/Main-product-frontend-` (see below).

## Next — planned
1. **Real login** (owner decision: invite-only accounts).
   - Backend: `POST /v2/auth/login` (email + password → a per-person session key, 8 h),
     `GET /v2/auth/me`, `POST /v2/auth/logout`, `POST /v2/invites` (admin), `GET /v2/people`,
     `POST /v2/auth/accept`; plus a script to create the first admin.
   - Started in backend branch `claude/accounts-login`: the account lookups for both stores,
     and session keys that expire and can only be revoked by their holder (tested). Not yet
     committed.
   - Frontend: a sign-in page, an accept-invite page, and an admin People page. Every request
     is made as the signed-in person; the greeting and avatar use the account name.
2. Re-capture all screens at 1440/1024/390 for approval.
3. Deploy (`vercel --prod`) once a reachable gateway with a migrated database is configured,
   then verify the live URL end to end.
4. Streaming, once the backend streams a conversation turn. `/v2/ask/stream` today wraps
   `ask` and emits its steps only when the run ends.
