import { createWalletClient, createPublicClient, http } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import {
  createTestClients,
  attestImplication,
  type TestClients,
  type ImplicationsContract,
  ImplicationsAbi,
  IpfsCidV1,
} from '@commonality/sdk';
import { loadConfig } from './config.js';
import { classifyBlockchainError, BlockchainError } from './errors.js';

let testClients: TestClients | null = null;
let implicationsContract: ImplicationsContract | null = null;

export function getBlockchainClients() {
  if (testClients && implicationsContract) {
    return { testClients, implicationsContract };
  }

  const config = loadConfig();
  
  try {
    testClients = createTestClients(
      config.ethereumPrivateKey as `0x${string}`,
      config.ethereumRpcUrl
    );
  } catch (error) {
    throw classifyBlockchainError(error);
  }

  implicationsContract = {
    address: config.implicationsContractAddress as `0x${string}`,
    abi: ImplicationsAbi,
  };

  return { testClients, implicationsContract };
}

export async function publishAttestation(
  fromStatementCid: IpfsCidV1,
  toStatementCid: IpfsCidV1,
  explanationCid: IpfsCidV1
): Promise<string> {
  const { testClients, implicationsContract } = getBlockchainClients();
  
  try {
    const txHash = await attestImplication(
      testClients,
      implicationsContract,
      fromStatementCid,
      toStatementCid,
      explanationCid
    );

    return txHash;
  } catch (error) {
    // Re-classify and re-throw for proper error handling upstream
    throw classifyBlockchainError(error);
  }
}

export async function checkExistingAttestation(
  fromStatementCid: IpfsCidV1,
  toStatementCid: IpfsCidV1
): Promise<boolean> {
  return false;
}

/**
 * Check if the attester has sufficient funds
 */
export async function checkAttesterBalance(): Promise<{
  balance: bigint;
  hasSufficientFunds: boolean;
  minimumRequired: bigint;
}> {
  const { testClients } = getBlockchainClients();
  
  try {
    const balance = await testClients.publicClient.getBalance({
      address: testClients.account,
    });

    // Minimum required: 0.01 ETH for gas + buffer
    const minimumRequired = BigInt(1e16); // 0.01 ETH
    
    return {
      balance,
      hasSufficientFunds: balance >= minimumRequired,
      minimumRequired,
    };
  } catch (error) {
    throw classifyBlockchainError(error);
  }
}

/**
 * Get attester account address
 */
export async function getAttesterAddress(): Promise<string> {
  const { testClients } = getBlockchainClients();
  return testClients.account;
}
