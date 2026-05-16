import express, { type Express } from 'express';
import { calculatePaymentRequired, type PaymentConfig } from './payment.js';
import { classifyBlockchainError } from './errors.js';

export interface CommonAttesterConfigSnapshot {
  ethUsdPrice: number;
  openRouterApiKey: string;
  ethereumPrivateKey: string;
  ipfsApiUrl: string;
  paymentAddress: string;
}

export interface AttesterBalanceInfo {
  balance: bigint;
  hasSufficientFunds: boolean;
  minimumRequired: bigint;
}

export interface StatusRouteConfig {
  path: string;
  requiredParams: string[];
  missingParamsMessage: string;
  paymentDescription?: string;
}

export interface AttesterStatusResult {
  exists: boolean;
  attestation: unknown;
}

export interface RegisterCommonAttesterRoutesOptions<TConfig extends CommonAttesterConfigSnapshot> {
  getConfig: () => TConfig;
  getCurrentGasPrice: () => Promise<bigint>;
  getPaymentConfig: (config: TConfig) => PaymentConfig;
  checkAttesterBalance: () => Promise<AttesterBalanceInfo>;
  getStatus?: (params: Record<string, string>, config: TConfig) => Promise<AttesterStatusResult>;
  version: string;
  statusRoute: StatusRouteConfig;
}

function formatEthValue(balanceWei: bigint, decimals: number): string {
  return (Number(balanceWei) / 1e18).toFixed(decimals);
}

export function createAttesterApp(): Express {
  const app = express();
  app.use(express.json());
  return app;
}

export function registerCommonAttesterRoutes<TConfig extends CommonAttesterConfigSnapshot>(
  app: Express,
  options: RegisterCommonAttesterRoutesOptions<TConfig>
): void {
  app.get('/health', async (_req, res) => {
    try {
      const config = options.getConfig();
      let balanceInfo: AttesterBalanceInfo | null = null;
      let blockchainConnected = false;
      let blockchainError: string | null = null;

      try {
        balanceInfo = await options.checkAttesterBalance();
        blockchainConnected = true;
      } catch (error) {
        blockchainConnected = false;
        blockchainError = classifyBlockchainError(error).message;
      }

      const ethBalance = balanceInfo ? formatEthValue(balanceInfo.balance, 4) : '0.0000';
      const lowBalanceWarning = balanceInfo ? !balanceInfo.hasSufficientFunds : true;
      const status = !blockchainConnected || lowBalanceWarning ? 'degraded' : 'healthy';

      const details: Record<string, unknown> = {
        ethBalance,
        ethBalanceUsd: (parseFloat(ethBalance) * config.ethUsdPrice).toFixed(2),
        lowBalanceWarning,
        blockchainConnected,
        openRouterConfigured: !!config.openRouterApiKey,
        ethereumConfigured: !!config.ethereumPrivateKey,
        ipfsConfigured: !!config.ipfsApiUrl,
        paymentAddress: config.paymentAddress,
      };

      if (blockchainError) {
        details.blockchainError = blockchainError;
      }

      res.status(status === 'healthy' ? 200 : 503).json({
        status,
        details,
        uptime: process.uptime(),
        version: options.version,
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Configuration error',
      });
    }
  });

  app.get('/quote', async (_req, res) => {
    try {
      const config = options.getConfig();
      const gasPrice = await options.getCurrentGasPrice();
      const paymentDetails = calculatePaymentRequired(gasPrice, options.getPaymentConfig(config));
      res.json({
        price: paymentDetails.amount,
        priceUsd: paymentDetails.amountUsd,
        currency: paymentDetails.currency,
        expiresAt: paymentDetails.expiresAt,
      });
    } catch (error) {
      console.error('Error in /quote:', error);
      res.status(500).json({
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  });

  app.get(options.statusRoute.path, async (req, res) => {
    const hasMissingParam = options.statusRoute.requiredParams.some((param) => !req.params[param]);

    if (hasMissingParam) {
      res.status(400).json({
        error: 'invalid_request',
        message: options.statusRoute.missingParamsMessage,
      });
      return;
    }

    try {
      const config = options.getConfig();
      const gasPrice = await options.getCurrentGasPrice();
      const paymentDetails = calculatePaymentRequired(gasPrice, options.getPaymentConfig(config));

      const status = await options.getStatus?.(req.params, config) ?? {
        exists: false,
        attestation: null,
      };

      res.json({
        ...status,
        paymentDetails: {
          ...paymentDetails,
          description: options.statusRoute.paymentDescription ?? 'Payment required to check attestation status',
        },
      });
    } catch (error) {
      console.error(`Error in ${options.statusRoute.path}:`, error);
      res.status(500).json({
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  });
}
