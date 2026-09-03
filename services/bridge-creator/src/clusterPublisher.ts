import { MutableRefUpdaterAbi, PublishedDataAbi } from '@commonality/sdk/abis';
import { createDefaultDocumentStore, type DisplayableDocument } from '@commonality/sdk/displayable-documents';
import type { SDKMachinery } from '@commonality/sdk/machinery';
import { updateRef } from '@commonality/sdk/mutable-refs';
import type { WriteClients } from '@commonality/sdk/utils';
import type { Abi } from 'viem';
import {
  clusterDocumentFromPlan,
  rosterDocumentFromPlan,
  type TickClusterPlan,
} from './clusterFromTick.js';

export interface ClusterPublisherOptions {
  clients: WriteClients;
  publishedDataContractAddress: `0x${string}`;
  mutableRefUpdaterContractAddress: `0x${string}`;
}

export async function publishTickClusterDocuments(
  machinery: SDKMachinery,
  plan: TickClusterPlan,
  options: ClusterPublisherOptions,
): Promise<{ clusterCid: string; rosterCids: string[] }> {
  const store = createDefaultDocumentStore(machinery, {
    clients: options.clients,
    publishedDataContract: {
      address: options.publishedDataContractAddress,
      abi: PublishedDataAbi as Abi,
    },
  });
  const refContract = {
    address: options.mutableRefUpdaterContractAddress,
    abi: MutableRefUpdaterAbi as Abi,
  };

  const rosterCids: string[] = [];
  for (const roster of plan.rosters) {
    const published = await store.publish(rosterDocumentFromPlan(roster) as unknown as DisplayableDocument);
    rosterCids.push(published.cid);
    await updateRef(options.clients, refContract, roster.slug, published.cid);
  }

  const clusterPublished = await store.publish(clusterDocumentFromPlan(plan.cluster) as unknown as DisplayableDocument);
  await updateRef(options.clients, refContract, plan.clusterSlug, clusterPublished.cid);
  return { clusterCid: clusterPublished.cid, rosterCids };
}
