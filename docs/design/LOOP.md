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
