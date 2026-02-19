import { onchainTable, primaryKey, relations, index } from "ponder";

// ============================================================================
// FUNDING PORTAL INDEXER SCHEMA
// ============================================================================
// This subsystem handles cross-cutting views that join concepts, projects, and funding.
// It federates queries to other subsystems' GraphQL APIs (Concept Space, Pubstarter, Delegation).
// The Funding Portal indexer tracks:
// - Alignment attestations (linking subjects to statements)
// - Cached federated query results for performance
// - Aggregated contributor data across aligned projects
// ============================================================================

/**
 * Alignment attestations - tracks attestations that subjects (projects, users, etc.) align with statements
 * Created when AlignmentAttestation event is emitted
 *
 * The topicStatementId field allows indexers to filter attestations by topic.
 * Every attestation must explicitly declare its topic (topicStatementId cannot be zero).
 * This enables the no-need-to-coordinate benefit: different topics can be linked via implication attestations.
 */
export const alignmentAttestations = onchainTable(
  "fundingportal_alignment_attestations",
  (t) => ({
    // Composite key: attester + subject + statement
    attester: t.hex().notNull(),
    subjectAddress: t.hex().notNull(),
    // IPFS CIDv1 of the statement
    statementId: t.text().notNull(),
    // Topic for indexer filtering (must be non-zero, IPFS CIDv1)
    topicStatementId: t.text().notNull(),
    // When attested
    createdAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({
      columns: [table.attester, table.subjectAddress, table.statementId],
    }),
    // Index for finding all subjects aligned with a statement (by attester)
    statementIdx: index().on(table.statementId, table.attester),
    // Index for finding all statements a subject is aligned with
    subjectIdx: index().on(table.subjectAddress, table.attester),
    // Index for finding all alignments by an attester
    attesterIdx: index().on(table.attester),
    // Index for filtering by topic
    topicIdx: index().on(table.topicStatementId),
  })
);

// Funding Portal Relations

export const alignmentAttestationsRelations = relations(alignmentAttestations, ({ one }) => ({
  // Note: We don't create foreign key relations to other subsystems
  // because they're logically separate. The Funding Portal federates
  // queries to other subsystems' GraphQL APIs instead.
}));
