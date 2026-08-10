/**
 * Publishing a plank.
 *
 * Each plank is published as its own signable statement — that is the whole
 * point of planks, and it is why publishing is per-plank rather than a
 * once-per-cause "launch". A founder can publish one plank today and another
 * next month; the cause page simply shows which are live.
 *
 * Statement *content* goes through the PublishedData contract, the same path
 * the main UI's CreateStatementForm uses. There is no browser IPFS write.
 */

import { BeliefsAbi, MutableRefUpdaterAbi, PublishedDataAbi } from '@commonality/sdk/abis'
import { createAndSignStatement, type BeliefsContract } from '@commonality/sdk/conceptspace'
import { createStatement } from '@commonality/sdk/displayable-documents'
import type { MutableRefUpdaterContract } from '@commonality/sdk/mutable-refs'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import type { WriteClients } from '@commonality/sdk/utils'
import { getRuntimeConfigValue } from './runtimeConfig'

interface PublishPlankArgs {
  machinery: SDKMachinery
  writeClients: WriteClients | null | undefined
  text: string
}

/** Publish one plank's text as a statement and return its CID. */
export async function publishPlank({
  machinery,
  writeClients,
  text,
}: PublishPlankArgs): Promise<string> {
  const contracts = machinery.contractAddresses
  const beliefsAddress = (contracts?.beliefs
    || getRuntimeConfigValue('VITE_BELIEFS_CONTRACT_ADDRESS')) as `0x${string}` | undefined
  const mutableRefAddress = (contracts?.mutableRefUpdater
    || getRuntimeConfigValue('VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS')) as `0x${string}` | undefined
  const publishedDataAddress = (contracts?.publishedData
    || getRuntimeConfigValue('VITE_PUBLISHED_DATA_CONTRACT_ADDRESS')) as `0x${string}` | undefined

  if (!writeClients) {
    throw new Error('Wallet is not ready. Connect your wallet and try again.')
  }
  if (!beliefsAddress || !mutableRefAddress || !publishedDataAddress) {
    throw new Error('Statement contract addresses are missing. Redeploy CauseStarter to refresh config.json.')
  }

  const beliefs: BeliefsContract = { address: beliefsAddress, abi: BeliefsAbi }
  const mutableRefUpdater: MutableRefUpdaterContract = {
    address: mutableRefAddress,
    abi: MutableRefUpdaterAbi,
  }

  const result = await createAndSignStatement(
    writeClients,
    {
      beliefs,
      mutableRefUpdater,
      publishedData: { address: publishedDataAddress, abi: PublishedDataAbi },
    },
    createStatement({ content: text.trim() }),
    { machinery, addToCreatedList: true },
  )
  return result.cid
}
