/**
 * Publish a mosaic-safety yes only after an LLM judgment says safe.
 * Never writes a negative. A failed or unsafe judgment is silence here;
 * withdrawing an earlier yes is a separate worker step that already knows
 * this attester has a current yes. The HTTP service does not call this.
 */

import { attestMosaicSafety } from '@commonality/sdk/statement-images'
import { cidToBytes32, createWriteClients, type WriteClients } from '@commonality/sdk/utils'
import type { Hex } from 'viem'
import {
  checkMosaicSafety,
  type MosaicSafetyVerdict,
} from './mosaicSafetyCheck.js'
import type { CauseAssistConfig } from './types.js'

export interface MosaicSafetyAttestRequest {
  statementText: string
  statementCid: string
  imageCid: string
}

export type MosaicSafetyAttestReason =
  | 'attested'
  | 'not_safe'
  | 'judgment_unavailable'
  | 'attester_not_configured'
  | 'invalid_cid'

export interface MosaicSafetyAttestResult {
  attested: boolean
  reason: MosaicSafetyAttestReason
  verdict?: MosaicSafetyVerdict
  txHash?: Hex
}

export interface MosaicSafetyWriteConfig {
  ethereumPrivateKey?: string
  ethereumRpcUrl?: string
  statementImagesContractAddress?: string
}

export interface AttestMosaicSafetyDeps {
  check?: typeof checkMosaicSafety
  writeYes?: (input: {
    clients: WriteClients
    contract: { address: `0x${string}` }
    statementId: `0x${string}`
    imageId: `0x${string}`
    promptHash: Hex
    modelId: Hex
  }) => Promise<Hex>
  createClients?: typeof createWriteClients
}

export function isMosaicSafetyAttesterConfigured(config: MosaicSafetyWriteConfig): boolean {
  return Boolean(
    config.ethereumPrivateKey?.trim()
    && config.ethereumRpcUrl?.trim()
    && config.statementImagesContractAddress?.trim(),
  )
}

export async function attestMosaicSafetyIfJudged(
  request: MosaicSafetyAttestRequest,
  config: Pick<CauseAssistConfig, 'apiKey' | 'apiBaseUrl' | 'coherenceModel'> & MosaicSafetyWriteConfig,
  deps: AttestMosaicSafetyDeps = {},
): Promise<MosaicSafetyAttestResult> {
  const check = deps.check ?? checkMosaicSafety
  const verdict = await check(request, config)
  if (verdict.source !== 'llm') {
    return { attested: false, reason: 'judgment_unavailable', verdict }
  }
  if (!verdict.safe) {
    return { attested: false, reason: 'not_safe', verdict }
  }
  if (!isMosaicSafetyAttesterConfigured(config)) {
    return { attested: false, reason: 'attester_not_configured', verdict }
  }

  let statementId: `0x${string}`
  let imageId: `0x${string}`
  try {
    statementId = cidToBytes32(request.statementCid.trim())
    imageId = cidToBytes32(request.imageCid.trim())
  } catch {
    return { attested: false, reason: 'invalid_cid', verdict }
  }

  const createClients = deps.createClients ?? createWriteClients
  const clients = createClients(
    config.ethereumPrivateKey as `0x${string}`,
    config.ethereumRpcUrl as string,
  )
  const txHash = deps.writeYes
    ? await deps.writeYes({
      clients,
      contract: { address: config.statementImagesContractAddress as `0x${string}` },
      statementId,
      imageId,
      promptHash: verdict.promptHash,
      modelId: verdict.modelId,
    })
    : await attestMosaicSafety(
      clients,
      { address: config.statementImagesContractAddress as `0x${string}` },
      statementId,
      imageId,
      verdict.promptHash,
      verdict.modelId,
    )
  return { attested: true, reason: 'attested', verdict, txHash }
}
