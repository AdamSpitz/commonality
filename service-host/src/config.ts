import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const serviceKinds = [
  'implication-finder',
  'content-finder',
  'implication-graph-nudger',
  'bridge-creator',
  'explorer-curator',
  'implication-attester',
  'content-attester',
  'beat-memory',
  'beat-agent',
  'recurring-pledge-scheduler',
] as const;

export type ServiceKind = (typeof serviceKinds)[number];

/** Non-financial services. A Conceptspace-only host uses this list and must not import funding factories. */
export const conceptspaceServiceKinds = [
  'implication-finder',
  'implication-graph-nudger',
  'bridge-creator',
  'explorer-curator',
  'implication-attester',
  'beat-memory',
] as const satisfies readonly ServiceKind[];

export type ConceptspaceServiceKind = (typeof conceptspaceServiceKinds)[number];

/** Funding and content-payout consumers. Composed into the full host, not the Conceptspace default. */
export const fundingServiceKinds = [
  'content-finder',
  'content-attester',
  'beat-agent',
  'recurring-pledge-scheduler',
] as const satisfies readonly ServiceKind[];

export type FundingServiceKind = (typeof fundingServiceKinds)[number];

export type HostCapability = 'all' | 'conceptspace';

/** Default `all` keeps the combined host. `conceptspace` is the non-financial process. */
export function parseHostCapability(value: string | undefined): HostCapability {
  if (value === undefined || value === '' || value === 'all') return 'all';
  if (value === 'conceptspace') return 'conceptspace';
  throw new Error(
    `Invalid SERVICE_HOST_CAPABILITY "${value}". Expected all or conceptspace.`,
  );
}

export function assertConceptspaceServiceKind(kind: ServiceKind): void {
  if (!(conceptspaceServiceKinds as readonly string[]).includes(kind)) {
    throw new Error(
      `Service kind "${kind}" is a funding service. A Conceptspace host cannot start it.`,
    );
  }
}

export interface HostedServiceConfig {
  name: string;
  kind: ServiceKind;
  config: Record<string, unknown>;
  enabled?: boolean;
  restartDelayMs?: number;
  routePrefix?: string;
}

export interface ServiceHostConfig {
  port?: number;
  services: HostedServiceConfig[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid service-host config: ${fieldName} must be a non-empty string`);
  }
  return value;
}

function assertOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid service-host config: ${fieldName} must be a boolean when provided`);
  }
  return value;
}

function assertOptionalNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid service-host config: ${fieldName} must be a non-negative number when provided`);
  }
  return value;
}

function assertOptionalRoutePrefix(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid service-host config: ${fieldName} must be a non-empty string when provided`);
  }
  if (!value.startsWith('/')) {
    throw new Error(`Invalid service-host config: ${fieldName} must start with "/"`);
  }
  return value;
}

function assertServiceKind(value: unknown, fieldName: string): ServiceKind {
  if (typeof value !== 'string' || !serviceKinds.includes(value as ServiceKind)) {
    throw new Error(
      `Invalid service-host config: ${fieldName} must be one of ${serviceKinds.join(', ')}`,
    );
  }
  return value as ServiceKind;
}

function parseHostedServiceConfig(value: unknown, index: number): HostedServiceConfig {
  if (!isRecord(value)) {
    throw new Error(`Invalid service-host config: services[${index}] must be an object`);
  }

  if (!isRecord(value.config)) {
    throw new Error(`Invalid service-host config: services[${index}].config must be an object`);
  }

  return {
    name: assertString(value.name, `services[${index}].name`),
    kind: assertServiceKind(value.kind, `services[${index}].kind`),
    config: value.config,
    enabled: assertOptionalBoolean(value.enabled, `services[${index}].enabled`),
    restartDelayMs: assertOptionalNumber(value.restartDelayMs, `services[${index}].restartDelayMs`),
    routePrefix: assertOptionalRoutePrefix(value.routePrefix, `services[${index}].routePrefix`),
  };
}

export function parseServiceHostConfig(value: unknown): ServiceHostConfig {
  if (!isRecord(value)) {
    throw new Error('Invalid service-host config: top-level JSON value must be an object');
  }

  if (!Array.isArray(value.services) || value.services.length === 0) {
    throw new Error('Invalid service-host config: services must be a non-empty array');
  }

  const services = value.services.map((service, index) => parseHostedServiceConfig(service, index));
  const port = assertOptionalNumber(value.port, 'port');
  const routedServices = services.filter((service) => service.routePrefix && service.enabled !== false);

  if (routedServices.length > 0 && port === undefined) {
    throw new Error('Invalid service-host config: port is required when any service has a routePrefix');
  }

  return { port, services };
}

export async function loadServiceHostConfig(configPath: string): Promise<ServiceHostConfig> {
  const resolvedPath = resolve(configPath);
  const raw = await readFile(resolvedPath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error(`Invalid service-host config JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  return parseServiceHostConfig(parsed);
}

export function getServiceHostConfigPath(argv: string[], env = process.env): string {
  const cliPath = argv[2];
  const envPath = env.SERVICE_HOST_CONFIG;
  const configPath = cliPath || envPath;
  if (!configPath) {
    throw new Error('Missing service-host config path. Pass a JSON file path or set SERVICE_HOST_CONFIG.');
  }
  return configPath;
}
