# Design loop progress

## 2026-10-06 — iteration 1
- Branch claude/conversation-ui-2026-10-06; origin/main already merged (nothing to merge).
- Phase 0: 21st MCP works (search). ui-ux-pro-max installed. Anthropic frontend-design exists in
  claude-plugins-official marketplace (not installed as a plugin; SKILL.md read and followed).
  shadcn NOT initialised yet (no components.json). Playwright: use cached chromium-1208 binary.
- Phase 1 DONE: TEARDOWN.md + 15 refs (Perplexity blocked, Mobbin/Pinterest login-walled, claude.com blank).
- Phase 2 DONE: SYSTEM.md. Key finding: backend main serves conversation.send/get/list and
  citation.get (quote + sha256 + in_force_from); frontend still calls `ask`, so the Source panel
  needs the new verbs. No /v2/ask/stream on backend main.
- NEXT (Phase 3): /app/design-lab with A Document (memo, marginal citations), B Chat, C Split
  (permanent source viewer). It sits under the /app layout, so render each direction as a fixed
  full-screen overlay. Fixture = ANSWER_S96 in src/lib/gateway/mock.ts (not exported; copy the
  string). Screenshot 1440 + 390, put them in the PR body, ASK the owner to pick. Stop there.

## 2026-10-07 — iteration 2
- Phase 3 DONE: /app/design-lab?d=a|b|c (A Document, B Chat, C Split). Screens in docs/design/lab/.
  `.console-main > *` caps width at 62rem (unlayered CSS) — the lab overlay sets maxWidth inline.
- node_modules was missing @radix-ui/react-tooltip/popover (in package.json, not installed);
  `npm install --cache $TMPDIR/npm-cache` fixed it with no lockfile change.
- WAITING ON OWNER: pick A, B or C (and confirm the name "Wall System"). No hi-fi until then.

## 2026-10-07 — iteration 3 (owner chose C)
- PR #6 had merged; #7 (owner) merged the lab commits into main. New branch
  claude/console-redesign-2026-10-07 from main, draft PR #8. PR #6 body restored.
- Phase 0 finished: shadcn init (radix) — tokens scoped, init's global changes reverted.
- Phase 4: tokens in app.css (`.console, [data-slot]`) + names in globals @theme. Font trial
  on the live Ask screen (Inter / IBM Plex Sans / Geist) → Plex Sans (pairs with Plex Mono
  evidence lines), subset woff2 69 KB.
- Phase 5 (Ask): conversation.send/get + citation.get; Split workspace; sidebar; composer.
  Recorded fixtures from a live gateway (in-memory store; placedon_dev lacks migrations
  010–023 and was NOT migrated by hand).
- Backend gaps found: no verb serves full section text; in_force_from always null;
  /v2/ask/stream exists but wraps `ask` and emits steps only at completion.
- NEXT: Phase 6 — screenshots of every screen/state at 1440/1024/390, axe, keyboard,
  reduced motion, build; delete /app/design-lab; AGENTS.md /app section; hand-off.

## 2026-10-07 — iteration 4 (verify + hand-off)
- Phase 6: typecheck · lint · 61 tests · build all green. 56 screens at 1440/1024/390 against a
  production build and the real gateway (docs/design/screens/). axe 0 violations; keyboard walk
  recorded; reduced motion leaves 0 elements animating.
- Self-critique fixes: dropped the header that repeated the question; marker never wraps away
  from its sentence; abstention-with-citations set aside under its own label; native controls
  forced light; sheet overlay blur removed (glass is banned); mono reserved for evidence.
- /app/design-lab deleted. AGENTS.md has the "/app console" design system.
- WAITING ON OWNER: approve the final screenshots in PR #8. Do not merge.

## 2026-10-07 — iteration 5 (full section text)
- Backend PR bubblebee1408/placedon-law-backend#78: citation.get returns `section {text,start,end}`
  only on a re-verified quote. Gate 317/0 green. Merge was blocked by the permission check —
  OWNER TO MERGE #78.
- Frontend: panel shows the whole section once with all cited passages marked (fail-closed
  offsets), hard wraps joined for display. 65 tests. Screens recaptured; axe 0.
