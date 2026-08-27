/**
 * Conceptspace queries — event cache + folds (no GraphQL).
 *
 * Implementation is split under `queries/`; this module re-exports the public
 * surface so callers keep importing `@commonality/sdk/conceptspace`.
 */
export { getStatement, getUserBelief } from './queries/statements.js';
export { getImplicationsFrom, getImplicationsTo, getImplication } from './queries/implications.js';
export {
  getIndirectSupporters,
  getStatementBelieverSets,
  getStatementSupportTieredHeadCount,
  getIndirectSupporterCount,
  getImplicationSourceActivity,
  type StatementBelieverSets,
  type ImplicationSourceActivity,
} from './queries/indirect-support.js';
export {
  browseStatementsByMostSupporters,
  browseStatementsByNewest,
  browseStatements,
  getAllStatements,
  getUserBeliefs,
  getUserDisbeliefs,
  getStatementSuggestions,
  type StatementSuggestion,
} from './queries/browse.js';
export { getStatementWithContent, getUserIndirectSupport } from './queries/composite.js';
