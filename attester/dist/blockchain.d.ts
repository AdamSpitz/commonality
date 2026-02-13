import { type TestClients, type ImplicationsContract } from '@commonality/sdk';
export declare function getBlockchainClients(): {
    testClients: TestClients;
    implicationsContract: ImplicationsContract;
};
export declare function publishAttestation(fromStatementCid: string, toStatementCid: string, explanationCid: string): Promise<string>;
export declare function checkExistingAttestation(fromStatementCid: string, toStatementCid: string): Promise<boolean>;
/**
 * Check if the attester has sufficient funds
 */
export declare function checkAttesterBalance(): Promise<{
    balance: bigint;
    hasSufficientFunds: boolean;
    minimumRequired: bigint;
}>;
/**
 * Get attester account address
 */
export declare function getAttesterAddress(): Promise<string>;
//# sourceMappingURL=blockchain.d.ts.map