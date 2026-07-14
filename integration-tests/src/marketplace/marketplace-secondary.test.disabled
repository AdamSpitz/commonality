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
import { ProjectFactoryAbi, AssuranceContractAbi, ERC1155SecondaryMarketAbi as SecondaryMarketAbi } from '@commonality/sdk/abis';
import { waitForIndexerToSyncToTxHash } from '@commonality/sdk/indexer-sync';
import { cancelSaleListing, createBuyOrder, fulfillBuyOrder, cancelBuyOrder, approveERC1155ForMarketplace, type ProjectFactoryContract, type AssuranceContract, type SecondaryMarketContract } from '@commonality/sdk/lazy-giving';
import { uploadToIPFS } from '@commonality/sdk/utils';
import { parseUnits, type Address } from 'viem';
import { getSaleListing, getActiveSaleListings, getBuyOrder, getActiveBuyOrders, getMarketplaceTrades, getTokenTrades } from '@commonality/sdk/lazy-giving';
import { testLog, createIsolatedWriteClients } from '../utils/setup.js';
import { buyProjectTokensChecked, createProjectChecked } from '../actions/funding-actions-checked.js';
import { createSaleListingChecked, fulfillSaleListingChecked } from './marketplace-actions-checked.js';
import { ActionTestingMachinery, createActionTestingMachinery } from '../actions/action-machinery.js';



describe('Secondary Marketplace Integration Tests', () => {
  // Test configuration
  const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
  const PROJECT_FACTORY_ADDRESS = process.env.PROJECT_FACTORY_ADDRESS as Address;

  // Test suite name for unique account derivation
  const SUITE_NAME = 'marketplace-secondary';

  let machinery: ActionTestingMachinery;

  before(() => {
    machinery = createActionTestingMachinery();
  });

  it('should create and fulfill a sale listing', async function() {
    this.timeout(40000);

    if (!PROJECT_FACTORY_ADDRESS) {
      throw new Error('PROJECT_FACTORY_ADDRESS not set in environment');
    }

    testLog('  Setting up test clients...');
    const sellerClients = createIsolatedWriteClients(SUITE_NAME, 0, RPC_URL);
    const buyerClients = createIsolatedWriteClients(SUITE_NAME, 1, RPC_URL);

    testLog(`  Seller: ${sellerClients.account}`);
    testLog(`  Buyer: ${buyerClients.account}`);

    // Create a project
    testLog('  Creating project...');
    const projectMetadataCid = await uploadToIPFS(machinery.ipfsConfig, {
      title: 'Secondary Market Test Project',
    });

    const projectFactoryContract: ProjectFactoryContract = {
      address: PROJECT_FACTORY_ADDRESS,
      abi: ProjectFactoryAbi,
    };

    const { projectDetails } = await createProjectChecked(
      sellerClients,
      projectFactoryContract,
      machinery,
      {
        metadataURI: 'https://example.com/metadata/',
        contractURI: 'https://example.com/contract',
        owner: sellerClients.account,
        recipient: sellerClients.account,
        threshold: parseUnits('1.0', 6),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid,
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseUnits('0.01', 6)],
      }
    );

    testLog('  ✓ Project creation properties verified');
    testLog(`  Marketplace: ${projectDetails.marketplaceAddress}`);

    // Seller buys some tokens from the primary market
    testLog('  Seller buying tokens from primary market...');
    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    await buyProjectTokensChecked(
      sellerClients,
      assuranceContract,
      machinery,
      {
        buyer: sellerClients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [1n],
        tokenCounts: [10n],
        totalCost: parseUnits('0.1', 6),
      }
    );

    // Seller approves marketplace to transfer their tokens
    testLog('  Seller approving marketplace...');
    await approveERC1155ForMarketplace(
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
      machinery,
      projectDetails.marketplaceAddress,
      {
        tokenId: 1n,
        count: 5n,
        pricePerToken: parseUnits('0.015', 6), // 50% markup
      },
      0n
    );

    // Query the listing from indexer
    testLog('  Querying sale listing from indexer...');
    const listing = await getSaleListing(machinery, projectDetails.marketplaceAddress, 0n);
    assert.ok(listing, 'Sale listing');

    testLog(`  Listing found! Price: ${listing.pricePerToken}, Count: ${listing.remainingCount}`);
    assert.strictEqual(listing.status, 'active', 'Listing should be active');
    assert.strictEqual(listing.seller.toLowerCase(), sellerClients.account.toLowerCase(), 'Seller should match');
    assert.strictEqual(listing.remainingCount, '5', 'Should have 5 tokens listed');
    assert.strictEqual(listing.pricePerToken, parseUnits('0.015', 6).toString(), 'Price should be 0.015 ETH');

    // Verify active listings query
    const activeListings = await getActiveSaleListings(machinery, projectDetails.marketplaceAddress);
    assert(activeListings.length >= 1, 'Should have at least 1 active listing');
    const ourListing = activeListings.find(l => l.listingId === '0');
    assert.ok(ourListing, 'Should find our listing');

    // Buyer fulfills the sale listing (buys 3 tokens)
    testLog('  Buyer purchasing from sale listing...');
    await fulfillSaleListingChecked(
      buyerClients,
      marketplaceContract,
      machinery,
      projectDetails.marketplaceAddress,
      {
        saleListingId: 0n,
        count: 3n,
        totalCost: parseUnits('0.045', 6), // 3 * 0.015
        expectedPricePerToken: parseUnits('0.015', 6),
      }
    );

    // Query updated listing
    const updatedListing = await getSaleListing(machinery, projectDetails.marketplaceAddress, 0n);
    assert.ok(updatedListing, 'Updated listing');

    testLog(`  Updated listing remaining count: ${updatedListing.remainingCount}`);
    assert.strictEqual(updatedListing.remainingCount, '2', 'Should have 2 tokens remaining');
    assert.strictEqual(updatedListing.status, 'active', 'Listing should still be active');

    // Query trades for this marketplace
    const trades = await getMarketplaceTrades(machinery, projectDetails.marketplaceAddress);
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

    if (!PROJECT_FACTORY_ADDRESS) {
      throw new Error('PROJECT_FACTORY_ADDRESS not set in environment');
    }

    testLog('  Setting up for cancellation test...');
    const sellerClients = createIsolatedWriteClients(SUITE_NAME, 2, RPC_URL);

    // Create a project
    const projectMetadataCid = await uploadToIPFS(machinery.ipfsConfig, { title: 'Cancel Test Project' });
    const projectFactoryContract: ProjectFactoryContract = {
      address: PROJECT_FACTORY_ADDRESS,
      abi: ProjectFactoryAbi,
    };

    const { projectDetails } = await createProjectChecked(
      sellerClients,
      projectFactoryContract,
      machinery,
      {
        metadataURI: 'https://example.com/metadata/',
        contractURI: 'https://example.com/contract',
        owner: sellerClients.account,
        recipient: sellerClients.account,
        threshold: parseUnits('1.0', 6),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid,
        tokenIds: [1n],
        tokenCounts: [50n],
        tokenPrices: [parseUnits('0.01', 6)],
      }
    );

    testLog('  ✓ Project creation properties verified');

    // Buy and approve tokens
    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    await buyProjectTokensChecked(sellerClients, assuranceContract, machinery, {
      buyer: sellerClients.account,
      tokenAddress: projectDetails.tokenAddress,
      tokenIds: [1n],
      tokenCounts: [10n],
      totalCost: parseUnits('0.1', 6),
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
      machinery,
      projectDetails.marketplaceAddress,
      {
        tokenId: 1n,
        count: 5n,
        pricePerToken: parseUnits('0.02', 6),
      },
      0n
    );

    // Verify listing exists
    const listing = await getSaleListing(machinery, projectDetails.marketplaceAddress, 0n);
    assert.ok(listing, 'Listing before cancel');
    assert.strictEqual(listing.status, 'active', 'Listing should be active');

    // Cancel the listing
    testLog('  Cancelling sale listing...');
    const cancelHash = await cancelSaleListing(
      sellerClients,
      marketplaceContract,
      { saleListingId: 0n }
    );

    await waitForIndexerToSyncToTxHash(machinery, sellerClients.publicClient, cancelHash);

    // Verify listing is cancelled
    const cancelledListing = await getSaleListing(machinery, projectDetails.marketplaceAddress, 0n);
    assert.ok(cancelledListing, 'Listing after cancel');
    assert.strictEqual(cancelledListing.status, 'cancelled', 'Listing should be cancelled');

    // Verify our listing is not in active listings
    const activeListings = await getActiveSaleListings(machinery, projectDetails.marketplaceAddress);
    const ourActiveListing = activeListings.find(l => l.listingId === '0');
    assert.strictEqual(ourActiveListing, undefined, 'Our listing should not be in active listings');

    testLog('  Cancellation test passed!');
  });

  it('should create and fulfill a buy order', async function() {
    this.timeout(40000);

    if (!PROJECT_FACTORY_ADDRESS) {
      throw new Error('PROJECT_FACTORY_ADDRESS not set in environment');
    }

    testLog('  Setting up for buy order test...');
    const buyerClients = createIsolatedWriteClients(SUITE_NAME, 3, RPC_URL);
    const sellerClients = createIsolatedWriteClients(SUITE_NAME, 4, RPC_URL);

    // Create a project
    const projectMetadataCid = await uploadToIPFS(machinery.ipfsConfig, { title: 'Buy Order Test Project' });
    const projectFactoryContract: ProjectFactoryContract = {
      address: PROJECT_FACTORY_ADDRESS,
      abi: ProjectFactoryAbi,
    };

    const { projectDetails } = await createProjectChecked(
      sellerClients,
      projectFactoryContract,
      machinery,
      {
        metadataURI: 'https://example.com/metadata/',
        contractURI: 'https://example.com/contract',
        owner: sellerClients.account,
        recipient: sellerClients.account,
        threshold: parseUnits('1.0', 6),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid,
        tokenIds: [1n],
        tokenCounts: [100n],
        tokenPrices: [parseUnits('0.01', 6)],
      }
    );

    testLog('  ✓ Project creation properties verified');

    // Seller buys tokens from primary market
    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    };

    await buyProjectTokensChecked(sellerClients, assuranceContract, machinery, {
      buyer: sellerClients.account,
      tokenAddress: projectDetails.tokenAddress,
      tokenIds: [1n],
      tokenCounts: [10n],
      totalCost: parseUnits('0.1', 6),
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
        pricePerToken: parseUnits('0.012', 6),
      }
    );

    await waitForIndexerToSyncToTxHash(machinery, buyerClients.publicClient, orderHash);

    // Query the buy order
    const buyOrder = await getBuyOrder(machinery, projectDetails.marketplaceAddress, 0n);
    assert.ok(buyOrder, 'Buy order');

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
        expectedPricePerToken: parseUnits('0.012', 6),
      }
    );

    await waitForIndexerToSyncToTxHash(machinery, sellerClients.publicClient, fulfillHash);

    // Query updated buy order
    const updatedOrder = await getBuyOrder(machinery, projectDetails.marketplaceAddress, 0n);
    assert.ok(updatedOrder, 'Updated buy order');

    assert.strictEqual(updatedOrder.remainingCount, '2', 'Should have 2 tokens remaining');
    assert.strictEqual(updatedOrder.status, 'active', 'Order should still be active');

    // Query trades for this token
    const trades = await getTokenTrades(machinery, projectDetails.marketplaceAddress, 1n);
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

    if (!PROJECT_FACTORY_ADDRESS) {
      throw new Error('PROJECT_FACTORY_ADDRESS not set in environment');
    }

    testLog('  Setting up for buy order cancellation...');
    const buyerClients = createIsolatedWriteClients(SUITE_NAME, 5, RPC_URL);
    const sellerClients = createIsolatedWriteClients(SUITE_NAME, 6, RPC_URL);

    // Create a project
    const projectMetadataCid = await uploadToIPFS(machinery.ipfsConfig, { title: 'Cancel Buy Order Test' });
    const projectFactoryContract: ProjectFactoryContract = {
      address: PROJECT_FACTORY_ADDRESS,
      abi: ProjectFactoryAbi,
    };

    const { projectDetails } = await createProjectChecked(
      sellerClients,
      projectFactoryContract,
      machinery,
      {
        metadataURI: 'https://example.com/metadata/',
        contractURI: 'https://example.com/contract',
        owner: sellerClients.account,
        recipient: sellerClients.account,
        threshold: parseUnits('1.0', 6),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        projectMetadataCid,
        tokenIds: [1n],
        tokenCounts: [50n],
        tokenPrices: [parseUnits('0.01', 6)],
      }
    );

    testLog('  ✓ Project creation properties verified');

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
        pricePerToken: parseUnits('0.015', 6),
      }
    );

    await waitForIndexerToSyncToTxHash(machinery, buyerClients.publicClient, orderHash);

    // Verify order exists
    const order = await getBuyOrder(machinery, projectDetails.marketplaceAddress, 0n);
    assert.ok(order, 'Buy order before cancel');
    assert.strictEqual(order.status, 'active', 'Order should be active');

    // Cancel the order
    testLog('  Cancelling buy order...');
    const cancelHash = await cancelBuyOrder(
      buyerClients,
      marketplaceContract,
      { buyOrderId: 0n }
    );

    await waitForIndexerToSyncToTxHash(machinery, buyerClients.publicClient, cancelHash);

    // Verify order is cancelled
    const cancelledOrder = await getBuyOrder(machinery, projectDetails.marketplaceAddress, 0n);
    assert.ok(cancelledOrder, 'Buy order after cancel');
    assert.strictEqual(cancelledOrder.status, 'cancelled', 'Order should be cancelled');

    // Verify our order is not in active orders
    const activeOrders = await getActiveBuyOrders(machinery, projectDetails.marketplaceAddress);
    const ourActiveOrder = activeOrders.find(o => o.orderId === '0');
    assert.strictEqual(ourActiveOrder, undefined, 'Our order should not be in active orders');

    testLog('  Buy order cancellation test passed!');
  });
});
