/**
 * Shared constants for the indexers
 *
 * These constants match the Solidity contract definitions and should be
 * kept in sync with any contract changes.
 */

// ============================================================================
// CONCEPT SPACE CONSTANTS
// ============================================================================

/**
 * Belief states for the Beliefs contract
 * Represents a user's stance on a statement
 */
export const BeliefState = {
  NO_OPINION: 0,
  BELIEVES: 1,
  DISBELIEVES: 2,
} as const;

// ============================================================================
// DELEGATION CONSTANTS
// ============================================================================

/**
 * Token types for delegatable notes
 * Matches the Solidity TokenType enum
 */
export const TokenType = {
  ERC20: 0,  // Includes native ETH (address(0))
  ERC1155: 1,
} as const;
