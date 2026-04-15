/**
 * Content-funding fake data generation.
 *
 * Creates a set of realistic content-funding scenarios across three channels:
 *   1. An unclaimed Twitter channel with a fan-created third-party contract.
 *   2. A verified YouTube channel with a creator contract.
 *   3. A creator-controlled Substack channel with both a creator contract and a
 *      third-party contract (eligible for veto).
 *
 * Run after the core simulation so the same users can act as supporters/buyers.
 */

import {
  createPublicClient,
  createWalletClient,
  encodePacked,
  http,
  keccak256,
  toBytes,
  parseEther,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ChannelRegistryAbi } from '../indexer/abis/ChannelRegistryAbi.js';
import { CreatorAssuranceContractFactoryAbi } from '../indexer/abis/CreatorAssuranceContractFactoryAbi.js';
import { AssuranceContractAbi } from '@commonality/sdk';
import { RPC_URL } from './loadEnv.js';
import type { User } from './types.js';

const erc20ApproveAbi = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ---------------------------------------------------------------------------
// Local chain definition (mirrors runSimulation.ts)
// ---------------------------------------------------------------------------

const hardhat = {
  id: 31337,
  name: 'Hardhat',
  network: 'hardhat',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://localhost:8545'] },
    public: { http: ['http://localhost:8545'] },
  },
} as const;

// Well-known Hardhat account #0 private key — used as the trusted verifier
// in local deployments. The deploy script sets this address as the
// ChannelVerifier's trustedVerifier.
const HARDHAT_DEPLOYER_PRIVATE_KEY: Hex =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createClients(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: hardhat,
    transport: http(RPC_URL),
  });
  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(RPC_URL),
  });
  return { walletClient, publicClient, account: account.address };
}

/** Compute the content-item ID the factory will use for a given canonical pair. */
function computeContentId(channelCanonicalId: string, contentSuffix: string, separator = ':'): bigint {
  const canonicalId = `${channelCanonicalId}${separator}${contentSuffix}`;
  return BigInt(keccak256(toBytes(canonicalId)));
}

/** keccak256 of the channel canonical ID string — used as the on-chain bytes32 channelId. */
function channelIdBytes(channelCanonicalId: string): Hex {
  return keccak256(toBytes(channelCanonicalId));
}

async function waitForTx(
  publicClient: ReturnType<typeof createPublicClient>,
  hash: Hex,
) {
  return publicClient.waitForTransactionReceipt({ hash });
}

// ---------------------------------------------------------------------------
// Scenario helpers
// ---------------------------------------------------------------------------

/**
 * Sign a channel-claim proof using the same scheme as the Platform API Service:
 * keccak256(abi.encodePacked(channelId, claimant, nonce, deadline)) signed with
 * EIP-191 personal sign.
 */
async function signClaimProof(
  verifierPrivateKey: Hex,
  channelId: Hex,
  claimant: `0x${string}`,
  nonce: Hex,
  deadline: bigint,
): Promise<Hex> {
  const verifierAccount = privateKeyToAccount(verifierPrivateKey);
  const packed = encodePacked(
    ['bytes32', 'address', 'bytes32', 'uint256'],
    [channelId, claimant, nonce, deadline],
  );
  const digest = keccak256(packed);
  return verifierAccount.signMessage({
    message: { raw: toBytes(digest) },
  });
}

/** Verify a channel so that a user becomes its on-chain owner. */
async function verifyChannel(
  clients: ReturnType<typeof createClients>,
  registryAddress: `0x${string}`,
  channelCanonicalId: string,
) {
  const chId = channelIdBytes(channelCanonicalId);
  // Deadline 1 hour from "now" (Hardhat time follows real time for view calls).
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  // Random nonce — just needs to be unused.
  const nonce = keccak256(toBytes(`nonce-${channelCanonicalId}-${Date.now()}`));

  const signature = await signClaimProof(
    HARDHAT_DEPLOYER_PRIVATE_KEY,
    chId,
    clients.account as `0x${string}`,
    nonce,
    deadline,
  );

  const hash = await clients.walletClient.writeContract({
    address: registryAddress,
    abi: ChannelRegistryAbi,
    functionName: 'verifyChannel',
    args: [chId, clients.account, nonce, deadline, signature],
    chain: hardhat,
    account: clients.walletClient.account!,
  });
  await waitForTx(clients.publicClient, hash);
  console.log(`  ✓ Channel verified: ${channelCanonicalId} → owner ${clients.account}`);
}

/** Take creator control of a verified channel. */
async function takeChannelControl(
  clients: ReturnType<typeof createClients>,
  registryAddress: `0x${string}`,
  channelCanonicalId: string,
) {
  const chId = channelIdBytes(channelCanonicalId);
  const hash = await clients.walletClient.writeContract({
    address: registryAddress,
    abi: ChannelRegistryAbi,
    functionName: 'takeChannelControl',
    args: [chId],
    chain: hardhat,
    account: clients.walletClient.account!,
  });
  await waitForTx(clients.publicClient, hash);
  console.log(`  ✓ Creator control taken: ${channelCanonicalId}`);
}

interface CreateContractParams {
  factoryAddress: `0x${string}`;
  channelCanonicalId: string;
  contentSuffixes: string[];
  supplies: bigint[];
  prices: bigint[];
  threshold: bigint;
  deadlineSecs: bigint;
  isThirdParty: boolean;
  /** contentIds to purchase in the same tx (required for third-party contracts). */
  initialPurchaseIds?: bigint[];
  initialPurchaseCounts?: bigint[];
}

/**
 * Call CreatorAssuranceContractFactory.createContract and return the new
 * assurance contract address (read from the CreatorContractCreated event).
 */
async function createCreatorContract(
  clients: ReturnType<typeof createClients>,
  params: CreateContractParams,
): Promise<`0x${string}`> {
  const {
    factoryAddress,
    channelCanonicalId,
    contentSuffixes,
    supplies,
    prices,
    threshold,
    deadlineSecs,
    isThirdParty,
    initialPurchaseIds = [],
    initialPurchaseCounts = [],
  } = params;

  const chId = channelIdBytes(channelCanonicalId);

  // Compute initial purchase value.
  let initialPurchaseValue = 0n;
  for (let i = 0; i < initialPurchaseIds.length; i++) {
    const idx = contentSuffixes.findIndex(
      (_, j) => computeContentId(channelCanonicalId, contentSuffixes[j]) === initialPurchaseIds[i],
    );
    if (idx >= 0) {
      initialPurchaseValue += prices[idx] * initialPurchaseCounts[i];
    }
  }

  const paymentToken = await clients.publicClient.readContract({
    address: factoryAddress,
    abi: CreatorAssuranceContractFactoryAbi,
    functionName: 'paymentToken',
    args: [],
  }) as `0x${string}`;

  if (initialPurchaseValue > 0n) {
    const approvalHash = await clients.walletClient.writeContract({
      address: paymentToken,
      abi: erc20ApproveAbi,
      functionName: 'approve',
      args: [factoryAddress, initialPurchaseValue],
      chain: hardhat,
      account: clients.walletClient.account!,
    });
    await waitForTx(clients.publicClient, approvalHash);
  }

  const createHash = await clients.walletClient.writeContract({
    address: factoryAddress,
    abi: CreatorAssuranceContractFactoryAbi,
    functionName: 'createContract',
    args: [
      chId,
      channelCanonicalId,
      contentSuffixes,
      supplies,
      prices,
      threshold,
      deadlineSecs,
      `fake-metadata-${channelCanonicalId}`,
      `https://fake-metadata.example/{id}.json`,
      `https://fake-contract.example/contract.json`,
      isThirdParty,
      initialPurchaseIds,
      initialPurchaseCounts,
    ],
    chain: hardhat,
    account: clients.walletClient.account!,
  });

  const receipt = await waitForTx(clients.publicClient, createHash);

  // Parse the CreatorContractCreated event to extract the new contract address.
  for (const log of receipt.logs) {
    try {
      // Topic[0] = keccak256("CreatorContractCreated(address,bytes32,address,bool)")
      const eventSig = keccak256(
        toBytes('CreatorContractCreated(address,bytes32,address,bool)'),
      );
      if (log.topics[0] === eventSig) {
        // contractAddress is indexed (topics[1]) — strip leading zeros.
        const contractAddress = `0x${log.topics[1]!.slice(26)}` as `0x${string}`;
        console.log(`  ✓ Creator contract deployed: ${contractAddress} (${isThirdParty ? 'third-party' : 'creator'})`);
        return contractAddress;
      }
    } catch {
      // Skip malformed logs.
    }
  }

  throw new Error(`CreatorContractCreated event not found in tx ${createHash}`);
}

/** Buy tokens on a creator assurance contract. */
async function buyTokens(
  clients: ReturnType<typeof createClients>,
  contractAddress: `0x${string}`,
  erc1155Address: `0x${string}`,
  tokenIds: bigint[],
  counts: bigint[],
  prices: bigint[],
) {
  const totalCost = tokenIds.reduce(
    (acc, _id, i) => acc + prices[i] * counts[i],
    0n,
  );

  const paymentToken = await clients.publicClient.readContract({
    address: contractAddress,
    abi: AssuranceContractAbi,
    functionName: 'paymentToken',
    args: [],
  }) as `0x${string}`;

  const approvalHash = await clients.walletClient.writeContract({
    address: paymentToken,
    abi: erc20ApproveAbi,
    functionName: 'approve',
    args: [contractAddress, totalCost],
    chain: hardhat,
    account: clients.walletClient.account!,
  });
  await waitForTx(clients.publicClient, approvalHash);

  const hash = await clients.walletClient.writeContract({
    address: contractAddress,
    abi: AssuranceContractAbi,
    functionName: 'buyERC1155',
    args: [clients.account, erc1155Address, tokenIds, counts, '0x' as Hex],
    chain: hardhat,
    account: clients.walletClient.account!,
  });
  await waitForTx(clients.publicClient, hash);
  console.log(`  ✓ Tokens purchased: ${tokenIds.map((id, i) => `${counts[i]}x #${id}`).join(', ')} from ${contractAddress}`);
}

/**
 * Read the contractERC1155 mapping from the factory to find the ERC-1155
 * token address for a given assurance contract.
 */
async function getERC1155Address(
  publicClient: ReturnType<typeof createPublicClient>,
  factoryAddress: `0x${string}`,
  contractAddress: `0x${string}`,
): Promise<`0x${string}`> {
  return publicClient.readContract({
    address: factoryAddress,
    abi: CreatorAssuranceContractFactoryAbi,
    functionName: 'contractERC1155',
    args: [contractAddress],
  }) as Promise<`0x${string}`>;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface ContentFundingAddresses {
  channelRegistry: `0x${string}`;
  creatorContractFactory: `0x${string}`;
}

/**
 * Generate content-funding blockchain state for all three scenario types.
 * Requires the services to be running and the content-funding contracts deployed.
 */
export async function generateContentFundingScenarios(
  addresses: ContentFundingAddresses,
  users: User[],
): Promise<void> {
  console.log('\n=== Generating Content-Funding Scenarios ===\n');

  if (users.length < 4) {
    console.warn('  Need at least 4 users for content-funding scenarios — skipping.');
    return;
  }

  const { channelRegistry, creatorContractFactory } = addresses;

  // Assign roles. Use later users so they don't clash with the primary hardhat
  // account (index 0) used as the funder in the main simulation.
  const fanUser = users[1];       // Creates the third-party contract on the unclaimed channel.
  const creatorUser = users[2];   // Owns the verified and creator-controlled channels.
  const buyerA = users[3];
  const buyerB = users.length > 4 ? users[4] : users[0];

  const fanClients = createClients(fanUser.privateKey);
  const creatorClients = createClients(creatorUser.privateKey);
  const buyerAClients = createClients(buyerA.privateKey);
  const buyerBClients = createClients(buyerB.privateKey);

  const deadline30d = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 3600);

  // -------------------------------------------------------------------------
  // Scenario 1: Unclaimed Twitter channel
  //   A fan creates a third-party contract for a creator who hasn't claimed yet.
  //   Funds are routed to the ChannelEscrow.
  // -------------------------------------------------------------------------
  console.log('--- Scenario 1: Unclaimed Twitter channel ---');
  {
    const channelCanonicalId = 'twitter:uid:111111111';
    const contentSuffixes = ['1000000000000000001', '1000000000000000002'];
    const supplies = [100n, 100n];
    const tokenPrice = parseEther('0.01');
    const prices = [tokenPrice, tokenPrice];
    const threshold = parseEther('2'); // 200 tokens × 0.01 ETH

    // Pre-compute the first content item's ID for the mandatory initial purchase.
    const firstContentId = computeContentId(channelCanonicalId, contentSuffixes[0]);

    const contractAddress = await createCreatorContract(fanClients, {
      factoryAddress: creatorContractFactory,
      channelCanonicalId,
      contentSuffixes,
      supplies,
      prices,
      threshold,
      deadlineSecs: deadline30d,
      isThirdParty: true,
      initialPurchaseIds: [firstContentId],
      initialPurchaseCounts: [1n],
    });

    // Additional buyers purchase tokens.
    const erc1155 = await getERC1155Address(buyerAClients.publicClient, creatorContractFactory, contractAddress);
    const secondContentId = computeContentId(channelCanonicalId, contentSuffixes[1]);

    await buyTokens(buyerAClients, contractAddress, erc1155, [firstContentId], [5n], [tokenPrice]);
    await buyTokens(buyerBClients, contractAddress, erc1155, [firstContentId, secondContentId], [3n, 2n], [tokenPrice, tokenPrice]);

    console.log(`  Channel ${channelCanonicalId}: unclaimed, 1 contract, buyers have purchased tokens.\n`);
  }

  // -------------------------------------------------------------------------
  // Scenario 2: Verified YouTube channel
  //   The creator verifies ownership and creates their own contract.
  //   Funds are routed directly to the creator (not escrow).
  // -------------------------------------------------------------------------
  console.log('--- Scenario 2: Verified YouTube channel ---');
  {
    const channelCanonicalId = 'youtube:channel:UCaaaaaaaaaaaaaaaaaaaaaaaa';
    const contentSuffixes = ['dQw4w9WgXcQ']; // YouTube video ID format
    const supplies = [200n];
    const tokenPrice = parseEther('0.005');
    const prices = [tokenPrice];
    const threshold = parseEther('0.5');

    await verifyChannel(creatorClients, channelRegistry, channelCanonicalId);

    const contractAddress = await createCreatorContract(creatorClients, {
      factoryAddress: creatorContractFactory,
      channelCanonicalId,
      contentSuffixes,
      supplies,
      prices,
      threshold,
      deadlineSecs: deadline30d,
      isThirdParty: false,
      initialPurchaseIds: [],
      initialPurchaseCounts: [],
    });

    const erc1155 = await getERC1155Address(buyerAClients.publicClient, creatorContractFactory, contractAddress);
    const contentId = computeContentId(channelCanonicalId, contentSuffixes[0]);

    await buyTokens(buyerAClients, contractAddress, erc1155, [contentId], [10n], [tokenPrice]);
    await buyTokens(fanClients, contractAddress, erc1155, [contentId], [4n], [tokenPrice]);

    console.log(`  Channel ${channelCanonicalId}: verified, 1 creator contract, buyers have purchased tokens.\n`);
  }

  // -------------------------------------------------------------------------
  // Scenario 3: Creator-controlled Substack channel
  //   Creator verifies the channel. While it's still Verified (not yet
  //   CreatorControlled) a fan creates a third-party contract. Then the
  //   creator creates their own contract and takes control, which starts the
  //   7-day veto window for the pre-existing third-party contract.
  //
  //   Note: third-party contracts may only be created on Unclaimed or Verified
  //   channels, not on CreatorControlled ones — so the fan must act before the
  //   creator calls takeChannelControl().
  // -------------------------------------------------------------------------
  console.log('--- Scenario 3: Creator-controlled Substack channel ---');
  {
    const channelCanonicalId = 'substack:smartwriter';
    const creatorSuffixes = ['my-first-big-piece'];
    const creatorSupplies = [150n];
    const creatorPrice = parseEther('0.008');
    const creatorPrices = [creatorPrice];
    const creatorThreshold = parseEther('1');

    const thirdPartySuffixes = ['an-older-post'];
    const thirdPartySupplies = [50n];
    const thirdPartyPrice = parseEther('0.02');
    const thirdPartyPrices = [thirdPartyPrice];
    // threshold > initialPurchaseValue (verified channel requires this).
    // initialPurchaseValue = 1 × 0.02 ETH = 0.02 ETH, threshold = 0.5 ETH > 0.02 ETH ✓
    const thirdPartyThreshold = parseEther('0.5');

    // Step 1: Verify the channel — it's now Verified (not CreatorControlled).
    await verifyChannel(creatorClients, channelRegistry, channelCanonicalId);

    // Step 2: Fan creates a third-party contract while channel is still Verified.
    const thirdPartyContentId = computeContentId(channelCanonicalId, thirdPartySuffixes[0]);

    const thirdPartyContract = await createCreatorContract(fanClients, {
      factoryAddress: creatorContractFactory,
      channelCanonicalId,
      contentSuffixes: thirdPartySuffixes,
      supplies: thirdPartySupplies,
      prices: thirdPartyPrices,
      threshold: thirdPartyThreshold,
      deadlineSecs: deadline30d,
      isThirdParty: true,
      initialPurchaseIds: [thirdPartyContentId],
      initialPurchaseCounts: [1n],
    });

    const thirdPartyERC1155 = await getERC1155Address(
      buyerBClients.publicClient,
      creatorContractFactory,
      thirdPartyContract,
    );
    await buyTokens(buyerBClients, thirdPartyContract, thirdPartyERC1155, [thirdPartyContentId], [2n], [thirdPartyPrice]);

    // Step 3: Creator creates their own contract (also while channel is Verified).
    const creatorContract = await createCreatorContract(creatorClients, {
      factoryAddress: creatorContractFactory,
      channelCanonicalId,
      contentSuffixes: creatorSuffixes,
      supplies: creatorSupplies,
      prices: creatorPrices,
      threshold: creatorThreshold,
      deadlineSecs: deadline30d,
      isThirdParty: false,
      initialPurchaseIds: [],
      initialPurchaseCounts: [],
    });

    const creatorERC1155 = await getERC1155Address(
      buyerAClients.publicClient,
      creatorContractFactory,
      creatorContract,
    );
    const creatorContentId = computeContentId(channelCanonicalId, creatorSuffixes[0]);
    await buyTokens(buyerAClients, creatorContract, creatorERC1155, [creatorContentId], [6n], [creatorPrice]);

    // Step 4: Creator takes control — starts the 7-day veto window for the
    // third-party contract created above.
    await takeChannelControl(creatorClients, channelRegistry, channelCanonicalId);

    console.log(`  Channel ${channelCanonicalId}: creator-controlled, 1 creator + 1 vetoable third-party contract.\n`);
  }

  console.log('=== Content-Funding Scenarios Complete ===\n');
}
