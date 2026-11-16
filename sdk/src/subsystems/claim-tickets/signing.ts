import {
  type Address,
  type Hex,
  type TypedDataDomain,
  encodeFunctionData,
  zeroAddress,
} from 'viem';
import { ClaimTicketAssuranceContractAbi } from '../../abis/funding.js';

export const CLAIM_TICKET_DOMAIN_NAME = 'ClaimTicket';
export const CLAIM_TICKET_DOMAIN_VERSION = '1';
export const REDEEM_CLAIM_TICKET_TYPES = {
  RedeemClaimTicket: [
    { name: 'destination', type: 'address' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

export interface RedeemClaimTicketMessage {
  destination: Address;
  deadline: bigint;
  nonce: bigint;
}

export function claimTicketDomain(chainId: bigint, project: Address): TypedDataDomain {
  return {
    name: CLAIM_TICKET_DOMAIN_NAME,
    version: CLAIM_TICKET_DOMAIN_VERSION,
    chainId,
    verifyingContract: project,
  };
}

export function redeemClaimTicketMessage(destination: Address, deadline: bigint): RedeemClaimTicketMessage {
  if (destination === zeroAddress) throw new Error('A claim needs a destination account.');
  return { destination, deadline, nonce: 0n };
}

export function encodeRedeemCall(input: {
  destination: Address;
  transitSignature: Hex;
  destinationSignature: Hex;
  deadline: bigint;
}): Hex {
  return encodeFunctionData({
    abi: ClaimTicketAssuranceContractAbi,
    functionName: 'redeem',
    args: [input.destination, input.transitSignature, input.destinationSignature, input.deadline],
  });
}
