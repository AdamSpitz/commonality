interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

export class MemoryCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(private readonly defaultTtlMs: number | null = null) {}

  get(key: string): T | undefined {
    this.cleanupKey(key);
    return this.store.get(key)?.value;
  }

  set(key: string, value: T, ttlMs: number | null = this.defaultTtlMs): void {
    const expiresAt = ttlMs === null ? null : Date.now() + ttlMs;
    this.store.set(key, { value, expiresAt });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  size(): number {
    this.cleanupExpired();
    return this.store.size;
  }

  cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt !== null && entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  private cleanupKey(key: string): void {
    const entry = this.store.get(key);
    if (!entry) {
      return;
    }

    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
    }
  }
}
