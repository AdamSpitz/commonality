
/**
 * Assert that a value is not null/undefined, throwing a descriptive error if it is
 */
export function assertNotNull<T>(value: T | null | undefined, description: string): T {
  if (value === null || value === undefined) {
    throw new Error(`${description} not found`);
  }
  return value;
}
