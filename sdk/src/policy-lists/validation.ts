export const UNPAIRED_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/;

export function requireRecord(
  input: unknown,
  error: () => Error,
): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw error();
  return input as Record<string, unknown>;
}

export function requireExactKeys(
  record: Record<string, unknown>,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[],
  unknownFieldError: (field: string) => Error,
  missingFieldError: (field: string) => Error,
): void {
  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  const unknown = Object.keys(record).find(key => !allowed.has(key));
  const missing = requiredKeys.find(key => !Object.hasOwn(record, key));
  if (unknown) throw unknownFieldError(unknown);
  if (missing) throw missingFieldError(missing);
}
