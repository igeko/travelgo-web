import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code git worktrees are nested checkouts — never lint them.
    ".claude/**",
    // Static HTML prototypes that intentionally don't follow the design
    // system / conventions (see CLAUDE.md). Not shipped app code.
    "app/(design)/**",
  ]),
  // Allow an underscore prefix to mark intentionally-unused vars/args/catches.
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  // The Scheduler is a private engine reached only through TripService, so the
  // day↔activity write-path stays single. Everything outside lib/services must
  // go through `services.trips.*`, never import or instantiate Scheduler.
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["lib/services/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/services/Scheduler",
              message:
                "Scheduler is internal. Schedule through services.trips.* (TripService) instead.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
