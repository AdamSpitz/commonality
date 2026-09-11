import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type CampaignActionType, type CampaignManifestV1, type CampaignRole, validateCampaignManifest } from './campaignSchema.js';
import { flattenSeedStatements, loadSeedCollections } from './seed-content-format.js';

export const CAMPAIGN_PLAN_VERSION = 'commonality-campaign-plan-v1' as const;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface PlannedStatement {
  id: string;
  causeId: string;
  source: { collectionId: string; groupId: string; statementId: string; fingerprint: string };
  text: string;
  role: string | null;
}

export interface PlannedUser {
  id: string;
  walletSlot: string;
  personaId: string;
  roles: CampaignRole[];
  causeIds: string[];
  inactive: boolean;
  activityWeight: number;
  fundingWeight: number;
}

export interface PlannedProject {
  id: string;
  title: string;
  outcome: string;
  causeId: string;
  founderUserId: string;
  statementIds: string[];
}

export interface PlannedAction {
  id: string;
  sequence: number;
  type: CampaignActionType;
  actorUserId: string | null;
  causeId?: string;
  statementId?: string;
  projectId?: string;
  noteId?: string;
  delegateUserId?: string;
  belief?: 'believe' | 'disbelieve';
  amount?: number;
  alignment?: 'supports-described-outcome';
  delegationBasis?: { sharedCauseIds: string[]; reason: 'shared-cause-trusted-role' };
  implication?: { fromStatementId: string; toStatementId: string; evidence: 'accepted-bridge-role-pair' };
  dependsOn: string[];
}

export interface CampaignPlan {
  version: typeof CAMPAIGN_PLAN_VERSION;
  campaignId: string;
  deterministicSeed: string;
  manifestFingerprint: string;
  statements: PlannedStatement[];
  users: PlannedUser[];
  projects: PlannedProject[];
  actions: PlannedAction[];
  estimate: {
    writesByType: Record<CampaignActionType, number>;
    totalWrites: number;
    estimatedGasByType: Record<CampaignActionType, number>;
    estimatedTotalGas: number;
    assumptions: { gasUnitsPerWrite: Record<CampaignActionType, number>; paymentTokenBaseUnit: number };
    estimatedPaymentTokenUnits: number;
  };
}

const GAS_UNITS: Record<CampaignActionType, number> = {
  'publish-statement': 180_000, 'create-cause': 120_000, 'set-belief': 90_000,
  'attest-implication': 130_000, 'create-project': 1_100_000, 'attest-alignment': 130_000,
  'fund-project': 180_000, 'deposit-note': 150_000, 'delegate-note': 100_000, 'revoke-delegation': 90_000,
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: string): string { return createHash('sha256').update(value).digest('hex'); }

class Xoshiro128StarStar {
  private readonly state: Uint32Array;
  constructor(seed: string) {
    const bytes = createHash('sha256').update(seed).digest();
    this.state = new Uint32Array(4);
    for (let index = 0; index < 4; index++) this.state[index] = bytes.readUInt32LE(index * 4);
  }
  next(): number {
    const s = this.state;
    const result = Math.imul(((Math.imul(s[1], 5) << 7) | (Math.imul(s[1], 5) >>> 25)) >>> 0, 9) >>> 0;
    const temporary = (s[1] << 9) >>> 0;
    s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3]; s[2] ^= temporary;
    s[3] = ((s[3] << 11) | (s[3] >>> 21)) >>> 0;
    return result / 0x1_0000_0000;
  }
  integer(min: number, max: number): number { return min + Math.floor(this.next() * (max - min + 1)); }
  pick<T>(items: readonly T[]): T { if (items.length === 0) throw new Error('cannot choose from an empty list'); return items[Math.floor(this.next() * items.length)]; }
  weighted<T>(items: readonly T[], weight: (item: T) => number): T {
    const total = items.reduce((sum, item) => sum + weight(item), 0);
    if (total <= 0) throw new Error('weighted choice needs a positive total weight');
    let cursor = this.next() * total;
    for (const item of items) { cursor -= weight(item); if (cursor < 0) return item; }
    return items[items.length - 1];
  }
  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index--) { const other = this.integer(0, index); [result[index], result[other]] = [result[other], result[index]]; }
    return result;
  }
}

function statementKey(ref: { collectionId: string; groupId: string; statementId: string }): string {
  return `${ref.collectionId}/${ref.groupId}/${ref.statementId}`;
}

function allocateCount(rule: CampaignManifestV1['actionRules'][number], random: Xoshiro128StarStar): number {
  return random.integer(rule.targetCount.min, rule.targetCount.max);
}

function chooseDistinctCauses(manifest: CampaignManifestV1, count: number, random: Xoshiro128StarStar): string[] {
  const remaining = [...manifest.causes];
  const chosen: string[] = [];
  while (chosen.length < count) {
    const cause = random.weighted(remaining, (item) => item.membershipWeight);
    chosen.push(cause.id);
    remaining.splice(remaining.indexOf(cause), 1);
  }
  return chosen;
}

function validateImplicationPair(from: PlannedStatement, to: PlannedStatement): void {
  const sameGroup = from.source.collectionId === to.source.collectionId && from.source.groupId === to.source.groupId;
  const approved = (from.role === 'modified-left' || from.role === 'modified-right') && to.role === 'commonality';
  if (!sameGroup || !approved) throw new Error(`unsuitable implication ${from.id} -> ${to.id}: pair lacks accepted bridge-role evidence`);
}

function usersForCause(users: PlannedUser[], causeId: string): PlannedUser[] {
  return users.filter((user) => user.causeIds.includes(causeId));
}

function chooseCauseAttester(users: PlannedUser[], causeId: string, random: Xoshiro128StarStar): PlannedUser {
  const members = usersForCause(users, causeId);
  return random.weighted(members, (user) => user.activityWeight * (user.roles.includes('attester') || user.roles.includes('mediator') ? 8 : 1));
}

function preferredStatements(user: PlannedUser, statements: PlannedStatement[]): PlannedStatement[] {
  const inCauses = statements.filter((statement) => user.causeIds.includes(statement.causeId));
  if (!user.roles.includes('mediator')) return inCauses.filter((statement) => !statement.role?.startsWith('natural-'));
  return inCauses.filter((statement) => statement.role === null || statement.role === 'commonality' || statement.role.startsWith('modified-'));
}

function fundingAmount(user: PlannedUser, projectIndex: number, random: Xoshiro128StarStar): number {
  const personaScale = Math.max(1, Math.round(user.fundingWeight * 100));
  const projectPopularity = Math.max(1, 6 - (projectIndex % 7));
  return personaScale * projectPopularity * random.integer(1, 3);
}

export async function buildCampaignPlan(manifest: CampaignManifestV1): Promise<CampaignPlan> {
  validateCampaignManifest(manifest);
  const random = new Xoshiro128StarStar(manifest.campaign.deterministicSeed);
  const records = flattenSeedStatements(await loadSeedCollections());
  const recordByKey = new Map(records.map((record) => [statementKey({ collectionId: record.collection.id, groupId: record.group.id, statementId: record.statement.id }), record]));
  const statements: PlannedStatement[] = manifest.causes.flatMap((cause) => cause.statementRefs.map((ref) => {
    const record = recordByKey.get(statementKey(ref));
    if (!record || manifest.sourcePolicy.excludeCollections.includes(ref.collectionId)) throw new Error(`missing or excluded statement reference ${statementKey(ref)}`);
    return { id: `statement-${cause.id}-${ref.statementId}`, causeId: cause.id, source: { ...ref, fingerprint: sha256(stableJson(record.statement)) }, text: record.statement.text, role: record.statement.role ?? null };
  }));

  const users: PlannedUser[] = [];
  for (const persona of manifest.personas) for (let index = 0; index < persona.count; index++) {
    const id = `user-${String(users.length + 1).padStart(3, '0')}`;
    const causeCount = random.integer(persona.causesPerUser.min, persona.causesPerUser.max);
    users.push({ id, walletSlot: `wallet-${id}`, personaId: persona.id, roles: persona.roles, causeIds: chooseDistinctCauses(manifest, causeCount, random), inactive: random.next() < persona.inactivityRate, activityWeight: persona.activityWeight, fundingWeight: persona.fundingWeight });
  }
  const activeUsers = users.filter((user) => !user.inactive && user.activityWeight > 0);
  if (activeUsers.length === 0) throw new Error('campaign has no active users');

  const countByType = Object.fromEntries(manifest.actionRules.map((rule) => [rule.type, allocateCount(rule, random)])) as Record<CampaignActionType, number>;
  countByType['publish-statement'] = statements.length;
  countByType['create-cause'] = manifest.causes.length;
  const projectFounders = activeUsers.filter((user) => user.roles.includes('project-founder') || user.roles.includes('power-user'));
  const attesters = activeUsers.filter((user) => user.roles.includes('attester'));
  const delegates = activeUsers.filter((user) => user.roles.includes('delegate'));
  if (projectFounders.length === 0 || attesters.length === 0 || delegates.length === 0) throw new Error('campaign lacks an active project founder, attester, or delegate');

  const projects: PlannedProject[] = Array.from({ length: countByType['create-project'] }, (_, index) => {
    const founder = random.pick(projectFounders);
    const causeId = random.pick(founder.causeIds);
    const candidates = statements.filter((statement) => statement.causeId === causeId);
    const selected = random.shuffle(candidates).slice(0, random.integer(1, Math.min(3, candidates.length)));
    const cause = manifest.causes.find((item) => item.id === causeId)!;
    return { id: `project-${String(index + 1).padStart(3, '0')}`, title: `${cause.title}: ${selected[0].text}`, outcome: selected.map((statement) => statement.text).join(' '), causeId, founderUserId: founder.id, statementIds: selected.map((statement) => statement.id) };
  });

  const actions: PlannedAction[] = [];
  const add = (action: Omit<PlannedAction, 'id' | 'sequence'>): PlannedAction => { const value = { ...action, id: `action-${String(actions.length + 1).padStart(5, '0')}`, sequence: actions.length + 1 }; actions.push(value); return value; };
  const publishes = new Map(statements.map((statement) => [statement.id, add({ type: 'publish-statement', actorUserId: null, causeId: statement.causeId, statementId: statement.id, dependsOn: [] })]));
  const causes = new Map(manifest.causes.map((cause) => [cause.id, add({ type: 'create-cause', actorUserId: random.pick(activeUsers.filter((user) => user.roles.includes('cause-founder') || user.roles.includes('power-user'))).id, causeId: cause.id, dependsOn: cause.statementRefs.map((ref) => publishes.get(statements.find((statement) => statementKey(statement.source) === statementKey(ref))!.id)!.id) })]));

  const latestBelief = new Map<string, PlannedAction>();
  for (let index = 0; index < countByType['set-belief']; index++) {
    const actor = random.weighted(activeUsers, (user) => user.activityWeight);
    const previous = index > Math.floor(countByType['set-belief'] * 0.92) && latestBelief.size > 0 ? random.pick([...latestBelief.values()]) : undefined;
    const statement = previous ? statements.find((item) => item.id === previous.statementId)! : random.pick(preferredStatements(actor, statements));
    const belief = previous ? (previous.belief === 'believe' ? 'disbelieve' : 'believe') : (random.next() < 0.94 ? 'believe' : 'disbelieve');
    const action = add({ type: 'set-belief', actorUserId: previous?.actorUserId ?? actor.id, causeId: statement.causeId, statementId: statement.id, belief, dependsOn: previous ? [publishes.get(statement.id)!.id, previous.id] : [publishes.get(statement.id)!.id] });
    latestBelief.set(`${action.actorUserId}/${statement.id}`, action);
  }
  const implicationPairs = manifest.causes.flatMap((cause) => {
    const groupStatements = statements.filter((statement) => statement.causeId === cause.id);
    const commonality = groupStatements.find((statement) => statement.role === 'commonality');
    return commonality ? groupStatements.filter((statement) => statement.role === 'modified-left' || statement.role === 'modified-right').map((from) => ({ from, to: commonality })) : [];
  });
  if (countByType['attest-implication'] > 0 && implicationPairs.length === 0) throw new Error('no suitable accepted implication pairs are available');
  for (let index = 0; index < countByType['attest-implication']; index++) {
    const pair = implicationPairs[index % implicationPairs.length]; validateImplicationPair(pair.from, pair.to);
    add({ type: 'attest-implication', actorUserId: chooseCauseAttester(activeUsers, pair.from.causeId, random).id, causeId: pair.from.causeId, implication: { fromStatementId: pair.from.id, toStatementId: pair.to.id, evidence: 'accepted-bridge-role-pair' }, dependsOn: [publishes.get(pair.from.id)!.id, publishes.get(pair.to.id)!.id] });
  }
  const createProjects = new Map(projects.map((project) => [project.id, add({ type: 'create-project', actorUserId: project.founderUserId, causeId: project.causeId, projectId: project.id, dependsOn: [causes.get(project.causeId)!.id] })]));
  const alignments: PlannedAction[] = [];
  for (let index = 0; index < countByType['attest-alignment']; index++) {
    const project = projects[index % projects.length]; const statementId = project.statementIds[index % project.statementIds.length];
    alignments.push(add({ type: 'attest-alignment', actorUserId: chooseCauseAttester(activeUsers, project.causeId, random).id, causeId: project.causeId, projectId: project.id, statementId, alignment: 'supports-described-outcome', dependsOn: [createProjects.get(project.id)!.id, publishes.get(statementId)!.id] }));
  }
  const fundableProjects = projects.slice(0, Math.max(1, Math.floor(projects.length * 0.8)));
  for (let index = 0; index < countByType['fund-project']; index++) {
    const project = random.weighted(fundableProjects, (item) => Math.max(1, fundableProjects.length - projects.indexOf(item))); const supporters = activeUsers.filter((user) => user.causeIds.includes(project.causeId) && user.fundingWeight > 0); const actor = random.weighted(supporters, (user) => user.fundingWeight);
    const alignment = alignments.find((item) => item.projectId === project.id);
    if (!alignment) throw new Error(`impossible fund-project: ${project.id} has no alignment action`);
    add({ type: 'fund-project', actorUserId: actor.id, causeId: project.causeId, projectId: project.id, amount: fundingAmount(actor, projects.indexOf(project), random), dependsOn: [createProjects.get(project.id)!.id, alignment.id] });
  }
  const deposits: PlannedAction[] = [];
  const delegatingDepositors = activeUsers.filter((owner) => delegates.some((delegate) => delegate.id !== owner.id && delegate.causeIds.some((causeId) => owner.causeIds.includes(causeId))));
  if (delegatingDepositors.length === 0) throw new Error('campaign has no users connected to the delegate trust graph');
  for (let index = 0; index < countByType['deposit-note']; index++) { const actor = random.weighted(delegatingDepositors, (user) => user.activityWeight); deposits.push(add({ type: 'deposit-note', actorUserId: actor.id, noteId: `note-${String(index + 1).padStart(4, '0')}`, amount: Math.max(100, Math.round(actor.fundingWeight * 500)) * random.integer(1, 3), dependsOn: [] })); }
  const delegations: PlannedAction[] = [];
  for (let index = 0; index < countByType['delegate-note']; index++) {
    const deposit = deposits[index % deposits.length]; const owner = users.find((user) => user.id === deposit.actorUserId)!;
    const candidates = delegates.filter((user) => user.id !== owner.id && user.causeIds.some((causeId) => owner.causeIds.includes(causeId)));
    if (candidates.length === 0) throw new Error(`no cause-aware delegate available for ${owner.id}`);
    const delegate = random.weighted(candidates, (user) => user.activityWeight * user.causeIds.filter((causeId) => owner.causeIds.includes(causeId)).length);
    const sharedCauseIds = delegate.causeIds.filter((causeId) => owner.causeIds.includes(causeId)).sort();
    delegations.push(add({ type: 'delegate-note', actorUserId: owner.id, noteId: deposit.noteId, delegateUserId: delegate.id, amount: deposit.amount, delegationBasis: { sharedCauseIds, reason: 'shared-cause-trusted-role' }, dependsOn: [deposit.id] }));
  }
  for (let index = 0; index < countByType['revoke-delegation']; index++) { const delegation = delegations[index % delegations.length]; add({ type: 'revoke-delegation', actorUserId: delegation.actorUserId, noteId: delegation.noteId, dependsOn: [delegation.id] }); }

  validatePlannedActions(manifest, statements, users, projects, actions);
  const writesByType = Object.fromEntries(manifest.actionRules.map((rule) => [rule.type, actions.filter((action) => action.type === rule.type).length])) as Record<CampaignActionType, number>;
  const estimatedGasByType = Object.fromEntries(Object.entries(writesByType).map(([type, count]) => [type, count * GAS_UNITS[type as CampaignActionType]])) as Record<CampaignActionType, number>;
  const estimatedPaymentTokenUnits = actions.filter((action) => action.type === 'fund-project').reduce((sum, action) => sum + (action.amount ?? 0), 0);
  return { version: CAMPAIGN_PLAN_VERSION, campaignId: manifest.campaign.id, deterministicSeed: manifest.campaign.deterministicSeed, manifestFingerprint: sha256(stableJson(manifest)), statements, users, projects, actions, estimate: { writesByType, totalWrites: actions.length, estimatedGasByType, estimatedTotalGas: Object.values(estimatedGasByType).reduce((sum, value) => sum + value, 0), assumptions: { gasUnitsPerWrite: GAS_UNITS, paymentTokenBaseUnit: 100 }, estimatedPaymentTokenUnits } };
}

export function validatePlannedActions(manifest: CampaignManifestV1, statements: PlannedStatement[], users: PlannedUser[], projects: PlannedProject[], actions: PlannedAction[]): void {
  const actionById = new Map(actions.map((action) => [action.id, action]));
  const statementIds = new Set(statements.map((item) => item.id)); const userIds = new Set(users.map((item) => item.id)); const projectIds = new Set(projects.map((item) => item.id));
  if (actionById.size !== actions.length) throw new Error('planned action IDs must be unique');
  for (const action of actions) {
    if (action.actorUserId !== null && !userIds.has(action.actorUserId)) throw new Error(`${action.id} has missing actor ${action.actorUserId}`);
    if (action.statementId && !statementIds.has(action.statementId)) throw new Error(`${action.id} has missing statement ${action.statementId}`);
    if (action.projectId && !projectIds.has(action.projectId)) throw new Error(`${action.id} has missing project ${action.projectId}`);
    for (const dependencyId of action.dependsOn) { const dependency = actionById.get(dependencyId); if (!dependency || dependency.sequence >= action.sequence) throw new Error(`${action.id} has impossible dependency ${dependencyId}`); }
    const rule = manifest.actionRules.find((item) => item.type === action.type)!;
    for (const prerequisite of rule.prerequisites) if (!action.dependsOn.some((id) => actionById.get(id)?.type === prerequisite)) throw new Error(`${action.id} is missing ${prerequisite} prerequisite`);
    const actor = action.actorUserId ? users.find((user) => user.id === action.actorUserId) : undefined;
    if (action.causeId && actor && ['set-belief', 'fund-project'].includes(action.type) && !actor.causeIds.includes(action.causeId)) throw new Error(`${action.id} actor is outside cause ${action.causeId}`);
    if (action.type === 'set-belief' && !action.belief) throw new Error(`${action.id} is missing belief value`);
    if (action.type === 'fund-project' && (!action.amount || action.amount <= 0)) throw new Error(`${action.id} is missing positive funding amount`);
    if (action.type === 'attest-alignment' && action.alignment !== 'supports-described-outcome') throw new Error(`${action.id} lacks project outcome alignment evidence`);
    if (action.type === 'delegate-note' && (!action.delegationBasis || action.delegationBasis.sharedCauseIds.length === 0)) throw new Error(`${action.id} lacks a shared-cause delegation basis`);
  }
  for (const rule of manifest.actionRules) { const count = actions.filter((action) => action.type === rule.type).length; if (count < rule.targetCount.min || count > rule.targetCount.max) throw new Error(`${rule.type} planned count ${count} is outside target ${rule.targetCount.min}-${rule.targetCount.max}`); }
  if (users.some((user) => user.causeIds.length < 1 || user.causeIds.length > 3)) throw new Error('user cause assignment is outside 1-3 causes');
  if (new Set(users.map((user) => user.walletSlot)).size !== users.length) throw new Error('planned wallet slots must be unique');
}

export async function loadCampaignPlan(manifest: CampaignManifestV1, outputDirectory: string): Promise<CampaignPlan> {
  const readJson = async (relativePath: string): Promise<Record<string, unknown>> =>
    JSON.parse(await readFile(path.join(outputDirectory, relativePath), 'utf8')) as Record<string, unknown>;
  const statementCatalog = await readJson(manifest.artifactLayout.statementCatalog);
  const assignments = await readJson(manifest.artifactLayout.assignments);
  const actionPlan = await readJson(manifest.artifactLayout.actionPlan);
  const plan: CampaignPlan = {
    version: CAMPAIGN_PLAN_VERSION,
    campaignId: manifest.campaign.id,
    deterministicSeed: manifest.campaign.deterministicSeed,
    manifestFingerprint: String(actionPlan.manifestFingerprint),
    statements: statementCatalog.statements as CampaignPlan['statements'],
    users: assignments.users as CampaignPlan['users'],
    projects: assignments.projects as CampaignPlan['projects'],
    actions: actionPlan.actions as CampaignPlan['actions'],
    estimate: actionPlan.estimate as CampaignPlan['estimate'],
  };
  if (plan.campaignId !== actionPlan.campaignId) throw new Error('action-plan campaign ID does not match the manifest');
  validatePlannedActions(manifest, plan.statements, plan.users, plan.projects, plan.actions);
  return plan;
}

export async function writePlanArtifacts(manifest: CampaignManifestV1, plan: CampaignPlan, outputDirectory: string): Promise<void> {
  const writeJson = async (relativePath: string, value: JsonValue | object): Promise<void> => { const target = path.join(outputDirectory, relativePath); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, `${JSON.stringify(value, null, 2)}\n`); };
  await writeJson(manifest.artifactLayout.manifest, manifest);
  await writeJson(manifest.artifactLayout.statementCatalog, { version: plan.version, campaignId: plan.campaignId, statements: plan.statements });
  await writeJson(manifest.artifactLayout.assignments, { version: plan.version, campaignId: plan.campaignId, users: plan.users, projects: plan.projects });
  await writeJson(manifest.artifactLayout.walletAddresses, { version: plan.version, campaignId: plan.campaignId, wallets: plan.users.map(({ id, walletSlot }) => ({ userId: id, walletSlot, address: null, status: 'unprovisioned' })) });
  await writeJson(manifest.artifactLayout.actionPlan, { version: plan.version, campaignId: plan.campaignId, manifestFingerprint: plan.manifestFingerprint, actions: plan.actions, estimate: plan.estimate });
}

async function main(): Promise<void> {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  const manifestPath = process.argv[2] ?? path.join(directory, 'campaigns/medium-realistic-v1.json');
  const outputDirectory = process.argv[3] ?? path.join(directory, 'output/campaigns/medium-realistic-v1');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as CampaignManifestV1;
  const plan = await buildCampaignPlan(manifest); await writePlanArtifacts(manifest, plan, outputDirectory);
  console.log(`Planned ${plan.users.length} users, ${plan.statements.length} statements, ${plan.projects.length} projects, and ${plan.estimate.totalWrites} writes.`);
  console.log(`Estimated gas: ${plan.estimate.estimatedTotalGas}; payment-token units: ${plan.estimate.estimatedPaymentTokenUnits}.`);
  console.log(`Wrote planning artifacts to ${outputDirectory}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
