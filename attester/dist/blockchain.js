import { createTestClients, attestImplication, ImplicationsAbi, } from '@commonality/sdk';
import { loadConfig } from './config.js';
import { classifyBlockchainError } from './errors.js';
let testClients = null;
let implicationsContract = null;
export function getBlockchainClients() {
    if (testClients && implicationsContract) {
        return { testClients, implicationsContract };
    }
    const config = loadConfig();
    try {
        testClients = createTestClients(config.ethereumPrivateKey, config.ethereumRpcUrl);
    }
    catch (error) {
        throw classifyBlockchainError(error);
    }
    implicationsContract = {
        address: config.implicationsContractAddress,
        abi: ImplicationsAbi,
    };
    return { testClients, implicationsContract };
}
export async function publishAttestation(fromStatementCid, toStatementCid, explanationCid) {
    const { testClients, implicationsContract } = getBlockchainClients();
    try {
        const txHash = await attestImplication(testClients, implicationsContract, fromStatementCid, toStatementCid, explanationCid);
        return txHash;
    }
    catch (error) {
        // Re-classify and re-throw for proper error handling upstream
        throw classifyBlockchainError(error);
    }
}
export async function checkExistingAttestation(fromStatementCid, toStatementCid) {
    return false;
}
/**
 * Check if the attester has sufficient funds
 */
export async function checkAttesterBalance() {
    const { testClients } = getBlockchainClients();
    try {
        const balance = await testClients.publicClient.getBalance({
            address: testClients.account,
        });
        // Minimum required: 0.01 ETH for gas + buffer
        const minimumRequired = BigInt(1e16); // 0.01 ETH
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
/**
 * Get attester account address
 */
export async function getAttesterAddress() {
    const { testClients } = getBlockchainClients();
    return testClients.account;
}
//# sourceMappingURL=blockchain.js.map