/**
 * Main Indexer Entry Point
 *
 * Registers Ponder event handlers for all contracts.
 * All handlers live in events-cache — they capture raw events and
 * update lightweight registry tables. Business logic lives in the SDK.
 */

import "./events-cache";
