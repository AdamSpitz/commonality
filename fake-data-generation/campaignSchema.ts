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
  | 'set-belief'
  | 'attest-implication'
  | 'create-project'
  | 'attest-alignment'
  | 'fund-project'
  | 'deposit-note'
  | 'delegate-note'
  | 'revoke-delegation';

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

export interface CampaignPersona {
  id: string;
  count: number;
  roles: CampaignRole[];
  causesPerUser: { min: number; max: number };
  activityWeight: number;
  inactivityRate: number;
  fundingWeight: number;
}

export interface CampaignActionRule {
  type: CampaignActionType;
  prerequisites: CampaignActionType[];
  targetCount: { min: number; max: number };
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
    kind: 'accepted-seed-content-only';
    fingerprintAlgorithm: 'sha256';
    excludeCollections: string[];
  };
  causes: CampaignCause[];
  personas: CampaignPersona[];
  actionRules: CampaignActionRule[];
  artifactLayout: Record<string, string>;
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

function validateCauses(manifest: CampaignManifestV1): void {
  if (manifest.causes.length < 8 || manifest.causes.length > 12) throw new Error('campaign must contain 8-12 causes');
  requireUnique(manifest.causes.map((cause) => cause.id), 'cause IDs');
  const statementRefs = manifest.causes.flatMap((cause) => cause.statementRefs);
  const statementKeys = statementRefs.map((ref) => `${ref.collectionId}/${ref.groupId}/${ref.statementId}`);
  requireUnique(statementKeys, 'statement references');
  if (statementRefs.length < 30 || statementRefs.length > 50) throw new Error('campaign must contain 30-50 statements');
  if (manifest.causes.some((cause) => cause.membershipWeight <= 0 || cause.statementRefs.length === 0)) {
    throw new Error('every cause needs a positive membership weight and at least one statement');
  }
}

function validatePersonas(manifest: CampaignManifestV1): void {
  requireUnique(manifest.personas.map((persona) => persona.id), 'persona IDs');
  const personaCount = manifest.personas.reduce((total, persona) => total + persona.count, 0);
  if (personaCount !== manifest.campaign.userCount) throw new Error(`persona counts total ${personaCount}, expected ${manifest.campaign.userCount}`);
  for (const persona of manifest.personas) {
    if (persona.count <= 0 || persona.activityWeight < 0 || persona.fundingWeight < 0) throw new Error(`invalid weights/count for persona ${persona.id}`);
    if (persona.causesPerUser.min < 1 || persona.causesPerUser.max > 3 || persona.causesPerUser.min > persona.causesPerUser.max) {
      throw new Error(`persona ${persona.id} must join 1-3 causes`);
    }
    if (persona.inactivityRate < 0 || persona.inactivityRate > 1) throw new Error(`invalid inactivityRate for persona ${persona.id}`);
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
  const requiredArtifacts = ['manifest', 'statementCatalog', 'assignments', 'walletAddresses', 'walletSecrets', 'actionPlan', 'executionState', 'fundingLedger', 'reconciliation', 'browserObservations', 'summary'];
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
  validateCauses(manifest);
  validatePersonas(manifest);
  validateActionRules(manifest);
  validateArtifactLayout(manifest);
}
