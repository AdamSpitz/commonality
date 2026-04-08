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
  userPrompt: string;
  referer?: string;
  title?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function requestJsonCompletion<T>(request: OpenRouterJsonRequest): Promise<T> {
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

  const data = await response.json() as { choices?: { message: { content: string } }[] };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Empty response from OpenRouter API');
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new OpenRouterInvalidJsonError(content);
  }
}
