const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export class OpenRouterInvalidJsonError extends Error {
  constructor(public readonly content: string) {
    super('OpenRouter returned non-JSON content');
    this.name = 'OpenRouterInvalidJsonError';
  }
}

export interface OpenRouterJsonRequest {
  apiKey: string;
  model: string;
  systemPrompt: string;
  staticUserPrompt?: string;
  userPrompt: string;
  referer?: string;
  title?: string;
  temperature?: number;
  maxTokens?: number;
}

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

export async function requestJsonCompletion<T>(request: OpenRouterJsonRequest): Promise<T> {
  const completion = await requestJsonCompletionWithUsage<T>(request);
  return completion.result;
}

export async function requestJsonCompletionWithUsage<T>(
  request: OpenRouterJsonRequest
): Promise<OpenRouterJsonCompletion<T>> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${request.apiKey}`,
      'HTTP-Referer': request.referer || 'https://commonality.app',
      'X-Title': request.title || 'Commonality Attester',
    },
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
    const errorData = await response.json().catch(() => ({})) as { error?: { message: string } };
    throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json() as {
    choices?: { message: { content: string } }[];
    usage?: OpenRouterUsage;
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Empty response from OpenRouter API');
  }

  try {
    return {
      result: JSON.parse(content) as T,
      usage: data.usage ?? null,
    };
  } catch {
    throw new OpenRouterInvalidJsonError(content);
  }
}
