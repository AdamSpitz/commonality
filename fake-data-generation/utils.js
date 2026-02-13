import { ethers } from 'ethers';

/**
 * Utility functions for generative testing
 */

/**
 * Convert a statement content object to a bytes32 statement ID
 * In production, this would be an IPFS CID
 * For testing, we use a keccak256 hash
 */
export function createStatementId(content) {
  const json = JSON.stringify(content, Object.keys(content).sort());
  return ethers.keccak256(ethers.toUtf8Bytes(json));
}

/**
 * Create a mock bytes32 from a string
 * Useful for creating consistent statement IDs in tests
 */
export function stringToBytes32(str) {
  return ethers.encodeBytes32String(str.slice(0, 31));
}

/**
 * Convert bytes32 back to string
 */
export function bytes32ToString(bytes32) {
  return ethers.decodeBytes32String(bytes32);
}

/**
 * Format wei to ETH
 */
export function formatEth(wei) {
  return ethers.formatEther(wei);
}

/**
 * Parse ETH to wei
 */
export function parseEth(eth) {
  return ethers.parseEther(eth.toString());
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate statistics for an array of numbers
 */
export function calculateStats(numbers) {
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
 * @param items Array of { item, weight } objects
 */
export function weightedRandom(items) {
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
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick N random elements from an array
 */
export function pickRandom(array, n) {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/**
 * Check if two belief positions are compatible
 * Used to determine if one statement might imply another
 */
export function arePositionsCompatible(pos1, pos2) {
  if (typeof pos1 === 'string' && typeof pos2 === 'string') {
    return pos1 === pos2;
  }

  if (typeof pos1 === 'object' && typeof pos2 === 'object') {
    // Check if any axis matches
    for (const [axis, value] of Object.entries(pos1)) {
      if (pos2[axis] === value) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Format a large number with commas
 */
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Get a human-readable timestamp
 */
export function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Create a simple progress bar
 */
export function progressBar(current, total, width = 40) {
  const percentage = current / total;
  const filled = Math.floor(width * percentage);
  const empty = width - filled;
  return `[${'='.repeat(filled)}${' '.repeat(empty)}] ${Math.floor(percentage * 100)}% (${current}/${total})`;
}
