export function requireEnv(name: string, value: string | undefined = process.env[name]): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function readStringEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export function readNumberEnv(name: string, fallback: number): number {
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
