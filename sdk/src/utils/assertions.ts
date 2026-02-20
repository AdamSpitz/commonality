
/**
 * Assert that a value is not null/undefined, throwing a descriptive error if it is
 * The function should return type T, and also tell the type checker that value is not null after this check
 */
export function assertNotNull<T>(value: T | null | undefined, description: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`${description} not found`);
  }
}
