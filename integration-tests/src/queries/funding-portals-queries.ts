/**
 * GraphQL queries for Funding Portals subsystem (ProjectAlignment)
 */

import { query, type GraphQLClient } from './common.js';

// ============================================================================
// ProjectAlignment Queries (Funding Portals)
// ============================================================================

export interface ProjectAlignment {
  attester: string;
  projectAddress: string;
  statementId: string;
  createdAt: string;
  blockNumber: string;
}

/**
 * Get all project alignments for a specific statement (by attester if provided)
 */
export async function getAlignedProjects(
  client: GraphQLClient,
  statementId: string,
  attesterAddress?: string
): Promise<ProjectAlignment[]> {
  if (attesterAddress) {
    const result = await query<{ projectAlignmentss: { items: ProjectAlignment[] } }>(
      client,
      `
        query GetAlignedProjects($statementId: String!, $attester: String!) {
          projectAlignmentss(where: { statementId: $statementId, attester: $attester }) {
            items {
              attester
              projectAddress
              statementId
              createdAt
              blockNumber
            }
          }
        }
      `,
      { statementId: statementId.toLowerCase(), attester: attesterAddress.toLowerCase() }
    );
    return result.projectAlignmentss?.items || [];
  } else {
    const result = await query<{ projectAlignmentss: { items: ProjectAlignment[] } }>(
      client,
      `
        query GetAlignedProjects($statementId: String!) {
          projectAlignmentss(where: { statementId: $statementId }) {
            items {
              attester
              projectAddress
              statementId
              createdAt
              blockNumber
            }
          }
        }
      `,
      { statementId: statementId.toLowerCase() }
    );
    return result.projectAlignmentss?.items || [];
  }
}

/**
 * Get all statement alignments for a specific project (by attester if provided)
 */
export async function getProjectStatements(
  client: GraphQLClient,
  projectAddress: string,
  attesterAddress?: string
): Promise<ProjectAlignment[]> {
  if (attesterAddress) {
    const result = await query<{ projectAlignmentss: { items: ProjectAlignment[] } }>(
      client,
      `
        query GetProjectStatements($projectAddress: String!, $attester: String!) {
          projectAlignmentss(where: { projectAddress: $projectAddress, attester: $attester }) {
            items {
              attester
              projectAddress
              statementId
              createdAt
              blockNumber
            }
          }
        }
      `,
      { projectAddress: projectAddress.toLowerCase(), attester: attesterAddress.toLowerCase() }
    );
    return result.projectAlignmentss?.items || [];
  } else {
    const result = await query<{ projectAlignmentss: { items: ProjectAlignment[] } }>(
      client,
      `
        query GetProjectStatements($projectAddress: String!) {
          projectAlignmentss(where: { projectAddress: $projectAddress }) {
            items {
              attester
              projectAddress
              statementId
              createdAt
              blockNumber
            }
          }
        }
      `,
      { projectAddress: projectAddress.toLowerCase() }
    );
    return result.projectAlignmentss?.items || [];
  }
}

/**
 * Get a specific project alignment attestation
 */
export async function getProjectAlignment(
  client: GraphQLClient,
  attesterAddress: string,
  projectAddress: string,
  statementId: string
): Promise<ProjectAlignment | null> {
  const result = await query<{ projectAlignments: ProjectAlignment | null }>(
    client,
    `
      query GetProjectAlignment($attester: String!, $projectAddress: String!, $statementId: String!) {
        projectAlignments(
          attester: $attester,
          projectAddress: $projectAddress,
          statementId: $statementId
        ) {
          attester
          projectAddress
          statementId
          createdAt
          blockNumber
        }
      }
    `,
    {
      attester: attesterAddress.toLowerCase(),
      projectAddress: projectAddress.toLowerCase(),
      statementId: statementId.toLowerCase()
    }
  );

  return result.projectAlignments;
}

/**
 * Get all alignments by a specific attester
 */
export async function getAlignmentsByAttester(
  client: GraphQLClient,
  attesterAddress: string
): Promise<ProjectAlignment[]> {
  const result = await query<{ projectAlignmentss: { items: ProjectAlignment[] } }>(
    client,
    `
      query GetAlignmentsByAttester($attester: String!) {
        projectAlignmentss(where: { attester: $attester }) {
          items {
            attester
            projectAddress
            statementId
            createdAt
            blockNumber
          }
        }
      }
    `,
    { attester: attesterAddress.toLowerCase() }
  );

  return result.projectAlignmentss?.items || [];
}
