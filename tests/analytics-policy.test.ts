import assert from "node:assert/strict";
import { test } from "node:test";
import { ANALYTICS_COLLECTION_ENABLED } from "../src/lib/analytics-policy";
import { track } from "../src/lib/track";

test("same-document marketing-to-private history changes cannot emit analytics even with a preexisting gtag", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const events: unknown[] = [];
  const location = { pathname: "/product", href: "https://example.test/product" };
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location, gtag: (...args: unknown[]) => events.push(args) } });
  try {
    assert.equal(ANALYTICS_COLLECTION_ENABLED, false);
    track("page_view");
    location.pathname = "/app";
    location.href = "https://example.test/app?c=private-thread";
    track("page_view", { page_location: location.href });
    location.pathname = "/login";
    track("form_start");
    assert.deepEqual(events, [], "neither automatic initialization nor manual calls may collect in this build");
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
