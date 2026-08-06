/**
 * OpenAI-compatible chat completions client (xAI Grok by default).
 * Kept local so cause-assist does not pull OpenRouter-specific defaults.
 */

export class LlmInvalidJsonError extends Error {
  constructor(public readonly content: string) {
    super('LLM returned non-JSON content')
    this.name = 'LlmInvalidJsonError'
  }
}

export interface LlmJsonRequest {
  apiKey: string
  baseUrl: string
  model: string
  systemPrompt: string
  staticUserPrompt?: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
}

export async function requestJsonCompletion<T>(request: LlmJsonRequest): Promise<T> {
  const base = request.baseUrl.replace(/\/$/, '')
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${request.apiKey}`,
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
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as {
      error?: { message?: string }
      message?: string
    }
    const message = errorData.error?.message || errorData.message || 'Unknown error'
    throw new Error(`LLM API error: ${response.status} - ${message}`)
  }

  const data = await response.json() as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('Empty response from LLM API')
  }

  try {
    return JSON.parse(content) as T
  } catch {
    // Some models wrap JSON in markdown fences.
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim()) as T
      } catch {
        // fall through
      }
    }
    throw new LlmInvalidJsonError(content)
  }
}

export type RequestJsonCompletionFn = <T>(request: LlmJsonRequest) => Promise<T>
