/**
 * Coherence attester for a cause roster (construction, not merit).
 *
 * Separate from atomize/sharpen: a model blessing its own generation output is
 * worthless. This prompt only judges whether the published summary and planks
 * cohere (planks match the summary, no hidden riders). Positive-only: silence
 * when not coherent — we never publish a negative judgment from this path.
 *
 * See docs/founder/shaping-your-cause-statements.md § The coherence badge.
 */

import {
  requestJsonCompletion,
  type LlmJsonRequest,
  type RequestJsonCompletionFn,
} from '@commonality/attester-core'
import type { CauseAssistConfig } from './types.js'

export interface CoherenceCheckRequest {
  /** Would-be roster document CID the verdict is about. */
  rosterCid: string
  title: string
  summary: string
  planks: string[]
  mediatorBlurb?: string
}

export interface CoherenceVerdict {
  coherent: boolean
  reasoning: string
  /** Which attester/config produced this — never "the" system attester. */
  attesterId: string
  rosterCid: string
  source: 'llm' | 'heuristic'
}

const ATTTESTER_ID = 'cause-assist-coherence-v1'

const SYSTEM_PROMPT = `You are a coherence attester for a public-goods cause page.

Judge ONLY construction, never merit or politics:
- Do the listed issues (planks) match the title and summary?
- Are there hidden riders — issues that change the cause's apparent meaning without being disclosed in the summary?
- A cause you find repellent but that clearly states its issues IS coherent. Approve it.
- A vague summary that conceals a sharp plank is NOT coherent.

Respond with JSON only:
{
  "coherent": boolean,
  "reasoning": string  // one or two short sentences, constructive, never moralizing
}`

function heuristicCoherence(request: CoherenceCheckRequest): CoherenceVerdict {
  const title = request.title.trim()
  const summary = request.summary.trim()
  const planks = request.planks.map((p) => p.trim()).filter(Boolean)

  if (planks.length === 0) {
    return {
      coherent: false,
      reasoning: 'A roster needs at least one published issue.',
      attesterId: ATTTESTER_ID,
      rosterCid: request.rosterCid,
      source: 'heuristic',
    }
  }

  if (!title) {
    return {
      coherent: false,
      reasoning: 'Add a title so visitors know what this cause is.',
      attesterId: ATTTESTER_ID,
      rosterCid: request.rosterCid,
      source: 'heuristic',
    }
  }

  // Without an LLM, only pass when the organizer wrote a non-trivial summary.
  // Empty summary is allowed on publish but does not earn a coherence pass
  // from the heuristic — the badge is optional.
  if (summary.length < 12) {
    return {
      coherent: false,
      reasoning: 'Add a short summary that discloses the issues so a visitor can judge fit.',
      attesterId: ATTTESTER_ID,
      rosterCid: request.rosterCid,
      source: 'heuristic',
    }
  }

  return {
    coherent: true,
    reasoning: 'Title, summary, and issues are present (heuristic pass; LLM attester unavailable).',
    attesterId: ATTTESTER_ID,
    rosterCid: request.rosterCid,
    source: 'heuristic',
  }
}

export async function checkCoherence(
  request: CoherenceCheckRequest,
  config: CauseAssistConfig,
  requestFn: RequestJsonCompletionFn = requestJsonCompletion,
): Promise<CoherenceVerdict> {
  if (!config.apiKey) {
    return heuristicCoherence(request)
  }

  const userPayload = {
    rosterCid: request.rosterCid,
    title: request.title,
    summary: request.summary,
    planks: request.planks,
    mediatorBlurb: request.mediatorBlurb ?? '',
  }

  try {
    const llmRequest: LlmJsonRequest = {
      apiKey: config.apiKey,
      baseUrl: config.apiBaseUrl,
      // Dedicated model slot so coherence never silently shares generation's model
      // unless the operator configures them the same on purpose.
      model: config.coherenceModel || config.safetyModel || config.suggestModel,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: JSON.stringify(userPayload),
      temperature: 0,
      maxTokens: 600,
      title: 'CauseAssist Coherence Check',
      openRouterHeaders: false,
    }
    const raw = await requestFn<{ coherent?: unknown; reasoning?: unknown }>(llmRequest)
    const coherent = raw?.coherent === true
    const reasoning =
      typeof raw?.reasoning === 'string' && raw.reasoning.trim()
        ? raw.reasoning.trim()
        : coherent
          ? 'The issues match the summary with no apparent riders.'
          : 'The summary and issues do not clearly match.'

    return {
      coherent,
      reasoning,
      attesterId: ATTTESTER_ID,
      rosterCid: request.rosterCid,
      source: 'llm',
    }
  } catch (error) {
    console.warn('coherenceCheck: LLM failed, falling back to heuristic', error)
    return heuristicCoherence(request)
  }
}
