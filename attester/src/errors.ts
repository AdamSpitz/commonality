/**
 * Blockchain error handling utilities
 * 
 * Provides error classification and handling for blockchain interactions
 */

export class BlockchainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'BlockchainError';
  }
}

export class InsufficientFundsError extends BlockchainError {
  constructor(message: string = 'Insufficient funds for transaction') {
    super(message, 'INSUFFICIENT_FUNDS', false);
    this.name = 'InsufficientFundsError';
  }
}

export class TransactionRevertedError extends BlockchainError {
  constructor(
    message: string = 'Transaction was reverted by the EVM',
    public readonly revertReason?: string
  ) {
    super(message, 'TRANSACTION_REVERTED', false);
    this.name = 'TransactionRevertedError';
  }
}

export class ConnectionError extends BlockchainError {
  constructor(message: string = 'Failed to connect to blockchain node') {
    super(message, 'CONNECTION_ERROR', true);
    this.name = 'ConnectionError';
  }
}

export class NonceError extends BlockchainError {
  constructor(message: string = 'Invalid transaction nonce') {
    super(message, 'NONCE_ERROR', true);
    this.name = 'NonceError';
  }
}

export class GasPriceError extends BlockchainError {
  constructor(message: string = 'Failed to estimate or fetch gas price') {
    super(message, 'GAS_PRICE_ERROR', true);
    this.name = 'GasPriceError';
  }
}

export class ContractError extends BlockchainError {
  constructor(
    message: string = 'Contract interaction failed',
    public readonly contractError?: string
  ) {
    super(message, 'CONTRACT_ERROR', false);
    this.name = 'ContractError';
  }
}

/**
 * Parse viem errors and classify them into specific error types
 */
export function classifyBlockchainError(error: unknown): BlockchainError {
  if (error instanceof BlockchainError) {
    return error;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorLower = errorMessage.toLowerCase();

  // Insufficient funds
  if (
    errorLower.includes('insufficient funds') ||
    errorLower.includes('insufficient balance') ||
    errorLower.includes('not enough funds')
  ) {
    return new InsufficientFundsError(errorMessage);
  }

  // Transaction reverted
  if (
    errorLower.includes('revert') ||
    errorLower.includes('transaction failed') ||
    errorLower.includes('execution reverted') ||
    errorLower.includes('vm exception')
  ) {
    // Try to extract revert reason
    const revertMatch = errorMessage.match(/reverted with reason string '([^']+)'/);
    const revertReason = revertMatch ? revertMatch[1] : undefined;
    return new TransactionRevertedError(errorMessage, revertReason);
  }

  // Connection/network errors
  if (
    errorLower.includes('connection refused') ||
    errorLower.includes('network error') ||
    errorLower.includes('timeout') ||
    errorLower.includes('econnrefused') ||
    errorLower.includes('etimedout') ||
    errorLower.includes('fetch failed') ||
    errorLower.includes('cannot connect')
  ) {
    return new ConnectionError(errorMessage);
  }

  // Nonce errors
  if (
    errorLower.includes('nonce') ||
    errorLower.includes('replacement transaction underpriced') ||
    errorLower.includes('transaction already exists')
  ) {
    return new NonceError(errorMessage);
  }

  // Gas price/estimation errors
  if (
    errorLower.includes('gas') ||
    errorLower.includes('fee') ||
    errorLower.includes('estimate')
  ) {
    return new GasPriceError(errorMessage);
  }

  // Contract errors (invalid ABI, wrong address, etc.)
  if (
    errorLower.includes('contract') ||
    errorLower.includes('abi') ||
    errorLower.includes('method not found')
  ) {
    return new ContractError(errorMessage);
  }

  // Default: unknown blockchain error
  return new BlockchainError(
    errorMessage,
    'BLOCKCHAIN_ERROR',
    true // Assume retryable for unknown errors
  );
}

/**
 * Format blockchain error for API response
 */
export function formatBlockchainError(error: unknown): {
  error: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
} {
  const classifiedError = classifyBlockchainError(error);

  const baseResponse = {
    error: classifiedError.code,
    message: classifiedError.message,
    retryable: classifiedError.isRetryable,
  };

  // Add specific details based on error type
  if (classifiedError instanceof TransactionRevertedError && classifiedError.revertReason) {
    return {
      ...baseResponse,
      details: { revertReason: classifiedError.revertReason },
    };
  }

  if (classifiedError instanceof ContractError && classifiedError.contractError) {
    return {
      ...baseResponse,
      details: { contractError: classifiedError.contractError },
    };
  }

  return baseResponse;
}

/**
 * Get HTTP status code for blockchain error
 */
export function getHttpStatusForError(error: BlockchainError): number {
  switch (error.code) {
    case 'INSUFFICIENT_FUNDS':
      return 503; // Service Unavailable - server can't process due to lack of funds
    case 'TRANSACTION_REVERTED':
      return 422; // Unprocessable Entity - transaction was valid but execution failed
    case 'CONNECTION_ERROR':
      return 503; // Service Unavailable - can't connect to blockchain
    case 'NONCE_ERROR':
      return 503; // Service Unavailable - temporary state issue
    case 'GAS_PRICE_ERROR':
      return 503; // Service Unavailable - temporary gas issue
    case 'CONTRACT_ERROR':
      return 500; // Internal Server Error - configuration issue
    default:
      return 500;
  }
}
