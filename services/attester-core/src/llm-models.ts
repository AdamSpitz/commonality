/**
 * Default OpenRouter model for deployed services (attesters, finders, nudgers,
 * cause-assist, coherence-badge-worker). Override with OPENROUTER_MODEL or a
 * service-specific *_OPENROUTER_MODEL / CAUSE_ASSIST_*_MODEL env var.
 *
 * Laptop/dev scripts (fake-data-generation) use DEV_OPENROUTER_MODEL instead;
 * see fake-data-generation/devOpenRouter.ts.
 */
export const PRODUCTION_OPENROUTER_MODEL = 'deepseek/deepseek-v4-flash-0731';
