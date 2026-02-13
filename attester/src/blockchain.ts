import { createWalletClient, createPublicClient, http } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import {
  createTestClients,
  attestImplication,
  type TestClients,
  type ImplicationsContract,
  ImplicationsAbi,
} from '@commonality/sdk';
import { loadConfig } from './config.js';

let testClients: TestClients | null = null;
let implicationsContract: ImplicationsContract | null = null;

export function getBlockchainClients() {
  if (testClients && implicationsContract) {
    return { testClients, implicationsContract };
  }

  const config = loadConfig();
  
  testClients = createTestClients(
    config.ethereumPrivateKey as `0x${string}`,
    config.ethereumRpcUrl
  );

  implicationsContract = {
    address: config.implicationsContractAddress as `0x${string}`,
    abi: ImplicationsAbi,
  };

  return { testClients, implicationsContract };
}

export async function publishAttestation(
  fromStatementCid: string,
  toStatementCid: string,
  explanationCid: string
): Promise<string> {
  const { testClients, implicationsContract } = getBlockchainClients();
  
  const txHash = await attestImplication(
    testClients,
    implicationsContract,
    fromStatementCid,
    toStatementCid,
    explanationCid
  );

  return txHash;
}

export async function checkExistingAttestation(
  fromStatementCid: string,
  toStatementCid: string
): Promise<boolean> {
  return false;
}
