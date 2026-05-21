export type BridgeContextReadiness = 'warming' | 'ready';

export interface TrustedContextSourceConfig {
  serviceUrl: string;
  expectedSignerAddress?: `0x${string}`;
}

export interface BridgeContextResponse {
  readiness: BridgeContextReadiness;
  summary: string;
  generatedAt?: string;
  signerAddress?: `0x${string}`;
  signature?: string;
}

export interface BridgeContextSnapshot {
  source: TrustedContextSourceConfig;
  response: BridgeContextResponse;
}

export interface BridgeContextClientDependencies {
  fetch: typeof fetch;
}

const defaultDependencies: BridgeContextClientDependencies = { fetch };

export function parseTrustedContextSources(value: string | undefined): TrustedContextSourceConfig[] {
  if (!value?.trim()) return [];

  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error('BRIDGE_CREATOR_CSM_CONTEXT_SOURCES must be a JSON array');
  }

  return parsed.map((entry, index) => normalizeTrustedContextSource(entry, index));
}

function normalizeTrustedContextSource(entry: unknown, index: number): TrustedContextSourceConfig {
  if (!entry || typeof entry !== 'object') {
    throw new Error(`Context source at index ${index} must be an object`);
  }

  const record = entry as Record<string, unknown>;
  const serviceUrl = record.service_url ?? record.serviceUrl;
  if (typeof serviceUrl !== 'string' || !serviceUrl.trim()) {
    throw new Error(`Context source at index ${index} is missing service_url`);
  }

  const expectedSignerAddress = record.expected_signer_address ?? record.expectedSignerAddress;
  if (expectedSignerAddress !== undefined && typeof expectedSignerAddress !== 'string') {
    throw new Error(`Context source at index ${index} has a non-string expected_signer_address`);
  }

  return {
    serviceUrl: serviceUrl.trim().replace(/\/+$/, ''),
    expectedSignerAddress: expectedSignerAddress as `0x${string}` | undefined,
  };
}

export async function fetchBridgeContextSnapshots(
  sources: TrustedContextSourceConfig[],
  dependencies: BridgeContextClientDependencies = defaultDependencies,
): Promise<BridgeContextSnapshot[]> {
  const snapshots: BridgeContextSnapshot[] = [];

  for (const source of sources) {
    const response = await dependencies.fetch(`${source.serviceUrl}/context`, {
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Context source ${source.serviceUrl} returned HTTP ${response.status}`);
    }

    const context = normalizeBridgeContextResponse(await response.json(), source);
    snapshots.push({ source, response: context });
  }

  return snapshots;
}

function normalizeBridgeContextResponse(value: unknown, source: TrustedContextSourceConfig): BridgeContextResponse {
  if (!value || typeof value !== 'object') {
    throw new Error(`Context source ${source.serviceUrl} returned a non-object response`);
  }

  const record = value as Record<string, unknown>;
  if (record.readiness !== 'warming' && record.readiness !== 'ready') {
    throw new Error(`Context source ${source.serviceUrl} returned invalid readiness`);
  }
  if (typeof record.summary !== 'string') {
    throw new Error(`Context source ${source.serviceUrl} returned missing summary`);
  }

  const signerAddress = record.signerAddress ?? record.signer_address;
  if (source.expectedSignerAddress && signerAddress !== source.expectedSignerAddress) {
    throw new Error(`Context source ${source.serviceUrl} signer mismatch`);
  }

  return {
    readiness: record.readiness,
    summary: record.summary,
    generatedAt: typeof record.generatedAt === 'string' ? record.generatedAt : undefined,
    signerAddress: signerAddress as `0x${string}` | undefined,
    signature: typeof record.signature === 'string' ? record.signature : undefined,
  };
}

export function allContextsReady(snapshots: BridgeContextSnapshot[]): boolean {
  return snapshots.length > 0 && snapshots.every((snapshot) => snapshot.response.readiness === 'ready');
}
