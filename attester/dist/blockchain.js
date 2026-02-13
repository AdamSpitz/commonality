import { createTestClients, attestImplication, ImplicationsAbi, } from '@commonality/sdk';
import { loadConfig } from './config.js';
let testClients = null;
let implicationsContract = null;
export function getBlockchainClients() {
    if (testClients && implicationsContract) {
        return { testClients, implicationsContract };
    }
    const config = loadConfig();
    testClients = createTestClients(config.ethereumPrivateKey, config.ethereumRpcUrl);
    implicationsContract = {
        address: config.implicationsContractAddress,
        abi: ImplicationsAbi,
    };
    return { testClients, implicationsContract };
}
export async function publishAttestation(fromStatementCid, toStatementCid, explanationCid) {
    const { testClients, implicationsContract } = getBlockchainClients();
    const txHash = await attestImplication(testClients, implicationsContract, fromStatementCid, toStatementCid, explanationCid);
    return txHash;
}
export async function checkExistingAttestation(fromStatementCid, toStatementCid) {
    return false;
}
//# sourceMappingURL=blockchain.js.map