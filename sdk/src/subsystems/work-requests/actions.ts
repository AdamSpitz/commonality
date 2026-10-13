import type { Abi } from 'viem';
import type { WriteClients } from '../../utils/ethereum.js';
import { toCanonicalJson } from '../displayable-documents/displayable-document.js';
import { updateRef } from '../mutable-refs/actions.js';
import { publishData } from '../published-data/actions.js';
import type { PublishedDataCid } from '../published-data/id.js';
import {
  buildContributionLinkDocument,
  buildWorkAcceptanceDocument,
  buildWorkDecisionDocument,
  buildWorkOfferDocument,
  buildWorkRequestDocument,
  buildWorkResponseDocument,
  cidForWorkDocument,
  type AcceptanceBody,
  type ContributionLinkBody,
  type DecisionBody,
  type OfferBody,
  type RequestBody,
  type ResponseBody,
} from './documents.js';
import {
  acceptanceRefName,
  contributionLinkRefName,
  decisionRefName,
  offerRefName,
  requestRefName,
  responseRefName,
} from './names.js';

export interface WorkPublishContracts {
  publishedData: { address: `0x${string}`; abi: Abi };
  mutableRefUpdater: { address: `0x${string}`; abi: Abi };
}

async function publishPointer(
  clients: WriteClients,
  contracts: WorkPublishContracts,
  document: ReturnType<typeof buildWorkRequestDocument>,
  refName: string,
): Promise<PublishedDataCid> {
  const bytes = new TextEncoder().encode(toCanonicalJson(document));
  const publication = await publishData(clients, contracts.publishedData, bytes);
  const cid = cidForWorkDocument(document);
  if (publication.cid !== cid) {
    throw new Error('Published bytes did not match the work-record document.');
  }
  try {
    await updateRef(clients, contracts.mutableRefUpdater, refName, cid);
  } catch (error) {
    throw new Error(`Published ${cid}, but the mutable pointer was not updated.`, { cause: error });
  }
  return cid;
}

export function publishWorkRequest(clients: WriteClients, contracts: WorkPublishContracts, body: RequestBody): Promise<PublishedDataCid> {
  return publishPointer(clients, contracts, buildWorkRequestDocument(body), requestRefName(body.slug));
}

export function publishWorkOffer(clients: WriteClients, contracts: WorkPublishContracts, body: OfferBody): Promise<PublishedDataCid> {
  return publishPointer(clients, contracts, buildWorkOfferDocument(body), offerRefName(body.slug));
}

export function publishWorkResponse(clients: WriteClients, contracts: WorkPublishContracts, body: ResponseBody): Promise<PublishedDataCid> {
  return publishPointer(clients, contracts, buildWorkResponseDocument(body), responseRefName(body.slug));
}

export function publishWorkAcceptance(clients: WriteClients, contracts: WorkPublishContracts, body: AcceptanceBody): Promise<PublishedDataCid> {
  return publishPointer(clients, contracts, buildWorkAcceptanceDocument(body), acceptanceRefName(body.responseOwner, body.responseSlug));
}

export function publishWorkDecision(clients: WriteClients, contracts: WorkPublishContracts, body: DecisionBody): Promise<PublishedDataCid> {
  return publishPointer(clients, contracts, buildWorkDecisionDocument(body), decisionRefName(body.offerOwner, body.offerSlug, body.responseOwner, body.responseSlug));
}

export function publishContributionLink(clients: WriteClients, contracts: WorkPublishContracts, body: ContributionLinkBody): Promise<PublishedDataCid> {
  return publishPointer(clients, contracts, buildContributionLinkDocument(body), contributionLinkRefName(body.slug));
}
