import { type Address, type Hex } from 'viem';
import { ContentRegistryAbi, ProjectFactoryAbi, WorkFundingConditionAbi } from '../../abis/funding.js';
import { type SDKMachinery } from '../../machinery.js';
import { workIdHash } from './ids.js';

export type ProjectWorkState = {
  beneficiaryId: Hex;
  beneficiaryAddress: Address;
  items: Array<{ id: string; hash: Hex }>;
  thirdParty: boolean;
  acceptedAt: bigint;
  vetoWindow: bigint;
  deadline: bigint;
  cancelled: boolean;
  succeeded: boolean;
  failed: boolean;
  timestamp: bigint;
  reservationActive: boolean;
};

/** Read authenticated work identity and proposal state from the configured factory. */
export async function getProjectWorkState(machinery: SDKMachinery, factory: Address, project: Address): Promise<ProjectWorkState | null> {
  const client = machinery.publicClient;
  if (!client) return null;
  const [beneficiaryId, condition, ids, registry] = await Promise.all([
    client.readContract({ address: factory, abi: ProjectFactoryAbi, functionName: 'workBeneficiaryOf', args: [project], authorizationList: undefined }),
    client.readContract({ address: factory, abi: ProjectFactoryAbi, functionName: 'workConditionOf', args: [project], authorizationList: undefined }),
    client.readContract({ address: factory, abi: ProjectFactoryAbi, functionName: 'workIdsOf', args: [project], authorizationList: undefined }),
    client.readContract({ address: factory, abi: ProjectFactoryAbi, functionName: 'workRegistry', authorizationList: undefined }),
  ]);
  if (condition === '0x0000000000000000000000000000000000000000') return null;
  const read = <T extends 'beneficiary' | 'isThirdParty' | 'acceptedAt' | 'VETO_WINDOW' | 'deadline' | 'cancelled' | 'hasSucceeded' | 'hasFailed'>(functionName: T) =>
    client.readContract({ address: condition, abi: WorkFundingConditionAbi, functionName, authorizationList: undefined });
  const items = ids.map(id => ({ id, hash: workIdHash(id, beneficiaryId) }));
  const [beneficiaryAddress, thirdParty, acceptedAt, vetoWindow, deadline, cancelled, succeeded, failed, block, reservations] = await Promise.all([
    read('beneficiary'), read('isThirdParty'), read('acceptedAt'), read('VETO_WINDOW'), read('deadline'), read('cancelled'), read('hasSucceeded'), read('hasFailed'),
    client.getBlock(),
    Promise.all(items.map(item => client.readContract({ address: registry, abi: ContentRegistryAbi, functionName: 'projectFor', args: [item.hash], authorizationList: undefined }))),
  ]);
  return {
    beneficiaryId, beneficiaryAddress, thirdParty, acceptedAt, vetoWindow, deadline, cancelled, succeeded, failed, timestamp: block.timestamp,
    items,
    reservationActive: reservations.some(current => current.toLowerCase() === project.toLowerCase()),
  };
}
