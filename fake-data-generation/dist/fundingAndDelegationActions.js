import { createPublicClient, createWalletClient, http, parseEther, zeroAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { generateStatements } from './generateStatements.js';
import { loadEnv, RPC_URL } from './loadEnv.js';
import { BeliefsAbi, ImplicationsAbi, AlignmentAttestationsAbi, PubstarterAbi, AssuranceContractAbi, ERC1155SecondaryMarketAbi, DelegatableNotesAbi, } from '@commonality/sdk';
import { createProject as sdkCreateProject, buyProjectTokens, withdrawProjectFunds as sdkWithdrawProjectFunds, createSaleListing, fulfillSaleListing, approveERC1155ForMarketplace, depositETH as sdkDepositETH, delegateNote as sdkDelegateNote, revokeNote as sdkRevokeNote, reclaimFunds as sdkReclaimFunds, purchaseFromPrimaryMarketWithNotes, } from '@commonality/sdk';
loadEnv();
// suppress unused import warnings
void BeliefsAbi;
void ImplicationsAbi;
void AlignmentAttestationsAbi;
const hardhat = {
    id: 31337,
    name: 'Hardhat',
    network: 'hardhat',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    rpcUrls: {
        default: { http: ['http://localhost:8545'] },
        public: { http: ['http://localhost:8545'] },
    },
};
class FundingAndDelegationActions {
    contracts;
    users;
    statements;
    createdProjects;
    createdNotes;
    userTokens;
    rpcUrl;
    constructor(contracts, users, statements) {
        this.contracts = contracts;
        this.users = users;
        this.statements = statements;
        this.createdProjects = [];
        this.createdNotes = [];
        this.userTokens = new Map();
        this.rpcUrl = RPC_URL || 'http://localhost:8545';
    }
    createClientsForUser(user) {
        const account = privateKeyToAccount(user.privateKey);
        const walletClient = createWalletClient({
            account,
            chain: hardhat,
            transport: http(this.rpcUrl),
        });
        const publicClient = createPublicClient({
            chain: hardhat,
            transport: http(this.rpcUrl),
        });
        return {
            walletClient,
            publicClient,
            account: account.address,
        };
    }
    getWalletForUser(user) {
        return this.createClientsForUser(user);
    }
    getRandomUser() {
        return this.users[Math.floor(Math.random() * this.users.length)];
    }
    getRandomStatement() {
        return this.statements[Math.floor(Math.random() * this.statements.length)];
    }
    getUserNotes(user) {
        return this.createdNotes.filter(note => note.owner === user.address && !note.delegated && !note.revoked);
    }
    getDelegatableNotes(user) {
        return this.createdNotes.filter(note => note.owner === user.address &&
            note.token === zeroAddress &&
            note.tokenType === 0 &&
            !note.delegated &&
            !note.revoked);
    }
    getDelegatableNotesExcluding(user, excludeAddresses) {
        return this.createdNotes.filter(note => note.owner === user.address &&
            note.token === zeroAddress &&
            note.tokenType === 0 &&
            !note.delegated &&
            !note.revoked &&
            !excludeAddresses.includes(note.originalOwner) &&
            !excludeAddresses.includes(note.owner));
    }
    getRevocableNotes(user) {
        return this.createdNotes.filter(note => note.owner === user.address &&
            note.delegated === true &&
            !note.revoked);
    }
    getUserTokens(user) {
        return this.userTokens.get(user.address) || [];
    }
    getAvailableTokens(user) {
        const tokens = this.userTokens.get(user.address) || [];
        return tokens.filter(t => (t.listedCount || 0) < t.count);
    }
    /**
     * Funding Action: Create a new project using Pubstarter
     */
    async createProject(user) {
        if (!this.contracts.pubstarter) {
            throw new Error('Pubstarter contract not deployed');
        }
        const clients = this.getWalletForUser(user);
        const threshold = parseEther((Math.random() * 5 + 1).toFixed(2));
        const deadline = BigInt(Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60));
        const projectMetadataCid = `ipfs://QmProject${Math.floor(Math.random() * 10000)}`;
        const tokenIds = [1n, 2n, 3n];
        const maxSupplies = [100n, 500n, 1000n];
        const prices = [
            parseEther('0.1'),
            parseEther('0.05'),
            parseEther('0.01')
        ];
        try {
            const { hash, projectDetails } = await sdkCreateProject(clients, { address: this.contracts.pubstarter.address, abi: this.contracts.pubstarter.abi }, {
                metadataURI: 'https://example.com/metadata/',
                contractURI: 'https://example.com/contract.json',
                owner: user.address,
                recipient: user.address,
                threshold,
                deadline,
                projectMetadataCid,
                tokenIds,
                tokenCounts: maxSupplies,
                tokenPrices: prices
            });
            const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
            const project = {
                owner: user.address,
                erc1155: projectDetails.tokenAddress,
                marketplace: projectDetails.marketplaceAddress,
                assuranceContract: projectDetails.assuranceContractAddress,
                threshold: threshold.toString(),
                deadline: Number(deadline),
                tokenIds: tokenIds.map(n => Number(n)),
                prices: prices.map(p => p.toString())
            };
            this.createdProjects.push(project);
            return { success: true, project, receipt };
        }
        catch (error) {
            const err = error;
            return { success: false, error: err.message };
        }
    }
    /**
     * Funding Action: Purchase tokens from primary market
     */
    async purchaseFromPrimaryMarket(user, project, tokenId, count) {
        const clients = this.getWalletForUser(user);
        try {
            const tokenIndex = project.tokenIds.indexOf(tokenId);
            if (tokenIndex === -1) {
                throw new Error('Invalid token ID');
            }
            const price = BigInt(project.prices[tokenIndex]);
            const totalCost = price * BigInt(count);
            const hash = await buyProjectTokens(clients, { address: project.assuranceContract, abi: AssuranceContractAbi }, {
                buyer: user.address,
                tokenAddress: project.erc1155,
                tokenIds: [BigInt(tokenId)],
                tokenCounts: [BigInt(count)],
                totalCost
            });
            const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
            if (!this.userTokens.has(user.address)) {
                this.userTokens.set(user.address, []);
            }
            const userTokenList = this.userTokens.get(user.address);
            const existingToken = userTokenList.find(t => t.erc1155 === project.erc1155 && t.tokenId === tokenId);
            if (existingToken) {
                existingToken.count += count;
            }
            else {
                userTokenList.push({ erc1155: project.erc1155, tokenId, count, listedCount: 0 });
            }
            return { success: true, receipt, totalCost: totalCost.toString() };
        }
        catch (error) {
            const err = error;
            return { success: false, error: err.message };
        }
    }
    /**
     * Funding Action: Create a sale listing on secondary market
     */
    async createSecondaryMarketListing(user, project, tokenId, count, pricePerToken) {
        const clients = this.getWalletForUser(user);
        try {
            if (!project || !project.erc1155 || !project.marketplace) {
                throw new Error(`Invalid project: missing erc1155 or marketplace`);
            }
            if (tokenId === undefined) {
                throw new Error(`Invalid tokenId: ${tokenId}`);
            }
            if (!pricePerToken || typeof pricePerToken !== 'bigint') {
                throw new Error(`Invalid pricePerToken: ${pricePerToken}`);
            }
            await approveERC1155ForMarketplace(clients, project.erc1155, project.marketplace);
            const hash = await createSaleListing(clients, { address: project.marketplace, abi: ERC1155SecondaryMarketAbi }, {
                tokenId: BigInt(tokenId),
                count: BigInt(count),
                pricePerToken
            });
            const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
            let listingId = 'unknown';
            try {
                const logs = receipt.logs;
                for (const log of logs) {
                    try {
                        if (log.topics && log.topics.length > 0) {
                            const topic = log.topics[0];
                            if (topic?.includes('SaleListingCreated') || topic?.length === 66) {
                                listingId = log.topics[1] ? BigInt(log.topics[1]).toString() : 'unknown';
                            }
                        }
                    }
                    catch { /* ignore parse errors */ }
                }
            }
            catch (eventError) {
                const err = eventError;
                console.log('Event parsing warning:', err.message);
            }
            const userTokenList = this.userTokens.get(user.address);
            if (userTokenList) {
                const tokenIdx = userTokenList.findIndex(t => t.erc1155 === project.erc1155 && t.tokenId === tokenId);
                if (tokenIdx !== -1) {
                    userTokenList[tokenIdx].listedCount = (userTokenList[tokenIdx].listedCount || 0) + count;
                }
            }
            return { success: true, receipt, listingId };
        }
        catch (error) {
            const err = error;
            return { success: false, error: err.message };
        }
    }
    /**
     * Funding Action: Purchase from secondary market
     */
    async purchaseFromSecondaryMarket(user, project, listingId, count, pricePerToken) {
        const clients = this.getWalletForUser(user);
        try {
            if (!pricePerToken) {
                throw new Error('pricePerToken is required');
            }
            const totalCost = pricePerToken * BigInt(count);
            const hash = await fulfillSaleListing(clients, { address: project.marketplace, abi: ERC1155SecondaryMarketAbi }, {
                saleListingId: BigInt(listingId),
                count: BigInt(count),
                totalCost
            });
            const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
            if (!this.userTokens.has(user.address)) {
                this.userTokens.set(user.address, []);
            }
            const userTokenList = this.userTokens.get(user.address);
            const existingToken = userTokenList.find(t => t.erc1155 === project.erc1155);
            if (existingToken) {
                existingToken.count += count;
            }
            else {
                userTokenList.push({ erc1155: project.erc1155, tokenId: 0, count, listedCount: 0 });
            }
            return { success: true, receipt, totalCost: totalCost.toString() };
        }
        catch (error) {
            const err = error;
            return { success: false, error: err.message };
        }
    }
    /**
     * Funding Action: Withdraw funds from successful project
     */
    async withdrawProjectFunds(user, project) {
        const clients = this.getWalletForUser(user);
        try {
            if (user.address.toLowerCase() !== project.owner.toLowerCase()) {
                throw new Error('Only project recipient can withdraw');
            }
            const hash = await sdkWithdrawProjectFunds(clients, { address: project.assuranceContract, abi: AssuranceContractAbi });
            const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
            return { success: true, receipt };
        }
        catch (error) {
            const err = error;
            return { success: false, error: err.message };
        }
    }
    /**
     * Delegation Action: Deposit ETH to create a note
     */
    async depositToNote(user, amount) {
        if (!this.contracts.delegatableNotes) {
            throw new Error('DelegatableNotes contract not deployed');
        }
        const clients = this.getWalletForUser(user);
        try {
            const { hash, noteId } = await sdkDepositETH(clients, { address: this.contracts.delegatableNotes.address, abi: this.contracts.delegatableNotes.abi }, { amount });
            const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
            const note = {
                noteId: noteId.toString(),
                owner: user.address,
                amount: amount.toString(),
                token: zeroAddress,
                tokenType: 0,
                tokenId: 0,
                delegated: false,
                revoked: false,
                originalOwner: user.address
            };
            this.createdNotes.push(note);
            return { success: true, note, receipt };
        }
        catch (error) {
            const err = error;
            return { success: false, error: err.message };
        }
    }
    /**
     * Delegation Action: Delegate a note to another user
     */
    async delegateNote(user, noteId, delegateTo, amountToDelegate) {
        if (!this.contracts.delegatableNotes) {
            throw new Error('DelegatableNotes contract not deployed');
        }
        const clients = this.getWalletForUser(user);
        try {
            const note = this.createdNotes.find(n => n.noteId === noteId);
            if (!note) {
                throw new Error('Note not found');
            }
            if (note.owner !== user.address) {
                throw new Error('Not note owner');
            }
            const owners = [user.address];
            const { hash, delegatedNoteId, remainderNoteId } = await sdkDelegateNote(clients, { address: this.contracts.delegatableNotes.address, abi: this.contracts.delegatableNotes.abi }, {
                noteId: BigInt(noteId),
                owners,
                delegateTo,
                amount: amountToDelegate
            });
            const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
            if (remainderNoteId && remainderNoteId > 0n) {
                const splitAmount = (BigInt(note.amount) - (BigInt(note.amount) * amountToDelegate / BigInt(note.amount))).toString();
                note.amount = (BigInt(note.amount) - BigInt(splitAmount)).toString();
                this.createdNotes.push({
                    noteId: delegatedNoteId.toString(),
                    owner: delegateTo,
                    amount: splitAmount,
                    token: note.token,
                    tokenType: note.tokenType,
                    tokenId: note.tokenId,
                    delegated: true,
                    revoked: false,
                    originalOwner: note.originalOwner || user.address
                });
                return {
                    success: true,
                    delegatedNoteId: delegatedNoteId.toString(),
                    remainderNoteId: remainderNoteId.toString(),
                    receipt
                };
            }
            else {
                note.owner = delegateTo;
                note.delegated = true;
                return { success: true, delegatedNoteId: delegatedNoteId.toString(), receipt };
            }
        }
        catch (error) {
            const err = error;
            return { success: false, error: err.message };
        }
    }
    /**
     * Delegation Action: Revoke a delegation
     */
    async revokeDelegation(user, noteId) {
        if (!this.contracts.delegatableNotes) {
            throw new Error('DelegatableNotes contract not deployed');
        }
        const clients = this.getWalletForUser(user);
        try {
            const note = this.createdNotes.find(n => n.noteId === noteId);
            if (!note) {
                throw new Error('Note not found');
            }
            const owners = [note.owner, user.address];
            const hash = await sdkRevokeNote(clients, { address: this.contracts.delegatableNotes.address, abi: this.contracts.delegatableNotes.abi }, {
                noteId: BigInt(noteId),
                owners
            });
            const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
            note.owner = user.address;
            note.revoked = true;
            return { success: true, receipt };
        }
        catch (error) {
            const err = error;
            return { success: false, error: err.message };
        }
    }
    /**
     * Delegation Action: Spend notes to purchase tokens from primary market
     */
    async spendNotesOnPrimaryMarket(user, noteIds, project, tokenIds, counts) {
        if (!this.contracts.delegatableNotes) {
            throw new Error('DelegatableNotes contract not deployed');
        }
        const clients = this.getWalletForUser(user);
        try {
            let totalCost = BigInt(0);
            for (let i = 0; i < tokenIds.length; i++) {
                const tokenIndex = project.tokenIds.indexOf(tokenIds[i]);
                if (tokenIndex !== -1) {
                    totalCost += BigInt(project.prices[tokenIndex]) * BigInt(counts[i]);
                }
            }
            const chains = noteIds.map(() => [user.address]);
            const hash = await purchaseFromPrimaryMarketWithNotes(clients, { address: this.contracts.delegatableNotes.address, abi: this.contracts.delegatableNotes.abi }, {
                noteIds: noteIds.map(n => BigInt(n)),
                chains,
                paymentAmount: totalCost,
                primaryMarket: project.assuranceContract,
                erc1155Contract: project.erc1155,
                tokenIds: tokenIds.map(n => BigInt(n)),
                counts: counts.map(n => BigInt(n))
            });
            const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
            for (const noteId of noteIds) {
                const note = this.createdNotes.find(n => n.noteId === noteId);
                if (note) {
                    const costPerNote = totalCost / BigInt(noteIds.length);
                    note.amount = (BigInt(note.amount) - costPerNote).toString();
                }
            }
            return { success: true, receipt, totalCost: totalCost.toString() };
        }
        catch (error) {
            const err = error;
            return { success: false, error: err.message };
        }
    }
    /**
     * Delegation Action: Reclaim funds from a root note
     */
    async reclaimNoteFunds(user, noteId) {
        if (!this.contracts.delegatableNotes) {
            throw new Error('DelegatableNotes contract not deployed');
        }
        const clients = this.getWalletForUser(user);
        try {
            const note = this.createdNotes.find(n => n.noteId === noteId);
            if (!note) {
                throw new Error('Note not found');
            }
            if (note.owner !== user.address) {
                throw new Error('Not note owner');
            }
            const hash = await sdkReclaimFunds(clients, { address: this.contracts.delegatableNotes.address, abi: this.contracts.delegatableNotes.abi }, BigInt(noteId));
            const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
            this.createdNotes = this.createdNotes.filter(n => n.noteId !== noteId);
            return { success: true, receipt };
        }
        catch (error) {
            const err = error;
            return { success: false, error: err.message };
        }
    }
}
// suppress unused import
void generateStatements;
void DelegatableNotesAbi;
void PubstarterAbi;
export { FundingAndDelegationActions };
