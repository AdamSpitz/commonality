/**
 * Publish a goal or belief as an on-chain statement (PublishedData path).
 */

import { BeliefsAbi, MutableRefUpdaterAbi, PublishedDataAbi } from '@commonality/sdk/abis'
import { createAndSignStatement, type BeliefsContract } from '@commonality/sdk/conceptspace'
import { createStatement } from '@commonality/sdk/displayable-documents'
import type { MutableRefUpdaterContract } from '@commonality/sdk/mutable-refs'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import type { WriteClients } from '@commonality/sdk/utils'
import { getRuntimeConfigValue } from './runtimeConfig'

interface PublishStatementArgs {
  machinery: SDKMachinery
  writeClients: WriteClients | null | undefined
  text: string
}

export async function publishStatement({
  machinery,
  writeClients,
  text,
}: PublishStatementArgs): Promise<string> {
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
    throw new Error('Statement contract addresses are missing. Seed ui3/.env from the local stack.')
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
