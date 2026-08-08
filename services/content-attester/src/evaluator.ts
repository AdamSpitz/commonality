import { OpenRouterInvalidJsonError, requestJsonCompletion, type OpenRouterJsonRequest } from '@commonality/attester-core';

export type ContentAttesterDimensionScore = 'pass' | 'fail' | 'partial';

export interface ContentAttesterEvaluationResult {
  decision: boolean;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  dimensions: Record<string, ContentAttesterDimensionScore>;
  supportsStatement?: ContentAttesterDimensionScore;
}

export type RequestJsonCompletionFn = <T>(request: OpenRouterJsonRequest) => Promise<T>;

export interface EvaluateContentWithLlmParams {
  content: string;
  statement?: string;
  declaredPerspective?: string;
  apiKey: string;
  model?: string;
  promptTemplate: string;
  attesterName: string;
  /** Injectable for deterministic tests; defaults to the real OpenRouter client. */
  requestJsonCompletionFn?: RequestJsonCompletionFn;
}

const delimiterPattern = /<\/?UNTRUSTED_DATA\b[^>]*>?/giu;

export function sanitizeUntrustedText(text: string): string {
  return text.replace(delimiterPattern, '[delimiter-stripped]');
}

export function sanitizeUntrustedKind(kind: string): string {
  const sanitized = kind.toLowerCase().replace(/[^a-z0-9_-]+/gu, '_').replace(/^_+|_+$/gu, '');
  return sanitized || 'data';
}

export function wrapUntrusted(kind: string, text: string): string {
  return `<UNTRUSTED_DATA kind="${sanitizeUntrustedKind(kind)}">\n${sanitizeUntrustedText(text)}\n</UNTRUSTED_DATA>`;
}

export async function evaluateContentWithLLM(
  params: EvaluateContentWithLlmParams,
): Promise<ContentAttesterEvaluationResult> {
  const prompt = buildContentAttesterPrompt(params.promptTemplate, params.content, params.declaredPerspective, params.statement);
  const requestJsonCompletionFn = params.requestJsonCompletionFn ?? requestJsonCompletion;
  let result: Record<string, unknown>;

  try {
    result = await requestJsonCompletionFn<Record<string, unknown>>({
      apiKey: params.apiKey,
      model: params.model ?? 'anthropic/claude-3.5-haiku',
      systemPrompt:
        'You are a careful content attester. Return valid JSON only. Be conservative and avoid false positives.',
      userPrompt: prompt,
      title: `Commonality ${params.attesterName}`,
    });
  } catch (error) {
    if (error instanceof OpenRouterInvalidJsonError) {
      result = extractResultFromText(error.content);
    } else {
      throw error;
    }
  }

  return {
    decision: result.decision === true || result.decision === 'true',
    confidence: normalizeConfidence(result.confidence),
    reasoning:
      (typeof result.reasoning === 'string' && result.reasoning) ||
      (typeof result.explanation === 'string' && result.explanation) ||
      'No reasoning provided',
    dimensions: normalizeDimensions(result.dimensions),
    supportsStatement: normalizeSupportDecision(result.supports_statement),
  };
}

export function buildContentAttesterPrompt(
  promptTemplate: string,
  content: string,
  declaredPerspective?: string,
  statement?: string,
): string {
  const perspectiveContext = declaredPerspective
    ? `Declared perspective from the submitter: ${wrapUntrusted('declared_perspective', declaredPerspective)}`
    : 'No declared perspective was provided.';

  const statementContext = statement
    ? `Target statement to evaluate support for: ${wrapUntrusted('target_statement', statement)}`
    : 'No target statement was provided. Judge noninflammatory-ness only; omit supports_statement or set it to "partial".';

  return promptTemplate
    .replaceAll('{content}', wrapUntrusted('content', content))
    .replaceAll('{statement}', statementContext)
    .replaceAll('{declared_perspective_context}', perspectiveContext);
}

function normalizeConfidence(confidence: unknown): 'high' | 'medium' | 'low' {
  if (typeof confidence === 'number') {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }

  const normalized = String(confidence).toLowerCase().trim();
  if (['high', 'strong', 'certain', 'definite'].includes(normalized)) {
    return 'high';
  }
  if (['medium', 'moderate', 'somewhat', 'partial'].includes(normalized)) {
    return 'medium';
  }
  return 'low';
}

function normalizeSupportDecision(value: unknown): ContentAttesterDimensionScore | undefined {
  const score = String(value).toLowerCase().trim();
  if (score === 'pass' || score === 'fail' || score === 'partial') {
    return score;
  }
  return undefined;
}

function normalizeDimensions(
  dimensions: unknown,
): Record<string, ContentAttesterDimensionScore> {
  if (!dimensions || typeof dimensions !== 'object' || Array.isArray(dimensions)) {
    return {};
  }

  const normalized: Record<string, ContentAttesterDimensionScore> = {};
  for (const [key, value] of Object.entries(dimensions)) {
    const score = String(value).toLowerCase().trim();
    if (score === 'pass' || score === 'fail' || score === 'partial') {
      normalized[key] = score;
    }
  }
  return normalized;
}

function extractResultFromText(text: string): Record<string, unknown> {
  const lowerText = text.toLowerCase();
  const decision =
    lowerText.includes('"decision": true') ||
    lowerText.includes('decision: true') ||
    lowerText.includes('"decision": "true"');

  let confidence: string = 'low';
  if (lowerText.includes('high confidence') || lowerText.includes('"confidence": "high"')) {
    confidence = 'high';
  } else if (lowerText.includes('medium confidence') || lowerText.includes('"confidence": "medium"')) {
    confidence = 'medium';
  }

  return {
    decision,
    confidence,
    reasoning: text.slice(0, 500),
  };
}
