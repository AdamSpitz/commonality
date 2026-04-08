import assert from 'assert';
import {
  calculatePaymentRequired,
  validatePayment,
  getPaymentFromHeader,
  formatPaymentProof,
  createPaymentRequiredResponse,
  type PaymentConfig,
  type PaymentDetails,
} from '../src/payment.js';

const testConfig: PaymentConfig = {
  openRouterModel: 'anthropic/claude-3.5-haiku',
  estimatedInputTokens: 1000,
  estimatedOutputTokens: 200,
  serviceMarginPercent: 20,
  ethUsdPrice: 3000,
  paymentAddress: '0x' + '3'.repeat(40),
};

describe('calculatePaymentRequired', () => {
  it('calculates payment with default model pricing', () => {
    const gasPrice = BigInt(20000000000);
    const payment = calculatePaymentRequired(gasPrice, testConfig);

    assert.ok(payment.amount);
    assert.ok(payment.amountUsd);
    assert.strictEqual(payment.currency, 'ETH');
    assert.ok(payment.paymentId.startsWith('pay_'));
    assert.ok(new Date(payment.expiresAt) > new Date());
  });

  it('calculates different amounts for different gas prices', () => {
    const lowGasPrice = BigInt(10000000000);
    const highGasPrice = BigInt(40000000000);

    const lowPayment = calculatePaymentRequired(lowGasPrice, testConfig);
    const highPayment = calculatePaymentRequired(highGasPrice, testConfig);

    assert.ok(parseFloat(lowPayment.amount) < parseFloat(highPayment.amount));
  });

  it('includes payment address from config', () => {
    const gasPrice = BigInt(20000000000);
    const payment = calculatePaymentRequired(gasPrice, testConfig);

    assert.strictEqual(payment.address, testConfig.paymentAddress);
  });

  it('generates unique payment IDs', () => {
    const gasPrice = BigInt(20000000000);
    const payment1 = calculatePaymentRequired(gasPrice, testConfig);
    const payment2 = calculatePaymentRequired(gasPrice, testConfig);

    assert.notStrictEqual(payment1.paymentId, payment2.paymentId);
  });
});

describe('validatePayment', () => {
  it('returns false for non-existent payment', () => {
    assert.strictEqual(validatePayment('non-existent-id'), false);
  });

  it('returns true for valid payment', () => {
    const gasPrice = BigInt(20000000000);
    const payment = calculatePaymentRequired(gasPrice, testConfig);

    assert.strictEqual(validatePayment(payment.paymentId), true);
  });

  it('removes payment after validation', () => {
    const gasPrice = BigInt(20000000000);
    const payment = calculatePaymentRequired(gasPrice, testConfig);

    assert.strictEqual(validatePayment(payment.paymentId), true);
    assert.strictEqual(validatePayment(payment.paymentId), false);
  });
});

describe('getPaymentFromHeader', () => {
  it('extracts payment ID from valid header', () => {
    const result = getPaymentFromHeader('payment:pay_123abc');
    assert.strictEqual(result, 'pay_123abc');
  });

  it('returns null for undefined header', () => {
    const result = getPaymentFromHeader(undefined);
    assert.strictEqual(result, null);
  });

  it('returns null for malformed header', () => {
    const result = getPaymentFromHeader('invalid');
    assert.strictEqual(result, null);
  });
});

describe('formatPaymentProof', () => {
  it('formats payment ID correctly', () => {
    const result = formatPaymentProof('pay_123abc');
    assert.strictEqual(result, 'payment:pay_123abc');
  });
});

describe('createPaymentRequiredResponse', () => {
  it('creates proper response structure', () => {
    const details: PaymentDetails = {
      amount: '0.001',
      amountUsd: '3.00',
      currency: 'ETH',
      address: '0x123',
      paymentId: 'pay_test',
      expiresAt: '2025-01-01T00:00:00.000Z',
    };

    const response = createPaymentRequiredResponse(details);

    assert.strictEqual(response.error, 'payment_required');
    assert.strictEqual(response.message, 'Payment required to process this request');
    assert.strictEqual(response.paymentDetails, details);
  });
});
