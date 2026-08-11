import { requestJsonCompletion, type LlmJsonRequest } from '@commonality/attester-core';

export interface StatementStrategy<TInput, TOutput> {
  name: string;
  systemPrompt: string;
  renderInput(input: TInput): unknown;
  normalize(output: unknown): TOutput;
  temperature?: number;
  maxTokens?: number;
}

export interface StatementStrategyEngineConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface StatementStrategyEngineDependencies {
  requestJsonCompletion: typeof requestJsonCompletion;
}

const defaultDependencies: StatementStrategyEngineDependencies = { requestJsonCompletion };

/** Prompt fragment shared across strategies that choose the relevant techniques. */
export const HIDDEN_MAJORITY_PATTERN_TECHNIQUES = {
  coalitionUnbundling: 'Use coalition unbundling: split an identity bundle into independent claims while letting supporters reaffirm the pieces they hold.',
  deferDetails: 'When details would make a statement unnatural, defer them with an explicit good-faith boundary instead of using ambiguous shorthand.',
  expressReservations: 'A statement may express a specific reservation while still clearly affirming its core claim.',
  hedgeDontBlur: 'Hedge explicitly when needed; never blur a claim into vague identity language.',
} as const;

/**
 * Shared LLM execution seam for founder-authored statement strategies. The engine
 * owns provider invocation and JSON handling; each tenant owns its strategy prompt.
 */
export async function runStatementStrategy<TInput, TOutput>(
  strategy: StatementStrategy<TInput, TOutput>,
  input: TInput,
  config: StatementStrategyEngineConfig,
  dependencies: StatementStrategyEngineDependencies = defaultDependencies,
): Promise<TOutput> {
  const request: LlmJsonRequest = {
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
    systemPrompt: strategy.systemPrompt,
    userPrompt: JSON.stringify(strategy.renderInput(input)),
    temperature: strategy.temperature ?? 0.2,
    maxTokens: strategy.maxTokens ?? 1600,
  };
  const response = await dependencies.requestJsonCompletion<unknown>(request);
  return strategy.normalize(response);
}
