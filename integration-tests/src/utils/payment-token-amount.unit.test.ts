import assert from 'assert';
import { amountInPaymentToken } from './payment-token-amount.js';

const usdzzz = { symbol: 'USDZZZ' };
const eth = { symbol: 'ETH' };

describe('amountInPaymentToken', () => {
  const previous = process.env.PAYMENT_TOKEN_SYMBOL;

  afterEach(() => {
    if (previous === undefined) delete process.env.PAYMENT_TOKEN_SYMBOL;
    else process.env.PAYMENT_TOKEN_SYMBOL = previous;
  });

  it('reads the settlement-token amount instead of ETH', () => {
    delete process.env.PAYMENT_TOKEN_SYMBOL;
    const amount = amountInPaymentToken([
      { amount: 1n, currency: eth },
      { amount: 800000n, currency: usdzzz },
    ]);
    assert.strictEqual(amount, 800000n);
  });

  it('falls back to the sole currency when the symbol is absent', () => {
    process.env.PAYMENT_TOKEN_SYMBOL = 'USDZZZ';
    const amount = amountInPaymentToken([{ amount: 42n, currency: eth }]);
    assert.strictEqual(amount, 42n);
  });
});
