import express from 'express';
import { calculatePaymentRequired } from './payment.js';
import { classifyBlockchainError } from './errors.js';
function formatEthValue(balanceWei, decimals) {
    return (Number(balanceWei) / 1e18).toFixed(decimals);
}
export function createAttesterApp() {
    const app = express();
    app.use(express.json());
    return app;
}
export function registerCommonAttesterRoutes(app, options) {
    app.get('/health', async (_req, res) => {
        try {
            const config = options.getConfig();
            let balanceInfo = null;
            let blockchainConnected = false;
            let blockchainError = null;
            try {
                balanceInfo = await options.checkAttesterBalance();
                blockchainConnected = true;
            }
            catch (error) {
                blockchainConnected = false;
                blockchainError = classifyBlockchainError(error).message;
            }
            const ethBalance = balanceInfo ? formatEthValue(balanceInfo.balance, 4) : '0.0000';
            const lowBalanceWarning = balanceInfo ? !balanceInfo.hasSufficientFunds : true;
            const status = !blockchainConnected || lowBalanceWarning ? 'degraded' : 'healthy';
            const details = {
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
        }
        catch (error) {
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
        }
        catch (error) {
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
            res.json({
                exists: false,
                attestation: null,
                paymentDetails: {
                    ...paymentDetails,
                    description: options.statusRoute.paymentDescription ?? 'Payment required to check attestation status',
                },
            });
        }
        catch (error) {
            console.error(`Error in ${options.statusRoute.path}:`, error);
            res.status(500).json({
                error: 'internal_error',
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
            });
        }
    });
}
//# sourceMappingURL=http.js.map