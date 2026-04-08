export interface PaymentDetails {
  amount: string;
  amountUsd: string;
  currency: string;
  address: string;
  paymentId: string;
  expiresAt: string;
}

export interface PaymentConfig {
  openRouterModel: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  serviceMarginPercent: number;
  ethUsdPrice: number;
  paymentAddress: string;
  estimatedGas?: number;
}

const pendingPayments = new Map<string, { details: PaymentDetails; expires: number }>();
const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

const LLM_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  'anthropic/claude-3.5-haiku': { inputPer1M: 0.80, outputPer1M: 4.00 },
  'anthropic/claude-3-haiku': { inputPer1M: 0.25, outputPer1M: 1.25 },
  'anthropic/claude-3-sonnet': { inputPer1M: 3.00, outputPer1M: 15.00 },
  'openai/gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.60 },
  'openai/gpt-4o': { inputPer1M: 2.50, outputPer1M: 10.00 },
};

function generatePaymentId(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function calculatePaymentRequired(
  currentGasPriceWei: bigint,
  config: PaymentConfig
): PaymentDetails {
  const modelPricing = LLM_PRICING[config.openRouterModel] || LLM_PRICING['anthropic/claude-3.5-haiku'];
  const llmCostUsd =
    (config.estimatedInputTokens / 1_000_000) * modelPricing.inputPer1M +
    (config.estimatedOutputTokens / 1_000_000) * modelPricing.outputPer1M;

  const gasCostWei = currentGasPriceWei * BigInt(config.estimatedGas || 50000);
  const gasCostEth = Number(gasCostWei) / 1e18;
  const gasCostUsd = gasCostEth * config.ethUsdPrice;

  const totalUsd = (gasCostUsd + llmCostUsd) * (1 + config.serviceMarginPercent / 100);
  const totalEth = totalUsd / config.ethUsdPrice;

  const paymentId = generatePaymentId();
  const expiresAt = new Date(Date.now() + PAYMENT_WINDOW_MS).toISOString();

  const details: PaymentDetails = {
    amount: totalEth.toFixed(6),
    amountUsd: totalUsd.toFixed(2),
    currency: 'ETH',
    address: config.paymentAddress,
    paymentId,
    expiresAt,
  };

  pendingPayments.set(paymentId, { details, expires: Date.now() + PAYMENT_WINDOW_MS });

  return details;
}

export function validatePayment(paymentId: string): boolean {
  const payment = pendingPayments.get(paymentId);
  if (!payment) {
    return false;
  }

  if (Date.now() > payment.expires) {
    pendingPayments.delete(paymentId);
    return false;
  }

  pendingPayments.delete(paymentId);
  return true;
}

export function getPaymentFromHeader(xPaymentProof: string | undefined): string | null {
  if (!xPaymentProof || typeof xPaymentProof !== 'string') {
    return null;
  }

  const parts = xPaymentProof.split(':');
  if (parts.length !== 2) {
    return null;
  }

  const [, paymentId] = parts;
  return paymentId || null;
}

export function formatPaymentProof(paymentId: string): string {
  return `payment:${paymentId}`;
}

export function createPaymentRequiredResponse(details: PaymentDetails) {
  return {
    error: 'payment_required',
    message: 'Payment required to process this request',
    paymentDetails: details,
  };
}

cleanupExpiredPayments();
setInterval(cleanupExpiredPayments, 60 * 1000);

function cleanupExpiredPayments() {
  const now = Date.now();
  for (const [id, payment] of pendingPayments.entries()) {
    if (now > payment.expires) {
      pendingPayments.delete(id);
    }
  }
}
