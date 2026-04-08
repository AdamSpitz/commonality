import { AlignmentAttestationsAbi, attestAlignment, createTestClients, hashCanonicalId, } from '@commonality/sdk';
import { classifyBlockchainError } from '@commonality/attester-core';
import { loadConfig } from './config.js';
let testClients = null;
let alignmentAttestationsContract = null;
export function getBlockchainClients() {
    if (testClients && alignmentAttestationsContract) {
        return { testClients, alignmentAttestationsContract };
    }
    const config = loadConfig();
    try {
        testClients = createTestClients(config.ethereumPrivateKey, config.ethereumRpcUrl);
    }
    catch (error) {
        throw classifyBlockchainError(error);
    }
    alignmentAttestationsContract = {
        address: config.alignmentAttestationsContractAddress,
        abi: AlignmentAttestationsAbi,
    };
    return { testClients, alignmentAttestationsContract };
}
export function getSubjectIdForContentCanonicalId(contentCanonicalId) {
    return hashCanonicalId(contentCanonicalId);
}
export async function publishAttestation(contentCanonicalId, statementCid, topicStatementCid) {
    const { testClients, alignmentAttestationsContract } = getBlockchainClients();
    try {
        const txHash = await attestAlignment(testClients, alignmentAttestationsContract, getSubjectIdForContentCanonicalId(contentCanonicalId), statementCid, topicStatementCid);
        return txHash;
    }
    catch (error) {
        throw classifyBlockchainError(error);
    }
}
export async function checkAttesterBalance() {
    const { testClients } = getBlockchainClients();
    try {
        const balance = await testClients.publicClient.getBalance({
            address: testClients.account,
        });
        const minimumRequired = BigInt(1e16);
        return {
            balance,
            hasSufficientFunds: balance >= minimumRequired,
            minimumRequired,
        };
    }
    catch (error) {
        throw classifyBlockchainError(error);
    }
}
//# sourceMappingURL=blockchain.js.map