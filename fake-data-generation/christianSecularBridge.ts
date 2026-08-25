import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { SeedCollection } from './seed-content-format.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const CHRISTIAN_SECULAR_BRIDGE_COLLECTION_ID = 'christian-secular-bridge';

export function loadChristianSecularBridgeCollection(): SeedCollection {
  const raw = readFileSync(join(__dirname, 'seed-content', 'christian-secular-bridge.json'), 'utf8');
  return JSON.parse(raw) as SeedCollection;
}

export function bridgeStatement(groupId: string, statementId: string): { id: string; groupId: string; statementId: string; text: string } {
  const collection = loadChristianSecularBridgeCollection();
  const group = collection.groups.find((candidate) => candidate.id === groupId);
  const statement = group?.statements.find((candidate) => candidate.id === statementId);
  if (!group || !statement) {
    throw new Error(`Missing ${collection.id}/${groupId}/${statementId}`);
  }
  return {
    id: `${groupId}/${statementId}`,
    groupId,
    statementId,
    text: statement.text,
  };
}

export const CHRISTIANITY_NATURAL_PLANKS = [
  bridgeStatement('abortion', 'natural-christian'),
  bridgeStatement('markets', 'natural-christian'),
  bridgeStatement('lgbt', 'natural-christian'),
  bridgeStatement('scripture', 'natural-christian'),
] as const;

export const SECULAR_NATURAL_PLANKS = [
  bridgeStatement('abortion', 'natural-secular'),
  bridgeStatement('markets', 'natural-secular'),
  bridgeStatement('lgbt', 'natural-secular'),
  bridgeStatement('colorblind-merit', 'natural-secular'),
] as const;

export const MEDIATOR_STATEMENTS = [
  bridgeStatement('abortion', 'modified-christian'),
  bridgeStatement('abortion', 'modified-secular'),
  bridgeStatement('abortion', 'commonality'),
  bridgeStatement('markets', 'modified-christian'),
  bridgeStatement('markets', 'modified-secular'),
  bridgeStatement('markets', 'commonality'),
  bridgeStatement('lgbt', 'modified-christian'),
  bridgeStatement('lgbt', 'modified-secular'),
  bridgeStatement('lgbt', 'commonality'),
] as const;
