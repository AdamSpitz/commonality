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
  });
});

describe('formatBlockchainError', () => {
  it('formats basic error response', () => {
    const error = new InsufficientFundsError('Not enough ETH');
    const result = formatBlockchainError(error);
    assert.deepStrictEqual(result, {
      error: 'INSUFFICIENT_FUNDS',
      message: 'Not enough ETH',
      retryable: false,
    });
  });

  it('includes revert reason for reverted transactions', () => {
    const error = new TransactionRevertedError('Reverted', 'Invalid input');
    const result = formatBlockchainError(error);
    assert.deepStrictEqual(result, {
      error: 'TRANSACTION_REVERTED',
      message: 'Reverted',
      retryable: false,
      details: { revertReason: 'Invalid input' },
    });
  });
});

describe('getHttpStatusForError', () => {
  it('maps insufficient funds to 503', () => {
    assert.strictEqual(getHttpStatusForError(new InsufficientFundsError()), 503);
  });

  it('maps reverted transactions to 422', () => {
    assert.strictEqual(getHttpStatusForError(new TransactionRevertedError()), 422);
  });
});
