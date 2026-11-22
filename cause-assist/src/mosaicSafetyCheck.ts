/**
 * Default mosaic-safety judgment for a (statement, image) pair.
 *
 * This is not alignment and not a content-quality score. A yes means this
 * picture is safe to show in a gallery of people who signed this sentence.
 * Silence is the fail-closed answer: missing text, an unreadable CID, a
 * classifier error, or anything the checker cannot classify.
 *
 * The default bot does not see pixels. A wordless drawing, or a picture whose
 * harm is only in the pixels, stays silent until an app runs a checker that
 * can look. Apps choose the attester; this prompt is one house style.
 *
 * See specs/product/statement-images.md.
 */

import { keccak256, stringToBytes, type Hex } from 'viem'
import {
  requestJsonCompletion,
  type LlmJsonRequest,
  type RequestJsonCompletionFn,
} from '@commonality/attester-core'
import type { CauseAssistConfig } from './types.js'

export const MOSAIC_SAFETY_ATTESTER_ID = 'cause-assist-mosaic-safety-v1'

export const MOSAIC_SAFETY_SYSTEM_PROMPT = `You judge whether a picture is safe to show in a gallery of people who signed one sentence.

You are not judging whether the sentence is true, wise, or aligned with any cause. You are not judging whether the picture illustrates the sentence. A dull, off-topic, or wordless picture can still be safe. A picture that agrees with the sentence can still be unsafe.

The picture is unsafe when any of these is true:
- It insults, mocks, or degrades the people who signed the sentence.
- It shows an identifiable person or organization in a way that reads as their endorsement, and the sentence does not say they signed.
- It smuggles a second claim the signer did not write in the sentence.
- You cannot tell. Uncertainty is unsafe.

You do not see the pixels. You only see the sentence and a content id. If the sentence is missing, or the content id is not a picture you can describe from the text given, answer unsafe.

Respond with JSON only:
{
  "safe": boolean,
  "reasoning": string
}`

export interface MosaicSafetyCheckRequest {
  statementText: string
  imageCid: string
}

export interface MosaicSafetyVerdict {
  safe: boolean
  reasoning: string
  attesterId: string
  source: 'llm' | 'unavailable'
  promptHash: Hex
  modelId: Hex
}

export function mosaicSafetyPromptHash(): Hex {
  return keccak256(stringToBytes(MOSAIC_SAFETY_SYSTEM_PROMPT))
}

export function mosaicSafetyModelId(model: string): Hex {
  return keccak256(stringToBytes(model))
}

function unavailable(reasoning: string, model = ''): MosaicSafetyVerdict {
  return {
    safe: false,
    reasoning,
    attesterId: MOSAIC_SAFETY_ATTESTER_ID,
    source: 'unavailable',
    promptHash: mosaicSafetyPromptHash(),
    modelId: mosaicSafetyModelId(model),
  }
}

function normalizeSafe(value: unknown): boolean {
  return value === true || value === 'true'
}

export async function checkMosaicSafety(
  request: MosaicSafetyCheckRequest,
  config: Pick<CauseAssistConfig, 'apiKey' | 'apiBaseUrl' | 'coherenceModel'>,
  requestJson: RequestJsonCompletionFn = requestJsonCompletion,
): Promise<MosaicSafetyVerdict> {
  const statementText = request.statementText.trim()
  const imageCid = request.imageCid.trim()
  const model = config.coherenceModel
  if (!statementText || !imageCid) {
    return unavailable('Missing sentence or image id. Fail closed.')
  }
  if (!config.apiKey?.trim()) {
    return unavailable('No mosaic-safety model is configured. Fail closed.')
  }

  const llmRequest: LlmJsonRequest = {
    apiKey: config.apiKey,
    model,
    baseUrl: config.apiBaseUrl,
    systemPrompt: MOSAIC_SAFETY_SYSTEM_PROMPT,
    userPrompt: `Sentence:\n${statementText}\n\nImage content id:\n${imageCid}`,
    title: 'Commonality mosaic safety',
    temperature: 0,
  }

  let parsed: { safe?: unknown; reasoning?: unknown }
  try {
    parsed = await requestJson<{ safe?: unknown; reasoning?: unknown }>(llmRequest)
  } catch {
    return unavailable('Mosaic-safety judgment failed. Fail closed.', model)
  }

  const reasoning = typeof parsed.reasoning === 'string' && parsed.reasoning.trim()
    ? parsed.reasoning.trim()
    : 'No reasoning returned. Fail closed.'
  const safe = normalizeSafe(parsed.safe) && reasoning !== 'No reasoning returned. Fail closed.'
  return {
    safe,
    reasoning,
    attesterId: MOSAIC_SAFETY_ATTESTER_ID,
    source: 'llm',
    promptHash: mosaicSafetyPromptHash(),
    modelId: mosaicSafetyModelId(model),
  }
}
