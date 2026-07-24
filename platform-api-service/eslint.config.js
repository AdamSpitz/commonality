import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import codeMetrics from '../eslint.metrics.mjs'

export default [
  ...codeMetrics,
  {
    ignores: ['dist'],
  },
  {
    files: ['**/*.ts'],
    ...js.configs.recommended,
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.ts'],
  })),
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },
]
