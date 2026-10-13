"""Run the real backend gateway on this laptop and hand this app a key.

Why a script and not a command: the gateway's key store is in memory, so a key exists
only for as long as the process that minted it. Something has to mint one and give it to
the web app. Doing that by hand means the key passes through a terminal, a shell history
and `ps` — so this writes it straight into `.env.local` and never prints it.

    python3 scripts/local-gateway.py

Reads `PLACEDON_DATABASE_URL` and the Azure credentials from the BACKEND's own `.env`.
Nothing here reads or writes a secret anywhere else.
"""
import io
import os
import pathlib
import secrets
import sys

WEB = pathlib.Path(__file__).resolve().parent.parent
BACKEND = pathlib.Path(
    os.environ.get("PLACEDON_BACKEND", WEB.parent / "placedon-law-backend")
).resolve()
PORT = int(os.environ.get("GATEWAY_PORT", "8000"))

# A tenant id and an actor id, fixed so that runs from one local session are readable in
# the next. Not secrets: row-level security compares against them, it does not trust them.
TENANT = "00000000-0000-0000-0000-000000000001"
ACTOR = "00000000-0000-0000-0000-0000000000a1"

if not (BACKEND / "gateway" / "app.py").exists():
    sys.exit(f"No gateway found at {BACKEND}. Set PLACEDON_BACKEND to the backend repo.")

sys.path.insert(0, str(BACKEND))
os.chdir(BACKEND)

from checker.env import load as load_env  # noqa: E402

load_env()

from gateway.app import create_app  # noqa: E402
from gateway.auth import KeyStore  # noqa: E402

db_url = os.environ.get("PLACEDON_DATABASE_URL")
if not db_url:
    sys.exit(
        "PLACEDON_DATABASE_URL is not set in the backend's .env. Without it the gateway "
        "runs on an in-memory store and every run vanishes when you stop it."
    )

# The tenant AND the actor rows must exist: conversations.actor_id and runs.actor_id are
# FOREIGN KEYS to actors, so conversation.send FK-fails on Postgres without the actor (R-019).
# Both use the fixed ids the key is minted with below. app.tenant_id is set first because the
# actors insert is under FORCE ROW LEVEL SECURITY, which checks tenant_id against it.
import psycopg  # noqa: E402

with psycopg.connect(db_url, autocommit=True) as conn:
    conn.execute("SELECT set_config('app.tenant_id', %s, false)", (TENANT,))
    conn.execute(
        "INSERT INTO tenants (tenant_id, name) VALUES (%s, 'local-console') "
        "ON CONFLICT DO NOTHING",
        (TENANT,),
    )
    conn.execute(
        "INSERT INTO actors (actor_id, tenant_id, label) VALUES (%s, %s, 'local-console') "
        "ON CONFLICT DO NOTHING",
        (ACTOR, TENANT),
    )

keys = KeyStore()
# `lawyer`, not the `viewer` default. Measured 04-10-2026: with a viewer key every WRITE
# verb answers 403 -- vault.upload, review_table.create, draft.create and draft.revise all
# need `lawyer` (gateway/roles.REQUIRED) -- so the local console could read the app and not
# use it. `admin` is deliberately NOT used: nothing this console does needs it, and a local
# key with more authority than the screens require is a habit worth not forming.
raw, principal = keys.mint(tenant_id=TENANT, actor=ACTOR, label="local-console",
                           role="lawyer")

# The /app console sign-in gate needs a passcode (src/lib/auth/session.py: APP_PASSCODE).
# Generate one so the gate works out of the box, independent of APP_SESSION_SECRET (which
# signs the cookie — session.ts refuses to run if the two are equal). Written to .env.local
# like the key, NEVER printed: read it back with `grep APP_PASSCODE .env.local` to sign in.
passcode = secrets.token_urlsafe(12)

# Written, not printed. The four lines are replaced rather than appended, so running this
# twice does not leave a stale key above a live one.
env_path = WEB / ".env.local"
managed = ("GATEWAY_URL=", "PLACEDON_GATEWAY_KEY=", "APP_SESSION_SECRET=", "APP_PASSCODE=")
existing = io.open(env_path, encoding="utf-8").read() if env_path.exists() else ""
kept = "\n".join(l for l in existing.splitlines() if not l.startswith(managed))
io.open(env_path, "w", encoding="utf-8").write(
    (kept.rstrip("\n") + "\n" if kept.strip() else "")
    + f"GATEWAY_URL=http://127.0.0.1:{PORT}\n"
    + f"PLACEDON_GATEWAY_KEY={raw}\n"
    + "APP_SESSION_SECRET=local-only-session-secret-not-for-deployment\n"
    + f"APP_PASSCODE={passcode}\n"
)
print(f"Key minted (id {principal.key_id}) and written to .env.local. Its value is not printed.", flush=True)
print("Sign-in passcode written to .env.local (APP_PASSCODE), not printed. "
      "`grep APP_PASSCODE .env.local` to read it.", flush=True)
print(f"Gateway starting on http://127.0.0.1:{PORT} — leave this window open.", flush=True)

import uvicorn  # noqa: E402

uvicorn.run(create_app(keys=keys), host="127.0.0.1", port=PORT, log_level="warning")
