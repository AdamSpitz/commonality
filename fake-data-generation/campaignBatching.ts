import type { CampaignActionType } from './campaignSchema.js';
import type { PlannedAction } from './campaignPlanner.js';

/** Writes whose contract entry point already accepts many items from one sender. */
export const BATCHABLE_CAMPAIGN_ACTIONS = new Set<CampaignActionType>([
  'publish-statement', 'set-belief', 'attest-implication', 'attest-alignment',
]);

const MAX_BATCH: Partial<Record<CampaignActionType, number>> = {
  'publish-statement': 8,
  'set-belief': 40,
  'attest-implication': 40,
  'attest-alignment': 40,
};

/** Gas for a transaction that carries exactly one of these writes. */
export const SOLO_GAS_UNITS: Record<CampaignActionType, bigint> = {
  // publishDataBatch does not set gas; viem's estimate on a campaign statement
  // batch was about 4e6. set-belief matches campaignActionAdapter: a single
  // setBelief is 120_000, and setBeliefsInBatch is 40_000 + 80_000 * n
  // (three beliefs => 280_000). The old 180k/90k figures left wallets short.
  'publish-statement': 4_000_000n, 'create-cause': 120_000n, 'create-bridge-board': 120_000n, 'create-bridge': 120_000n, 'set-belief': 120_000n,
  // Local network-societies batch 2 on 2026-10-19: 62 create-project receipts
  // used 4,073,876–4,073,924 gas. A 3,000,000 quote left 17 founder wallets
  // short of the balance viem requires for that limit. Headroom above the max.
  'attest-implication': 130_000n, 'create-project': 4_500_000n, 'attest-alignment': 130_000n,
  // 2026-10-21 local buys used 252,635–257,259 gas. viem submits a higher gas
  // limit than gas used, and the node checks that limit against the balance.
  // A 180,000 quote, even with the 25% wallet buffer, left frequent funders short.
  'fund-project': 400_000n, 'deposit-note': 350_000n, 'delegate-note': 100_000n, 'revoke-delegation': 90_000n,
  // ERC-20 deposit approves then deposits. A delegated-note purchase is larger than a wallet buy.
  'spend-delegated-note': 400_000n,
};

/**
 * Gas limit for one ERC-20 `approve` the writer sends outside the planned action.
 * A project buy approves once per project. An ERC-20 note deposit approves every time.
 */
export const ERC20_APPROVAL_GAS_UNITS = 80_000n;

/** Storage and log cost of one extra item once the transaction overhead is paid. */
const MARGINAL_GAS_UNITS: Partial<Record<CampaignActionType, bigint>> = {
  'publish-statement': 500_000n,
  'set-belief': 80_000n,
  'attest-implication': 55_000n,
  'attest-alignment': 40_000n,
};

const BATCH_OVERHEAD_GAS = 45_000n;

function reaches(start: PlannedAction, targetId: string, byId: ReadonlyMap<string, PlannedAction>): boolean {
  const stack = [...start.dependsOn];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === targetId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const next = byId.get(id);
    if (next) stack.push(...next.dependsOn);
    seen.add(id);
  }
  return false;
}

function canShareTransaction(group: readonly PlannedAction[], candidate: PlannedAction, byId: ReadonlyMap<string, PlannedAction>, batchPublishes: boolean): boolean {
  if (!BATCHABLE_CAMPAIGN_ACTIONS.has(candidate.type)) return false;
  if (candidate.type === 'publish-statement' && !batchPublishes) return false;
  if (group.length >= (MAX_BATCH[candidate.type] ?? 1)) return false;
  return group.every((member) =>
    member.type === candidate.type
    && member.actorUserId === candidate.actorUserId
    && !reaches(member, candidate.id, byId)
    && !reaches(candidate, member.id, byId));
}

/**
 * Partition a plan into the transactions the executor will send.
 * Mutually independent writes of the same type from the same wallet share one transaction.
 * A later write that depends on an earlier one stays in a later transaction.
 */
export function groupCampaignWrites(actions: readonly PlannedAction[], options: { batchPublishes?: boolean } = {}): PlannedAction[][] {
  const batchPublishes = options.batchPublishes !== false;
  const byId = new Map(actions.map((action) => [action.id, action]));
  const groups: PlannedAction[][] = [];
  const open = new Map<string, PlannedAction[]>();
  for (const action of actions) {
    const key = `${action.type}:${action.actorUserId ?? ''}`;
    const existing = open.get(key);
    if (existing && canShareTransaction(existing, action, byId, batchPublishes)) {
      existing.push(action);
      continue;
    }
    const group = [action];
    groups.push(group);
    if (BATCHABLE_CAMPAIGN_ACTIONS.has(action.type) && (action.type !== 'publish-statement' || batchPublishes)) open.set(key, group);
  }
  return groups;
}

/** Native gas units for one grouped transaction, before the gas price. */
export function estimateGroupGas(group: readonly PlannedAction[]): bigint {
  if (group.length === 0) throw new Error('cannot estimate an empty campaign write group');
  const type = group[0].type;
  if (group.length === 1) return SOLO_GAS_UNITS[type];
  // Belief and publish batches must cover the limit the writer asks viem for.
  // overhead + small marginal underfunded setBeliefsInBatch (280_000 for three)
  // and large publishDataBatch transactions.
  if (type === 'set-belief' || type === 'publish-statement') {
    const marginal = MARGINAL_GAS_UNITS[type]!;
    return SOLO_GAS_UNITS[type] + marginal * BigInt(group.length - 1);
  }
  const marginal = MARGINAL_GAS_UNITS[type];
  if (marginal === undefined) return group.reduce((sum, action) => sum + SOLO_GAS_UNITS[action.type], 0n);
  return BATCH_OVERHEAD_GAS + marginal * BigInt(group.length);
}

/** Split a wei amount across group members so the recorded costs still sum to the transaction. */
export function splitNativeCost(total: bigint, count: number): bigint[] {
  if (count < 1) throw new Error('cannot split a cost across zero actions');
  const base = total / BigInt(count);
  const remainder = total % BigInt(count);
  return Array.from({ length: count }, (_, index) => base + (index === 0 ? remainder : 0n));
}
