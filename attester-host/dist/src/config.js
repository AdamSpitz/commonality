import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function assertString(value, fieldName) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`Invalid attester-host config: ${fieldName} must be a non-empty string`);
    }
    return value;
}
function assertNumber(value, fieldName) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new Error(`Invalid attester-host config: ${fieldName} must be a non-negative number`);
    }
    return value;
}
function assertRoutePrefix(value, fieldName) {
    const routePrefix = assertString(value, fieldName);
    if (!routePrefix.startsWith('/')) {
        throw new Error(`Invalid attester-host config: ${fieldName} must start with "/"`);
    }
    if (routePrefix.length > 1 && routePrefix.endsWith('/')) {
        throw new Error(`Invalid attester-host config: ${fieldName} must not end with "/"`);
    }
    return routePrefix;
}
function parseHostedAttesterDefinition(value, fieldName) {
    if (!isRecord(value)) {
        throw new Error(`Invalid attester-host config: ${fieldName} must be an object`);
    }
    if (!isRecord(value.config)) {
        throw new Error(`Invalid attester-host config: ${fieldName}.config must be an object`);
    }
    return {
        routePrefix: assertRoutePrefix(value.routePrefix, `${fieldName}.routePrefix`),
        config: value.config,
    };
}
export function parseAttesterHostConfig(value) {
    if (!isRecord(value)) {
        throw new Error('Invalid attester-host config: top-level JSON value must be an object');
    }
    return {
        port: assertNumber(value.port, 'port'),
        implicationAttester: parseHostedAttesterDefinition(value.implicationAttester, 'implicationAttester'),
        contentAttester: parseHostedAttesterDefinition(value.contentAttester, 'contentAttester'),
    };
}
export async function loadAttesterHostConfig(configPath) {
    const raw = await readFile(resolve(configPath), 'utf8');
    return parseAttesterHostConfig(JSON.parse(raw));
}
export function getAttesterHostConfigPath(argv, env = process.env) {
    const cliPath = argv[2];
    const envPath = env.ATTESTER_HOST_CONFIG;
    const configPath = cliPath || envPath;
    if (!configPath) {
        throw new Error('Missing attester-host config path. Pass a JSON file path or set ATTESTER_HOST_CONFIG.');
    }
    return configPath;
}
//# sourceMappingURL=config.js.map