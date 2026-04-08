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
export declare function calculatePaymentRequired(currentGasPriceWei: bigint, config: PaymentConfig): PaymentDetails;
export declare function validatePayment(paymentId: string): boolean;
export declare function getPaymentFromHeader(xPaymentProof: string | undefined): string | null;
export declare function formatPaymentProof(paymentId: string): string;
export declare function createPaymentRequiredResponse(details: PaymentDetails): {
    error: string;
    message: string;
    paymentDetails: PaymentDetails;
};
//# sourceMappingURL=payment.d.ts.map