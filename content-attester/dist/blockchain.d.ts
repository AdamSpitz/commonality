import { AlignmentAttestationsAbi, type IpfsCidV1, type TestClients } from '@commonality/sdk';
interface AlignmentAttestationsContract {
    address: `0x${string}`;
    abi: typeof AlignmentAttestationsAbi;
}
export declare function getBlockchainClients(): {
    testClients: TestClients;
    alignmentAttestationsContract: AlignmentAttestationsContract;
};
export declare function getSubjectIdForContentCanonicalId(contentCanonicalId: string): `0x${string}`;
export declare function publishAttestation(contentCanonicalId: string, statementCid: IpfsCidV1, topicStatementCid: IpfsCidV1): Promise<string>;
export declare function checkAttesterBalance(): Promise<{
    balance: bigint;
    hasSufficientFunds: boolean;
    minimumRequired: bigint;
}>;
export {};
//# sourceMappingURL=blockchain.d.ts.map