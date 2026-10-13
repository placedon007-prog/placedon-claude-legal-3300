import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

const CANDIDATES = [".ts", ".tsx", "/index.ts", "/index.tsx"];
const SOURCE_ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), "../src");

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = resolvePath(SOURCE_ROOT, specifier.slice(2));
    for (const ext of CANDIDATES) {
      const candidate = resolvePath(base + ext);
      if (existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (specifier.startsWith("next/")) {
      try {
        return await nextResolve(`${specifier}.js`, context);
      } catch {
        // Fall through to the existing relative TypeScript resolution below.
      }
    }
    if (!specifier.startsWith(".") || !context.parentURL) throw error;
    const base = dirname(fileURLToPath(context.parentURL));
    for (const ext of CANDIDATES) {
      const candidate = resolvePath(base, specifier + ext);
      if (existsSync(candidate)) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
    throw error;
  }
}
