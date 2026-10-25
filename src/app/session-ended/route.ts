import { NextResponse, type NextRequest } from "next/server";
import { ACCOUNT_SESSION_COOKIE, SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Where a session the gateway rejected (HTTP 401: revoked, expired, signed out elsewhere)
 * is sent. Only a route handler or server action may delete a cookie, and /login sends
 * anyone holding one straight back to /app -- so the cookie is cleared here, once, and the
 * person lands on sign-in with a reason. It removes only this browser's own cookies.
 */
export function GET(request: NextRequest) {
  // The browser's own host, not the server's idea of it: dev reports "localhost" for a page
  // opened on 127.0.0.1, and cookies are per host.
  const target = request.nextUrl.clone();
  const host = request.headers.get("host");
  if (host) target.host = host;
  target.pathname = "/login";
  target.search = "?ended=1";
  const response = NextResponse.redirect(target);
  response.cookies.delete(ACCOUNT_SESSION_COOKIE);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
