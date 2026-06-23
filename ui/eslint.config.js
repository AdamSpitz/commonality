import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    files: ['e2e/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  // Module-boundary enforcement: feature modules that have a defined public API
  // (a root `index.ts` barrel) must be consumed only through that barrel. Deep
  // imports into a module's internals from outside are forbidden, so the public
  // surface stays the contract a future published package can rely on. See
  // docs/founder/standing-up-a-vertical.md. Add one entry per module as it gets a
  // barrel; the module's own files are excluded via `ignores`.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/delegation/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          // Forbid deep paths into delegation/*, but allow the barrel itself
          // (`.../delegation`) and the lazy route entry points (pages + LandingPage),
          // which are loaded via dynamic import() to preserve code-splitting and are
          // the subpath half of the public API.
          group: [
            '**/delegation/*',
            '**/delegation/*/**',
            '!**/delegation/pages/*',
            '!**/delegation/LandingPage',
          ],
          message: 'Import delegation through its public barrel ("…/delegation"), not deep paths. Pages/LandingPage are allowed as lazy route entry points. See docs/founder/standing-up-a-vertical.md.',
        }],
      }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lazy-giving/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          // Forbid deep relative imports into the lazy-giving feature module,
          // but allow the barrel itself (`.../lazy-giving`, no trailing path)
          // and the lazy route entry points (`.../lazy-giving/pages/*`), which
          // domain route wrappers (domains/lazy-giving/manifest.tsx and the
          // content-funding/civility ContentPages wrappers) load to keep routes
          // in their own code-split chunks and which are the subpath half of the
          // public API. Same regex form as the content-funding block — see the
          // comment there for why the glob `group` form is avoided (can't
          // re-include children of an excluded `pages/` dir, and would also
          // match the unrelated `src/domains/lazy-giving/` directory).
          regex: '(?:\.\./)+lazy-giving/(?!pages(?:/|$))',
          message: 'Import lazy-giving through its public barrel ("…/lazy-giving"), not deep paths. pages/* are allowed as lazy route entry points. See docs/founder/standing-up-a-vertical.md.',
        }],
      }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/fundingportals/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          // Forbid deep relative imports into the fundingportals feature module,
          // but allow the barrel itself (`.../fundingportals`, no trailing path)
          // and the lazy route entry points (`.../fundingportals/pages/*`), which
          // domain route wrappers (domains/alignment/manifest.tsx and
          // domains/tally/manifest.tsx) load via dynamic import() to keep routes
          // in their own code-split chunks and which are the subpath half of the
          // public API. Same regex form as the content-funding/lazy-giving blocks
          // — see those comments for why the glob `group` form is avoided.
          regex: '(?:\.\./)+fundingportals/(?!pages(?:/|$))',
          message: 'Import fundingportals through its public barrel ("…/fundingportals"), not deep paths. pages/* are allowed as lazy route entry points. See docs/founder/standing-up-a-vertical.md.',
        }],
      }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/conceptspace/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          // Forbid deep relative imports into the conceptspace feature module,
          // but allow the barrel itself (`.../conceptspace`, no trailing path)
          // and the lazy route entry points (`.../conceptspace/pages/*`), which
          // domain route wrappers (domains/tally/manifest.tsx) load via dynamic
          // import() to keep routes in their own code-split chunks and which are
          // the subpath half of the public API. Same regex form as the
          // content-funding/lazy-giving/fundingportals blocks — see those
          // comments for why the glob `group` form is avoided (can't re-include
          // children of an excluded `pages/` dir, and would also match the
          // unrelated `src/domains/conceptspace/` directory).
          regex: '(?:\.\./)+conceptspace/(?!pages(?:/|$))',
          message: 'Import conceptspace through its public barrel ("…/conceptspace"), not deep paths. pages/* are allowed as lazy route entry points. See docs/founder/standing-up-a-vertical.md.',
        }],
      }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/content-funding/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          // Forbid deep relative imports into the content-funding feature module,
          // but allow the barrel itself (`.../content-funding`, no trailing path)
          // and the lazy route entry points (`.../content-funding/pages/*`), which
          // domain route wrappers load to keep routes in their own code-split
          // chunks and which are the subpath half of the public API.
          //
          // A regex (not globs) is used because the `ignore`-backed `group` matcher
          // (a) can't re-include children of an excluded `pages/` directory
          // (gitignore parent-dir rule) and (b) would also match the unrelated
          // `src/domains/content-funding/` directory. Requiring at least one `../`
          // before `content-funding/` scopes the rule to the feature module, since
          // every real consumer lives in a sibling/nested folder under `src/` and
          // reaches `src/content-funding` via `../`-relative paths, while the
          // domains wrapper is reached via `./content-funding/...`.
          regex: '(?:\\.\\./)+content-funding/(?!pages(?:/|$))',
          message: 'Import content-funding through its public barrel ("…/content-funding"), not deep paths. pages/* are allowed as lazy route entry points. See docs/founder/standing-up-a-vertical.md.',
        }],
      }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/shared/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          // Forbid deep relative imports into the `shared` substrate module, but
          // allow the barrel itself (`.../shared`, no trailing path) and two
          // heavy app-chrome component subpaths — `components/AppShell` and
          // `components/WalletButton` — which are the subpath half of the public
          // API (like `pages/*` for the feature modules). Those two are NOT in
          // the eager barrel because they transitively import `src/wagmi.ts`,
          // whose top level eagerly calls `http()` and builds the wagmi config;
          // re-exporting them would pull the whole wagmi/connectkit config into
          // every consumer's module graph (bundle bloat) and break tests that
          // partially mock `wagmi` (no `http` export). `shared` owns no routes,
          // so unlike the feature modules there is no `pages/*` directory — the
          // heavy components are individual files, negated explicitly here.
          //
          // The regex requires `shared/` to immediately follow the leading
          // `./`/`../` sequence, which scopes it to `src/shared` and avoids
          // false-matching the unrelated `docs/end-user/shared/...` raw-asset
          // import (where `shared/` is preceded by `docs/end-user/`, not by
          // `../`). The `./shared/...` form (used by the top-level `src/App.tsx`
          // and `src/main.tsx`) is covered too. `src/shared/**` is excluded via
          // `ignores` so the module's own files can import their own internals;
          // the two test files that need a real module namespace for `vi.spyOn`
          // carry an inline `eslint-disable-next-line no-restricted-imports`.
          regex: '(?:\\.{1,2}/)+shared/(?!components/AppShell(?:/|$)|components/WalletButton(?:/|$))',
          message: 'Import shared through its public barrel ("…/shared"), not deep paths. (AppShell/WalletButton are allowed as heavy subpath entry points.) See docs/founder/standing-up-a-vertical.md.',
        }],
      }],
    },
  },
])
