import { type Express } from 'express';
import { type PaymentConfig } from './payment.js';
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
export interface RegisterCommonAttesterRoutesOptions<TConfig extends CommonAttesterConfigSnapshot> {
    getConfig: () => TConfig;
    getCurrentGasPrice: () => Promise<bigint>;
    getPaymentConfig: (config: TConfig) => PaymentConfig;
    checkAttesterBalance: () => Promise<AttesterBalanceInfo>;
    version: string;
    statusRoute: StatusRouteConfig;
}
export declare function createAttesterApp(): Express;
export declare function registerCommonAttesterRoutes<TConfig extends CommonAttesterConfigSnapshot>(app: Express, options: RegisterCommonAttesterRoutesOptions<TConfig>): void;
//# sourceMappingURL=http.d.ts.map