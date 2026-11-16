import { type Address, type Hex, getAddress, isAddress, isHex } from 'viem';
import { encodeRedeemCall } from '@commonality/sdk/claim-tickets';
import { HttpError } from './errors.js';

export interface ClaimTicketRelayConfig {
  chainId?: number;
  factoryAddress?: Address;
  maxGas?: bigint;
  minSignerBalance?: bigint;
}

export interface ClaimTicketRelayRequest {
  project?: string;
  destination?: string;
  transitSignature?: string;
  destinationSignature?: string;
  deadline?: string;
  transitAddress?: string;
}

export interface ClaimTicketRelayChain {
  readProvenance(project: Address, transitAddress: Address): Promise<{ matchesFactory: boolean; redeemed: boolean }>;
  simulateRedeem(project: Address, data: Hex): Promise<void>;
  estimateRedeemGas(project: Address, data: Hex): Promise<bigint>;
  signerBalance(): Promise<bigint>;
  submitRedeem(project: Address, data: Hex): Promise<Hex>;
}

export interface ClaimTicketRelayResult {
  transactionHash?: Hex;
  retryable: boolean;
  payload: { chainId: number; to: Address; data: Hex };
}

const MAX_SIGNATURE_BYTES = 2_048;

export async function relayClaimTicket(
  config: ClaimTicketRelayConfig,
  request: ClaimTicketRelayRequest,
  chain: ClaimTicketRelayChain,
): Promise<ClaimTicketRelayResult> {
  if (!config.chainId || !config.factoryAddress) {
    throw new HttpError(503, 'claim_relay_not_configured', 'Claim ticket relay is not configured for this deployment.');
  }
  const project = parseAddress(request.project, 'project');
  const destination = parseAddress(request.destination, 'destination');
  const transitAddress = parseAddress(request.transitAddress, 'transitAddress');
  const deadline = parseDeadline(request.deadline);
  const transitSignature = parseSignature(request.transitSignature, 'transitSignature');
  const destinationSignature = parseSignature(request.destinationSignature, 'destinationSignature');
  const data = encodeRedeemCall({ destination, transitSignature, destinationSignature, deadline });
  const payload = { chainId: config.chainId, to: project, data };

  const provenance = await chain.readProvenance(project, transitAddress);
  if (!provenance.matchesFactory) {
    throw new HttpError(400, 'unknown_claim_ticket', 'This project is not a ticket recorded by the configured factory.');
  }
  if (provenance.redeemed) {
    throw new HttpError(409, 'ticket_already_redeemed', 'This ticket is already redeemed.');
  }
  try {
    await chain.simulateRedeem(project, data);
  } catch (error) {
    throw new HttpError(400, 'claim_simulation_failed', 'The redemption would revert.', errorMessage(error));
  }
  const maxGas = config.maxGas ?? 500_000n;
  const minSignerBalance = config.minSignerBalance ?? 1_000_000_000_000_000n;
  const gas = await chain.estimateRedeemGas(project, data);
  if (gas > maxGas) {
    throw new HttpError(400, 'claim_gas_too_high', 'The redemption exceeds the relay gas cap.', { gas: gas.toString() });
  }
  if (await chain.signerBalance() < minSignerBalance) {
    throw new HttpError(503, 'sponsorship_exhausted', 'The relay cannot sponsor this claim right now. Submit the payload with another signer.', payload);
  }
  try {
    const transactionHash = await chain.submitRedeem(project, data);
    return { transactionHash, retryable: false, payload };
  } catch (error) {
    throw new HttpError(503, 'sponsorship_exhausted', 'The relay could not submit this claim. Submit the payload with another signer.', {
      ...payload,
      reason: errorMessage(error),
    });
  }
}

function parseAddress(value: string | undefined, field: string): Address {
  if (!value || !isAddress(value)) throw new HttpError(400, 'invalid_request', `Missing or invalid ${field}.`);
  return getAddress(value);
}

function parseSignature(value: string | undefined, field: string): Hex {
  if (!value || !isHex(value) || value.length < 4 || (value.length - 2) / 2 > MAX_SIGNATURE_BYTES) {
    throw new HttpError(400, 'invalid_request', `Missing or invalid ${field}.`);
  }
  return value;
}

function parseDeadline(value: string | undefined): bigint {
  if (!value || !/^[0-9]+$/.test(value)) throw new HttpError(400, 'invalid_request', 'Missing or invalid deadline.');
  return BigInt(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
