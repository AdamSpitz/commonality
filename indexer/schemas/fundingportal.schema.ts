import { onchainTable, primaryKey, relations, index } from "ponder";

// ============================================================================
// FUNDING PORTAL INDEXER SCHEMA
// ============================================================================
// This subsystem handles cross-cutting views that join concepts, projects, and funding.
// It federates queries to other subsystems' GraphQL APIs (Concept Space, Pubstarter, Delegation).
// The Funding Portal indexer tracks:
// - Project alignment attestations (linking projects to statements)
// - Cached federated query results for performance
// - Aggregated contributor data across aligned projects
// ============================================================================

/**
 * Project alignments - tracks attestations that projects align with statements
 * Created when ProjectAlignmentAttestation event is emitted
 *
 * The topicStatementId field allows indexers to filter attestations by topic.
 * For project-alignment attestations, use a known hardcoded statement that says
 * "this is for project alignment attestations". This enables the no-need-to-coordinate
 * benefit: different topics can be linked via implication attestations.
 */
export const projectAlignments = onchainTable(
  "fundingportal_project_alignments",
  (t) => ({
    // Composite key: attester + project + statement
    attester: t.hex().notNull(),
    projectAddress: t.hex().notNull(),
    statementId: t.hex().notNull(),
    // Topic for indexer filtering (can be 0x0 for no topic)
    topicStatementId: t.hex().notNull(),
    // When attested
    createdAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({
      columns: [table.attester, table.projectAddress, table.statementId],
    }),
    // Index for finding all projects aligned with a statement (by attester)
    statementIdx: index().on(table.statementId, table.attester),
    // Index for finding all statements a project is aligned with
    projectIdx: index().on(table.projectAddress, table.attester),
    // Index for finding all alignments by an attester
    attesterIdx: index().on(table.attester),
    // Index for filtering by topic
    topicIdx: index().on(table.topicStatementId),
  })
);

// Funding Portal Relations

export const projectAlignmentsRelations = relations(projectAlignments, ({ one }) => ({
  // Note: We don't create foreign key relations to other subsystems
  // because they're logically separate. The Funding Portal federates
  // queries to other subsystems' GraphQL APIs instead.
}));
