import {
  createWriteClients,
  attestImplication,
  type WriteClients,
  type ImplicationsContract,
  ImplicationsAbi,
  IpfsCidV1,
} from '@commonality/sdk';
import { classifyBlockchainError } from '@commonality/attester-core';
import type { AttesterConfig } from './config.js';

export function getBlockchainClients(config: AttesterConfig): {
  testClients: WriteClients;
  implicationsContract: ImplicationsContract;
} {
  try {
    const testClients = createWriteClients(
      config.ethereumPrivateKey as `0x${string}`,
      config.ethereumRpcUrl,
    );
    const implicationsContract: ImplicationsContract = {
      address: config.implicationsContractAddress as `0x${string}`,
      abi: ImplicationsAbi,
    };

    return { testClients, implicationsContract };
  } catch (error) {
    throw classifyBlockchainError(error);
  }
}

export async function publishAttestation(
  config: AttesterConfig,
  fromStatementCid: IpfsCidV1,
  toStatementCid: IpfsCidV1,
  explanationCid: IpfsCidV1,
): Promise<string> {
  const { testClients, implicationsContract } = getBlockchainClients(config);
  
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
  _config: AttesterConfig,
  _fromStatementCid: IpfsCidV1,
  _toStatementCid: IpfsCidV1,
): Promise<boolean> {
  return false;
}

/**
 * Check if the attester has sufficient funds
 */
export async function checkAttesterBalance(config: AttesterConfig): Promise<{
  balance: bigint;
  hasSufficientFunds: boolean;
  minimumRequired: bigint;
}> {
  const { testClients } = getBlockchainClients(config);
  
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
export async function getAttesterAddress(config: AttesterConfig): Promise<string> {
  const { testClients } = getBlockchainClients(config);
  return testClients.account;
}
