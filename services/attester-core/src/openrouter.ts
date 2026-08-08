const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Thrown when a chat-completion response body is not valid JSON.
 * Named for historical OpenRouter callers; also used for other OpenAI-compatible APIs.
 */
export class OpenRouterInvalidJsonError extends Error {
  constructor(public readonly content: string) {
    super('OpenRouter returned non-JSON content');
    this.name = 'OpenRouterInvalidJsonError';
  }
}

/** Alias for non-OpenRouter callers (e.g. cause-assist / xAI). */
export const LlmInvalidJsonError = OpenRouterInvalidJsonError;

export interface OpenRouterJsonRequest {
  apiKey: string;
  model: string;
  systemPrompt: string;
  staticUserPrompt?: string;
  userPrompt: string;
  /**
   * OpenAI-compatible API root (no trailing `/chat/completions`).
   * Defaults to OpenRouter so existing attesters keep working unchanged.
   */
  baseUrl?: string;
  referer?: string;
  title?: string;
  temperature?: number;
  maxTokens?: number;
  /**
   * When true, send OpenRouter-specific HTTP-Referer / X-Title headers.
   * Defaults to true only when using the OpenRouter base URL.
   */
  openRouterHeaders?: boolean;
}

/** Generic name for OpenAI-compatible JSON chat requests. */
export type LlmJsonRequest = OpenRouterJsonRequest;

export type RequestJsonCompletionFn = <T>(request: OpenRouterJsonRequest) => Promise<T>;

export interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
    cache_write_tokens?: number;
  };
}

export interface OpenRouterJsonCompletion<T> {
  result: T;
  usage: OpenRouterUsage | null;
}

function resolveBaseUrl(baseUrl?: string): string {
  return (baseUrl || DEFAULT_OPENROUTER_BASE_URL).replace(/\/$/, '');
}

function shouldSendOpenRouterHeaders(request: OpenRouterJsonRequest, baseUrl: string): boolean {
  if (request.openRouterHeaders !== undefined) {
    return request.openRouterHeaders;
  }
  return baseUrl === DEFAULT_OPENROUTER_BASE_URL;
}

function parseJsonContent<T>(content: string): T {
  try {
    return JSON.parse(content) as T;
  } catch {
    // Some models wrap JSON in markdown fences.
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim()) as T;
      } catch {
        // fall through
      }
    }
    throw new OpenRouterInvalidJsonError(content);
  }
}

export async function requestJsonCompletion<T>(request: OpenRouterJsonRequest): Promise<T> {
  const completion = await requestJsonCompletionWithUsage<T>(request);
  return completion.result;
}

export async function requestJsonCompletionWithUsage<T>(
  request: OpenRouterJsonRequest
): Promise<OpenRouterJsonCompletion<T>> {
  const baseUrl = resolveBaseUrl(request.baseUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${request.apiKey}`,
  };

  if (shouldSendOpenRouterHeaders(request, baseUrl)) {
    headers['HTTP-Referer'] = request.referer || 'https://commonality.app';
    headers['X-Title'] = request.title || 'Commonality Attester';
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: request.model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        ...(request.staticUserPrompt ? [{ role: 'user', content: request.staticUserPrompt }] : []),
        { role: 'user', content: request.userPrompt },
      ],
      temperature: request.temperature ?? 0.3,
      max_tokens: request.maxTokens ?? 500,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as {
      error?: { message?: string };
      message?: string;
    };
    const message = errorData.error?.message || errorData.message || 'Unknown error';
    throw new Error(`LLM API error: ${response.status} - ${message}`);
  }

  const data = await response.json() as {
    choices?: { message?: { content?: string } }[];
    usage?: OpenRouterUsage;
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Empty response from LLM API');
  }

  return {
    result: parseJsonContent<T>(content),
    usage: data.usage ?? null,
  };
}
