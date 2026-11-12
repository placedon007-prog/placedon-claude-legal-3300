# Deploy Placedon to Azure App Service

Hosts the full Next.js app (server components, dynamic routes, API) on Azure App
Service using your Azure credits, deployed straight from GitHub. No environment
variables are required for the pilot — mock product data, the Web3Forms lead
form, and Google Analytics all work with defaults.

The app runs as a Node server via `next start`, which listens on the port App
Service provides (`$PORT`). Every push to `main` redeploys automatically once
connected.

## One-time setup (Azure Portal — ~10 min)

### 1. Create the App Service
1. **portal.azure.com** → search **App Services** → **+ Create → Web App**.
2. Fill in:
   - **Resource group:** create one, e.g. `placedon-rg`.
   - **Name:** `placedon-web` → the site will be `placedon-web.azurewebsites.net`.
   - **Publish:** **Code**
   - **Runtime stack:** **Node 20 LTS**
   - **Operating System:** **Linux**
   - **Region:** **Central India** (or nearest).
   - **Pricing plan:** **Basic B1** recommended (Free F1 can run out of memory
     during the Next.js build; if you must use F1 and the build fails, upgrade to
     B1).
3. **Review + create → Create**, wait for it to finish, then **Go to resource**.

### 2. Set the startup command
1. App Service → **Settings → Configuration → General settings**.
2. **Startup Command:** `npm start`
   *(this runs `next start`, which uses App Service's port automatically)*
3. **Save.**

### 3. Add one app setting (build on deploy)
1. **Settings → Configuration → Application settings → + New application setting**:
   - Name: `SCM_DO_BUILD_DURING_DEPLOYMENT` · Value: `true`
2. **Save** (this tells Azure to run `npm install` + `npm run build` on deploy).

### 4. Connect GitHub (Deployment Center)
1. App Service → **Deployment → Deployment Center**.
2. **Source:** **GitHub** → authorise if asked.
3. **Organisation:** `placedon007-prog` · **Repository:** `placedon-claude-legal-3300`
   · **Branch:** `main`.
4. **Build provider:** choose **App Service build service (Oryx)** if offered
   (simplest — builds on Azure, no workflow file). If only **GitHub Actions** is
   offered, that's fine too — Azure generates and commits the workflow itself
   with the right permissions.
5. **Save.** Azure pulls the repo, builds, and deploys. First build ~3–6 min.

### 5. Verify
- Open **`https://placedon-web.azurewebsites.net`**.
- You should see the site, the cookie banner, and the form (delivers to
  `placedon007@gmail.com`).
- If you get an "Application Error", check **Deployment Center → Logs** and
  **Log stream** — usually the build ran out of memory on Free tier (→ use B1) or
  the startup command wasn't set to `npm start`.

## Custom domain (placedon.com) — after the app is live on Azure
1. App Service → **Settings → Custom domains → + Add custom domain** → `placedon.com`.
2. Azure shows a **TXT** (verification) record and an **A** or **CNAME** target.
   Add them in **Google Cloud DNS** (where placedon.com is managed).
3. **Validate → Add**, then enable the free **App Service Managed Certificate**
   for HTTPS. Repeat for `www.placedon.com`.

⚠️ Point placedon.com at **either** Vercel **or** Azure, not both. Pick your
production host before adding DNS records.

## Optional environment variables (App Service → Configuration → App settings)
None needed for the pilot. Later:
- `SITE_ORIGIN=https://placedon.com` + `SITE_PUBLICATION_READY=true` → allow
  search indexing (do this only after legal review).
- `PLACEDON_API_ORIGIN` → point product surfaces at the real backend instead of
  the mock engine.

## Notes
- `start` = `next start` (uses `$PORT`); `start:local` keeps port 3300 for local use.
- Keep the App Service runtime on Node 20 to match local.
- Vercel stays live and unaffected — you can compare both and choose which to keep.
