# Biome Setup (Formatting + Linting)

Biome replaces ESLint + Prettier for the whole monorepo (Next.js `frontend/`, Node.js `backend/`, and root scripts/config).

## Step-by-step setup

1. Install the tools (already done at the repo root):

   ```sh
   npm install --save-dev @biomejs/biome lint-staged simple-git-hooks
   ```

2. Create `biome.json` at the repo root — the single source of truth for all packages. See [Final biome.json](#final-biomejson) below.

3. Add scripts + hook config to the root `package.json` (see [package.json](#packagejson)).

4. Install the git pre-commit hook:

   ```sh
   npx simple-git-hooks
   ```

5. Install the VS Code extension and accept the recommended settings (`.vscode/extensions.json`, `.vscode/settings.json` are committed to the repo).

6. CI is defined in `.github/workflows/biome.yml`.

## Design decisions

- **One config at the root** for the whole monorepo (works across `frontend/`, `backend/`, and root files) — no per-package config drift. Use `overrides` for per-folder rules as the repo grows.
- **`files.includes` + `!` force-ignore** for `node_modules`, `.next`, `dist`, `build`, `out`, `coverage`, `.vercel`, `*.tsbuildinfo`, lockfiles, and non-app folders (`desktop`, `cache`, `research`, `load-tests`, `k8s`).
- **`vcs.useIgnoreFile: true`** — Biome also honours `.gitignore`, so generated/gitignored files are never touched.
- **Generated/scratch files are force-ignored:** the Vercel build dump (`/public`), `frontend/public/`, and throwaway `frontend/test_*.js` scripts. `globals.css` (Tailwind v4) needs `css.parser.tailwindDirectives: true` so Biome's CSS parser understands `@plugin`/`@import ... layer()`, otherwise it reports false parse errors.
- **2-space indent, double quotes, semicolons, 100 col** — matches the existing codebase style so the initial `--write` sweep produced a diff instead of a rewrite-remap.
- **`assist.actions.source.organizeImports: "on"`** replaces Prettier-Plugin-Organize-Imports / ESLint import order.
- **`preset: "recommended"`** for lint rules, plus `correctness/noUnusedVariables: "error"`.

## package.json

```jsonc
{
  "scripts": {
    "build": "cd frontend && npm ci --include=dev --legacy-peer-deps && npm run build",
    "vercel-build": "cd frontend && npm ci --include=dev --legacy-peer-deps && npm run build && rm -rf ../.next && cp -r .next ../.next && cp -r public ../public",
    "format": "biome format --write .",
    "format:check": "biome format .",
    "lint": "biome lint .",
    "lint:fix": "biome lint --write .",
    "check": "biome check .",
    "fix": "biome check --write .",
    "fix:unsafe": "biome check --write --unsafe ."
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx,mjs,cjs,json,jsonc,css,html}": "biome check --write"
  },
  "simple-git-hooks": {
    "pre-commit": "npx lint-staged --concurrent=false"
  }
}
```

## Final biome.json

```jsonc
{
  "$schema": "https://biomejs.dev/schemas/2.5.7/schema.json",
  "root": true,
  "files": {
    "ignoreUnknown": true,
    "includes": [
      "**",
      "!**/node_modules", "!**/.next", "!**/out", "!**/dist", "!**/build", "!**/coverage",
      "!**/.vercel", "!**/*.tsbuildinfo",
      "!**/package-lock.json", "!**/pnpm-lock.yaml", "!**/yarn.lock",
      "!frontend/public", "!public",
      "!frontend/test_*.js", "!desktop", "!cache", "!research", "!load-tests", "!k8s"
    ]
  },
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true, "defaultBranch": "main" },
  "formatter": {
    "enabled": true, "indentStyle": "space", "indentWidth": 2,
    "lineEnding": "lf", "lineWidth": 100, "attributePosition": "auto",
    "bracketSameLine": false, "bracketSpacing": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "preset": "recommended",
      "correctness": { "noUnusedVariables": "error" }
    }
  },
  "assist": {
    "enabled": true,
    "actions": { "source": { "organizeImports": "on" } }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double", "jsxQuoteStyle": "double", "semicolons": "always",
      "trailingCommas": "all", "arrowParentheses": "always"
    }
  },
  "json": {
    "formatter": { "indentStyle": "space", "indentWidth": 2, "trailingCommas": "none" },
    "parser": { "allowComments": true, "allowTrailingCommas": true }
  },
  "css": {
    "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 },
    "parser": { "tailwindDirectives": true }
  },
  "overrides": []
}
```

## CLI commands

```sh
npx biome format --write .        # format everything (safe)
npx biome format .                # check formatting, no writes (CI-friendly)
npx biome lint .                  # lint everything, no writes
npx biome lint --write .          # apply safe lint fixes
npx biome check .                 # lint + format + import order (no writes)
npx biome check --write .         # apply safe fixes + format + sort imports
npx biome check --write --unsafe . # apply unsafe (behaviour-changing) fixes — use per-file, review diff
npx biome check --since=main .    # only check files changed vs main (used by CI / local branch gate)
```

## Editor (VS Code)

`.vscode/extensions.json` recommends `biomejs.biome`. `.vscode/settings.json` sets:

```jsonc
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "always",
    "source.organizeImports.biome": "explicit"
  },
  "[typescriptreact]": { "editor.defaultFormatter": "biomejs.biome" }
  // ... plus [javascript], [javascriptreact], [typescript], [json], [jsonc], [css]
}
```

`quickfix.biome` auto-applies safe fixes on save; import ordering is applied explicitly (`Shift+Alt+O`) so every save isn't a surprise reorder.

## CI / pre-commit

- **Pre-commit** (`simple-git-hooks` → `lint-staged`): runs `biome check --write` on staged files. If any lint *error* remains it blocks the commit; format-only issues are fixed and re-staged automatically.
- **CI** (`.github/workflows/biome.yml`):
  - `lint-changed` — `biome check --since=main .` — **hard gate** on changed files only. New code must be clean; legacy debt is not a blocker.
  - `lint-full` — `biome check .` with `continue-on-error` — informational full-repo debt trend.

## Onboarding a legacy codebase (phased rollout)

The repo had ~1100 lint errors when Biome was introduced. Adopting with a clean sweep in one commit is not practical, so:

1. **Day 1 (done):** `npx biome check --write .` — applied formatting + safe fixes + import order across the repo. `tsc --noEmit` verified clean in both `backend/` (0) and `frontend/` (0). Remaining diagnostics are **legacy debt** (~1033 errors, mostly a11y + `noImplicitAnyLet`/`noArrayIndexKey`/`useExhaustiveDependencies` that need human judgement) — tracked, not gating.
2. **Day 1+:** CI gates changed files (`--since=main`). Devs fix diagnostics in files they touch (editor + pre-commit help).
3. **Steady state:** as debt drops, flip `lint-full` from informational to a hard gate, then optionally raise noisy-but-important rules to `error`.

> ⚠️ Do **not** run `--unsafe` repo-wide on the legacy baseline without review. Unsafe fixes can change types/runtime behaviour (e.g. `style/noNonNullAssertion` strips `!`, `correctness/useExhaustiveDependencies` injects deps that can break hook hoisting, and multi-pass JSX rewrites can drop props). Use `--unsafe` per-file on PRs and review the diff.

## Enterprise / scaling notes

- **Multi-tenant SaaS:** Biome is per-file and parallel; one root config keeps all tenants/packages identical. Add per-package behaviour via `overrides[].includes` (e.g. `"backend/**/*.ts"` to disable JSX parsing).
- **Ignoring code deliberately:** use `// biome-ignore lint/<rule>: reason` for intentional violations (never blanket-disable a rule for a whole package).
- **Formatting generated files:** never let Biome own generated output — keep them in `files.includes` negatives (e.g. `!**/.next`, `!backend/dist`, `!**/*.tsbuildinfo`, `!frontend/public`).
- **Performance:** Biome runs in ~1s on this repo (1400+ files). Use `--since`/`--changed` in CI to stay fast at SaaS scale.
- **Staying current:** `npx @biomejs/biome upgrade` bumps the CLI; run `biome migrate` if a major version changes config keys.
