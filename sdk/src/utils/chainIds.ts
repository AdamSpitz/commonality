import { isAddress } from 'viem';

export type ChainId = number;

export interface ChainAddressRef {
  chainId: ChainId;
  address: `0x${string}`;
}

const CAIP10_EIP155_PATTERN = /^eip155:(\d+):(0x[a-fA-F0-9]{40})$/;

export function formatChainAddressRef(ref: ChainAddressRef): string {
  return `eip155:${ref.chainId}:${ref.address}`;
}

export function parseChainAddressRef(value: string, defaultChainId: ChainId): ChainAddressRef {
  const decodedValue = decodeURIComponent(value);
  const match = CAIP10_EIP155_PATTERN.exec(decodedValue);
  if (match) {
    return {
      chainId: Number(match[1]),
      address: match[2] as `0x${string}`,
    };
  }

  if (isAddress(decodedValue)) {
    return {
      chainId: defaultChainId,
      address: decodedValue as `0x${string}`,
    };
  }

  throw new Error(`Invalid chain address reference: ${value}`);
}

export function tryParseChainAddressRef(
  value: string | undefined | null,
  defaultChainId: ChainId,
): ChainAddressRef | null {
  if (!value) return null;
  try {
    return parseChainAddressRef(value, defaultChainId);
  } catch {
    return null;
  }
}

export function chainStatusKeyForChainId(chainId: ChainId): string {
  switch (chainId) {
    case 1:
      return 'mainnet';
    case 8453:
      return 'base';
    case 84532:
      return 'base-sepolia';
    case 31337:
      return 'hardhat';
    default:
      return String(chainId);
  }
}
