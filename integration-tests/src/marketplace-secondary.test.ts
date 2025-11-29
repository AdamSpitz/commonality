/**
 * Secondary Marketplace Integration Tests
 *
 * Tests secondary market functionality:
 * 1. Create sale listings for project tokens
 * 2. Purchase tokens from sale listings
 * 3. Cancel sale listings
 * 4. Create buy orders for project tokens
 * 5. Fulfill buy orders by selling tokens
 * 6. Cancel buy orders
 * 7. Query active listings and orders
 * 8. Price history tracking via trades
 */

import assert from 'assert';
import {
  createTestClients,
  createProject,
  buyProjectTokens,
  uploadToIPFS,
  createSaleListing,
  fulfillSaleListing,
  cancelSaleListing,
  createBuyOrder,
  fulfillBuyOrder,
  cancelBuyOrder,
  approveERC1155ForMarketplace,
  type PubstarterContract,
  type AssuranceContract,
  type SecondaryMarketContract,
} from './actions/index.js';
import {
  createGraphQLClient,
  getProject,
  getSaleListing,
  getActiveSaleListings,
  getBuyOrder,
  getActiveBuyOrders,
  getMarketplaceTrades,
  getTokenTrades,
  waitForSync,
  assertNotNull,
  type GraphQLClient,
} from './queries/index.js';
import { parseEther, type Address } from 'viem';

// Minimal ABIs for the contracts we need
const PubstarterAbi = [
  {
    inputs: [
      { name: 'metadataURI', type: 'string' },
      { name: 'contractURI', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'threshold', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'projectMetadataCid', type: 'string' },
      { name: 'ids', type: 'uint256[]' },
      { name: 'counts', type: 'uint256[]' },
      { name: 'prices', type: 'uint256[]' },
    ],
    name: 'createERC1155AndMarketplaceAndAssuranceContract',
    outputs: [
      { name: '', type: 'address' },
      { name: '', type: 'address' },
      { name: '', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const AssuranceContractAbi = [
  {
    inputs: [
      { name: 'buyer', type: 'address' },
      { name: 'erc1155Addr', type: 'address' },
      { name: 'ids', type: 'uint256[]' },
      { name: 'counts', type: 'uint256[]' },
      { name: 'data', type: 'bytes' },
    ],
    name: 'buyERC1155',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

const SecondaryMarketAbi = [
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'count', type: 'uint256' },
      { name: 'pricePerToken', type: 'uint256' },
    ],
    name: 'createSaleListing',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'saleListingId', type: 'uint256' },
      { name: 'count', type: 'uint256' },
    ],
    name: 'fulfillSaleListing',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'saleListingId', type: 'uint256' },
    ],
    name: 'cancelSaleListing',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'count', type: 'uint256' },
      { name: 'pricePerToken', type: 'uint256' },
    ],
    name: 'createBuyOrder',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'buyOrderId', type: 'uint256' },
      { name: 'count', type: 'uint256' },
    ],
    name: 'fulfillBuyOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'buyOrderId', type: 'uint256' },
    ],
    name: 'cancelBuyOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

describe('Secondary Marketplace Integration Tests', () => {
  // Test configuration
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as Address;

  // Hardhat test accounts
  const SELLER_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;
  const BUYER_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const;

  let graphqlClient: GraphQLClient;

  before(() => {
    graphqlClient = createGraphQLClient(GRAPHQL_URL);
  });

  it('should create and fulfill a sale listing', async function() {
    this.timeout(40000);

    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }

    console.log('  Setting up test clients...');
    const sellerClients = createTestClients(SELLER_PRIVATE_KEY, RPC_URL);
    const buyerClients = createTestClients(BUYER_PRIVATE_KEY, RPC_URL);

    console.log(`  Seller: ${sellerClients.account}`);
    console.log(`  Buyer: ${buyerClients.account}`);

    // Create a project
    console.log('  Creating project...');
    const projectMetadataCid = await uploadToIPFS({
      title: 'Secondary Market Test Project',
    });

    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    const { hash, projectDetails } = await createProject(
      sellerClients,
      pubstarterContract,
      {
        metadataURI: 'https://example.com/metadata/',
        contractURI: 'https://example.com/contract',
        owner: sellerClients.account,
        recipient: sellerClients.account,
        threshold: parseEther('1.0'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid,
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseEther('0.01')],
      }
    );

    console.log(`  Project created! Marketplace: ${projectDetails.marketplaceAddress}`);

    // Wait for indexer to sync
    const receipt = await sellerClients.publicClient.getTransactionReceipt({ hash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Seller buys some tokens from the primary market
    console.log('  Seller buying tokens from primary market...');
    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    const buyHash = await buyProjectTokens(
      sellerClients,
      assuranceContract,
      {
        buyer: sellerClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [10n],
        totalCost: parseEther('0.1'),
      }
    );

    const buyReceipt = await sellerClients.publicClient.getTransactionReceipt({ hash: buyHash });
    await waitForSync(graphqlClient, buyReceipt.blockNumber, 15000);

    // Seller approves marketplace to transfer their tokens
    console.log('  Seller approving marketplace...');
    const approveHash = await approveERC1155ForMarketplace(
      sellerClients,
      projectDetails.tokenAddress,
      projectDetails.marketplaceAddress
    );

    // Seller creates a sale listing
    console.log('  Seller creating sale listing...');
    const marketplaceContract: SecondaryMarketContract = {
      address: projectDetails.marketplaceAddress,
      abi: SecondaryMarketAbi,
    };

    const listingHash = await createSaleListing(
      sellerClients,
      marketplaceContract,
      {
        tokenId: 1n,
        count: 5n,
        pricePerToken: parseEther('0.015'), // 50% markup
      }
    );

    const listingReceipt = await sellerClients.publicClient.getTransactionReceipt({ hash: listingHash });
    console.log('  Waiting for indexer to sync sale listing...');
    await waitForSync(graphqlClient, listingReceipt.blockNumber, 15000);

    // Query the listing from indexer
    console.log('  Querying sale listing from indexer...');
    const listing = assertNotNull(
      await getSaleListing(graphqlClient, projectDetails.marketplaceAddress, 0n),
      'Sale listing'
    );

    console.log(`  Listing found! Price: ${listing.pricePerToken}, Count: ${listing.remainingCount}`);
    assert.strictEqual(listing.status, 'active', 'Listing should be active');
    assert.strictEqual(listing.seller.toLowerCase(), sellerClients.account.toLowerCase(), 'Seller should match');
    assert.strictEqual(listing.remainingCount, '5', 'Should have 5 tokens listed');
    assert.strictEqual(listing.pricePerToken, parseEther('0.015').toString(), 'Price should be 0.015 ETH');

    // Verify active listings query
    const activeListings = await getActiveSaleListings(graphqlClient, projectDetails.marketplaceAddress);
    assert.strictEqual(activeListings.length, 1, 'Should have 1 active listing');

    // Buyer fulfills the sale listing (buys 3 tokens)
    console.log('  Buyer purchasing from sale listing...');
    const fulfillHash = await fulfillSaleListing(
      buyerClients,
      marketplaceContract,
      {
        saleListingId: 0n,
        count: 3n,
        totalCost: parseEther('0.045'), // 3 * 0.015
      }
    );

    const fulfillReceipt = await buyerClients.publicClient.getTransactionReceipt({ hash: fulfillHash });
    console.log('  Waiting for indexer to sync trade...');
    await waitForSync(graphqlClient, fulfillReceipt.blockNumber, 15000);

    // Query updated listing
    const updatedListing = assertNotNull(
      await getSaleListing(graphqlClient, projectDetails.marketplaceAddress, 0n),
      'Updated listing'
    );

    console.log(`  Updated listing remaining count: ${updatedListing.remainingCount}`);
    assert.strictEqual(updatedListing.remainingCount, '2', 'Should have 2 tokens remaining');
    assert.strictEqual(updatedListing.status, 'active', 'Listing should still be active');

    // Query trades
    const trades = await getMarketplaceTrades(graphqlClient, projectDetails.marketplaceAddress);
    console.log(`  Found ${trades.length} trade(s)`);
    assert.strictEqual(trades.length, 1, 'Should have 1 trade');

    const trade = trades[0];
    assert.strictEqual(trade.buyer.toLowerCase(), buyerClients.account.toLowerCase(), 'Trade buyer should match');
    assert.strictEqual(trade.seller.toLowerCase(), sellerClients.account.toLowerCase(), 'Trade seller should match');
    assert.strictEqual(trade.count, '3', 'Trade count should be 3');
    assert.strictEqual(trade.orderType, 'sale_listing', 'Trade type should be sale_listing');

    console.log('  Sale listing test passed!');
  });

  it('should create and cancel a sale listing', async function() {
    this.timeout(40000);

    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }

    console.log('  Setting up for cancellation test...');
    const sellerClients = createTestClients(SELLER_PRIVATE_KEY, RPC_URL);

    // Create a project
    const projectMetadataCid = await uploadToIPFS({ title: 'Cancel Test Project' });
    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    const { hash, projectDetails } = await createProject(
      sellerClients,
      pubstarterContract,
      {
        metadataURI: 'https://example.com/metadata/',
        contractURI: 'https://example.com/contract',
        owner: sellerClients.account,
        recipient: sellerClients.account,
        threshold: parseEther('1.0'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid,
        tokenIds: [1n],
        tokenCounts: [50n],
        tokenPrices: [parseEther('0.01')],
      }
    );

    const receipt = await sellerClients.publicClient.getTransactionReceipt({ hash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Buy and approve tokens
    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    await buyProjectTokens(sellerClients, assuranceContract, {
      buyer: sellerClients.account,
      tokenAddress: projectDetails.tokenAddress,
      tokenIds: [1n],
      tokenCounts: [10n],
      totalCost: parseEther('0.1'),
    });

    await approveERC1155ForMarketplace(
      sellerClients,
      projectDetails.tokenAddress,
      projectDetails.marketplaceAddress
    );

    // Create a listing
    console.log('  Creating sale listing to cancel...');
    const marketplaceContract: SecondaryMarketContract = {
      address: projectDetails.marketplaceAddress,
      abi: SecondaryMarketAbi,
    };

    const listingHash = await createSaleListing(
      sellerClients,
      marketplaceContract,
      {
        tokenId: 1n,
        count: 5n,
        pricePerToken: parseEther('0.02'),
      }
    );

    const listingReceipt = await sellerClients.publicClient.getTransactionReceipt({ hash: listingHash });
    await waitForSync(graphqlClient, listingReceipt.blockNumber, 15000);

    // Verify listing exists
    const listing = assertNotNull(
      await getSaleListing(graphqlClient, projectDetails.marketplaceAddress, 0n),
      'Listing before cancel'
    );
    assert.strictEqual(listing.status, 'active', 'Listing should be active');

    // Cancel the listing
    console.log('  Cancelling sale listing...');
    const cancelHash = await cancelSaleListing(
      sellerClients,
      marketplaceContract,
      { saleListingId: 0n }
    );

    const cancelReceipt = await sellerClients.publicClient.getTransactionReceipt({ hash: cancelHash });
    await waitForSync(graphqlClient, cancelReceipt.blockNumber, 15000);

    // Verify listing is cancelled
    const cancelledListing = assertNotNull(
      await getSaleListing(graphqlClient, projectDetails.marketplaceAddress, 0n),
      'Listing after cancel'
    );
    assert.strictEqual(cancelledListing.status, 'cancelled', 'Listing should be cancelled');

    // Verify it's not in active listings
    const activeListings = await getActiveSaleListings(graphqlClient, projectDetails.marketplaceAddress);
    assert.strictEqual(activeListings.length, 0, 'Should have no active listings');

    console.log('  Cancellation test passed!');
  });

  it('should create and fulfill a buy order', async function() {
    this.timeout(40000);

    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }

    console.log('  Setting up for buy order test...');
    const buyerClients = createTestClients(BUYER_PRIVATE_KEY, RPC_URL);
    const sellerClients = createTestClients(SELLER_PRIVATE_KEY, RPC_URL);

    // Create a project
    const projectMetadataCid = await uploadToIPFS({ title: 'Buy Order Test Project' });
    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    const { hash, projectDetails } = await createProject(
      sellerClients,
      pubstarterContract,
      {
        metadataURI: 'https://example.com/metadata/',
        contractURI: 'https://example.com/contract',
        owner: sellerClients.account,
        recipient: sellerClients.account,
        threshold: parseEther('1.0'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid,
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseEther('0.01')],
      }
    );

    const receipt = await sellerClients.publicClient.getTransactionReceipt({ hash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Seller buys tokens from primary market
    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    await buyProjectTokens(sellerClients, assuranceContract, {
      buyer: sellerClients.account,
      tokenAddress: projectDetails.tokenAddress,
      tokenIds: [1n],
      tokenCounts: [10n],
      totalCost: parseEther('0.1'),
    });

    await approveERC1155ForMarketplace(
      sellerClients,
      projectDetails.tokenAddress,
      projectDetails.marketplaceAddress
    );

    // Buyer creates a buy order
    console.log('  Buyer creating buy order...');
    const marketplaceContract: SecondaryMarketContract = {
      address: projectDetails.marketplaceAddress,
      abi: SecondaryMarketAbi,
    };

    const orderHash = await createBuyOrder(
      buyerClients,
      marketplaceContract,
      {
        tokenId: 1n,
        count: 4n,
        pricePerToken: parseEther('0.012'),
      }
    );

    const orderReceipt = await buyerClients.publicClient.getTransactionReceipt({ hash: orderHash });
    await waitForSync(graphqlClient, orderReceipt.blockNumber, 15000);

    // Query the buy order
    const buyOrder = assertNotNull(
      await getBuyOrder(graphqlClient, projectDetails.marketplaceAddress, 0n),
      'Buy order'
    );

    assert.strictEqual(buyOrder.status, 'active', 'Buy order should be active');
    assert.strictEqual(buyOrder.buyer.toLowerCase(), buyerClients.account.toLowerCase(), 'Buyer should match');
    assert.strictEqual(buyOrder.remainingCount, '4', 'Should want 4 tokens');

    // Seller fulfills the buy order (sells 2 tokens)
    console.log('  Seller fulfilling buy order...');
    const fulfillHash = await fulfillBuyOrder(
      sellerClients,
      marketplaceContract,
      {
        buyOrderId: 0n,
        count: 2n,
      }
    );

    const fulfillReceipt = await sellerClients.publicClient.getTransactionReceipt({ hash: fulfillHash });
    await waitForSync(graphqlClient, fulfillReceipt.blockNumber, 15000);

    // Query updated buy order
    const updatedOrder = assertNotNull(
      await getBuyOrder(graphqlClient, projectDetails.marketplaceAddress, 0n),
      'Updated buy order'
    );

    assert.strictEqual(updatedOrder.remainingCount, '2', 'Should have 2 tokens remaining');
    assert.strictEqual(updatedOrder.status, 'active', 'Order should still be active');

    // Query trades
    const trades = await getTokenTrades(graphqlClient, projectDetails.marketplaceAddress, 1n);
    assert.strictEqual(trades.length, 1, 'Should have 1 trade');

    const trade = trades[0];
    assert.strictEqual(trade.orderType, 'buy_order', 'Trade type should be buy_order');
    assert.strictEqual(trade.count, '2', 'Trade count should be 2');

    console.log('  Buy order test passed!');
  });

  it('should create and cancel a buy order', async function() {
    this.timeout(30000);

    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }

    console.log('  Setting up for buy order cancellation...');
    const buyerClients = createTestClients(BUYER_PRIVATE_KEY, RPC_URL);
    const sellerClients = createTestClients(SELLER_PRIVATE_KEY, RPC_URL);

    // Create a project
    const projectMetadataCid = await uploadToIPFS({ title: 'Cancel Buy Order Test' });
    const pubstarterContract: PubstarterContract = {
      address: PUBSTARTER_ADDRESS,
      abi: PubstarterAbi,
    };

    const { hash, projectDetails } = await createProject(
      sellerClients,
      pubstarterContract,
      {
        metadataURI: 'https://example.com/metadata/',
        contractURI: 'https://example.com/contract',
        owner: sellerClients.account,
        recipient: sellerClients.account,
        threshold: parseEther('1.0'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid,
        tokenIds: [1n],
        tokenCounts: [50n],
        tokenPrices: [parseEther('0.01')],
      }
    );

    const receipt = await sellerClients.publicClient.getTransactionReceipt({ hash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Buyer creates a buy order
    console.log('  Creating buy order to cancel...');
    const marketplaceContract: SecondaryMarketContract = {
      address: projectDetails.marketplaceAddress,
      abi: SecondaryMarketAbi,
    };

    const orderHash = await createBuyOrder(
      buyerClients,
      marketplaceContract,
      {
        tokenId: 1n,
        count: 3n,
        pricePerToken: parseEther('0.015'),
      }
    );

    const orderReceipt = await buyerClients.publicClient.getTransactionReceipt({ hash: orderHash });
    await waitForSync(graphqlClient, orderReceipt.blockNumber, 15000);

    // Verify order exists
    const order = assertNotNull(
      await getBuyOrder(graphqlClient, projectDetails.marketplaceAddress, 0n),
      'Buy order before cancel'
    );
    assert.strictEqual(order.status, 'active', 'Order should be active');

    // Cancel the order
    console.log('  Cancelling buy order...');
    const cancelHash = await cancelBuyOrder(
      buyerClients,
      marketplaceContract,
      { buyOrderId: 0n }
    );

    const cancelReceipt = await buyerClients.publicClient.getTransactionReceipt({ hash: cancelHash });
    await waitForSync(graphqlClient, cancelReceipt.blockNumber, 15000);

    // Verify order is cancelled
    const cancelledOrder = assertNotNull(
      await getBuyOrder(graphqlClient, projectDetails.marketplaceAddress, 0n),
      'Buy order after cancel'
    );
    assert.strictEqual(cancelledOrder.status, 'cancelled', 'Order should be cancelled');

    // Verify it's not in active orders
    const activeOrders = await getActiveBuyOrders(graphqlClient, projectDetails.marketplaceAddress);
    assert.strictEqual(activeOrders.length, 0, 'Should have no active buy orders');

    console.log('  Buy order cancellation test passed!');
  });
});
