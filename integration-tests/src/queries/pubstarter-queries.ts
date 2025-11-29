/**
 * GraphQL queries for Pubstarter subsystem
 */

import { query, type GraphQLClient } from './common.js';

// ============================================================================
// Pubstarter Queries
// ============================================================================

export interface Project {
  id: string;
  erc1155Address: string;
  recipient: string;
  threshold: string;
  deadline: string;
  totalReceived: string;
  metadataCid?: string;
}

export interface ProjectToken {
  id: string;
  projectId: string;
  tokenId: string;
  price: string;
  totalSupply: string;
}

export interface Contribution {
  id: string;
  participant: string;
  projectAddress: string;
  erc1155Address: string;
  tokenIds: string; // JSON array
  tokenCounts: string; // JSON array
  totalCost: string;
  createdAt: string;
  blockNumber: string;
  transactionHash: string;
}

/**
 * Get project by assurance contract address (which is the project id)
 */
export async function getProject(
  client: GraphQLClient,
  assuranceContractAddress: string
): Promise<Project | null> {
  const result = await query<{ projects: Project | null }>(
    client,
    `
      query GetProject($id: String!) {
        projects(id: $id) {
          id
          erc1155Address
          recipient
          threshold
          deadline
          totalReceived
          metadataCid
        }
      }
    `,
    { id: assuranceContractAddress.toLowerCase() }
  );

  return result.projects;
}

/**
 * Get all projects
 */
export async function getAllProjects(
  client: GraphQLClient
): Promise<Project[]> {
  const result = await query<{ projectss: { items: Project[] } }>(
    client,
    `
      query GetAllProjects {
        projectss {
          items {
            id
            erc1155Address
            recipient
            threshold
            deadline
            totalReceived
            metadataCid
          }
        }
      }
    `
  );

  return result.projectss?.items || [];
}

/**
 * Get project tokens for a project
 */
export async function getProjectTokens(
  client: GraphQLClient,
  assuranceContractAddress: string
): Promise<ProjectToken[]> {
  const result = await query<{ projectTokenss: { items: ProjectToken[] } }>(
    client,
    `
      query GetProjectTokens($projectId: String!) {
        projectTokenss(where: { projectId: $projectId }) {
          items {
            id
            projectId
            tokenId
            price
            totalSupply
          }
        }
      }
    `,
    { projectId: assuranceContractAddress.toLowerCase() }
  );

  return result.projectTokenss?.items || [];
}

/**
 * Get contributions for a project
 */
export async function getProjectContributions(
  client: GraphQLClient,
  assuranceContractAddress: string
): Promise<Contribution[]> {
  const result = await query<{ contributionss: { items: Contribution[] } }>(
    client,
    `
      query GetProjectContributions($projectAddress: String!) {
        contributionss(where: { projectAddress: $projectAddress }) {
          items {
            id
            participant
            projectAddress
            erc1155Address
            tokenIds
            tokenCounts
            totalCost
            createdAt
            blockNumber
            transactionHash
          }
        }
      }
    `,
    { projectAddress: assuranceContractAddress.toLowerCase() }
  );

  return result.contributionss?.items || [];
}

/**
 * Get contributions by a specific user
 */
export async function getUserContributions(
  client: GraphQLClient,
  userAddress: string
): Promise<Contribution[]> {
  const result = await query<{ contributionss: { items: Contribution[] } }>(
    client,
    `
      query GetUserContributions($participant: String!) {
        contributionss(where: { participant: $participant }) {
          items {
            id
            participant
            projectAddress
            erc1155Address
            tokenIds
            tokenCounts
            totalCost
            createdAt
            blockNumber
            transactionHash
          }
        }
      }
    `,
    { participant: userAddress.toLowerCase() }
  );

  return result.contributionss?.items || [];
}

// ============================================================================
// Secondary Market Queries
// ============================================================================

export interface SaleListing {
  marketplaceAddress: string;
  listingId: string;
  seller: string;
  tokenId: string;
  originalCount: string;
  remainingCount: string;
  pricePerToken: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BuyOrder {
  marketplaceAddress: string;
  orderId: string;
  buyer: string;
  tokenId: string;
  originalCount: string;
  remainingCount: string;
  pricePerToken: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Trade {
  id: string;
  marketplaceAddress: string;
  orderType: string;
  orderId: string;
  buyer: string;
  seller: string;
  tokenId: string;
  count: string;
  pricePerToken: string;
  totalPrice: string;
  createdAt: string;
  blockNumber: string;
  transactionHash: string;
}

/**
 * Get a specific sale listing by marketplace and listing ID
 */
export async function getSaleListing(
  client: GraphQLClient,
  marketplaceAddress: string,
  listingId: bigint
): Promise<SaleListing | null> {
  const result = await query<{ saleListingss: { items: SaleListing[] } }>(
    client,
    `
      query GetSaleListing($marketplaceAddress: String!, $listingId: BigInt!) {
        saleListingss(where: {
          marketplaceAddress: $marketplaceAddress,
          listingId: $listingId
        }) {
          items {
            marketplaceAddress
            listingId
            seller
            tokenId
            originalCount
            remainingCount
            pricePerToken
            status
            createdAt
            updatedAt
          }
        }
      }
    `,
    {
      marketplaceAddress: marketplaceAddress.toLowerCase(),
      listingId: listingId.toString()
    }
  );

  return result.saleListingss?.items[0] || null;
}

/**
 * Get all active sale listings for a marketplace
 */
export async function getActiveSaleListings(
  client: GraphQLClient,
  marketplaceAddress: string
): Promise<SaleListing[]> {
  const result = await query<{ saleListingss: { items: SaleListing[] } }>(
    client,
    `
      query GetActiveSaleListings($marketplaceAddress: String!) {
        saleListingss(where: {
          marketplaceAddress: $marketplaceAddress,
          status: "active"
        }) {
          items {
            marketplaceAddress
            listingId
            seller
            tokenId
            originalCount
            remainingCount
            pricePerToken
            status
            createdAt
            updatedAt
          }
        }
      }
    `,
    { marketplaceAddress: marketplaceAddress.toLowerCase() }
  );

  return result.saleListingss?.items || [];
}

/**
 * Get a specific buy order by marketplace and order ID
 */
export async function getBuyOrder(
  client: GraphQLClient,
  marketplaceAddress: string,
  orderId: bigint
): Promise<BuyOrder | null> {
  const result = await query<{ buyOrderss: { items: BuyOrder[] } }>(
    client,
    `
      query GetBuyOrder($marketplaceAddress: String!, $orderId: BigInt!) {
        buyOrderss(where: {
          marketplaceAddress: $marketplaceAddress,
          orderId: $orderId
        }) {
          items {
            marketplaceAddress
            orderId
            buyer
            tokenId
            originalCount
            remainingCount
            pricePerToken
            status
            createdAt
            updatedAt
          }
        }
      }
    `,
    {
      marketplaceAddress: marketplaceAddress.toLowerCase(),
      orderId: orderId.toString()
    }
  );

  return result.buyOrderss?.items[0] || null;
}

/**
 * Get all active buy orders for a marketplace
 */
export async function getActiveBuyOrders(
  client: GraphQLClient,
  marketplaceAddress: string
): Promise<BuyOrder[]> {
  const result = await query<{ buyOrderss: { items: BuyOrder[] } }>(
    client,
    `
      query GetActiveBuyOrders($marketplaceAddress: String!) {
        buyOrderss(where: {
          marketplaceAddress: $marketplaceAddress,
          status: "active"
        }) {
          items {
            marketplaceAddress
            orderId
            buyer
            tokenId
            originalCount
            remainingCount
            pricePerToken
            status
            createdAt
            updatedAt
          }
        }
      }
    `,
    { marketplaceAddress: marketplaceAddress.toLowerCase() }
  );

  return result.buyOrderss?.items || [];
}

/**
 * Get all trades for a marketplace
 */
export async function getMarketplaceTrades(
  client: GraphQLClient,
  marketplaceAddress: string
): Promise<Trade[]> {
  const result = await query<{ tradess: { items: Trade[] } }>(
    client,
    `
      query GetMarketplaceTrades($marketplaceAddress: String!) {
        tradess(where: { marketplaceAddress: $marketplaceAddress }) {
          items {
            id
            marketplaceAddress
            orderType
            orderId
            buyer
            seller
            tokenId
            count
            pricePerToken
            totalPrice
            createdAt
            blockNumber
            transactionHash
          }
        }
      }
    `,
    { marketplaceAddress: marketplaceAddress.toLowerCase() }
  );

  return result.tradess?.items || [];
}

/**
 * Get trades for a specific token
 */
export async function getTokenTrades(
  client: GraphQLClient,
  marketplaceAddress: string,
  tokenId: bigint
): Promise<Trade[]> {
  const result = await query<{ tradess: { items: Trade[] } }>(
    client,
    `
      query GetTokenTrades($marketplaceAddress: String!, $tokenId: BigInt!) {
        tradess(where: {
          marketplaceAddress: $marketplaceAddress,
          tokenId: $tokenId
        }) {
          items {
            id
            marketplaceAddress
            orderType
            orderId
            buyer
            seller
            tokenId
            count
            pricePerToken
            totalPrice
            createdAt
            blockNumber
            transactionHash
          }
        }
      }
    `,
    {
      marketplaceAddress: marketplaceAddress.toLowerCase(),
      tokenId: tokenId.toString()
    }
  );

  return result.tradess?.items || [];
}
