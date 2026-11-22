/**
 * Default mosaic-safety judgment for a (statement, image) pair.
 *
 * This is not alignment and not a content-quality score. A yes means this
 * picture is safe to show in a gallery of people who signed this sentence.
 * Silence is the fail-closed answer: missing text, an unreadable CID, bytes
 * that are not the picture, a classifier error, or anything the checker cannot
 * classify.
 *
 * The default bot fetches the image from the configured gateway, checks that
 * the bytes hash to the raw CIDv1, and sends those pixels to the model. A
 * missing gateway, a miss, or a non-image stays silent. Apps choose the
 * attester; this prompt is one house style.
 *
 * See specs/product/statement-images.md.
 */

import { hexToBytes, keccak256, sha256, stringToBytes, type Hex } from 'viem'
import { buildCidV1FromDigest, RAW_CID_CODEC } from '@commonality/sdk/utils'
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

You are shown the picture. Judge the pixels, not the content id. A wordless drawing can still be safe. If you cannot read the picture, answer unsafe.

Respond with JSON only:
{
  "safe": boolean,
  "reasoning": string
}`

/** Cap gateway reads so a huge CID cannot be loaded into the model call. */
export const MOSAIC_IMAGE_MAX_BYTES = 4_000_000

export type MosaicImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

export interface MosaicImageBytes {
  mediaType: MosaicImageMediaType
  bytes: Uint8Array
}

export type FetchMosaicImageFn = (imageCid: string) => Promise<MosaicImageBytes | null>

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

export function mosaicImageMediaType(bytes: Uint8Array): MosaicImageMediaType | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return 'image/gif'
  }
  if (
    bytes.length >= 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

export function mosaicImageCidMatches(imageCid: string, bytes: Uint8Array): boolean {
  try {
    const digest = hexToBytes(sha256(bytes))
    return buildCidV1FromDigest(RAW_CID_CODEC, digest) === imageCid
  } catch {
    return false
  }
}

async function readLimited(response: Response, maxBytes: number): Promise<Uint8Array | null> {
  const declared = Number(response.headers.get('content-length') ?? '')
  if (Number.isFinite(declared) && declared > maxBytes) return null
  if (!response.body) {
    const buf = new Uint8Array(await response.arrayBuffer())
    return buf.byteLength > maxBytes ? null : buf
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

export function createGatewayMosaicImageFetcher(
  gatewayUrl: string,
  timeoutMs = 15_000,
): FetchMosaicImageFn {
  const base = gatewayUrl.replace(/\/$/, '')
  return async (imageCid) => {
    const response = await fetch(`${base}/${imageCid}`, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'manual',
    })
    if (response.status >= 300 && response.status < 400) return null
    if (response.status === 404 || response.status === 410) return null
    if (!response.ok) return null
    const bytes = await readLimited(response, MOSAIC_IMAGE_MAX_BYTES)
    if (!bytes || !mosaicImageCidMatches(imageCid, bytes)) return null
    const mediaType = mosaicImageMediaType(bytes)
    if (!mediaType) return null
    return { mediaType, bytes }
  }
}

export async function checkMosaicSafety(
  request: MosaicSafetyCheckRequest,
  config: Pick<CauseAssistConfig, 'apiKey' | 'apiBaseUrl' | 'coherenceModel' | 'ipfsGatewayUrl'>,
  requestJson: RequestJsonCompletionFn = requestJsonCompletion,
  fetchImage?: FetchMosaicImageFn,
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

  const loadImage = fetchImage ?? (
    config.ipfsGatewayUrl?.trim()
      ? createGatewayMosaicImageFetcher(config.ipfsGatewayUrl.trim())
      : undefined
  )
  if (!loadImage) {
    return unavailable('No image gateway is configured. Fail closed.', model)
  }

  let image: MosaicImageBytes | null
  try {
    image = await loadImage(imageCid)
  } catch {
    return unavailable('Image bytes could not be loaded. Fail closed.', model)
  }
  if (!image || !mosaicImageCidMatches(imageCid, image.bytes) || mosaicImageMediaType(image.bytes) !== image.mediaType) {
    return unavailable('Image bytes are missing, mismatched, or not a picture. Fail closed.', model)
  }

  const llmRequest: LlmJsonRequest = {
    apiKey: config.apiKey,
    model,
    baseUrl: config.apiBaseUrl,
    systemPrompt: MOSAIC_SAFETY_SYSTEM_PROMPT,
    userPrompt: `Sentence:\n${statementText}\n\nImage content id:\n${imageCid}`,
    userImages: [{
      mediaType: image.mediaType,
      base64: Buffer.from(image.bytes).toString('base64'),
    }],
    title: 'Commonality mosaic safety',
    temperature: 0,
  }

  let parsed: { safe?: unknown; reasoning?: unknown }
  try {
    parsed = await requestJson<{ safe?: unknown; reasoning?: unknown }>(llmRequest)
  } catch {
    return unavailable('Mosaic-safety judgment failed. Fail closed.', model)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return unavailable('Mosaic-safety judgment was not an object. Fail closed.', model)
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
