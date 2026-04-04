import { type Address, type Hash, type Abi } from 'viem';
import { type TestClients } from '../../utils/ethereum.js';

export interface TrustRegistryContract {
  address: Address;
  abi: Abi;
}

export async function setTrust(
  clients: TestClients,
  trustRegistryContract: TrustRegistryContract,
  trustee: Address,
  score: number
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: trustRegistryContract.address,
    abi: trustRegistryContract.abi,
    functionName: 'setTrust',
    args: [trustee, score],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function setTrustBatch(
  clients: TestClients,
  trustRegistryContract: TrustRegistryContract,
  trustees: Address[],
  scores: number[]
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: trustRegistryContract.address,
    abi: trustRegistryContract.abi,
    functionName: 'setTrustBatch',
    args: [trustees, scores],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
