
// Safe environment variable access that works in both Node.js and browser
export function getEnvVar(name: string): string | undefined {
  // Try Node.js process.env
  const proc = (globalThis as any).process;
  if (proc?.env?.[name]) {
    return proc.env[name];
  }
  // Try Vite's import.meta.env (available in browser builds)
  // In Node.js ESM, import.meta exists but import.meta.env is undefined
  const metaEnv = (import.meta as any).env;
  if (metaEnv?.[name]) {
    return metaEnv[name];
  }
  return undefined;
}
