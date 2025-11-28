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
  contributor: string;
  projectId: string;
  tokenId: string;
  amount: string;
  totalCost: string;
  timestamp: string;
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
      query GetProjectContributions($projectId: String!) {
        contributionss(where: { projectId: $projectId }) {
          items {
            id
            contributor
            projectId
            tokenId
            amount
            totalCost
            timestamp
          }
        }
      }
    `,
    { projectId: assuranceContractAddress.toLowerCase() }
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
      query GetUserContributions($contributor: String!) {
        contributionss(where: { contributor: $contributor }) {
          items {
            id
            contributor
            projectId
            tokenId
            amount
            totalCost
            timestamp
          }
        }
      }
    `,
    { contributor: userAddress.toLowerCase() }
  );

  return result.contributionss?.items || [];
}
