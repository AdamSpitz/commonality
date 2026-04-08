export function requireEnv(name, value = process.env[name]) {
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
export function readStringEnv(name, fallback) {
    return process.env[name] || fallback;
}
export function readNumberEnv(name, fallback) {
    const rawValue = process.env[name];
    if (!rawValue) {
        return fallback;
    }
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid numeric environment variable: ${name}`);
    }
    return parsed;
}
//# sourceMappingURL=config.js.map