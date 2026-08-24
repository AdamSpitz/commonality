/** Ordered map with at most `limit` promises in flight; rejects on first failure. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return []
  const width = Math.max(1, Math.min(limit, items.length))
  const results = new Array<R>(items.length)
  let next = 0

  const worker = async () => {
    while (true) {
      const index = next++
      if (index >= items.length) return
      results[index] = await fn(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: width }, worker))
  return results
}

/** How many per-plank indexer queries a single page may have in flight. */
export const PLANK_QUERY_CONCURRENCY = 6
