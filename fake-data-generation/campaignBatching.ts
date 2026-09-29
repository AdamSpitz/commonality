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
  'publish-statement': 180_000n, 'create-cause': 120_000n, 'set-belief': 90_000n,
  'attest-implication': 130_000n, 'create-project': 1_100_000n, 'attest-alignment': 130_000n,
  'fund-project': 180_000n, 'deposit-note': 150_000n, 'delegate-note': 100_000n, 'revoke-delegation': 90_000n,
};

/** Storage and log cost of one extra item once the transaction overhead is paid. */
const MARGINAL_GAS_UNITS: Partial<Record<CampaignActionType, bigint>> = {
  'publish-statement': 80_000n,
  'set-belief': 35_000n,
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
  if (group.length === 1) return SOLO_GAS_UNITS[group[0].type];
  const marginal = MARGINAL_GAS_UNITS[group[0].type];
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
