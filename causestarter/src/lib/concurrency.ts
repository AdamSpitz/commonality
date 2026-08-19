/**
 * Map over items with a ceiling on how many run at once.
 *
 * The cause page fans a query out per published plank, and `Promise.all` over
 * that array opens one connection per plank at the same instant — a 40-plank
 * cause hits the indexer with 40 simultaneous walks. This keeps the same
 * result order and the same all-or-nothing rejection, but only `limit` are in
 * flight at a time.
 */
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
