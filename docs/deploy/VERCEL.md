# Deploy Placedon to Vercel

This makes the **whole website** browsable by anyone at a public URL — the same
site you see on `localhost:3300`, A to Z. It is one-click after you connect the
repo. The repo can stay **private**; only the deployed site is public.

## What you get
- Every page live: `/`, `/product`, `/how-it-works`, `/pricing`, `/about`,
  `/security`, `/faq`, `/waitlist`, `/privacy`, `/terms`, `/cookies`, and the
  four product surfaces under `/product/…`.
- Product surfaces run on the **mock engine** (real Companies Act, 2013
  fixtures), so they render fully with no backend.
- The request form stays **closed** (pre-launch) — safe to show publicly.
- The site is served **`noindex`** until you set `SITE_ORIGIN` (below), so it
  won't be picked up by Google while it's pre-launch.
- Serverless functions run in **Mumbai (`bom1`)** for the Indian market
  (configured in `vercel.json`).

## Steps (about 2 minutes)
1. Go to **https://vercel.com** and sign in with the GitHub account that can see
   `placedon007-prog/placedon-claude-legal-3300` (or add Vercel to that org).
2. **Add New… → Project → Import Git Repository** → pick this repo.
   - If the repo isn't listed, click **Adjust GitHub App Permissions** and grant
     Vercel access to it (needed because the repo is private).
3. Vercel auto-detects **Next.js**. Leave the defaults:
   - Framework Preset: **Next.js**
   - Build Command: `next build` (auto)
   - Install Command: `npm install` (auto)
   - Root Directory: repo root (auto)
4. **Environment Variables:** none are required for the public demo — leave them
   all unset. (See the table below for what to set later.)
5. Click **Deploy**. In ~1–2 minutes you get a public URL like
   `https://placedon-claude-legal-3300.vercel.app` that anyone can open.

## Optional environment variables (set later, not needed for the demo)
Unset = the safe pre-launch defaults. Set these only when you're ready.

| Variable | Effect when set |
|---|---|
| `SITE_ORIGIN` | Your public URL. Turns on canonical/OG URLs, sitemap, and lets you allow indexing. Leave unset to stay `noindex`. |
| `SITE_PUBLICATION_READY` | `true` allows search indexing (only with `SITE_ORIGIN`). |
| `PLACEDON_API_ORIGIN` | Point the product surfaces at the **real backend** instead of the mock engine (server-only, e.g. `http://127.0.0.1:8020`). |
| `WAITLIST_ENABLED` + `WAITLIST_SINK_URL` + `PRIVACY_NOTICE_VERSION` + `CONSENT_VERSION` | Open the request form and record submissions. Keep closed until counsel-reviewed. |

Never commit real values — set them in **Vercel → Project → Settings →
Environment Variables**. Secrets stay out of git (`.env*` is git-ignored).

## Redeploys
Every push to `main` auto-deploys. Pull requests get their own preview URLs.
