import assert from 'assert';
import {
  BlockchainError,
  InsufficientFundsError,
  TransactionRevertedError,
  ConnectionError,
  NonceError,
  GasPriceError,
  ContractError,
  classifyBlockchainError,
  formatBlockchainError,
  getHttpStatusForError,
} from '../src/errors.js';

describe('BlockchainError', () => {
  it('creates base error with code and retryable flag', () => {
    const error = new BlockchainError('Test error', 'TEST_CODE', true);
    assert.strictEqual(error.message, 'Test error');
    assert.strictEqual(error.code, 'TEST_CODE');
    assert.strictEqual(error.isRetryable, true);
    assert.strictEqual(error.name, 'BlockchainError');
  });

  it('defaults to non-retryable', () => {
    const error = new BlockchainError('Test error', 'TEST_CODE');
    assert.strictEqual(error.isRetryable, false);
  });
});

describe('InsufficientFundsError', () => {
  it('creates error with default message', () => {
    const error = new InsufficientFundsError();
    assert.strictEqual(error.message, 'Insufficient funds for transaction');
    assert.strictEqual(error.code, 'INSUFFICIENT_FUNDS');
    assert.strictEqual(error.isRetryable, false);
    assert.strictEqual(error.name, 'InsufficientFundsError');
  });

  it('creates error with custom message', () => {
    const error = new InsufficientFundsError('Custom message');
    assert.strictEqual(error.message, 'Custom message');
  });
});

describe('TransactionRevertedError', () => {
  it('creates error with default message', () => {
    const error = new TransactionRevertedError();
    assert.strictEqual(error.message, 'Transaction was reverted by the EVM');
    assert.strictEqual(error.code, 'TRANSACTION_REVERTED');
    assert.strictEqual(error.isRetryable, false);
    assert.strictEqual(error.name, 'TransactionRevertedError');
  });

  it('creates error with revert reason', () => {
    const error = new TransactionRevertedError('Custom message', 'Insufficient balance');
    assert.strictEqual(error.revertReason, 'Insufficient balance');
  });
});

describe('ConnectionError', () => {
  it('creates retryable error', () => {
    const error = new ConnectionError();
    assert.strictEqual(error.code, 'CONNECTION_ERROR');
    assert.strictEqual(error.isRetryable, true);
    assert.strictEqual(error.name, 'ConnectionError');
  });
});

describe('NonceError', () => {
  it('creates retryable error', () => {
    const error = new NonceError();
    assert.strictEqual(error.code, 'NONCE_ERROR');
    assert.strictEqual(error.isRetryable, true);
    assert.strictEqual(error.name, 'NonceError');
  });
});

describe('GasPriceError', () => {
  it('creates retryable error', () => {
    const error = new GasPriceError();
    assert.strictEqual(error.code, 'GAS_PRICE_ERROR');
    assert.strictEqual(error.isRetryable, true);
    assert.strictEqual(error.name, 'GasPriceError');
  });
});

describe('ContractError', () => {
  it('creates error with contract details', () => {
    const error = new ContractError('Custom message', 'Invalid ABI');
    assert.strictEqual(error.code, 'CONTRACT_ERROR');
    assert.strictEqual(error.contractError, 'Invalid ABI');
    assert.strictEqual(error.isRetryable, false);
    assert.strictEqual(error.name, 'ContractError');
  });
});

describe('classifyBlockchainError', () => {
  it('returns same error if already BlockchainError', () => {
    const original = new InsufficientFundsError();
    const result = classifyBlockchainError(original);
    assert.strictEqual(result, original);
  });

  describe('insufficient funds detection', () => {
    it('classifies "insufficient funds" error', () => {
      const error = new Error('insufficient funds for gas * price + value');
      const result = classifyBlockchainError(error);
      assert.ok(result instanceof InsufficientFundsError);
      assert.strictEqual(result.code, 'INSUFFICIENT_FUNDS');
    });

    it('classifies "insufficient balance" error', () => {
      const error = new Error('insufficient balance');
      const result = classifyBlockchainError(error);
      assert.ok(result instanceof InsufficientFundsError);
    });

    it('classifies "not enough funds" error', () => {
      const error = new Error('not enough funds');
      const result = classifyBlockchainError(error);
      assert.ok(result instanceof InsufficientFundsError);
    });
  });

  describe('transaction reverted detection', () => {
    it('classifies "revert" error', () => {
      const error = new Error('Transaction reverted');
      const result = classifyBlockchainError(error);
      assert.ok(result instanceof TransactionRevertedError);
      assert.strictEqual(result.code, 'TRANSACTION_REVERTED');
    });

    it('extracts revert reason from error message', () => {
      const error = new Error('VM Exception while processing transaction: reverted with reason string \'Invalid input\'');
      const result = classifyBlockchainError(error);
      assert.ok(result instanceof TransactionRevertedError);
      assert.strictEqual((result as TransactionRevertedError).revertReason, 'Invalid input');
    });

    it('handles execution reverted error', () => {
      const error = new Error('execution reverted');
      const result = classifyBlockchainError(error);
      assert.ok(result instanceof TransactionRevertedError);
    });
  });

  describe('connection error detection', () => {
    it('classifies "connection refused" error', () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:8545');
      const result = classifyBlockchainError(error);
      assert.ok(result instanceof ConnectionError);
      assert.strictEqual(result.code, 'CONNECTION_ERROR');
      assert.strictEqual(result.isRetryable, true);
    });

    it('classifies timeout error', () => {
      const error = new Error('network timeout');
      const result = classifyBlockchainError(error);
      assert.ok(result instanceof ConnectionError);
    });

    it('classifies fetch failed error', () => {
      const error = new Error('fetch failed');
      const result = classifyBlockchainError(error);
      assert.ok(result instanceof ConnectionError);
    });
  });

  describe('nonce error detection', () => {
    it('classifies nonce error', () => {
      const error = new Error('invalid nonce');
      const result = classifyBlockchainError(error);
      assert.ok(result instanceof NonceError);
      assert.strictEqual(result.code, 'NONCE_ERROR');
    });

    it('classifies replacement transaction underpriced', () => {
      const error = new Error('replacement transaction underpriced');
      const result = classifyBlockchainError(error);
      assert.ok(result instanceof NonceError);
    });
  });

  describe('gas price error detection', () => {
    it('classifies gas estimation error', () => {
      const error = new Error('gas estimation failed');
      const result = classifyBlockchainError(error);
      assert.ok(result instanceof GasPriceError);
      assert.strictEqual(result.code, 'GAS_PRICE_ERROR');
    });

    it('classifies fee-related error', () => {
      const error = new Error('fee too low');
      const result = classifyBlockchainError(error);
      assert.ok(result instanceof GasPriceError);
    });
  });

  describe('contract error detection', () => {
    it('classifies contract error', () => {
      const error = new Error('contract call failed');
      const result = classifyBlockchainError(error);
      assert.ok(result instanceof ContractError);
      assert.strictEqual(result.code, 'CONTRACT_ERROR');
    });

    it('classifies ABI error', () => {
      const error = new Error('invalid ABI');
      const result = classifyBlockchainError(error);
      assert.ok(result instanceof ContractError);
    });
  });

  describe('unknown errors', () => {
    it('returns generic BlockchainError for unknown errors', () => {
      const error = new Error('some random error');
      const result = classifyBlockchainError(error);
      assert.ok(result instanceof BlockchainError);
      assert.strictEqual(result.code, 'BLOCKCHAIN_ERROR');
      assert.strictEqual(result.isRetryable, true);
    });

    it('handles non-Error objects', () => {
      const result = classifyBlockchainError('string error');
      assert.ok(result instanceof BlockchainError);
      assert.strictEqual(result.message, 'string error');
    });

    it('handles null/undefined', () => {
      const result = classifyBlockchainError(null);
      assert.ok(result instanceof BlockchainError);
      assert.strictEqual(result.message, 'null');
    });
  });
});

describe('formatBlockchainError', () => {
  it('formats base error correctly', () => {
    const error = new BlockchainError('Test message', 'TEST_CODE', false);
    const formatted = formatBlockchainError(error);
    assert.strictEqual(formatted.error, 'TEST_CODE');
    assert.strictEqual(formatted.message, 'Test message');
    assert.strictEqual(formatted.retryable, false);
  });

  it('includes revert reason for TransactionRevertedError', () => {
    const error = new TransactionRevertedError('Reverted', 'Out of gas');
    const formatted = formatBlockchainError(error);
    assert.strictEqual(formatted.error, 'TRANSACTION_REVERTED');
    assert.deepStrictEqual(formatted.details, { revertReason: 'Out of gas' });
  });

  it('includes contract error details', () => {
    const error = new ContractError('Failed', 'Method not found');
    const formatted = formatBlockchainError(error);
    assert.deepStrictEqual(formatted.details, { contractError: 'Method not found' });
  });

  it('handles raw errors by classifying them', () => {
    const error = new Error('insufficient funds');
    const formatted = formatBlockchainError(error);
    assert.strictEqual(formatted.error, 'INSUFFICIENT_FUNDS');
  });
});

describe('getHttpStatusForError', () => {
  it('returns 503 for insufficient funds', () => {
    const error = new InsufficientFundsError();
    assert.strictEqual(getHttpStatusForError(error), 503);
  });

  it('returns 422 for transaction reverted', () => {
    const error = new TransactionRevertedError();
    assert.strictEqual(getHttpStatusForError(error), 422);
  });

  it('returns 503 for connection errors', () => {
    const error = new ConnectionError();
    assert.strictEqual(getHttpStatusForError(error), 503);
  });

  it('returns 503 for nonce errors', () => {
    const error = new NonceError();
    assert.strictEqual(getHttpStatusForError(error), 503);
  });

  it('returns 503 for gas price errors', () => {
    const error = new GasPriceError();
    assert.strictEqual(getHttpStatusForError(error), 503);
  });

  it('returns 500 for contract errors', () => {
    const error = new ContractError();
    assert.strictEqual(getHttpStatusForError(error), 500);
  });

  it('returns 500 for unknown errors', () => {
    const error = new BlockchainError('Unknown', 'UNKNOWN');
    assert.strictEqual(getHttpStatusForError(error), 500);
  });
});
