import { type TestClients, type ImplicationsContract } from '@commonality/sdk';
export declare function getBlockchainClients(): {
    testClients: TestClients;
    implicationsContract: ImplicationsContract;
};
export declare function publishAttestation(fromStatementCid: string, toStatementCid: string, explanationCid: string): Promise<string>;
export declare function checkExistingAttestation(fromStatementCid: string, toStatementCid: string): Promise<boolean>;
//# sourceMappingURL=blockchain.d.ts.map