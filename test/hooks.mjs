/**
 * test/hooks.mjs — Node module-resolution hooks for `node --test`.
 *
 * The codebase uses TypeScript-style imports that Node can't resolve on its
 * own: the `@/…` path alias (tsconfig `paths`) and extensionless relative
 * imports (`./util`). This resolve hook rewrites both to real files so the
 * native test runner (Node ≥ 22 type-stripping) can load the source as-is —
 * no bundler, no install. Registered via test/setup.mjs.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath, extname } from "node:path";
import ts from "typescript";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const EXTS = [".ts", ".tsx", ".mts", ".js", ".mjs", ".json"];

/** Find the real file for a bare absolute path (try extensions + /index). */
function realFile(absNoExt) {
  if (extname(absNoExt) && existsSync(absNoExt)) return absNoExt;
  for (const e of EXTS) if (existsSync(absNoExt + e)) return absNoExt + e;
  for (const e of EXTS) {
    const idx = resolvePath(absNoExt, "index" + e);
    if (existsSync(idx)) return idx;
  }
  return null;
}

export function resolve(specifier, context, nextResolve) {
  let abs = null;

  if (specifier.startsWith("@/")) {
    abs = resolvePath(ROOT, specifier.slice(2));
  } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    // Only intervene for extensionless or .ts/.tsx specifiers; let Node handle
    // fully-qualified .js/.mjs (e.g. the hook/setup files themselves).
    const ext = extname(specifier);
    if (!ext || ext === ".ts" || ext === ".tsx") {
      const parent = context.parentURL ? dirname(fileURLToPath(context.parentURL)) : ROOT;
      abs = resolvePath(parent, specifier);
    }
  }

  if (abs) {
    const file = realFile(abs);
    if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  }

  try {
    return nextResolve(specifier, context);
  } catch (err) {
    // Fallback for bare package subpaths without a usable exports map
    // (e.g. "next/server" → node_modules/next/server.js). Bare names only.
    if (/^[^./]/.test(specifier) && specifier.includes("/")) {
      const file = realFile(resolvePath(ROOT, "node_modules", specifier));
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
    }
    throw err;
  }
}

/**
 * Load hook: transpile TS/TSX with the TypeScript compiler (already installed
 * for `tsc`). Node's native strip-only mode rejects parameter properties and
 * JSX, which the codebase uses — a full transpile sidesteps that. Type-only
 * imports must use `import type` (codebase convention) so they're elided.
 */
export function load(url, context, nextLoad) {
  if (/\.tsx?$|\.mts$/.test(url)) {
    const path = fileURLToPath(url);
    const source = readFileSync(path, "utf8");
    const { outputText } = ts.transpileModule(source, {
      fileName: path,
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        inlineSourceMap: true,
        inlineSources: true,
      },
    });
    return { format: "module", source: outputText, shortCircuit: true };
  }
  return nextLoad(url, context);
}
