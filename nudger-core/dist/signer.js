import { privateKeyToAccount } from 'viem/accounts';
let account = null;
export function initializeSigner(config) {
    account = privateKeyToAccount(config.nudgerPrivateKey);
    return account;
}
export function getSignerAddress() {
    if (!account) {
        throw new Error('Signer not initialized. Call initializeSigner first.');
    }
    return account.address;
}
export async function signNudgeMessage(message) {
    if (!account) {
        throw new Error('Signer not initialized. Call initializeSigner first.');
    }
    const messageString = JSON.stringify({
        targetStatementCid: message.targetStatementCid,
        suggestedStatementCid: message.suggestedStatementCid,
        reason: message.reason,
        confidence: message.confidence,
        timestamp: message.timestamp,
    });
    const signature = await account.signMessage({
        message: messageString,
    });
    return {
        nudger: account.address,
        targetStatementCid: message.targetStatementCid,
        suggestedStatementCid: message.suggestedStatementCid,
        reason: message.reason,
        confidence: message.confidence,
        timestamp: message.timestamp,
        signature,
    };
}
export function recoverSignerAddress(message) {
    return message.nudger;
}
//# sourceMappingURL=signer.js.map