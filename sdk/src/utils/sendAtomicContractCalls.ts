import { encodeFunctionData, numberToHex, type Abi, type Address, type Hash } from 'viem';
import type { WriteClients } from './ethereum.js';
import { getWriteClientCapabilities, paymasterServiceCapability } from './walletCapabilities.js';

export type AtomicContractCall = {
  to: Address;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
};

export async function sendAtomicContractCalls(
  clients: WriteClients,
  calls: readonly AtomicContractCall[],
  paymasterUrl?: string,
): Promise<Hash> {
  const chainId = clients.walletClient.chain?.id;
  if (!chainId) throw new Error('Atomic transactions require a configured wallet chain.');
  const walletCaps = await getWriteClientCapabilities(clients);
  const paymaster = paymasterServiceCapability(paymasterUrl, walletCaps);
  const id = await clients.walletClient.request({
    method: 'wallet_sendCalls',
    params: [{
      version: '2.0.0',
      chainId: numberToHex(chainId),
      from: clients.account,
      atomicRequired: true,
      calls: calls.map(({ to, abi, functionName, args }) => ({
        to,
        data: encodeFunctionData({ abi, functionName, args }),
      })),
      ...(paymaster ? { capabilities: paymaster } : {}),
    }],
  });
  const batchId = typeof id === 'string' ? id : (id as { id: string }).id;
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const status = await clients.walletClient.request({
      method: 'wallet_getCallsStatus',
      params: [batchId],
    }) as { status: number; receipts?: { transactionHash?: Hash }[] };
    if (status.status === 200) {
      const hash = status.receipts?.[0]?.transactionHash;
      if (!hash) throw new Error('Atomic transaction completed without a transaction hash.');
      return hash;
    }
    if (status.status >= 300) throw new Error('Atomic transaction failed.');
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
  throw new Error('Timed out waiting for atomic transaction confirmation.');
}
