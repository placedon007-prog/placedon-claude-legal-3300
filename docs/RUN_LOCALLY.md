# Running the console on your own machine

This gets `/app` — Ask, Contracts, Runs — working on your laptop against the real backend,
the real database and the real model. It is not a deployment and must not be treated as
one: the console has no passcode unless you set one, and the model is in UAE North, so
**only test documents go through it.**

Written for someone who does not write software. Every command is one line. Type it, press
Enter, wait for it to finish, then go to the next one. Where a command must keep running,
it says so — leave that window alone and open a new one.

Every command below has been run on this machine, in this order, on 2026-09-29.

---

## Before you start, once

You need three things installed. If you have run this before, skip to
[Every time](#every-time-three-windows).

**1. Postgres.** Download Postgres.app from <https://postgresapp.com>, drag it to
Applications, open it, and click **Initialize**. Leave it running — it sits in the menu
bar. This is the database the console writes its runs to.

**2. The two folders.** This guide assumes they are side by side:

```
~/PlacedOn/placedon-law-backend          the engine, the gateway, the corpus
~/PlacedOn/placedon-claude-legal-3300    this website, which the console lives in
```

If yours are somewhere else, every `cd` below changes to match.

**3. The backend's `.env` file.** It holds the database address and the Azure key. It is
not in Git, on purpose. If `~/PlacedOn/placedon-law-backend/.env` does not exist, you
cannot run this — ask whoever set the project up for a copy. **Never paste its contents
into a chat, an issue or a terminal that logs.**

Then install what each side needs. These take a few minutes and print a lot:

```bash
cd ~/PlacedOn/placedon-law-backend && python3 -m pip install -r requirements-gateway.txt
```

```bash
cd ~/PlacedOn/placedon-claude-legal-3300 && npm install
```

---

## Set the database up, once

This creates the tables, creates the restricted role the gateway logs in as, and then
**proves** that one tenant cannot read another's rows. Run it from the backend folder:

```bash
cd ~/PlacedOn/placedon-law-backend && PYTHONPATH=. python3 scripts/rls_integration.py --run
```

It prints a long list of `[PASS]` lines and ends with:

```
all properties proved on PostgreSQL 18.6 (Postgres.app) as placedon_app.
```

If you see that line, the database is ready. **If you see `[FAIL]` anywhere, stop and
report it** — a failure here means the isolation between tenants is not switched on, and
nothing downstream is worth looking at until it is.

Running this again later is safe. It does not wipe anything.

---

## Every time: three windows

You need three Terminal windows. Two of them stay open while you use the console.

### Window 1 — Postgres

Open Postgres.app from Applications. The elephant icon in the menu bar should show your
server **running**. Nothing to type. If it is already running, you are done here.

### Window 2 — the gateway (leave this open)

```bash
cd ~/PlacedOn/placedon-claude-legal-3300 && python3 scripts/local-gateway.py
```

It prints two lines and then appears to hang. That is correct — it is serving:

```
Key minted (id …) and written to .env.local. Its value is not printed.
Gateway starting on http://127.0.0.1:8000 — leave this window open.
```

The script creates an API key and writes it straight into `.env.local`, which is where the
website reads it from. **The key is never printed and never typed**, because anything you
type into a terminal is saved in your shell history.

To check it is alive, in any other window:

```bash
curl -s http://127.0.0.1:8000/v1/health
```

The answer should contain `"kind":"postgres"` and `"degraded":false`. If it says
`"kind":"memory"`, the database was not reached and every run will vanish when you stop
the gateway — go back to Postgres.app.

### Window 3 — the website (leave this open)

```bash
cd ~/PlacedOn/placedon-claude-legal-3300 && npm run dev
```

Wait for `Ready in …`. Then open <http://127.0.0.1:3300/app> in a browser.

If you would rather run it the way it runs in production — slower to start, faster to use:

```bash
cd ~/PlacedOn/placedon-claude-legal-3300 && npm run build && npm run start:local
```

---

## Using it

Three screens, linked across the top.

- **Ask** — one question against the held statute. Try *"What is the time limit for holding
  an annual general meeting under section 96?"*. The answer is sentences that each carry
  the provision and the character span they were read from. A question the corpus cannot
  answer comes back as a named abstention, not a guess — try a SEBI question and see.
- **Contracts** — attach a `.docx` or a `.pdf` **that has a real text layer**, or paste the
  text. Tick *"This is a test document"*, then Review. A scan has no text layer and is
  refused rather than half-read.
- **Runs** — every question and review leaves a run. Open one to see each step, which model
  served it, which region it ran in, and what it cost in rupees.

If you need something to try it on, invent one — a page of made-up NDA clauses works, and
the ten fixtures the backend tests against are built in code, in
`agents/review_contract.py`, rather than kept as files. Anything you would not email to a
stranger does not go through this.

### What you will see, and why it is not a fault

- **`ACCESS · No passcode is configured`** — the console is open to anyone who can reach it.
  Fine on a laptop. Set `APP_PASSCODE` in `.env.local` before it goes anywhere else.
- **`degraded route`** next to the model — there is no Anthropic credit, so Azure Llama
  served the call instead. Expected, per PLAN_22 §3.
- **`UNPRICED`** in a cost column — that step called no model, so there is nothing to price.
  It is not a cost of zero, and it never renders as one.
- **`Partial answer`** — some sentences the model wrote did not trace back to evidence and
  were dropped from the summary. The count is shown. This is the product working.

---

## Stopping

In Window 3 and Window 2, press **Ctrl-C** in each. Quit Postgres.app from the menu bar if
you want the database down too.

The gateway's API key lives only in memory, so stopping Window 2 destroys it. The next
`local-gateway.py` mints a fresh one and rewrites `.env.local`. Your runs stay in the
database.

---

## When it does not work

| What you see | What it means |
|---|---|
| `PLACEDON_DATABASE_URL is not set` | The backend's `.env` is missing or unreadable. |
| `No gateway found at …` | The two folders are not side by side. Set `PLACEDON_BACKEND` to the backend folder's path. |
| `"kind":"memory"` from `/v1/health` | Postgres is not running. Open Postgres.app. |
| `Address already in use` | A gateway is already running. Either use it, or `GATEWAY_PORT=8001 python3 scripts/local-gateway.py`. |
| Every question errors, none abstains | The website is not reaching the gateway. Check Window 2 is still open, then restart Window 3 so it re-reads `.env.local`. |
| A transport error on screen | It will say so in its own words. **An abstention and a network failure are deliberately different states** — if you ever see a network problem rendered as "abstained", that is a bug worth reporting. |

## The rules this setup does not relax

- **Test documents only.** The model is in UAE North and that region has not been confirmed
  acceptable for client data (PLAN_22 D3). The tick box on Contracts is you stating the
  document is a fixture.
- **The playbook is `DRAFT`.** No lawyer has approved those rules. A finding is a potential
  issue against a commercial standard, never a statement that a clause is valid or void.
- **No passcode means no access control.** Do not put this on a network.
