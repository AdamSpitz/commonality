/**
 * Input validation utilities for API endpoints
 *
 * Provides helpers to validate and parse user inputs, preventing crashes
 * from malformed data and providing clear error messages.
 */

/**
 * Validates that a string is a properly formatted Ethereum address (0x + 40 hex chars)
 */
export function isValidAddress(address: string): address is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validates that a string is a properly formatted hex string (0x + even number of hex chars)
 */
export function isValidHex(hex: string): hex is `0x${string}` {
  return /^0x[a-fA-F0-9]*$/.test(hex) && hex.length % 2 === 0;
}

/**
 * Validates that a string is a properly formatted 32-byte hash (0x + 64 hex chars)
 */
export function isValidHash(hash: string): hash is `0x${string}` {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Safely parses a string to BigInt, returning null if invalid
 */
export function parseBigIntSafe(value: string): bigint | null {
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

/**
 * Validates and parses a comma-separated list of addresses
 * Returns null if any address is invalid
 */
export function parseAddressList(addressString: string | undefined): `0x${string}`[] | null {
  if (!addressString) {
    return null;
  }

  const addresses = addressString.split(",").map(a => a.trim());

  for (const addr of addresses) {
    if (!isValidAddress(addr)) {
      return null;
    }
  }

  return addresses as `0x${string}`[];
}

/**
 * Validates and parses a positive integer from a query parameter
 * Returns defaultValue if invalid or not provided
 */
export function parsePositiveInt(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 0) {
    return defaultValue;
  }

  return parsed;
}

/**
 * Validates a boolean query parameter
 * Accepts: "true", "false", "1", "0"
 * Returns defaultValue if invalid or not provided
 */
export function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) {
    return defaultValue;
  }

  const lower = value.toLowerCase();
  if (lower === "true" || lower === "1") {
    return true;
  }
  if (lower === "false" || lower === "0") {
    return false;
  }

  return defaultValue;
}

/**
 * Type guard for checking if a value is a valid token type (0 or 1)
 */
export function isValidTokenType(value: number): value is 0 | 1 {
  return value === 0 || value === 1;
}

/**
 * Standard error response for invalid input
 */
export function invalidInputError(field: string, reason: string) {
  return {
    error: "Invalid input",
    field,
    reason,
  };
}
