/**
 * Main Indexer Entry Point
 *
 * This file imports all logical indexer subsystems to register their
 * Ponder event handlers.
 *
 * Subsystems:
 * - Concept Space: Statements, beliefs, and implications
 * - Pubstarter: Crowdfunding projects, contributions, and markets
 * - Delegation: Delegatable notes and delegation chains
 * - Funding Portal: Project alignments and cross-cutting views
 */

// Import subsystem event handlers to register them with Ponder
import "./conceptspace";
import "./pubstarter";
import "./delegation";
import "./fundingportal";
