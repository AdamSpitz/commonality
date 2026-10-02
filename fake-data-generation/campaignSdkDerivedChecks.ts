import type { Address } from 'viem';
import { BeliefStates, getImplication, getUserBelief } from '@commonality/sdk/conceptspace';
import { getNote, type Note } from '@commonality/sdk/delegation';
import { getAlignmentAttestation, PROJECT_ALIGNMENT_TOPIC, toSubjectId } from '@commonality/sdk/fundingportals';
import { getProject, getProjectReimbursementState, type Project, type ProjectReimbursementState } from '@commonality/sdk/lazy-giving';
import type { SDKMachinery } from '@commonality/sdk/machinery';
import { getRefsByName, type MutableRef } from '@commonality/sdk/mutable-refs';
import type { IpfsCidV1 } from '@commonality/sdk/utils';
import type { CampaignDerivedCheckProvider } from './campaignIndexerAdapter.js';
import type { CampaignPlan, PlannedAction } from './campaignPlanner.js';
import { validateRuntimeBindings, type CampaignRuntimeBindings } from './campaignRuntimeBindings.js';
import type { DerivedCheck } from './campaignReconciler.js';
import { campaignActionFundingCost } from './paymentTokenUnits.js';

/** Injectable SDK query surface, primarily to make the expected-state logic testable. */
export interface CampaignSdkQueries {
  getUserBelief(user: Address, statement: IpfsCidV1): Promise<number>;
  hasImplication(attester: Address, from: IpfsCidV1, to: IpfsCidV1): Promise<boolean>;
  getRefsByName(name: string): Promise<MutableRef[]>;
  getProject(address: Address): Promise<Project | null>;
  getProjectReimbursementState?(address: Address): Promise<ProjectReimbursementState>;
  hasAlignment(attester: Address, project: Address, statement: IpfsCidV1): Promise<boolean>;
  getNote(noteId: string): Promise<Note | null>;
}

function realSdkQueries(machinery: SDKMachinery): CampaignSdkQueries {
  return {
    async getUserBelief(user, statement) {
      return (await getUserBelief(machinery, user, statement))?.beliefState ?? BeliefStates.NO_OPINION;
    },
    async hasImplication(attester, from, to) {
      return (await getImplication(machinery, attester, from, to)) !== null;
    },
    getRefsByName: (name) => getRefsByName(machinery, name, 10_000),
    getProject: (address) => getProject(machinery, address),
    getProjectReimbursementState: (address) => getProjectReimbursementState(machinery, address),
    async hasAlignment(attester, project, statement) {
      return (await getAlignmentAttestation(machinery, attester, toSubjectId(project), statement, PROJECT_ALIGNMENT_TOPIC)) !== null;
    },
    getNote: (noteId) => getNote(machinery, noteId),
  };
}

function check(name: string, expected: DerivedCheck['expected'], actual: DerivedCheck['actual']): DerivedCheck {
  return { name, expected, actual };
}

function memoizeCampaignSdkQueries(queries: CampaignSdkQueries): CampaignSdkQueries {
  const remember = <T>(key: string, load: () => Promise<T>, cache: Map<string, Promise<T>>): Promise<T> => {
    const cached = cache.get(key);
    if (cached) return cached;
    const pending = load().catch((error: unknown) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, pending);
    return pending;
  };
  const beliefs = new Map<string, Promise<number>>();
  const implications = new Map<string, Promise<boolean>>();
  const refs = new Map<string, Promise<MutableRef[]>>();
  const projects = new Map<string, Promise<Project | null>>();
  const alignments = new Map<string, Promise<boolean>>();
  const notes = new Map<string, Promise<Note | null>>();
  return {
    getUserBelief: (user, statement) => remember(`${user}/${statement}`, () => queries.getUserBelief(user, statement), beliefs),
    hasImplication: (attester, from, to) => remember(`${attester}/${from}/${to}`, () => queries.hasImplication(attester, from, to), implications),
    getRefsByName: (name) => remember(name, () => queries.getRefsByName(name), refs),
    getProject: (address) => remember(address.toLowerCase(), () => queries.getProject(address), projects),
    getProjectReimbursementState: queries.getProjectReimbursementState ? (address) => queries.getProjectReimbursementState!(address) : undefined,
    hasAlignment: (attester, project, statement) => remember(`${attester}/${project}/${statement}`, () => queries.hasAlignment(attester, project, statement), alignments),
    getNote: (noteId) => remember(noteId.toLowerCase(), () => queries.getNote(noteId), notes),
  };
}

/**
 * Build SDK-fold checks against the campaign's final intended state. Historical
 * writes to the same belief, project, or note deliberately share the final
 * expectation because reconciliation runs after the complete campaign settles.
 */
export function createCampaignSdkDerivedCheckProvider(input: {
  machinery: SDKMachinery;
  plan: CampaignPlan;
  bindings: CampaignRuntimeBindings;
  queries?: CampaignSdkQueries;
}): CampaignDerivedCheckProvider {
  const { plan, bindings } = input;
  validateRuntimeBindings(plan, bindings, { complete: true });
  const queries = memoizeCampaignSdkQueries(input.queries ?? realSdkQueries(input.machinery));
  const latestBelief = new Map<string, PlannedAction>();
  const latestNoteAction = new Map<string, PlannedAction>();
  const fundingByProject = new Map<string, bigint>();
  const retroByProject = new Map<string, bigint>();
  for (const action of plan.actions) {
    if (action.type === 'set-belief') latestBelief.set(`${action.actorUserId}/${action.statementId}`, action);
    if (action.noteId) latestNoteAction.set(action.noteId, action);
    if (action.type === 'fund-project') {
      const target = action.funding?.kind === 'retroactive' ? retroByProject : fundingByProject;
      target.set(action.projectId!, (target.get(action.projectId!) ?? 0n) + campaignActionFundingCost(action));
    }
  }

  const user = (id: string | null | undefined): Address => bindings.users[id!];
  const statement = (id: string | undefined): IpfsCidV1 => bindings.statements[id!];
  const project = (id: string | undefined): Address => bindings.projects[id!];

  return {
    // One explicit branch per frozen campaign action type keeps coverage auditable.
    // eslint-disable-next-line complexity
    async getDerivedChecks(action): Promise<DerivedCheck[]> {
      switch (action.type) {
        case 'publish-statement':
          // DataPublished has no independent SDK fold; its raw indexed event is
          // the authoritative publication check. Later actions query this CID.
          return [];
        case 'create-cause':
        case 'create-bridge-board': {
          const binding = bindings.causes[action.boardId ?? action.causeId!];
          const refs = await queries.getRefsByName(binding.refName);
          const actual = refs.find((ref) => ref.owner.toLowerCase() === binding.owner.toLowerCase())?.value ?? null;
          return [check('SDK cause roster ref', binding.rosterCid, actual)];
        }
        case 'create-bridge': {
          const binding = bindings.bridges?.[action.causeId!];
          if (!binding) return [check('SDK bridge cluster ref', 'published', null)];
          const refs = await queries.getRefsByName(binding.refName);
          const actual = refs.find((ref) => ref.owner.toLowerCase() === binding.owner.toLowerCase())?.value ?? null;
          return [check('SDK bridge cluster ref', binding.rosterCid, actual)];
        }
        case 'set-belief': {
          const final = latestBelief.get(`${action.actorUserId}/${action.statementId}`)!;
          const expected = final.belief === 'believe' ? BeliefStates.BELIEVES : BeliefStates.DISBELIEVES;
          return [check('SDK final user belief', expected, await queries.getUserBelief(user(action.actorUserId), statement(action.statementId)))];
        }
        case 'attest-implication':
          return [check('SDK active implication', true, await queries.hasImplication(user(action.actorUserId), statement(action.implication!.fromStatementId), statement(action.implication!.toStatementId)))];
        case 'create-project':
          return [check('SDK project exists', true, (await queries.getProject(project(action.projectId))) !== null)];
        case 'attest-alignment':
          return [check('SDK active project alignment', true, await queries.hasAlignment(user(action.actorUserId), project(action.projectId), statement(action.statementId)))];
        case 'fund-project': {
          const folded = await queries.getProject(project(action.projectId));
          if (action.funding?.kind === 'retroactive') {
            const reimbursement = await queries.getProjectReimbursementState?.(project(action.projectId));
            return [check('SDK final retroactive donations', (retroByProject.get(action.projectId!) ?? 0n).toString(), reimbursement?.totalRetroactiveDonations ?? null)];
          }
          return [check('SDK final project funding', (fundingByProject.get(action.projectId!) ?? 0n).toString(), folded?.totalReceived ?? null)];
        }
        case 'deposit-note':
        case 'delegate-note':
        case 'revoke-delegation': {
          const binding = bindings.notes[action.noteId!];
          const folded = await queries.getNote(`${binding.contractAddress.toLowerCase()}:${binding.noteId}`);
          const final = latestNoteAction.get(action.noteId!)!;
          const expectedOwner = final.type === 'delegate-note' ? user(final.delegateUserId) : user(final.actorUserId);
          const rootOwner = user(plan.actions.find((item) => item.type === 'deposit-note' && item.noteId === action.noteId)!.actorUserId);
          return [
            check('SDK note exists', true, folded !== null),
            check('SDK final note owner', expectedOwner.toLowerCase(), folded?.owner.toLowerCase() ?? null),
            check('SDK note root owner', rootOwner.toLowerCase(), folded?.rootOwner.toLowerCase() ?? null),
            check('SDK note remains active', true, folded?.active ?? null),
          ];
        }
      }
    },
  };
}
