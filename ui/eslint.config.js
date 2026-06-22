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
])
