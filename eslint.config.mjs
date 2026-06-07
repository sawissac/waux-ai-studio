import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";

/**
 * Flat ESLint config for the project (ESLint v9+ flat config format).
 *
 * Config blocks are merged top-to-bottom; later blocks override earlier ones.
 *
 * Layer order:
 *  1. `nextVitals` / `nextTs` — Next.js Core Web Vitals + TypeScript presets.
 *  2. `prettier` — disables stylistic rules that conflict with Prettier
 *     (keep this after the presets so it wins).
 *  3. Project rules block — registers the `unused-imports` and
 *     `simple-import-sort` plugins, configures the TS import resolver, and
 *     sets the team's rule overrides (auto-fixable import sorting, unused
 *     import/var handling, relaxed `react-hooks` rules, etc.).
 *  4. `src/**` type-aware block — enables rules that need TypeScript type
 *     info (`projectService`), scoped to source files only for speed.
 *  5. `globalIgnores` — build output and generated files ESLint skips.
 *
 * Note: some rules are intentionally declared twice; the last value wins
 * (e.g. `no-console` ends up "off", `react-hooks/set-state-in-effect` "off").
 *
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 * @type {import("eslint").Linter.Config[]}
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    // Third-party plugins made available to the rules below. The key is the
    // prefix you reference in rule names (e.g. "unused-imports/...").
    plugins: {
      "unused-imports": unusedImports,
      "simple-import-sort": simpleImportSort,
    },
    // Shared settings consumed by plugins. Here: tell `eslint-plugin-import`
    // to resolve module paths via TypeScript (honors `paths`/aliases in
    // tsconfig), so `import/no-unresolved` understands `@/...` style imports.
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
      },
    },
    rules: {
      // --- Unused imports and variables ---
      // Remove dead imports outright (auto-fixable).
      "unused-imports/no-unused-imports": "error",
      // Warn on unused vars/args, but allow intentional throwaways prefixed
      // with `_` (e.g. `_unusedArg`). `args: "after-used"` only flags args
      // that come before the last used one.
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      // Turn off the core/TS unused-vars rules so `unused-imports` is the
      // single source of truth (avoids duplicate reports).
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // Allow `any` — pragmatic escape hatch for this codebase.
      "@typescript-eslint/no-explicit-any": "off",

      // --- Import sorting and organization ---
      // Auto-sort/group imports and exports (fixable on save).
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
      // Merge multiple imports from the same module into one statement.
      "import/no-duplicates": "warn",
      // Require exactly one blank line after the import block.
      "import/newline-after-import": ["warn", { count: 1 }],
      // Flag imports that don't resolve to a real file/module.
      "import/no-unresolved": "warn",

      // --- TypeScript specific (non type-aware) ---
      // Prefer ES `import` over `require()`.
      "@typescript-eslint/no-var-requires": "warn",
      // Flag `setState` called directly inside an effect (re-render loop risk).
      // NOTE: re-declared to "off" further down — the later value wins.
      "react-hooks/set-state-in-effect": "warn",

      // --- General code quality ---
      "prefer-const": "warn", // use const when a let is never reassigned
      "no-var": "warn", // ban `var`, use let/const
      "no-console": "warn", // discourage console.* (overridden to "off" below)
      eqeqeq: ["warn", "always"], // require === / !== over == / !=
      curly: ["warn", "all"], // require braces on all control statements

      // --- React specific ---
      "react/jsx-key": "warn", // keys required in list-rendered elements
      "react/jsx-no-duplicate-props": "warn", // no repeated props on one element
      "react/jsx-no-undef": "warn", // referenced JSX components must be defined
      "react/self-closing-comp": "warn", // <Foo /> instead of <Foo></Foo>
      "react/no-unescaped-entities": "off", // allow raw quotes/apostrophes in JSX
      // react-hooks rules deliberately disabled for this codebase's patterns.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/refs": "off",
      "react-hooks/exhaustive-deps": "off",
      // --- Next.js specific ---
      "@next/next/no-img-element": "warn", // prefer next/image over <img>

      // Final override: allow console.* everywhere (wins over the "warn" above).
      "no-console": "off",
    },
  },
  {
    // Type-aware block — only `src/**` TS files. Scoping keeps the slower
    // type-checking linting off config/script files.
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        // Auto-discover the right tsconfig per file (enables typed linting).
        projectService: true,
        // Root used to resolve tsconfig paths.
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // --- Type-aware TypeScript rules (need type info) ---
      // Flag `x as T` assertions that don't change the type.
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      // Suggest `a?.b` over `a && a.b` chains.
      "@typescript-eslint/prefer-optional-chain": "warn",
    },
  },
  // Paths ESLint never lints: graphify output + build/generated artifacts.
  globalIgnores([
    "graphify-out",
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "coverage/**",
    "node_modules/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
