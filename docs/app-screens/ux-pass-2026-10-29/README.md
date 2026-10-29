# Console UX pass — 2026-10-29

Live captures, isolated harness (synthetic data), `local-stack/program/tests/ux-capture.mjs`,
desktop 1440×1000 and mobile 390×844, full page. `before-*` = origin/main ed35ff3, `after-*` = this branch.

| Change | Where it shows |
|---|---|
| Step headings inside a form or fieldset were unstyled body text beside bold siblings ("1. Add the contract", "2. Set the check date…"); now the same section heading as the rest | contracts, document-check |
| Page titles are the page's `h1` (were `h2`, and 10 of 12 screens had no `h1`); look unchanged | every tool page (metric only) |
| Disclosure rows in forms are 44 px tall with their marker kept ("Use an existing Wall System document ID" was 26 px) | document-check |
| Checkbox 13 px → 18 px; its whole label stays the target | document-check |

Measured on all 12 console screens × 2 widths: horizontal overflow 0 before and after; screens
with exactly one `h1`: 2/12 → 12/12.
