# Documentation index

| Document | What it is |
|---|---|
| [../README.md](../README.md) | Start here: status, stack, architecture, where things live, gotchas |
| [../AGENTS.md](../AGENTS.md) | Binding brand, voice, honesty and engineering rules — re-read before every change |
| [RUN_LOCALLY.md](RUN_LOCALLY.md) | Run the `/app` console against the real backend gateway |
| [deploy/VERCEL.md](deploy/VERCEL.md) | Production deploy (Vercel, auto-deploy from `main`) |
| [deploy/AZURE.md](deploy/AZURE.md) | Optional Azure App Service deploy (`BUILD_STANDALONE=1`) |
| [app-screens/README.md](app-screens/README.md) | Live console screenshots and every way the live system differed from the mock |

## `archive/` — history, not instructions

| Document | What it was |
|---|---|
| [archive/ASTRA_MASTER_PROMPT.md](archive/ASTRA_MASTER_PROMPT.md) | An early master build prompt for the frontend |
| [archive/RAG-INTEGRATION.md](archive/RAG-INTEGRATION.md) | Early RAG / backend integration notes, superseded by the gateway contract in `AGENTS.md` |
| [archive/specs/](archive/specs/) | September 2026 redesign dossiers: codebase, backend contract, design research, visual audit, build plan |

The backend's own architecture (features, integrations, agents) lives in the
`placedon-law-backend` repository: `docs/ARCHITECTURE.md`, `docs/FEATURE_ARCHITECTURE.md`,
`docs/PLATFORM_FEATURES_AND_INTEGRATIONS.md`.
