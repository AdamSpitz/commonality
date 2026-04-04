import { keccak256, formatEther, parseEther } from 'viem';

/**
 * Utility functions for generative testing
 */

/**
 * Create a mock bytes32 from a string
 * Useful for creating consistent statement IDs in tests
 */
export function stringToBytes32(str: string): `0x${string}` {
  const bytes = new TextEncoder().encode(str.slice(0, 31));
  return keccak256(bytes);
}

/**
 * Convert bytes32 back to string
 */
export function bytes32ToString(bytes32: `0x${string}`): string {
  const hex = bytes32.slice(2);
  const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
  return new TextDecoder().decode(bytes).replace(/\0+$/, '');
}

/**
 * Format wei to ETH
 */
export function formatEth(wei: bigint): string {
  return formatEther(wei);
}

/**
 * Parse ETH to wei
 */
export function parseEth(eth: number): bigint {
  return parseEther(eth.toString());
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate statistics for an array of numbers
 */
export function calculateStats(numbers: number[]): {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
} {
  if (numbers.length === 0) {
    return { count: 0, mean: 0, median: 0, min: 0, max: 0, p95: 0, p99: 0 };
  }

  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    count: sorted.length,
    mean: Math.round(sum / sorted.length),
    median: sorted[Math.floor(sorted.length / 2)],
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  };
}

/**
 * Weighted random selection
 */
export function weightedRandom<T>(items: Array<{ item: T; weight: number }>): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let rand = Math.random() * totalWeight;

  for (const item of items) {
    rand -= item.weight;
    if (rand <= 0) {
      return item.item;
    }
  }

  return items[items.length - 1].item;
}

/**
 * Generate a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick N random elements from an array
 */
export function pickRandom<T>(array: T[], n: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/**
 * Check if two belief positions are compatible
 * Used to determine if one statement might imply another
 */
export function arePositionsCompatible(pos1: unknown, pos2: unknown): boolean {
  if (typeof pos1 === 'string' && typeof pos2 === 'string') {
    return pos1 === pos2;
  }

  if (typeof pos1 === 'object' && pos1 !== null && typeof pos2 === 'object' && pos2 !== null) {
    // Check if any axis matches
    for (const [axis, value] of Object.entries(pos1 as Record<string, unknown>)) {
      if ((pos2 as Record<string, unknown>)[axis] === value) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Format a large number with commas
 */
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Get a human-readable timestamp
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Create a simple progress bar
 */
export function progressBar(current: number, total: number, width = 40): string {
  const percentage = current / total;
  const filled = Math.floor(width * percentage);
  const empty = width - filled;
  return `[${'='.repeat(filled)}${' '.repeat(empty)}] ${Math.floor(percentage * 100)}% (${current}/${total})`;
}
