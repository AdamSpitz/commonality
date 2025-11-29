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

// ============================================================================
// Indirect Alignment Queries (via Implication Graph)
// ============================================================================

export interface IndirectProjectAlignment {
  projectAddress: string;
  directStatementId: string; // Statement the project is directly aligned with
  indirectStatementId: string; // Statement we queried for (implied by directStatementId)
  attester: string;
}

/**
 * Get projects that are indirectly aligned with a statement via the implication graph.
 *
 * A project is indirectly aligned with statement S2 if:
 * - The project is directly aligned with statement S1
 * - S1 implies S2 (according to a trusted attester)
 *
 * @param client GraphQL client
 * @param statementId The statement to find indirectly aligned projects for
 * @param trustedImplicationAttester Optional: filter implications by this attester
 * @param trustedAlignmentAttester Optional: filter alignments by this attester
 */
export async function getIndirectlyAlignedProjects(
  client: GraphQLClient,
  statementId: string,
  trustedImplicationAttester?: string,
  trustedAlignmentAttester?: string
): Promise<IndirectProjectAlignment[]> {
  // Step 1: Find all statements that imply the target statement
  const implicationsResult = trustedImplicationAttester
    ? await query<{ implicationss: { items: Array<{ fromStatementId: string; attester: { id: string } }> } }>(
        client,
        `
          query GetImplicationsTo($toStatementId: String!, $attester: String!) {
            implicationss(where: { toStatementId: $toStatementId, attester: $attester }) {
              items {
                fromStatementId
                attester {
                  id
                }
              }
            }
          }
        `,
        { toStatementId: statementId.toLowerCase(), attester: trustedImplicationAttester.toLowerCase() }
      )
    : await query<{ implicationss: { items: Array<{ fromStatementId: string; attester: { id: string } }> } }>(
        client,
        `
          query GetImplicationsTo($toStatementId: String!) {
            implicationss(where: { toStatementId: $toStatementId }) {
              items {
                fromStatementId
                attester {
                  id
                }
              }
            }
          }
        `,
        { toStatementId: statementId.toLowerCase() }
      );

  const implications = implicationsResult.implicationss?.items || [];

  if (implications.length === 0) {
    return [];
  }

  // Step 2: For each implying statement, find projects aligned with it
  const indirectAlignments: IndirectProjectAlignment[] = [];

  for (const implication of implications) {
    const alignments = await getAlignedProjects(
      client,
      implication.fromStatementId,
      trustedAlignmentAttester
    );

    for (const alignment of alignments) {
      indirectAlignments.push({
        projectAddress: alignment.projectAddress,
        directStatementId: implication.fromStatementId,
        indirectStatementId: statementId,
        attester: alignment.attester,
      });
    }
  }

  return indirectAlignments;
}
