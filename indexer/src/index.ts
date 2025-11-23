/**
 * Main Indexer Entry Point
 *
 * This file imports all logical indexer subsystems to register their
 * Ponder event handlers.
 *
 * Subsystems:
 * - Concept Space: Statements, beliefs, and implications
 * - Pubstarter: Crowdfunding projects, contributions, and markets
 */

// Import subsystem event handlers to register them with Ponder
import "./conceptspace";
import "./pubstarter";
