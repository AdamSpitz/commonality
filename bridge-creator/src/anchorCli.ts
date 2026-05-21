import { readFileSync, writeFileSync } from 'node:fs';
import { normalizeAnchorStoreFile, type BridgeAnchorRecord, type BridgeAnchorStatus, type BridgeAnchorStoreFile } from './anchors.js';

export type AnchorCliCommand = 'list-proposed' | 'approve' | 'retire' | 'delete';

export interface AnchorCliResult {
  message: string;
  storeChanged: boolean;
  anchors: BridgeAnchorRecord[];
}

export function runAnchorCli(argv: string[]): AnchorCliResult {
  const { storePath, command, anchorIds } = parseAnchorCliArgs(argv);
  const store = loadMutableAnchorStore(storePath);

  let result: AnchorCliResult;
  switch (command) {
    case 'list-proposed':
      result = {
        message: formatAnchorList(store.anchors.filter((anchor) => anchor.status === 'proposed')),
        storeChanged: false,
        anchors: store.anchors.filter((anchor) => anchor.status === 'proposed'),
      };
      break;
    case 'approve':
      result = updateAnchorStatuses(store, anchorIds, 'active');
      break;
    case 'retire':
      result = updateAnchorStatuses(store, anchorIds, 'retired');
      break;
    case 'delete':
      result = deleteAnchors(store, anchorIds);
      break;
  }

  if (result.storeChanged) {
    writeAnchorStore(storePath, store);
  }

  return result;
}

export function parseAnchorCliArgs(argv: string[]): {
  storePath: string;
  command: AnchorCliCommand;
  anchorIds: string[];
} {
  const args = [...argv];
  let storePath = process.env.BRIDGE_CREATOR_ANCHOR_STORE_PATH ?? 'bridge-creator/data/seed-anchors.json';
  const storeFlagIndex = args.indexOf('--store');
  if (storeFlagIndex !== -1) {
    const value = args[storeFlagIndex + 1];
    if (!value) throw new Error('--store requires a file path');
    storePath = value;
    args.splice(storeFlagIndex, 2);
  }

  const command = args.shift();
  if (!isAnchorCliCommand(command)) {
    throw new Error('Usage: anchor-cli [--store path] <list-proposed|approve|retire|delete> [anchor-id ...]');
  }

  if (command !== 'list-proposed' && args.length === 0) {
    throw new Error(`${command} requires at least one anchor id`);
  }

  return { storePath, command, anchorIds: args };
}

function loadMutableAnchorStore(storePath: string): BridgeAnchorStoreFile {
  return normalizeAnchorStoreFile(JSON.parse(readFileSync(storePath, 'utf8')) as unknown);
}

function updateAnchorStatuses(
  store: BridgeAnchorStoreFile,
  anchorIds: string[],
  status: Exclude<BridgeAnchorStatus, 'proposed'>,
): AnchorCliResult {
  const anchors = findAnchorsByIds(store, anchorIds);
  const reviewedAt = new Date().toISOString();
  for (const anchor of anchors) {
    anchor.status = status;
    anchor.last_reviewed_at = reviewedAt;
  }

  return {
    message: `${status === 'active' ? 'Approved' : 'Retired'} ${anchors.length} anchor(s): ${anchorIds.join(', ')}`,
    storeChanged: true,
    anchors,
  };
}

function deleteAnchors(store: BridgeAnchorStoreFile, anchorIds: string[]): AnchorCliResult {
  const anchors = findAnchorsByIds(store, anchorIds);
  store.anchors = store.anchors.filter((anchor) => !anchorIds.includes(anchor.id));
  return {
    message: `Deleted ${anchors.length} anchor(s): ${anchorIds.join(', ')}`,
    storeChanged: true,
    anchors,
  };
}

function findAnchorsByIds(store: BridgeAnchorStoreFile, anchorIds: string[]): BridgeAnchorRecord[] {
  const anchors = anchorIds.map((id) => store.anchors.find((anchor) => anchor.id === id));
  const missing = anchorIds.filter((_, index) => anchors[index] === undefined);
  if (missing.length > 0) {
    throw new Error(`Unknown anchor id(s): ${missing.join(', ')}`);
  }
  return anchors as BridgeAnchorRecord[];
}

function writeAnchorStore(storePath: string, store: BridgeAnchorStoreFile): void {
  writeFileSync(storePath, `${JSON.stringify(store, null, 2)}\n`);
}

function formatAnchorList(anchors: BridgeAnchorRecord[]): string {
  if (anchors.length === 0) return 'No proposed anchors.';
  return anchors.map((anchor) => `${anchor.id} [${anchor.topic_tag}/${anchor.role}]: ${anchor.text}`).join('\n');
}

function isAnchorCliCommand(value: unknown): value is AnchorCliCommand {
  return value === 'list-proposed' || value === 'approve' || value === 'retire' || value === 'delete';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = runAnchorCli(process.argv.slice(2));
    console.log(result.message);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
