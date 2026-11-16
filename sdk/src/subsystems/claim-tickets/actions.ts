import { type Address, type Hash, type Hex, getAddress, parseEventLogs } from 'viem';
import { ProjectFactoryAbi } from '../../abis.js';
import type { WriteClients } from '../../utils/ethereum.js';
import type { IpfsCidV1 } from '../../utils/cid-types.js';
import { encodeClaimTicketCode } from './code.js';

export interface CreatedClaimTicket {
  hash: Hash;
  project: Address;
  token: Address;
  transitAddress: Address;
  code: string;
}

export class ClaimTicketCreationRevertedError extends Error {
  constructor(public readonly transactionHash: Hash) {
    super('Claim ticket creation transaction reverted.');
    this.name = 'ClaimTicketCreationRevertedError';
  }
}

/**
 * Create a ticket project and return its claim code only after the receipt confirms.
 * The caller keeps the transit key until this returns. A timeout after submission
 * must retry the same hash; do not generate another key for an unknown attempt.
 */
export async function createClaimTicketProject(
  clients: WriteClients,
  projectFactory: Address,
  params: {
    metadataURI: string;
    contractURI: string;
    owner: Address;
    transitAddress: Address;
    transitKey: Hex;
    paymentToken: Address;
    threshold: bigint;
    deadline: bigint;
    projectMetadataCid: IpfsCidV1;
    tokenIds: bigint[];
    tokenCounts: bigint[];
    tokenPrices: bigint[];
    workIds?: string[];
  },
  options: {
    /** Resume confirmation of an earlier submission without creating another project. */
    transactionHash?: Hash;
    /** Retain the hash before waiting, including when confirmation times out. */
    onSubmitted?: (hash: Hash) => void;
  } = {},
): Promise<CreatedClaimTicket> {
  const chainId = BigInt(clients.walletClient.chain?.id ?? await clients.publicClient.getChainId());
  const args = [
    params.metadataURI,
    params.contractURI,
    params.owner,
    params.transitAddress,
    params.paymentToken,
    params.threshold,
    params.deadline,
    params.projectMetadataCid,
    params.tokenIds,
    params.tokenCounts,
    params.tokenPrices,
    params.workIds ?? [],
  ] as const;
  const hash = options.transactionHash ?? await clients.walletClient.writeContract({
    address: projectFactory,
    abi: ProjectFactoryAbi,
    functionName: 'createClaimTicketProject',
    args,
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });
  options.onSubmitted?.(hash);
  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new ClaimTicketCreationRevertedError(hash);
  const created = parseEventLogs({
    abi: ProjectFactoryAbi,
    eventName: 'ClaimTicketProjectCreated',
    logs: receipt.logs,
  }).filter((event) => event.address.toLowerCase() === projectFactory.toLowerCase());
  const projects = parseEventLogs({
    abi: ProjectFactoryAbi,
    eventName: 'ProjectCreated',
    logs: receipt.logs,
  }).filter((event) => event.address.toLowerCase() === projectFactory.toLowerCase());
  if (created.length !== 1 || projects.length !== 1) {
    throw new Error('Claim ticket creation did not confirm a single project.');
  }
  const project = getAddress(created[0].args.project);
  const transitAddress = getAddress(created[0].args.transitAddress);
  if (transitAddress !== getAddress(params.transitAddress) || project !== getAddress(projects[0].args.assuranceContract)) {
    throw new Error('Confirmed claim ticket does not match the submitted transit key.');
  }
  return {
    hash,
    project,
    token: getAddress(projects[0].args.token),
    transitAddress,
    code: encodeClaimTicketCode({ chainId, project, transitKey: params.transitKey }),
  };
}
