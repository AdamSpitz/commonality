import type { Hash } from 'viem';
import { StatementImagesAbi } from '../../abis.js';
import type { WriteClients } from '../../utils/ethereum.js';

export interface StatementImagesWrite {
  address: `0x${string}`;
}

async function write(
  clients: WriteClients,
  contract: StatementImagesWrite,
  functionName: 'adoptImage' | 'revokeImageAdoption' | 'revokeMosaicSafety',
  statementId: `0x${string}`,
  imageId: `0x${string}`,
): Promise<Hash> {
  return clients.walletClient.writeContract({
    address: contract.address,
    abi: StatementImagesAbi,
    functionName,
    args: [statementId, imageId],
    account: clients.account,
    chain: clients.walletClient.chain,
  });
}

export function adoptStatementImage(
  clients: WriteClients,
  contract: StatementImagesWrite,
  statementId: `0x${string}`,
  imageId: `0x${string}`,
): Promise<Hash> {
  return write(clients, contract, 'adoptImage', statementId, imageId);
}

export function revokeStatementImage(
  clients: WriteClients,
  contract: StatementImagesWrite,
  statementId: `0x${string}`,
  imageId: `0x${string}`,
): Promise<Hash> {
  return write(clients, contract, 'revokeImageAdoption', statementId, imageId);
}

export function attestMosaicSafety(
  clients: WriteClients,
  contract: StatementImagesWrite,
  statementId: `0x${string}`,
  imageId: `0x${string}`,
  promptHash: `0x${string}`,
  modelId: `0x${string}`,
): Promise<Hash> {
  return clients.walletClient.writeContract({
    address: contract.address,
    abi: StatementImagesAbi,
    functionName: 'attestMosaicSafety',
    args: [statementId, imageId, promptHash, modelId],
    account: clients.account,
    chain: clients.walletClient.chain,
  });
}

export function revokeMosaicSafety(
  clients: WriteClients,
  contract: StatementImagesWrite,
  statementId: `0x${string}`,
  imageId: `0x${string}`,
): Promise<Hash> {
  return write(clients, contract, 'revokeMosaicSafety', statementId, imageId);
}
