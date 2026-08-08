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

export function classifyBlockchainError(error: unknown): BlockchainError {
  if (error instanceof BlockchainError) {
    return error;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorLower = errorMessage.toLowerCase();

  if (
    errorLower.includes('insufficient funds') ||
    errorLower.includes('insufficient balance') ||
    errorLower.includes('not enough funds')
  ) {
    return new InsufficientFundsError(errorMessage);
  }

  if (
    errorLower.includes('revert') ||
    errorLower.includes('transaction failed') ||
    errorLower.includes('execution reverted') ||
    errorLower.includes('vm exception')
  ) {
    const revertMatch = errorMessage.match(/reverted with reason string '([^']+)'/);
    const revertReason = revertMatch ? revertMatch[1] : undefined;
    return new TransactionRevertedError(errorMessage, revertReason);
  }

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

  if (
    errorLower.includes('nonce') ||
    errorLower.includes('replacement transaction underpriced') ||
    errorLower.includes('transaction already exists')
  ) {
    return new NonceError(errorMessage);
  }

  if (
    errorLower.includes('gas') ||
    errorLower.includes('fee') ||
    errorLower.includes('estimate')
  ) {
    return new GasPriceError(errorMessage);
  }

  if (
    errorLower.includes('contract') ||
    errorLower.includes('abi') ||
    errorLower.includes('method not found')
  ) {
    return new ContractError(errorMessage);
  }

  return new BlockchainError(errorMessage, 'BLOCKCHAIN_ERROR', true);
}

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

export function getHttpStatusForError(error: BlockchainError): number {
  switch (error.code) {
    case 'INSUFFICIENT_FUNDS':
      return 503;
    case 'TRANSACTION_REVERTED':
      return 422;
    case 'CONNECTION_ERROR':
      return 503;
    case 'NONCE_ERROR':
      return 503;
    case 'GAS_PRICE_ERROR':
      return 503;
    case 'CONTRACT_ERROR':
      return 500;
    default:
      return 500;
  }
}
