/**
 * Extension-less imports, for `node --test` only.
 *
 * The app's modules import `"../engine/server-guard"` because that is what TypeScript and
 * the Next bundler resolve. Node's ESM resolver wants a real filename. Rather than rewrite
 * every import in the app to suit the test runner — which would bend the shipped code
 * around its tests — the runner is taught the same resolution.
 *
 * Registered with `--import ./tests/resolve-ts.mjs`. No dependency.
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./resolve-ts-hooks.mjs", pathToFileURL("./tests/"));
