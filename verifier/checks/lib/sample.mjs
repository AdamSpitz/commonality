// Rotating sample window for the bounded LLM page reviews. Instead of always
// reviewing the first N pages, successive runs slide the window forward so the
// whole page inventory gets covered over time. The offset is derived from the
// day by default (stateless, no cursor file), advancing a full window per day so
// a ~70-page inventory with size 10 is fully covered in ~7 days. Pass an explicit
// `sampleOffset` param to pin the window for reproducibility.

export function daySeed(now = Date.now()) {
  return Math.floor(now / 86_400_000); // whole days since epoch
}

/**
 * Return a window of `size` items starting at (seed * size) mod length, wrapping
 * around. When there are no more items than the window, returns them all.
 *
 * @param {Array} items    ordered items to sample from
 * @param {number} size    window size
 * @param {number} seed    integer offset seed (each increment advances one window)
 * @returns {{ window: Array, start: number }}
 */
export function sampleRotating(items, size, seed) {
  const n = items.length;
  const w = Math.max(1, Math.floor(size));
  if (n <= w) return { window: items.slice(), start: 0 };
  const start = (((Math.floor(seed) * w) % n) + n) % n;
  const window = [];
  for (let i = 0; i < w; i++) window.push(items[(start + i) % n]);
  return { window, start };
}
