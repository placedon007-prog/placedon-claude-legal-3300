/**
 * Stands in for `import "server-only";`. That package is not a dependency of this
 * project and adding one is out of scope, so the boundary is enforced at module
 * evaluation instead: any client bundle that pulls a provider in fails loudly
 * rather than shipping the engine origin and token to the browser.
 *
 * Replace this module with the real `server-only` import if the package is added.
 */
if (typeof window !== "undefined")
  throw new Error(
    "src/lib/engine is server-only and must not be imported into a client component.",
  );
export {};
