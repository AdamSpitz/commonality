import { privateKeyToAccount } from 'viem/accounts';
import type { NudgerConfig } from './config.js';

let account: ReturnType<typeof privateKeyToAccount> | null = null;

export function initializeSigner(config: NudgerConfig) {
  account = privateKeyToAccount(config.nudgerPrivateKey as `0x${string}`);
  return account;
}

export function getSignerAddress(): string {
  if (!account) {
    throw new Error('Signer not initialized. Call initializeSigner first.');
  }
  return account.address;
}

export interface NudgeMessage {
  nudger: string;
  targetStatementCid: string;
  suggestedStatementCid: string;
  reason: string;
  confidence: number;
  timestamp: number;
  signature: string;
}

export async function signNudgeMessage(message: Omit<NudgeMessage, 'nudger' | 'signature'>): Promise<NudgeMessage> {
  if (!account) {
    throw new Error('Signer not initialized. Call initializeSigner first.');
  }

  const messageString = JSON.stringify({
    targetStatementCid: message.targetStatementCid,
    suggestedStatementCid: message.suggestedStatementCid,
    reason: message.reason,
    confidence: message.confidence,
    timestamp: message.timestamp,
  });

  const signature = await account.signMessage({
    message: messageString,
  });

  return {
    nudger: account.address,
    targetStatementCid: message.targetStatementCid,
    suggestedStatementCid: message.suggestedStatementCid,
    reason: message.reason,
    confidence: message.confidence,
    timestamp: message.timestamp,
    signature,
  };
}

export function recoverSignerAddress(message: NudgeMessage): string {
  return message.nudger;
}