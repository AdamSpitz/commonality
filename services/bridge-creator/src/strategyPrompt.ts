import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_STRATEGY_PROMPT_FILE = 'csm-strategy.md';
let cachedDefaultStrategyPrompt: string | undefined;

export function loadDefaultStrategyPrompt(): string {
  if (cachedDefaultStrategyPrompt) {
    return cachedDefaultStrategyPrompt;
  }

  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const promptPath = join(moduleDir, '..', 'prompts', DEFAULT_STRATEGY_PROMPT_FILE);
  cachedDefaultStrategyPrompt = readFileSync(promptPath, 'utf8');
  return cachedDefaultStrategyPrompt;
}
