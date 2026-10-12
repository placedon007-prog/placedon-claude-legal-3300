import assert from "node:assert/strict";

// Run against a local server with APP_PASSCODE and APP_SESSION_SECRET configured.
// Requests deliberately have no session cookie: the public login must remain reachable
// while each protected entry point redirects before exposing any tenant data.
const origin = process.env.AUTH_TEST_ORIGIN ?? "http://localhost:3315";
const parsed = new URL(origin);
assert.ok(["localhost", "127.0.0.1"].includes(parsed.hostname), "Use a local test server");

const login = await fetch(new URL("/login", origin), { redirect: "manual" });
assert.equal(login.status, 200, "An unauthenticated person can reach the sign-in page");
const html = await login.text();
assert.match(html, /name="passcode"/, "The sign-in form is rendered outside the app guard");

for (const path of ["/app", "/app/vault", "/app/tables"]) {
  const response = await fetch(new URL(path, origin), { redirect: "manual" });
  assert.equal(response.status, 307, `${path} requires a session`);
  assert.equal(new URL(response.headers.get("location"), origin).pathname, "/login");
}

console.log("8 authentication HTTP assertions passed.");
