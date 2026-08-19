/**
 * Promote a cause view (selected planks) to a combinator statement.
 *
 * Writes the canonical all/any template, signs it, and pays the implication
 * attester for the pairwise arrows that actually follow from the operator.
 */

import { BeliefsAbi, MutableRefUpdaterAbi, PublishedDataAbi } from '@commonality/sdk/abis'
import { createAndSignStatement, type BeliefsContract } from '@commonality/sdk/conceptspace'
import {
  combinatorAttestationPairs,
  createCombinatorStatement,
  createDefaultDocumentReader,
  parseCombinatorStatement,
  publishedDataCidForDocument,
  type CombinatorKind,
} from '@commonality/sdk/displayable-documents'
import type { MutableRefUpdaterContract } from '@commonality/sdk/mutable-refs'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import type { IpfsCidV1, WriteClients } from '@commonality/sdk/utils'
import { getRuntimeConfigValue } from './runtimeConfig'
import { submitPairsToAttester, type SubmitPairsResult } from './implicationAttesterClient'

export interface PromoteViewArgs {
  machinery: SDKMachinery
  writeClients: WriteClients | null | undefined
  operandCids: readonly string[]
  combinator: CombinatorKind
  payAttester?: boolean
}

export interface PromoteViewResult {
  cid: string
  combinator: CombinatorKind
  attester?: SubmitPairsResult
}

export async function promoteViewToCombinator({
  machinery,
  writeClients,
  operandCids,
  combinator,
  payAttester = true,
}: PromoteViewArgs): Promise<PromoteViewResult> {
  if (operandCids.length < 2) {
    throw new Error('Select at least two published statements to promote a combination.')
  }
  if (!writeClients) {
    throw new Error('Wallet is not ready. Connect your wallet and try again.')
  }

  const reader = createDefaultDocumentReader(machinery)
  for (const cid of operandCids) {
    const read = await reader.read(cid as IpfsCidV1)
    if (read.status === 'active' && parseCombinatorStatement(read.document)) {
      throw new Error('v1 promotion is over ordinary planks only, not nested combinators.')
    }
  }

  const contracts = machinery.contractAddresses
  const beliefsAddress = (contracts?.beliefs
    || getRuntimeConfigValue('VITE_BELIEFS_CONTRACT_ADDRESS')) as `0x${string}` | undefined
  const mutableRefAddress = (contracts?.mutableRefUpdater
    || getRuntimeConfigValue('VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS')) as `0x${string}` | undefined
  const publishedDataAddress = (contracts?.publishedData
    || getRuntimeConfigValue('VITE_PUBLISHED_DATA_CONTRACT_ADDRESS')) as `0x${string}` | undefined

  if (!beliefsAddress || !mutableRefAddress || !publishedDataAddress) {
    throw new Error('Statement contract addresses are missing. Redeploy CauseStarter to refresh config.json.')
  }

  const document = createCombinatorStatement(combinator, operandCids)
  const cid = publishedDataCidForDocument(document)
  const parsed = parseCombinatorStatement(document)
  if (!parsed) {
    throw new Error('Internal error: combinator document was not canonical.')
  }

  const beliefs: BeliefsContract = { address: beliefsAddress, abi: BeliefsAbi }
  const mutableRefUpdater: MutableRefUpdaterContract = {
    address: mutableRefAddress,
    abi: MutableRefUpdaterAbi,
  }

  await createAndSignStatement(
    writeClients,
    {
      beliefs,
      mutableRefUpdater,
      publishedData: { address: publishedDataAddress, abi: PublishedDataAbi },
    },
    document,
    { machinery, addToCreatedList: true },
  )

  let attester: SubmitPairsResult | undefined
  if (payAttester) {
    attester = await submitPairsToAttester({
      writeClients,
      pairs: combinatorAttestationPairs(cid, parsed),
    })
  }

  return { cid, combinator, attester }
}
