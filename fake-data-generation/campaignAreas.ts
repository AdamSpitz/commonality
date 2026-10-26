import type { CampaignPlan, PlannedAction } from './campaignPlanner.js';
import type { CampaignExecutionState } from './campaignExecutor.js';
import type { CampaignRuntimeBindings } from './campaignRuntimeBindings.js';
import type { CampaignCause, CampaignDemoArea } from './campaignSchema.js';

export interface CampaignRunAreaStatement {
  id: string;
  text: string;
  cid?: string;
  path?: string;
  role?: string | null;
  causeId?: string;
  partTitle?: string;
}

export interface CampaignRunAreaBoard {
  title: string;
  path: string;
  role?: string;
  slug?: string;
  causeId?: string;
  partTitle?: string;
}

export interface CampaignRunAreaBridge {
  title: string;
  path: string;
  slug?: string;
  causeId?: string;
  partTitle?: string;
}

export interface CampaignRunArea {
  id: string;
  title: string;
  statements: CampaignRunAreaStatement[];
  causeBoards: CampaignRunAreaBoard[];
  bridges: CampaignRunAreaBridge[];
  projects: Array<{ title: string; path: string; assuranceContract: string }>;
  activeUserIds: number[];
}

interface DemoGroup {
  id: string;
  title: string;
  causeIds: string[];
}

/** One admin area per demo group. Causes omitted from demoAreas each stay their own area. */
function demoGroups(causes: Pick<CampaignCause, 'id' | 'title'>[], demoAreas: CampaignDemoArea[] | undefined): DemoGroup[] {
  if (!demoAreas?.length) return causes.map((cause) => ({ id: cause.id, title: cause.title, causeIds: [cause.id] }));
  const grouped = new Set(demoAreas.flatMap((area) => area.causeIds));
  return [
    ...demoAreas.map((area) => ({ id: area.id, title: area.title, causeIds: area.causeIds })),
    ...causes.filter((cause) => !grouped.has(cause.id)).map((cause) => ({ id: cause.id, title: cause.title, causeIds: [cause.id] })),
  ];
}

/** Derive demo navigation from the saved plan, counting only confirmed activity. */
export function campaignRunAreas(
  plan: CampaignPlan,
  bindings: CampaignRuntimeBindings,
  causes: Pick<CampaignCause, 'id' | 'title'>[],
  state: CampaignExecutionState,
  demoAreas?: CampaignDemoArea[],
): CampaignRunArea[] {
  if (state.campaignId !== plan.campaignId || state.manifestFingerprint !== plan.manifestFingerprint) throw new Error('area execution state does not match campaign plan');
  if (bindings.campaignId !== plan.campaignId || bindings.manifestFingerprint !== plan.manifestFingerprint) throw new Error('area runtime bindings do not match campaign plan');
  const mined = new Set(state.actions.filter((action) => action.status === 'mined').map((action) => action.actionId));
  const statements = new Map(plan.statements.map((statement) => [statement.id, statement]));
  const projects = new Map(plan.projects.map((project) => [project.id, project]));
  const causeTitle = new Map(causes.map((cause) => [cause.id, cause.title]));
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
  const forCause = (causeId: string) => {
    const partTitle = causeTitle.get(causeId) ?? causeId;
    const relevant = plan.actions.filter((action) => mined.has(action.id) && actionAreas(action).has(causeId));
    const seenStatements = new Set<string>();
    return {
      statements: plan.statements.filter((statement) => statementAreas(statement.id).includes(causeId) && bindings.statements[statement.id]).flatMap((statement) => {
        if (seenStatements.has(statement.id)) return [];
        seenStatements.add(statement.id);
        const cid = bindings.statements[statement.id];
        return [{ id: statement.id, text: statement.text, cid, path: `/statement/${cid}`, role: statement.role, causeId, partTitle }];
      }),
      causeBoards: relevant.flatMap((action) => {
        if (action.type !== 'create-cause' && action.type !== 'create-bridge-board') return [];
        const binding = bindings.causes[action.boardId ?? action.causeId ?? ''];
        return binding ? [{ title: action.board?.title ?? partTitle, role: action.board?.role ?? 'plain', slug: binding.refName, path: `/cause/${binding.owner}/${binding.refName}`, causeId, partTitle }] : [];
      }),
      bridges: relevant.flatMap((action) => {
        if (action.type !== 'create-bridge' || action.causeId !== causeId) return [];
        const binding = bindings.bridges?.[action.causeId];
        return binding ? [{ title: `${partTitle} bridge`, slug: binding.refName, path: `/bridge/${binding.owner}/${binding.refName}`, causeId, partTitle }] : [];
      }),
      projects: plan.projects.filter((project) => projectAreas(project.id).includes(causeId) && relevant.some((action) => action.type === 'create-project' && action.projectId === project.id)).flatMap((project) => {
        const assuranceContract = bindings.projects[project.id];
        return assuranceContract ? [{ title: project.title, assuranceContract, path: `/projects/${assuranceContract}` }] : [];
      }),
      activeUserIds: plan.users.filter((user) => relevant.some((action) => action.actorUserId === user.id || (action.type === 'delegate-note' && action.delegateUserId === user.id))).map((user) => Number(user.id.replace('user-', '')) - 1),
    };
  };
  return demoGroups(causes, demoAreas).map((group) => {
    const parts = group.causeIds.map(forCause);
    const seenProjects = new Set<string>();
    return {
      id: group.id,
      title: group.title,
      statements: parts.flatMap((part) => part.statements),
      causeBoards: parts.flatMap((part) => part.causeBoards),
      bridges: parts.flatMap((part) => part.bridges),
      projects: parts.flatMap((part) => part.projects).filter((project) => {
        if (seenProjects.has(project.assuranceContract)) return false;
        seenProjects.add(project.assuranceContract);
        return true;
      }),
      activeUserIds: parts.flatMap((part) => part.activeUserIds).filter((userId, index, all) => all.indexOf(userId) === index),
    };
  });
}
