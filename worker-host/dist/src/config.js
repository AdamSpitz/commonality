import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
export const workerKinds = [
    'implication-finder',
    'content-finder',
    'implication-graph-nudger',
    'bridge-creator',
    'explorer-curator',
];
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function assertString(value, fieldName) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`Invalid worker-host config: ${fieldName} must be a non-empty string`);
    }
    return value;
}
function assertOptionalBoolean(value, fieldName) {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== 'boolean') {
        throw new Error(`Invalid worker-host config: ${fieldName} must be a boolean when provided`);
    }
    return value;
}
function assertOptionalNumber(value, fieldName) {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new Error(`Invalid worker-host config: ${fieldName} must be a non-negative number when provided`);
    }
    return value;
}
function assertOptionalRoutePrefix(value, fieldName) {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`Invalid worker-host config: ${fieldName} must be a non-empty string when provided`);
    }
    if (!value.startsWith('/')) {
        throw new Error(`Invalid worker-host config: ${fieldName} must start with "/"`);
    }
    return value;
}
function assertWorkerKind(value, fieldName) {
    if (typeof value !== 'string' || !workerKinds.includes(value)) {
        throw new Error(`Invalid worker-host config: ${fieldName} must be one of ${workerKinds.join(', ')}`);
    }
    return value;
}
function parseHostedWorkerConfig(value, index) {
    if (!isRecord(value)) {
        throw new Error(`Invalid worker-host config: workers[${index}] must be an object`);
    }
    if (!isRecord(value.config)) {
        throw new Error(`Invalid worker-host config: workers[${index}].config must be an object`);
    }
    return {
        name: assertString(value.name, `workers[${index}].name`),
        kind: assertWorkerKind(value.kind, `workers[${index}].kind`),
        config: value.config,
        enabled: assertOptionalBoolean(value.enabled, `workers[${index}].enabled`),
        restartDelayMs: assertOptionalNumber(value.restartDelayMs, `workers[${index}].restartDelayMs`),
        routePrefix: assertOptionalRoutePrefix(value.routePrefix, `workers[${index}].routePrefix`),
    };
}
export function parseWorkerHostConfig(value) {
    if (!isRecord(value)) {
        throw new Error('Invalid worker-host config: top-level JSON value must be an object');
    }
    if (!Array.isArray(value.workers) || value.workers.length === 0) {
        throw new Error('Invalid worker-host config: workers must be a non-empty array');
    }
    const workers = value.workers.map((worker, index) => parseHostedWorkerConfig(worker, index));
    const port = assertOptionalNumber(value.port, 'port');
    const routedWorkers = workers.filter((worker) => worker.routePrefix);
    if (routedWorkers.length > 0 && port === undefined) {
        throw new Error('Invalid worker-host config: port is required when any worker has a routePrefix');
    }
    return { port, workers };
}
export async function loadWorkerHostConfig(configPath) {
    const resolvedPath = resolve(configPath);
    const raw = await readFile(resolvedPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parseWorkerHostConfig(parsed);
}
export function getWorkerHostConfigPath(argv, env = process.env) {
    const cliPath = argv[2];
    const envPath = env.WORKER_HOST_CONFIG;
    const configPath = cliPath || envPath;
    if (!configPath) {
        throw new Error('Missing worker-host config path. Pass a JSON file path or set WORKER_HOST_CONFIG.');
    }
    return configPath;
}
//# sourceMappingURL=config.js.map