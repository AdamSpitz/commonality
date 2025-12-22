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
  createProject,
  uploadToIPFS,
  cancelSaleListing,
  createBuyOrder,
  fulfillBuyOrder,
  cancelBuyOrder,
  approveERC1155ForMarketplace,
  type PubstarterContract,
  type AssuranceContract,
  type SecondaryMarketContract,
} from '@commonality/sdk';
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
} from '@commonality/sdk';
import { parseEther, type Address } from 'viem';
import {
  PubstarterAbi,
  AssuranceContractAbi,
  ERC1155SecondaryMarketAbi as SecondaryMarketAbi
} from '@commonality/sdk';
import { testLog, createIsolatedTestClients } from './setup.js';
import { buyProjectTokensChecked } from './funding-actions-checked.js';
import { createSaleListingChecked, fulfillSaleListingChecked } from './marketplace-actions-checked.js';



describe('Secondary Marketplace Integration Tests', () => {
  // Test configuration
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const GRAPHQL_URL = process.env.GRAPHQL_URL || 'http://localhost:42069/graphql';
  const PUBSTARTER_ADDRESS = process.env.PUBSTARTER_ADDRESS as Address;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'marketplace-secondary';

  let graphqlClient: GraphQLClient;

  before(() => {
    graphqlClient = createGraphQLClient(GRAPHQL_URL);
  });

  it('should create and fulfill a sale listing', async function() {
    this.timeout(40000);

    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }

    testLog('  Setting up test clients...');
    const sellerClients = createIsolatedTestClients(SUITE_NAME, 0, RPC_URL);
    const buyerClients = createIsolatedTestClients(SUITE_NAME, 1, RPC_URL);

    testLog(`  Seller: ${sellerClients.account}`);
    testLog(`  Buyer: ${buyerClients.account}`);

    // Create a project
    testLog('  Creating project...');
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

    testLog(`  Project created! Marketplace: ${projectDetails.marketplaceAddress}`);

    // Wait for indexer to sync
    const receipt = await sellerClients.publicClient.getTransactionReceipt({ hash });
    await waitForSync(graphqlClient, receipt.blockNumber, 15000);

    // Seller buys some tokens from the primary market
    testLog('  Seller buying tokens from primary market...');
    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    await buyProjectTokensChecked(
      sellerClients,
      assuranceContract,
      graphqlClient,
      {
        buyer: sellerClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [10n],
        totalCost: parseEther('0.1'),
      }
    );

    // Seller approves marketplace to transfer their tokens
    testLog('  Seller approving marketplace...');
    const approveHash = await approveERC1155ForMarketplace(
      sellerClients,
      projectDetails.tokenAddress,
      projectDetails.marketplaceAddress
    );

    // Seller creates a sale listing
    testLog('  Seller creating sale listing...');
    const marketplaceContract: SecondaryMarketContract = {
      address: projectDetails.marketplaceAddress,
      abi: SecondaryMarketAbi,
    };

    await createSaleListingChecked(
      sellerClients,
      marketplaceContract,
      graphqlClient,
      projectDetails.marketplaceAddress,
      {
        tokenId: 1n,
        count: 5n,
        pricePerToken: parseEther('0.015'), // 50% markup
      },
      0n
    );

    // Query the listing from indexer
    testLog('  Querying sale listing from indexer...');
    const listing = assertNotNull(
      await getSaleListing(graphqlClient, projectDetails.marketplaceAddress, 0n),
      'Sale listing'
    );

    testLog(`  Listing found! Price: ${listing.pricePerToken}, Count: ${listing.remainingCount}`);
    assert.strictEqual(listing.status, 'active', 'Listing should be active');
    assert.strictEqual(listing.seller.toLowerCase(), sellerClients.account.toLowerCase(), 'Seller should match');
    assert.strictEqual(listing.remainingCount, '5', 'Should have 5 tokens listed');
    assert.strictEqual(listing.pricePerToken, parseEther('0.015').toString(), 'Price should be 0.015 ETH');

    // Verify active listings query
    const activeListings = await getActiveSaleListings(graphqlClient, projectDetails.marketplaceAddress);
    assert(activeListings.length >= 1, 'Should have at least 1 active listing');
    const ourListing = activeListings.find(l => l.listingId === '0');
    assert.ok(ourListing, 'Should find our listing');

    // Buyer fulfills the sale listing (buys 3 tokens)
    testLog('  Buyer purchasing from sale listing...');
    await fulfillSaleListingChecked(
      buyerClients,
      marketplaceContract,
      graphqlClient,
      projectDetails.marketplaceAddress,
      {
        saleListingId: 0n,
        count: 3n,
        totalCost: parseEther('0.045'), // 3 * 0.015
      }
    );

    // Query updated listing
    const updatedListing = assertNotNull(
      await getSaleListing(graphqlClient, projectDetails.marketplaceAddress, 0n),
      'Updated listing'
    );

    testLog(`  Updated listing remaining count: ${updatedListing.remainingCount}`);
    assert.strictEqual(updatedListing.remainingCount, '2', 'Should have 2 tokens remaining');
    assert.strictEqual(updatedListing.status, 'active', 'Listing should still be active');

    // Query trades for this marketplace
    const trades = await getMarketplaceTrades(graphqlClient, projectDetails.marketplaceAddress);
    testLog(`  Found ${trades.length} trade(s) for this marketplace`);
    assert(trades.length >= 1, 'Should have at least 1 trade');

    // Find our trade (the one involving our buyer)
    const trade = trades.find(t => t.buyer.toLowerCase() === buyerClients.account.toLowerCase());
    assert.ok(trade, 'Should find our trade');
    assert.strictEqual(trade.buyer.toLowerCase(), buyerClients.account.toLowerCase(), 'Trade buyer should match');
    assert.strictEqual(trade.seller.toLowerCase(), sellerClients.account.toLowerCase(), 'Trade seller should match');
    assert.strictEqual(trade.count, '3', 'Trade count should be 3');
    assert.strictEqual(trade.orderType, 'sale_listing', 'Trade type should be sale_listing');

    testLog('  Sale listing test passed!');
  });

  it('should create and cancel a sale listing', async function() {
    this.timeout(40000);

    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }

    testLog('  Setting up for cancellation test...');
    const sellerClients = createIsolatedTestClients(SUITE_NAME, 2, RPC_URL);

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

    await buyProjectTokensChecked(sellerClients, assuranceContract, graphqlClient, {
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
    testLog('  Creating sale listing to cancel...');
    const marketplaceContract: SecondaryMarketContract = {
      address: projectDetails.marketplaceAddress,
      abi: SecondaryMarketAbi,
    };

    await createSaleListingChecked(
      sellerClients,
      marketplaceContract,
      graphqlClient,
      projectDetails.marketplaceAddress,
      {
        tokenId: 1n,
        count: 5n,
        pricePerToken: parseEther('0.02'),
      },
      0n
    );

    // Verify listing exists
    const listing = assertNotNull(
      await getSaleListing(graphqlClient, projectDetails.marketplaceAddress, 0n),
      'Listing before cancel'
    );
    assert.strictEqual(listing.status, 'active', 'Listing should be active');

    // Cancel the listing
    testLog('  Cancelling sale listing...');
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

    // Verify our listing is not in active listings
    const activeListings = await getActiveSaleListings(graphqlClient, projectDetails.marketplaceAddress);
    const ourActiveListing = activeListings.find(l => l.listingId === '0');
    assert.strictEqual(ourActiveListing, undefined, 'Our listing should not be in active listings');

    testLog('  Cancellation test passed!');
  });

  it('should create and fulfill a buy order', async function() {
    this.timeout(40000);

    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }

    testLog('  Setting up for buy order test...');
    const buyerClients = createIsolatedTestClients(SUITE_NAME, 3, RPC_URL);
    const sellerClients = createIsolatedTestClients(SUITE_NAME, 4, RPC_URL);

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

    await buyProjectTokensChecked(sellerClients, assuranceContract, graphqlClient, {
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
    testLog('  Buyer creating buy order...');
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
    testLog('  Seller fulfilling buy order...');
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

    // Query trades for this token
    const trades = await getTokenTrades(graphqlClient, projectDetails.marketplaceAddress, 1n);
    assert(trades.length >= 1, 'Should have at least 1 trade');

    // Find our trade (the one with our seller)
    const trade = trades.find(t => t.seller.toLowerCase() === sellerClients.account.toLowerCase());
    assert.ok(trade, 'Should find our trade');
    assert.strictEqual(trade.orderType, 'buy_order', 'Trade type should be buy_order');
    assert.strictEqual(trade.count, '2', 'Trade count should be 2');

    testLog('  Buy order test passed!');
  });

  it('should create and cancel a buy order', async function() {
    this.timeout(30000);

    if (!PUBSTARTER_ADDRESS) {
      throw new Error('PUBSTARTER_ADDRESS not set in environment');
    }

    testLog('  Setting up for buy order cancellation...');
    const buyerClients = createIsolatedTestClients(SUITE_NAME, 5, RPC_URL);
    const sellerClients = createIsolatedTestClients(SUITE_NAME, 6, RPC_URL);

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
    testLog('  Creating buy order to cancel...');
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
    testLog('  Cancelling buy order...');
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

    // Verify our order is not in active orders
    const activeOrders = await getActiveBuyOrders(graphqlClient, projectDetails.marketplaceAddress);
    const ourActiveOrder = activeOrders.find(o => o.orderId === '0');
    assert.strictEqual(ourActiveOrder, undefined, 'Our order should not be in active orders');

    testLog('  Buy order cancellation test passed!');
  });
});
