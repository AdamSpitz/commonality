import type { CampaignPlan, PlannedAction } from './campaignPlanner.js';
import type { CampaignExecutionState } from './campaignExecutor.js';
import type { CampaignRuntimeBindings } from './campaignRuntimeBindings.js';
import type { CampaignCause } from './campaignSchema.js';

export interface CampaignRunArea {
  id: string;
  title: string;
  statements: Array<{ id: string; text: string; cid?: string; path?: string }>;
  causeBoards: Array<{ title: string; path: string; role?: string; slug?: string }>;
  bridges: Array<{ title: string; path: string; slug?: string }>;
  projects: Array<{ title: string; path: string; assuranceContract: string }>;
  activeUserIds: number[];
}

/** Derive demo navigation from the saved plan, counting only confirmed activity. */
export function campaignRunAreas(plan: CampaignPlan, bindings: CampaignRuntimeBindings, causes: Pick<CampaignCause, 'id' | 'title'>[], state: CampaignExecutionState): CampaignRunArea[] {
  if (state.campaignId !== plan.campaignId || state.manifestFingerprint !== plan.manifestFingerprint) throw new Error('area execution state does not match campaign plan');
  if (bindings.campaignId !== plan.campaignId || bindings.manifestFingerprint !== plan.manifestFingerprint) throw new Error('area runtime bindings do not match campaign plan');
  const mined = new Set(state.actions.filter((action) => action.status === 'mined').map((action) => action.actionId));
  const statements = new Map(plan.statements.map((statement) => [statement.id, statement]));
  const projects = new Map(plan.projects.map((project) => [project.id, project]));
  const statementAreas = (id: string): string[] => {
    const statement = statements.get(id);
    return statement ? [statement.causeId, ...(statement.alsoOnCauseIds ?? [])] : [];
  };
  const projectAreas = (id: string): string[] => {
    const project = projects.get(id);
    return project ? [project.causeId, ...project.statementIds.flatMap(statementAreas)] : [];
  };
  const actionAreas = (action: PlannedAction): Set<string> => new Set([
    ...(action.causeId ? [action.causeId] : []),
    ...(action.statementId ? statementAreas(action.statementId) : []),
    ...(action.projectId ? projectAreas(action.projectId) : []),
    ...(action.implication ? [...statementAreas(action.implication.fromStatementId), ...statementAreas(action.implication.toStatementId)] : []),
    ...(action.delegationBasis?.sharedCauseIds ?? []),
  ]);
  return causes.map((cause) => {
    const relevant = plan.actions.filter((action) => mined.has(action.id) && actionAreas(action).has(cause.id));
    const active = new Set(relevant.flatMap((action) => [action.actorUserId, action.type === 'delegate-note' ? action.delegateUserId : undefined]).filter((id): id is string => !!id));
    return {
      id: cause.id,
      title: cause.title,
      statements: plan.statements.filter((statement) => statementAreas(statement.id).includes(cause.id) && bindings.statements[statement.id]).map((statement) => {
        const cid = bindings.statements[statement.id];
        return { id: statement.id, text: statement.text, cid, path: `/statement/${cid}` };
      }),
      causeBoards: relevant.flatMap((action) => {
        if (action.type !== 'create-cause' && action.type !== 'create-bridge-board') return [];
        const binding = bindings.causes[action.boardId ?? action.causeId ?? ''];
        return binding ? [{ title: action.board?.title ?? cause.title, role: action.board?.role ?? 'plain', slug: binding.refName, path: `/cause/${binding.owner}/${binding.refName}` }] : [];
      }),
      bridges: relevant.flatMap((action) => {
        if (action.type !== 'create-bridge' || !action.causeId) return [];
        const binding = bindings.bridges?.[action.causeId];
        return binding ? [{ title: `${cause.title} bridge`, slug: binding.refName, path: `/bridge/${binding.owner}/${binding.refName}` }] : [];
      }),
      projects: plan.projects.filter((project) => projectAreas(project.id).includes(cause.id) && relevant.some((action) => action.type === 'create-project' && action.projectId === project.id)).flatMap((project) => {
        const assuranceContract = bindings.projects[project.id];
        return assuranceContract ? [{ title: project.title, assuranceContract, path: `/projects/${assuranceContract}` }] : [];
      }),
      activeUserIds: plan.users.filter((user) => active.has(user.id)).map((user) => Number(user.id.replace('user-', '')) - 1),
    };
  });
}
