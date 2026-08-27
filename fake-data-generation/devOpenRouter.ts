/**
 * OpenRouter model for laptop/dev scripts (seed evaluations, proliferation,
 * live attester exercises). Independent of PRODUCTION_OPENROUTER_MODEL used by
 * deployed services. Override with DEV_OPENROUTER_MODEL — not OPENROUTER_MODEL.
 */
export const DEV_OPENROUTER_MODEL = 'deepseek/deepseek-v4-flash-0731';

export function readDevOpenRouterModel(env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = env.DEV_OPENROUTER_MODEL?.trim();
  return fromEnv || DEV_OPENROUTER_MODEL;
}
