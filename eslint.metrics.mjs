// Shared code-metric guardrails, applied repo-wide as WARNINGS (never errors).
//
// These flag the failure mode of LLM-authored code — god-functions and
// mega-modules that grow because each ephemeral author only sees a slice of the
// repo. They are deliberately advisory: warnings surface outliers without
// gating commits or CI (no lint script passes --max-warnings). Tune the
// thresholds here rather than sprinkling per-file overrides.
//
// Rationale and the decision to keep these non-blocking:
// specs/decisions/0002-code-quality-metrics.md
//
// Each workspace's eslint.config.js spreads `...codeMetrics` into its
// defineConfig array (near the top, so workspace-specific rules can still
// override). Import path is always '../eslint.metrics.mjs' since every
// workspace sits one directory below the repo root.
export default [
  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    rules: {
      // Thresholds pick out genuine outliers, not everyday code. Raise/lower as
      // the warning population settles.
      complexity: ['warn', 15],
      'max-depth': ['warn', 4],
      'max-params': ['warn', 5],
      'max-lines': ['warn', { max: 600, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': [
        'warn',
        { max: 120, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    // Tests legitimately run long and set up elaborate fixtures; size limits
    // there are noise. Complexity/depth still apply — convoluted test logic is a
    // real smell.
    files: [
      '**/*.{test,spec}.{ts,tsx,js,mjs,cjs}',
      '**/test/**',
      '**/tests/**',
      '**/__tests__/**',
    ],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
    },
  },
]
