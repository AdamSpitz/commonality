export declare class BlockchainError extends Error {
    readonly code: string;
    readonly isRetryable: boolean;
    constructor(message: string, code: string, isRetryable?: boolean);
}
export declare class InsufficientFundsError extends BlockchainError {
    constructor(message?: string);
}
export declare class TransactionRevertedError extends BlockchainError {
    readonly revertReason?: string | undefined;
    constructor(message?: string, revertReason?: string | undefined);
}
export declare class ConnectionError extends BlockchainError {
    constructor(message?: string);
}
export declare class NonceError extends BlockchainError {
    constructor(message?: string);
}
export declare class GasPriceError extends BlockchainError {
    constructor(message?: string);
}
export declare class ContractError extends BlockchainError {
    readonly contractError?: string | undefined;
    constructor(message?: string, contractError?: string | undefined);
}
export declare function classifyBlockchainError(error: unknown): BlockchainError;
export declare function formatBlockchainError(error: unknown): {
    error: string;
    message: string;
    details?: Record<string, unknown>;
    retryable: boolean;
};
export declare function getHttpStatusForError(error: BlockchainError): number;
//# sourceMappingURL=errors.d.ts.map