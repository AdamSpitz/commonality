export const CAMPAIGN_SCHEMA_VERSION = 'commonality-testnet-campaign-v1' as const;

export type CampaignRole =
  | 'cause-founder'
  | 'project-founder'
  | 'supporter'
  | 'delegate'
  | 'attester'
  | 'mediator'
  | 'lurker'
  | 'power-user';

export type CampaignActionType =
  | 'publish-statement'
  | 'create-cause'
  | 'create-bridge-board'
  | 'create-bridge'
  | 'set-belief'
  | 'attest-implication'
  | 'create-project'
  | 'attest-alignment'
  | 'fund-project'
  | 'deposit-note'
  | 'delegate-note'
  | 'revoke-delegation'
  | 'spend-delegated-note';

export interface CampaignStatementRef {
  collectionId: string;
  groupId: string;
  statementId: string;
}

export interface CampaignCause {
  id: string;
  title: string;
  activityTier: 'large' | 'medium' | 'small';
  membershipWeight: number;
  statementRefs: CampaignStatementRef[];
}

/** Demo navigation. Several causes can share one area. A cause not listed here stays its own area. */
export interface CampaignDemoArea {
  id: string;
  title: string;
  causeIds: string[];
}

export interface CampaignPersona {
  id: string;
  count: number;
  roles: CampaignRole[];
  causesPerUser: { min: number; max: number };
  activityWeight: number;
  inactivityRate: number;
  fundingWeight: number;
}

export interface CampaignUserProfile {
  userId: string;
  displayName: string;
  bio: string;
  favoriteCauseId: string;
  interests: string[];
  /** When set, replaces the persona's random cause draw. One to four ids, including favoriteCauseId. */
  causeIds?: string[];
  /** Another profiled user who should receive this user's delegated notes when they share a cause. */
  delegatesTo?: string;
  /** Lower numbers are listed first on the test-data admin page. */
  spotlightOrder?: number;
}

export interface CampaignActionRule {
  type: CampaignActionType;
  prerequisites: CampaignActionType[];
  targetCount: { min: number; max: number };
}

/** Explicit size bounds. Omitted manifests keep the historical 8–18 causes and 30–70 statement refs. */
export interface CampaignScale {
  minCauses: number;
  maxCauses: number;
  /** Unique catalog statements. A statement reused on another board counts once. */
  minStatements: number;
  maxStatements: number;
  allowRepeatedStatementRefs?: boolean;
}

export interface CampaignManifestV1 {
  schema: typeof CAMPAIGN_SCHEMA_VERSION;
  campaign: {
    id: string;
    label: string;
    syntheticDataLabel: string;
    userCount: number;
    deterministicSeed: string;
    randomAlgorithm: 'xoshiro128**';
  };
  sourcePolicy: {
    kind: 'accepted-seed-content-only' | 'accepted-plus-campaign-synthetic';
    fingerprintAlgorithm: 'sha256';
    excludeCollections: string[];
    /** Optional synthetic collection stored beside the campaign manifest, never in seed-content/. */
    campaignCollection?: string;
  };
  causes: CampaignCause[];
  /** Optional coarser grouping for the test-data admin "Demo by area" list. */
  demoAreas?: CampaignDemoArea[];
  personas: CampaignPersona[];
  userProfiles?: CampaignUserProfile[];
  actionRules: CampaignActionRule[];
  artifactLayout: Record<string, string>;
  /** When set, replaces the historical fixed cause and statement-ref caps. */
  scale?: CampaignScale;
  /** Curated project stories beside the manifest. Not a TypeScript story module. */
  projectStories?: string;
  /**
   * When set, attest-implication uses only these pairs and their evidence labels.
   * Absent manifests still plan every modified-to-commonality pair as accepted-bridge-role-pair.
   */
  implicationAllowances?: CampaignImplicationAllowance[];
  /**
   * Persona sign and reject choices. The planner pins those set-belief writes
   * and does not let the random draw overwrite them. Unsigned entries stay unpinned.
   */
  beliefDecisions?: string;
  /**
   * One named project gets early 0.10-receipt purchases, then retroactive
   * donations that depend on those purchases. Twenty early purchases match
   * the 2 USDZZZ project threshold. Absent on historical manifests.
   */
  reimbursement?: {
    projectTitle: string;
    earlyPurchases: number;
    retroactiveDonations: number;
  };
  /**
   * One payment-token note stays delegated, and the delegate buys one cheap
   * receipt on a named project. Absent on historical manifests. The Pat/Ned
   * revoke pair is a different story and must not be this pair.
   */
  delegatedSpend?: {
    ownerUserId: string;
    delegateUserId: string;
    projectTitle: string;
  };
}

export type CampaignImplicationEvidence =
  | 'accepted-bridge-role-pair'
  | 'live-attester-modified-to-commonality'
  | 'live-attester-recorded-bless';

export interface CampaignImplicationAllowance {
  from: CampaignStatementRef;
  to: CampaignStatementRef;
  evidence: CampaignImplicationEvidence;
}

function requireUnique(values: string[], label: string): void {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length > 0) throw new Error(`${label} contains duplicates: ${[...new Set(duplicates)].join(', ')}`);
}

function validateCampaignIdentity(manifest: CampaignManifestV1): void {
  const campaign = manifest.campaign;
  if (!/^[a-z0-9][a-z0-9-]+$/.test(campaign.id)) throw new Error('campaign.id must be a stable kebab-case ID');
  if (!campaign.syntheticDataLabel.toLowerCase().includes('synthetic')) {
    throw new Error('campaign.syntheticDataLabel must unmistakably identify synthetic data');
  }
  if (!campaign.deterministicSeed) throw new Error('campaign.deterministicSeed is required');
}

function campaignScale(manifest: CampaignManifestV1): CampaignScale {
  return manifest.scale ?? { minCauses: 8, maxCauses: 18, minStatements: 30, maxStatements: 70, allowRepeatedStatementRefs: false };
}

function validateCauses(manifest: CampaignManifestV1): void {
  const scale = campaignScale(manifest);
  if (manifest.scale && (scale.minCauses < 1 || scale.maxCauses < scale.minCauses || scale.minStatements < 1 || scale.maxStatements < scale.minStatements)) {
    throw new Error('campaign scale limits are invalid');
  }
  if (manifest.causes.length < scale.minCauses || manifest.causes.length > scale.maxCauses) {
    throw new Error(manifest.scale ? `campaign must contain ${scale.minCauses}-${scale.maxCauses} causes` : 'campaign must contain 8-18 causes');
  }
  requireUnique(manifest.causes.map((cause) => cause.id), 'cause IDs');
  const statementRefs = manifest.causes.flatMap((cause) => cause.statementRefs);
  const statementKeys = statementRefs.map((ref) => `${ref.collectionId}/${ref.groupId}/${ref.statementId}`);
  if (!scale.allowRepeatedStatementRefs) requireUnique(statementKeys, 'statement references');
  const uniqueStatements = new Set(statementKeys).size;
  if (uniqueStatements < scale.minStatements || uniqueStatements > scale.maxStatements) {
    throw new Error(manifest.scale ? `campaign must contain ${scale.minStatements}-${scale.maxStatements} unique statements` : 'campaign must contain 30-70 statements');
  }
  if (manifest.causes.some((cause) => cause.membershipWeight <= 0 || cause.statementRefs.length === 0)) {
    throw new Error('every cause needs a positive membership weight and at least one statement');
  }
  const allowances = manifest.implicationAllowances ?? [];
  const allowanceKeys = allowances.map((item) => `${statementRefKey(item.from)}=>${statementRefKey(item.to)}`);
  requireUnique(allowanceKeys, 'implication allowances');
  for (const item of allowances) {
    if (item.evidence !== 'accepted-bridge-role-pair' && item.evidence !== 'live-attester-modified-to-commonality' && item.evidence !== 'live-attester-recorded-bless') {
      throw new Error(`invalid implication evidence for ${allowanceKeys[allowances.indexOf(item)]}`);
    }
    if (item.from.collectionId !== item.to.collectionId || item.from.groupId !== item.to.groupId) {
      throw new Error(`implication allowance crosses groups: ${allowanceKeys[allowances.indexOf(item)]}`);
    }
  }
}

function statementRefKey(ref: CampaignStatementRef): string {
  return `${ref.collectionId}/${ref.groupId}/${ref.statementId}`;
}

function validateDemoAreas(manifest: CampaignManifestV1): void {
  const areas = manifest.demoAreas;
  if (!areas) return;
  if (areas.length === 0) throw new Error('demoAreas must list at least one area');
  requireUnique(areas.map((area) => area.id), 'demo area IDs');
  const known = new Set(manifest.causes.map((cause) => cause.id));
  const membership = areas.flatMap((area) => area.causeIds);
  requireUnique(membership, 'demo area cause IDs');
  for (const area of areas) {
    if (!/^[a-z0-9][a-z0-9-]+$/.test(area.id)) throw new Error(`demo area id must be kebab-case: ${area.id}`);
    if (!area.title.trim()) throw new Error(`demo area ${area.id} needs a title`);
    if (area.causeIds.length === 0) throw new Error(`demo area ${area.id} needs at least one cause`);
    for (const causeId of area.causeIds) {
      if (!known.has(causeId)) throw new Error(`demo area ${area.id} names unknown cause ${causeId}`);
    }
  }
}

function validatePersonas(manifest: CampaignManifestV1): void {
  requireUnique(manifest.personas.map((persona) => persona.id), 'persona IDs');
  const personaCount = manifest.personas.reduce((total, persona) => total + persona.count, 0);
  if (personaCount !== manifest.campaign.userCount) throw new Error(`persona counts total ${personaCount}, expected ${manifest.campaign.userCount}`);
  for (const persona of manifest.personas) {
    if (persona.count <= 0 || persona.activityWeight < 0 || persona.fundingWeight < 0) throw new Error(`invalid weights/count for persona ${persona.id}`);
    if (persona.causesPerUser.min < 1 || persona.causesPerUser.max > 4 || persona.causesPerUser.min > persona.causesPerUser.max) {
      throw new Error(`persona ${persona.id} must join 1-4 causes`);
    }
    if (persona.inactivityRate < 0 || persona.inactivityRate > 1) throw new Error(`invalid inactivityRate for persona ${persona.id}`);
  }
  const profiles = manifest.userProfiles ?? [];
  requireUnique(profiles.map((profile) => profile.userId), 'profile user IDs');
  requireUnique(profiles.flatMap((profile) => profile.spotlightOrder === undefined ? [] : [String(profile.spotlightOrder)]), 'spotlight orders');
  const causeIds = new Set(manifest.causes.map((cause) => cause.id));
  const profileIds = new Set(profiles.map((profile) => profile.userId));
  for (const profile of profiles) {
    const userNumber = Number(profile.userId.match(/^user-(\d{3})$/)?.[1]);
    if (!Number.isInteger(userNumber) || userNumber < 1 || userNumber > manifest.campaign.userCount) throw new Error(`invalid profile user ID ${profile.userId}`);
    if (!causeIds.has(profile.favoriteCauseId) || !profile.displayName.trim() || !profile.bio.trim() || profile.interests.length === 0) {
      throw new Error(`invalid interest profile for ${profile.userId}`);
    }
    if (profile.causeIds) {
      if (profile.causeIds.length < 1 || profile.causeIds.length > 4 || new Set(profile.causeIds).size !== profile.causeIds.length || profile.causeIds.some((causeId) => !causeIds.has(causeId)) || !profile.causeIds.includes(profile.favoriteCauseId)) {
        throw new Error(`invalid pinned causes for ${profile.userId}`);
      }
    }
    if (profile.delegatesTo && (profile.delegatesTo === profile.userId || !profileIds.has(profile.delegatesTo))) {
      throw new Error(`invalid delegatesTo for ${profile.userId}`);
    }
    if (profile.spotlightOrder !== undefined && (!Number.isInteger(profile.spotlightOrder) || profile.spotlightOrder < 1)) {
      throw new Error(`invalid spotlightOrder for ${profile.userId}`);
    }
  }
}

function validateActionRules(manifest: CampaignManifestV1): void {
  requireUnique(manifest.actionRules.map((rule) => rule.type), 'action rule types');
  const actionTypes = new Set(manifest.actionRules.map((rule) => rule.type));
  for (const rule of manifest.actionRules) {
    if (rule.targetCount.min < 0 || rule.targetCount.min > rule.targetCount.max) throw new Error(`invalid target count for ${rule.type}`);
    for (const prerequisite of rule.prerequisites) {
      if (!actionTypes.has(prerequisite)) throw new Error(`${rule.type} has unknown prerequisite ${prerequisite}`);
      if (prerequisite === rule.type) throw new Error(`${rule.type} cannot depend on itself`);
    }
  }
}

function validateArtifactLayout(manifest: CampaignManifestV1): void {
  const requiredArtifacts = ['manifest', 'statementCatalog', 'assignments', 'walletAddresses', 'walletSecrets', 'actionPlan', 'executionState', 'runtimeBindings', 'fundingLedger', 'reconciliation', 'browserObservations', 'summary'];
  for (const artifact of requiredArtifacts) {
    if (!manifest.artifactLayout[artifact]) throw new Error(`artifactLayout.${artifact} is required`);
  }
  if (!manifest.artifactLayout.walletSecrets.startsWith('../secrets/')) {
    throw new Error('wallet secrets must live outside the campaign artifact directory');
  }
}

export function validateCampaignManifest(manifest: CampaignManifestV1): void {
  if (manifest.schema !== CAMPAIGN_SCHEMA_VERSION) throw new Error(`unsupported campaign schema: ${String(manifest.schema)}`);
  validateCampaignIdentity(manifest);
  if ((manifest.sourcePolicy.kind === 'accepted-plus-campaign-synthetic') !== Boolean(manifest.sourcePolicy.campaignCollection)) {
    throw new Error('synthetic campaign source policy requires a campaign collection, and vice versa');
  }
  if (manifest.sourcePolicy.campaignCollection && !/^[a-z0-9][a-z0-9-]*\.json$/.test(manifest.sourcePolicy.campaignCollection)) {
    throw new Error('sourcePolicy.campaignCollection must be a JSON filename in campaigns/');
  }
  if (manifest.projectStories && !/^[a-z0-9][a-z0-9-]*\.json$/.test(manifest.projectStories)) {
    throw new Error('projectStories must be a JSON filename in campaigns/');
  }
  if (manifest.beliefDecisions && !/^[a-z0-9][a-z0-9-]*\.json$/.test(manifest.beliefDecisions)) {
    throw new Error('beliefDecisions must be a JSON filename in campaigns/');
  }
  if (manifest.reimbursement) {
    const { projectTitle, earlyPurchases, retroactiveDonations } = manifest.reimbursement;
    if (!projectTitle.trim()) throw new Error('reimbursement.projectTitle is required');
    if (!Number.isInteger(earlyPurchases) || earlyPurchases < 1) throw new Error('reimbursement.earlyPurchases must be a positive integer');
    if (!Number.isInteger(retroactiveDonations) || retroactiveDonations < 1) throw new Error('reimbursement.retroactiveDonations must be a positive integer');
  }
  if (manifest.delegatedSpend) {
    const { ownerUserId, delegateUserId, projectTitle } = manifest.delegatedSpend;
    if (!/^user-\d{3}$/.test(ownerUserId) || !/^user-\d{3}$/.test(delegateUserId) || ownerUserId === delegateUserId) {
      throw new Error('delegatedSpend needs two different user ids');
    }
    if (!projectTitle.trim()) throw new Error('delegatedSpend.projectTitle is required');
    const spendRule = manifest.actionRules.find((rule) => rule.type === 'spend-delegated-note');
    if (!spendRule || spendRule.targetCount.min !== 1 || spendRule.targetCount.max !== 1) {
      throw new Error('delegatedSpend requires exactly one spend-delegated-note action');
    }
  } else if (manifest.actionRules.some((rule) => rule.type === 'spend-delegated-note')) {
    throw new Error('spend-delegated-note requires delegatedSpend');
  }
  validateCauses(manifest);
  validateDemoAreas(manifest);
  validatePersonas(manifest);
  validateActionRules(manifest);
  validateArtifactLayout(manifest);
}
