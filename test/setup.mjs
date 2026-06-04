// test/setup.mjs — registers the resolution + transpile hooks for `node --test`.
// Run with:  node --import ./test/setup.mjs --test "test/<glob>.test.ts"
import { registerHooks } from "node:module";
import { resolve, load } from "./hooks.mjs";

registerHooks({ resolve, load });
